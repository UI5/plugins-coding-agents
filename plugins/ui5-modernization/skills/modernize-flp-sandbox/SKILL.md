---
name: modernize-flp-sandbox
description: >
  Use when migrating UI5 apps from legacy FLP sandbox to the new
  sandbox (New Sandbox). Triggers on /modernize-flp-sandbox,
  mentions of "flpSandbox.html", "sap-ushell-config", or requests
  to update sandbox configuration.
---

# New Sandbox Migration Skill

Migrate a UI5 application from the legacy FLP sandbox to New Sandbox.
You analyze, transform, verify, and report. The skill is fully automatic
for the *core migration*; for adjacent concerns (see scope below) it asks
the consumer before acting.

Read `references/operations.md` now — it is the operational reference for
all HTML / JSON / hook-module transformations.

Read `references/sandbox-config-surface.md` now — it is the ground-truth
description of what New Sandbox allows, blocks, and silently overrides.
All §6 rules cite this file rather than restating constraints inline.

## Scope — three layers

1. **Core migration** — actions necessary for the app to boot under New Sandbox. Performed unconditionally; fails migration if impossible. Triggers: §6a, §6b, §6c, §6f.

2. **Test infrastructure** — gets the test suite running again without changing test semantics. Safe rewrites applied unconditionally (resource-root rebind, OPA bootstrap extraction). Anything touching test logic: detect, report, offer on request. Triggers: §6d, §6e, §6g, §6h, §6j, §6l.

3. **Adjacent migrations & advisories** — concerns surfaced *by* the migration but not *part of* it. Detect and report only; no rewrites applied.
   - QUnit 1.x → 2.x patterns (§6i) — advisory.
   - Shell-feature tests (§6j, §6l) — advisory.
   - Deprecated ushell services (§6k) — detected in core pass, reported as "Manual action required" (hard runtime block).


## 1. Detect App Root

If the user provided a path argument, use it. Otherwise, detect from CWD:
- Look for `package.json` + `webapp/` in CWD and parent directories
- If not found, tell the user: "Could not detect a UI5 app root. Please run from inside
  the app directory or provide a path: `/modernize-flp-sandbox ~/path/to/app`"

Set `APP_ROOT` to the resolved absolute path.

## 2. Ensure Clean State (Pre-Migration)

Before touching any files, secure a rollback point.

**If git repository detected:**
```bash
cd $APP_ROOT
git stash push -m "modernize-flp-sandbox: pre-migration backup $(date +%Y%m%d-%H%M%S)"
```
Save the stash ref for rollback. If nothing to stash, the tree is already clean.

**If no git repository:**
```bash
mkdir -p $APP_ROOT/webapp/test/.migration-backup
cp $APP_ROOT/webapp/test/flpSandbox*.html $APP_ROOT/webapp/test/.migration-backup/ 2>/dev/null
cp $APP_ROOT/webapp/test/fioriSandboxAppConfig.json $APP_ROOT/webapp/test/.migration-backup/ 2>/dev/null
```

## 3. Analyze

Read all HTML files under `$APP_ROOT/webapp/test/` (recursive) and build a pattern inventory.

**Detect legacy sandbox HTML files** — a file is legacy if it contains ANY of:
- `id="sap-ushell-bootstrap"` (sandbox bootstrap script tag)
- `window["sap-ushell-config"]` assignment
- `src=` referencing `sandbox2.js` (intermediate New Sandbox old-style bootstrap — predates `SandboxBootTask.js`; treat identically to other legacy patterns)

**OPA test-page (does NOT receive SandboxBootTask / boot-manifest):**
A file matches legacy detection AND ALSO contains ALL of:
- `QUnit.config` or `QUnit.config.autostart` assignment, OR `window.QUnit = {`
- `sap.ui.require(` with entries from `sap/ui/qunit/`, `sap/ui/test/`, or `sap/ui/thirdparty/qunit`

These files are NOT migrated as sandbox HTMLs. They receive: (a) §6g bootstrap extraction into sibling JS, (b) §6i QUnit 1.x detection → sub-skill handoff on consent. The §6g HTML edits:
- Remove `<script src="../ushellConfig.js">` and `<script src="...sandbox.js" id="sap-ushell-bootstrap">`
- Replace inline QUnit/OPA bootstrap with direct script-tag loading (qunit-2.css, qunit-2.js, qunit-junit.js) + `<script src="AllJourneys.js">`
- Create `AllJourneys.js` from inline content (see §6g)
- Update `data-sap-ui-preload="async"` → `data-sap-ui-async="true"`, rename `data-sap-ui-compatVersion` → `data-sap-ui-compat-version`, `data-sap-ui-resourceroots` → `data-sap-ui-resource-roots`
- Do NOT add `SandboxBootTask.js`, `boot-manifest`, or `<div id="canvas">`

**Externalized ushell config detection:**
For each `<script src="...">` in any HTML under `webapp/test/`, check if the referenced file contains an *assignment* to the ushell-config object via:
- `window["sap-ushell-config"] = …` / `globalThis[…]` / `self[…]`
- `Object.assign(<global>["sap-ushell-config"], …)`
- `<global>["sap-ushell-config"].<prop> = …` (property-write after initializer)

Files that only *read* the config do NOT qualify. Record each qualifying file as `externalUshellConfigFile`. For migration: parse the config identically to inline, remove the `<script>` include from all referencing HTMLs, delete the file in Step 9.

**For each legacy HTML file, record:**
- Filename, has mock server?, has RTA/LREP?, has custom plugins?, has deprecated services?
- Has `locate-reuse-libs.js`? (flag for Gap-Report)
- Existing `data-sap-ui-libs`, `data-sap-ui-resourceroots`/`data-sap-ui-resource-roots`, `data-sap-ui-theme`, `data-sap-ui-language` values (carry over, rename to kebab-case)

**Check for existing New Sandbox artifacts:**
- `fioriSandboxAppConfig.json` — exists? (will be created/overwritten)
- `sandbox/` directory — for each `*.js` file, classify:
  - **`legacy`** if contains `Container.createRendererInternal` OR `attachRendererCreatedEvent` OR does NOT contain `execute:`. Capture for in-place rewrite (§6c). Capture top-level namespace declarations as `preservedDeclarations[]` (regex: `^\s*sap(\.[a-zA-Z0-9_]+)+\s*\?\?=\s*\{\}` and `globalThis.sap`/`window.sap` chains; fallback: copy verbatim until first `sap.ui.define(` or IIFE).
  - **`modern`** if exports `{ execute: ... }`. Reuse untouched.
  - **Multiple legacy files:** rewrite ALL. Only one wired via `beforeFlpStart` — prefer name containing `Init` (not `Mock`). Emit Gap-Report note.
- FakeLREP file (`*Lrep*.json` / `*LRep*.json` under `webapp/test/`) — note exact filename for `rta` reference.

**Check for OPA test wiring:**
- OPA test runner HTML (default `webapp/test/integration/opaTests.qunit.html`; fallback: any `*qunit.html` under `webapp/test/integration/` referencing the legacy mockserver HTML) — record value matching `"../flpSandboxMockServer"` → triggers §6d.
- OPA Common-helper file (default `webapp/test/integration/pages/Common.js`; fallback: any `*.js` under `webapp/test/integration/` containing `iStartMyAppInAFrame(`/`getFrameUrl(` AND `sap.ui.require.toUrl(`) — triggers §6e.

**Scan for deprecated ushell service usage:**
Search `*.js` under `webapp/` (excluding `test/`, `resources/`, `*.min.js`) for `getService(<name>)` / `getServiceAsync(<name>)` where `<name>` is one of the 12 deprecated services in `references/sandbox-config-surface.md` §5. Record file, line, service name, bound variable. Surface in Gap-Report (§8); follow-up in §6k.

**Check UI5 framework version:**
Read `ui5.yaml` and `ui5-local.yaml` for `framework.version`. New Sandbox requires >= 1.147. If below, **auto-bump**:
1. Find latest stable SAPUI5 version >= 1.147
2. Write to `ui5.yaml` in-place
3. Log: "Auto-bumped ui5.yaml framework version from `<old>` to `<new>` (New Sandbox requires >= 1.147)."
4. Note in Gap-Report.

## 3a. Hook Dependency Graph Scan

Identifies eager `sap/ushell/*` imports in the transitive AMD graph reachable from the `beforeFlpStart` hook (Hard Constraint H2 — see `references/sandbox-config-surface.md` §1). Detail and rewrite recipe in `references/operations.md` §6f.

**This step builds inventory only.** Action happens in §6f (after hook is generated in §6c).

Record:
1. `hookEntryModule` — resolve from existing `fioriSandboxAppConfig.json` `beforeFlpStart`, or detect from legacy hook in §3 (typically `webapp/test/sandbox/fioriSandboxInit.js`).
2. `hookGraphRoots[]` — additional modules the hook requires directly (from inspecting legacy hook body).

## 4. Scenario Wizard (only when multiple flp*.html found)

**Skip** if only one legacy sandbox HTML found.

New Sandbox uses a single `fioriSandboxAppConfig.json` — multiple HTML files cannot have independent configurations. Solution: consolidate into one HTML with a URL parameter selecting the scenario at runtime.

**Non-interactive mode:** Check for `$APP_ROOT/webapp/test/wizard-answers.json`. If exists, use its values directly (CI/scripted migrations). Format:

```json
{
    "scenarios": [
        { "file": "flpSandbox.html", "id": "default", "description": "Live backend" },
        { "file": "flpSandboxMockServer.html", "id": "mockserver", "description": "Mock server" }
    ],
    "defaultScenario": "mockserver",
    "targetHtml": "flpSandbox.html",
    "paramName": "scenario"
}
```

**Ask the user:**
1. "What scenario does each file represent?" (e.g., "mockserver", "cdm", "default/no-mock")
2. "Which scenario should be default?" (Recommend: `mockserver` — works offline)
3. "Which HTML filename should be kept?"
4. "URL parameter name?" (Default: `scenario`; project-specific name avoids collisions)

**Record:** target HTML, scenario list, default scenario ID, parameter name, obsolete HTML files.

**URL convention:** `flpSandbox.html?scenario=mockserver`. No param → default scenario. Document chosen name in README.

## 5. Pre-Migration Checklist

Before writing files, verify: APP_ROOT set (§1), rollback secured (§2), inventory built (§3), wizard answers available if needed (§4). All good → proceed to §6.

## 6. Migrate

Execute all transformations. If any write fails, jump to ROLLBACK (§10).

**Scope — files modified:**
- All `flp*.html` detected in §3 → full transformation (§6a–§6c)
- OPA test-page HTMLs → bootstrap extraction (§6g)
- OPA test runner HTML → resource-root rebind (§6d)
- QUnit test suite index → journey-URL rewrite (§6g)
- OPA Common-helper → URL-param injection (§6e)
- `webapp/test/fioriSandboxAppConfig.json` → create/overwrite (§6b)
- `webapp/test/sandbox/*.js` legacy hooks → rewrite in-place (§6c)
- Files in `beforeFlpStart` AMD graph → auto-apply `references/native-replacements.md` (§6f)
- OPA test code under `webapp/test/integration/` and app code → §6h–§6l mechanical rewrites

**Out of scope:** `unitTests.qunit.html`, `unit/`, `*.qunit.js`.

When `flpSandboxMockServer.html` is referenced by `opaTests.qunit.html`, migrate it (§6a) AND rebind the OPA reference (§6d) together.

Each subsection below states what/when/which-layer. Full algorithms live in [`references/operations.md`](references/operations.md).

### 6a. Transform legacy HTML file(s) in-place

**Layer:** core. Unconditional on every legacy sandbox HTML.

Removes legacy ushell-config write, `sap-ushell-bootstrap` script tag, obsolete bootstrap attributes. Adds `SandboxBootTask.js` (or CDN variant), boot-manifest attributes, `<div id="canvas">`. Merges resource roots across variants, always adds `sandbox` root.

→ [`references/operations.md` §6a](references/operations.md#6a-transform-legacy-html-in-place)

### 6b. Create or update `fioriSandboxAppConfig.json`

**Layer:** core. Honors only keys in [`references/sandbox-config-surface.md` §2](references/sandbox-config-surface.md#2-configuration-surface-what-the-sandbox-reads).

Builds JSON from parsed legacy config. Splits application keys on first `-` into semanticObject + action. Strips query strings from `rootPath`, ensures trailing slash. Aggregates tiles across variants when Wizard ran. Adds `beforeFlpStart`, `rta`, `plugins` only when warranted.

→ [`references/operations.md` §6b](references/operations.md#6b-build-fiorisandboxappconfigjson)

### 6c. Create or rewrite hook module

**Layer:** core. Backs `beforeFlpStart`, runs before `applyUshellConfig`. Contract: no `globalThis["sap-ushell-config"]` touch, no eager `sap/ushell/*` require (see `references/sandbox-config-surface.md` §8).

Produces single-scenario hook (mock-server only) or multi-scenario hook (URL-parameter switch). Rewrites legacy hooks in place preserving namespace declarations. Falls back to minimal no-op when no mock server needed.

→ [`references/operations.md` §6c](references/operations.md#6c-create-or-rewrite-hook-module)

### 6d. Rebind OPA resource roots

**Layer:** test-infra. Unconditional (no semantics change).

In OPA test runner HTML, rewrites `data-sap-ui-resource-roots` pointing at legacy mockserver HTML to point at migrated target.

→ [`references/operations.md` §6d](references/operations.md#6d-rebind-opa-resource-roots)

### 6e. Inject scenario URL parameter into Common.js

**Layer:** test-infra. Only when Wizard consolidated multiple HTMLs.

Injects scenario parameter into iframe URL *before* the `#` hash (so `window.location.search` sees it).

→ [`references/operations.md` §6e](references/operations.md#6e-inject-scenario-url-parameter-into-commonjs)

### 6f. Resolve hook-graph ushell dependencies

**Layer:** core. Hard runtime block H2 — no `sap/ushell/*` may be eagerly required from hook's transitive AMD graph.

Walks AMD closure from `hookEntryModule` (§3a). Classifies each `sap/ushell/*` hit as trivial-replaceable / architectural-relocatable / manual-required. Auto-applies recipes from `references/native-replacements.md` or emits Gap-Report entry.

→ [`references/operations.md` §6f](references/operations.md#6f-resolve-hook-graph-ushell-dependencies)

### 6g. Extract OPA bootstrap into a sibling JS file

**Layer:** test-infra. Mechanical extraction.

Extracts inline `<script>` block into sibling `.js` (default `AllJourneys.js`). Converts QUnit 1.x globals and `jQuery.sap.getUriParameters` to modern equivalents. Updates test-suite index to URLSearchParams-style journey URLs.

→ [`references/operations.md` §6g](references/operations.md#6g-extract-opa-bootstrap-into-a-sibling-js-file)

### 6h. Detect bindings to legacy ushell-config values

**Layer:** test-infra (auto-fix where mechanical, report otherwise).

Identifies code hard-coding values that were free-form in legacy config but are now derived differently under New Sandbox. Categories: A tile-derived (auto-fix), B user-profile (auto-fix), C personalization (auto-fix), D fixed-by-default (report only). See `references/sandbox-config-surface.md` §3+§4.

→ [`references/operations.md` §6h](references/operations.md#6h-detect-bindings-to-legacy-ushell-config-values)

### 6i. QUnit 1.x → 2.x patterns (handoff)

**Layer:** advisory. Actual rewrite in `modernize-flp-sandbox-qunit` sub-skill.

Detects, reports, offers to invoke sub-skill. Why surfaced: §6a adds `data-sap-ui-async="true"` — QUnit 1.x globals (`module`, `ok`, `equal`) throw `ReferenceError` in that mode. Root cause is independent of sandbox migration; the migration just exposes it.

→ [`references/operations.md` §6i](references/operations.md#6i-qunit-1x-2x-detection-handoff)

### 6j. FLP shell-control awareness (reporting)

**Layer:** test-infra (report only). Detects OPA tests targeting FLP shell controls directly. Shell renders through Web Components in newer UI5 — tests matching `sap.m.*` shell controls break silently.

Patterns: S1 = `sap.m` control + shell-only id, S2 = `type:"Back"` matcher, S3 = non-WebComponent shell header calls.

→ [`references/operations.md` §6j](references/operations.md#6j-flp-shell-control-awareness-reporting)

### 6k. Deprecated ushell-services in app code (detection)

**Layer:** core detection. Every deprecated service is a hard runtime block at `getService()`/`getServiceAsync()` time (see `references/sandbox-config-surface.md` §5). App won't boot.

Scans app code, records hits, surfaces in Gap-Report as "Manual action required". No rewrite attempted.

→ [`references/operations.md` §6k](references/operations.md#6k-deprecated-ushell-services-detection)

### 6l. OPA tests exercising FLP-shell features (detection + ask)

**Layer:** test-infra (detection + ask). Detects journey tests dependent on FLP shell. Only offers to apply fix if recognised iframe-toggle pattern exists. Never modifies without consent.

Signals: shell-control selectors (§6j), deprecated service calls (§6k), convention-named page-object methods.
Probes: P1 = `startMyAppInAFrame` flag, P2 = `iStartMyAppInAFrame` helper, P3 = bespoke iframe URL builder.

→ [`references/operations.md` §6l](references/operations.md#6l-flp-shell-feature-tests-detection-ask)

## 8. Report

Always emit the Gap-Report:

```
== New Sandbox Migration Report ==

App:    <app name from package.json>
Path:   <APP_ROOT>
Status: ✓ SUCCESSFUL  |  ✗ FAILED

── Automatically applied ──────────────────────────────────────────────
  ✓/✗  webapp/test/<filename>.html              (HTML transformed)
  ✓/✗  webapp/test/fioriSandboxAppConfig.json   (created)
  ✓/—  webapp/test/sandbox/<hookModule>.js      (created / reused / rewrote-legacy)
  ✓/—  rta: "<fakeLRep filename>"               (written to config)
  ✓/—  opaTests.qunit.html                      (resource root rebound)
  ✓/—  Common.js                                (scenario URL param injected)
  ✓/—  Hook-graph: <N> trivial replacement(s) auto-applied

── Manual action required ─────────────────────────────────────────────
  ✗  <ServiceName> (deprecated — hard runtime error): <file>:<line>
     → <successor from sandbox-config-surface.md §5>

  ✗  Custom FakeLrep connector at <path>
     → May have sap/ushell dependencies incompatible with beforeFlpStart.

  ✗  Hook-graph — architectural-relocatable: <module> uses <sap/ushell/X>
     → [diff sketch]

  ✗  Hook-graph — manual-required: <module> uses <sap/ushell/X> at load time
     → [textual sketch]

  ✗  <Layer-2 step> — pattern not recognised
     → [description]

── Advisory (no migration blocker) ───────────────────────────────────
  ℹ  <N> QUnit 1.x pattern(s) in <M> file(s)
  ℹ  Shell-control test patterns: <N> in <M> files (S1: ?, S2: ?, S3: ?)
  ℹ  locate-reuse-libs.js: script tag removed — deprecated pattern, safe.
  ℹ  <other non-standard patterns>

[On failure: "Rolled back. Partial attempt saved to webapp/test/.migration-attempt/"]
```

Sections with no findings are omitted from the report.

## 9. Legacy File Cleanup (REQUIRED — do not skip)

- **No Wizard:** legacy HTMLs transformed in-place — no extra files to delete.
- **Wizard used:** delete all obsolete HTML files (everything except target).
- **Always:** delete each `externalUshellConfigFile[]`.

```bash
rm <obsolete-file-1> <obsolete-file-2> ...
```

**Verify:** `ls webapp/test/flp*.html` — only the migrated target remains.

## 10. Rollback

On any failure during §6:

**Save partial attempt:**
```bash
mkdir -p $APP_ROOT/webapp/test/.migration-attempt
cp $APP_ROOT/webapp/test/*.html $APP_ROOT/webapp/test/.migration-attempt/ 2>/dev/null
cp $APP_ROOT/webapp/test/fioriSandboxAppConfig.json $APP_ROOT/webapp/test/.migration-attempt/ 2>/dev/null
```

**Restore:**
- Git: `git checkout -- webapp/test/ && git stash pop`
- No git: `cp $APP_ROOT/webapp/test/.migration-backup/* $APP_ROOT/webapp/test/`

Emit Gap-Report with status FAILED.
