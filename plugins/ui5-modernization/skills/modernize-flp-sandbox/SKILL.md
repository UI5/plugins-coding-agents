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

The skill operates in three layers. Each §6 subsection below is tagged with
one of them so it is always clear what is core and what is adjacent.

1. **Core migration** — actions that are necessary for the app to boot
   under New Sandbox. The skill performs them unconditionally and fails the
   migration if they cannot be performed. Triggers: §6a, §6b, §6c, §6f.

2. **Test infrastructure** — actions that get the existing test suite
   running again under New Sandbox without changing test semantics. The
   skill performs the safe ones (resource-root rebind, OPA bootstrap
   extraction). For anything that touches test logic, it detects, reports,
   and offers to apply on consumer request. Triggers: §6d, §6e, §6g,
   §6h, §6j, §6l.

3. **Adjacent migrations & advisories** — concerns that are surfaced *by*
   the New Sandbox migration but are not *part of* it. The skill detects
   and reports only; no rewrites are applied.
   Triggers:
   - QUnit 1.x → 2.x patterns (§6i) — advisory.
   - Shell-feature tests (§6j, §6l) — advisory.

   Note: deprecated ushell service usage (§6k) is detected as part of
   the core pass and reported as "Manual action required" — it is a hard
   runtime block, not an advisory.


## 1. Detect App Root

If the user provided a path argument, use it. Otherwise, detect from CWD:
- Look for `package.json` + `webapp/` in CWD and parent directories
- If not found, tell the user: "Could not detect a UI5 app root. Please run from inside
  the app directory or provide a path: `/modernize-flp-sandbox ~/path/to/app`"

Set `APP_ROOT` to the resolved absolute path. All file operations use this as the base.

## 2. Ensure Clean State (Pre-Migration)

Before touching any files, secure a rollback point.

**If git repository detected** (`git -C $APP_ROOT rev-parse --git-dir` succeeds):
```bash
cd $APP_ROOT
git stash push -m "modernize-flp-sandbox: pre-migration backup $(date +%Y%m%d-%H%M%S)"
```
Save the stash ref for rollback. If `git stash` fails (nothing to stash), note it — the
working tree is already clean.

**If no git repository:**
```bash
mkdir -p $APP_ROOT/webapp/test/.migration-backup
cp $APP_ROOT/webapp/test/flpSandbox*.html $APP_ROOT/webapp/test/.migration-backup/ 2>/dev/null
cp $APP_ROOT/webapp/test/fioriSandboxAppConfig.json $APP_ROOT/webapp/test/.migration-backup/ 2>/dev/null
```
Save the backup path for rollback.

## 3. Analyze

Read all HTML files under `$APP_ROOT/webapp/test/` (recursive, including subdirectories) and build a pattern inventory:

**Detect legacy sandbox HTML files** — a file is a legacy sandbox HTML if it contains ANY of:
- `id="sap-ushell-bootstrap"` (sandbox bootstrap script tag), OR
- `window["sap-ushell-config"]` assignment, OR
- `src=` referencing `sandbox2.js` (intermediate New Sandbox old-style bootstrap — predates `SandboxBootTask.js`)

The `sandbox2.js` pattern indicates a partial/old-style New Sandbox migration that still needs updating to the current `SandboxBootTask.js`-based approach. Treat it identically to the other legacy patterns.

**OPA test-page (does NOT receive SandboxBootTask / boot-manifest):**
A file matches the legacy sandbox detection criteria above AND ALSO
contains ALL of:
- `QUnit.config` or `QUnit.config.autostart` assignment, OR `window.QUnit = {` pattern
- `sap.ui.require(` with entries from `"sap/ui/qunit/`, `"sap/ui/test/`, or `"sap/ui/thirdparty/qunit`

These files are NOT added to the legacy HTML migration list. Instead, they receive a different treatment composed of two pieces: (a) §6g extracts the inline OPA bootstrap into a sibling JS file and rewrites the HTML attributes, (b) §6i detects QUnit 1.x patterns in the journey/page modules and hands off to the `modernize-flp-sandbox-qunit` sub-skill on consumer consent. The HTML edits performed in §6g specifically:
- Remove `<script src="../ushellConfig.js">` and `<script src="...sandbox.js" id="sap-ushell-bootstrap">` includes (these are no longer needed once the primary FLP HTML is migrated)
- Replace inline QUnit/OPA bootstrap `<script>` block with direct script-tag loading (qunit-2.css, qunit-2.js, qunit-junit.js) + `<script src="AllJourneys.js">`
- Create `AllJourneys.js` from the inline bootstrap content (see §6g below)
- Update `data-sap-ui-preload="async"` to `data-sap-ui-async="true"` and rename `data-sap-ui-compatVersion` → `data-sap-ui-compat-version` and `data-sap-ui-resourceroots` → `data-sap-ui-resource-roots`
- Do NOT add `SandboxBootTask.js`, `boot-manifest`, or `<div id="canvas">`

**Externalized ushell config detection:**
After scanning HTML files for legacy sandbox detection, also check: for
each `<script src="...">` tag in any HTML file under `webapp/test/`, if
the `src` attribute resolves to a file (default: `.js` extension; the
extension is not required — accept any `src` whose contents are loaded
as JavaScript) that:

(a) is reachable from the HTML's directory (resolve `src` against the
    HTML location; the file may live anywhere under `$APP_ROOT/`, not
    only under `webapp/test/`), AND

(b) contains an *assignment* into the global ushell-config object via
    any of these write patterns:
    - `window["sap-ushell-config"] = …`
    - `globalThis["sap-ushell-config"] = …`
    - `self["sap-ushell-config"] = …`
    - any `Object.assign(<global>["sap-ushell-config"], …)` where
      `<global>` is one of the three above
    - any `<global>["sap-ushell-config"].<prop> = …` (property-write
      after a prior `??=`/`||=` initializer in the same file)

    A file that only *reads* `window["sap-ushell-config"]` does NOT
    qualify — bare reads are common in app code that consults the
    config and must not be deleted.

Record each such file as an `externalUshellConfigFile`. For migration:
- Parse the `window["sap-ushell-config"]` value from the external file identically to inline config (same rules for extracting applications, rootIntent, etc.)
- Remove the `<script src="...">` include tag from ALL HTML files that reference it
- The external file itself will be deleted in Step 9 (Legacy File Cleanup)

For each legacy HTML file found, record:
- Filename
- Has mock server? (contains `MockServer` or `use-mockserver` or `locate-reuse-libs`)
- Has RTA/LREP? (contains `fakeLrep` or `FakeLrepConnector` or `xx-flexibilityServices`)
- Has custom plugins? (contains `bootstrapPlugins` with entries other than `RuntimeAuthoringPlugin`)
- Has deprecated services in config? (contains `Personalization`, `LaunchPage`, `NavTargetResolution` in services config)
- Has `locate-reuse-libs.js`? (non-standard pattern — flag for Gap-Report)
- Existing `data-sap-ui-libs` value (carry over)
- Existing `data-sap-ui-resourceroots` / `data-sap-ui-resource-roots` value (carry over, rename to kebab-case)
- Existing `data-sap-ui-theme` value (carry over)
- Existing `data-sap-ui-language` value (carry over)

**Check for existing New Sandbox artifacts:**
- `fioriSandboxAppConfig.json` — exists? (will be created/overwritten)
- `sandbox/` directory — exists? For each `*.js` file inside, classify:
  - **`legacy`** if file contains `Container.createRendererInternal` OR `attachRendererCreatedEvent` OR file does NOT contain the literal token `execute:`. Capture the filename for in-place rewrite (Step 6c).
  - **`modern`** if file exports `{ execute: ... }`. Reuse untouched.
  - For each `legacy` file, capture **top-level namespace declarations** as `preservedDeclarations[]`. Match the regex `^\s*sap(\.[a-zA-Z0-9_]+)+\s*\?\?=\s*\{\}` and analogous `globalThis.sap`/`window.sap` chains. Conservative fallback: if a non-recognised top-of-file prelude exists, copy lines verbatim from start of file until the first `sap.ui.define(` or `(function()` IIFE.
  - **Multiple legacy files found:** rewrite ALL of them. Each gets the same `execute:` export
    treatment. Only one file needs to be wired via `beforeFlpStart` — if one file's name
    suggests it is the primary init (heuristic: name contains `Init` and not `Mock`/`MockServer`),
    prefer the primary one. Emit a Gap-Report note listing all rewritten files so the developer
    can verify the correct one is referenced.
- A FakeLREP file (default name `fakeLrep.json` / `fakeLRep.json`, but any
  `*Lrep*.json` / `*LRep*.json` under `webapp/test/` qualifies) — exists?
  Note exact filename for the `rta` reference.

**Check for OPA test wiring:**
- An OPA test runner HTML (default location
  `webapp/test/integration/opaTests.qunit.html`; fallback: any
  `*qunit.html` under `webapp/test/integration/` whose
  `data-sap-ui-resource-roots` attribute references the legacy mockserver
  HTML) — exists? Read the attribute. Record any value matching
  `"../flpSandboxMockServer"` (without `.html`, possibly with trailing
  path) — this triggers Step 6d.
- An OPA Common-helper file (default location
  `webapp/test/integration/pages/Common.js`; fallback: any `*.js` under
  `webapp/test/integration/` containing both `iStartMyAppInAFrame(` or
  `getFrameUrl(` AND `sap.ui.require.toUrl(`) — exists? Record whether
  it matches the iframe-URL-builder pattern — this triggers Step 6e.

**Scan application code for deprecated ushell service usage:**

This is the analysis-time inventory pass. The action — reporting as
"Manual action required" in the Gap-Report — is in §6k.
The canonical 12-entry table with successors and reasons lives in
`references/sandbox-config-surface.md` §5; do not duplicate it here.

Search all `*.js` files under `webapp/` excluding `test/`, `resources/`,
and `*.min.js` for `getService(<name>)` / `getServiceAsync(<name>)`
where `<name>` is one of the 12 deprecated services in the reference.
Per match record file path, line number, service name, and (if visible)
the variable bound to the resolved service.

If at least one match is found, surface the inventory in the Gap-Report
during §8 and let §6k drive the follow-up. If no matches: note
"No deprecated service usage found in app code."

**Check UI5 framework version:**
Read `ui5.yaml` and `ui5-local.yaml` (if present) for the `framework.version` field.
New Sandbox requires UI5 >= 1.147. If the version is below 1.147, **automatically bump it**:

1. Run `npm info @sapui5/distribution-metadata versions --json 2>/dev/null | python3 -c "import json,sys; vs=[v for v in json.load(sys.stdin) if not 'SNAPSHOT' in v]; vs.sort(key=lambda v: [int(x) for x in v.split('.')]); print(vs[-1])"` to find the latest stable SAPUI5 version >= 1.147.
2. Write that version to `ui5.yaml` (replace the `framework.version` value in-place).
3. Log: "Auto-bumped ui5.yaml framework version from `<old>` to `<new>` (New Sandbox requires >= 1.147)."

Note this in the Gap-Report as an automatic change that was applied.

## 3a. Hook Dependency Graph Scan

This step identifies eager `sap/ushell/*` imports anywhere in the transitive AMD graph reachable from the `beforeFlpStart` hook. Such imports trigger Hard Constraint H2 from [`references/sandbox-config-surface.md` §1](references/sandbox-config-surface.md#1-hard-runtime-blocks) — the app never renders. The architectural detail and the rewrite recipe live in [`references/operations.md` §6f](references/operations.md#6f-resolve-hook-graph-ushell-dependencies).

**This step builds the inventory only.** The actual graph walk and rewrite/report happens in Section 6f (after the hook is generated in 6c).

**Inventory items to record now (during Step 3):**

1. **Locate the hook entry module.** If `webapp/test/fioriSandboxAppConfig.json` exists with `beforeFlpStart`, resolve that module path. Otherwise the entry is the legacy hook detected in Step 3 (typically `webapp/test/sandbox/fioriSandboxInit.js` or whatever the legacy mockserver init file is). On a first-run migration, the entry is whichever module Section 6c will write/rewrite.
2. **Record the entry module path** as `hookEntryModule` for Section 6f.
3. **Record `hookGraphRoots[]`** — additional modules the hook will require directly (e.g. `localService/mockserver`). These come from inspecting the legacy hook's body. Section 6f recurses from each.

The graph walk itself (depth-first traversal, dependency extraction, classification) runs at the start of Section 6f, after Sections 6a–6e have produced the post-migration hook content.

## 4. Scenario Wizard (only when multiple flp*.html found)

**Skip this step** if only one legacy sandbox HTML was found in step 3.

**Context:** New Sandbox uses a single shared `fioriSandboxAppConfig.json`. Multiple HTML files
cannot have independent configurations. The solution is to consolidate into one HTML file with
a URL parameter that selects the scenario at runtime.

**Non-interactive mode:** Before prompting, check for `$APP_ROOT/webapp/test/wizard-answers.json`.
If it exists, use its values directly. This lets callers pre-fill answers for unattended runs
(CI, scripted migrations). Skip the questions below if found.

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

Fields: `scenarios` (all legacy HTMLs with their assigned ids), `defaultScenario` (id of the
scenario that runs when no URL param is present), `targetHtml` (the HTML file that survives),
`paramName` (URL parameter name — optional, defaults to `"scenario"` if absent).

**Ask the user:**

1. "Found multiple legacy sandbox files: `<list with detected characteristics>`.
   What scenario does each file represent?" (e.g., "mockserver", "cdm", "default/no-mock")

2. "Which scenario should be the default when no URL parameter is set?
   (Recommendation: `mockserver` — it works offline without a proxy, which is the
   common case for local development. Other scenarios often require Fiori Tools or
   a network proxy.)"

3. "Which HTML filename should be kept for the migrated file?"

4. "What URL parameter name should be used to select the scenario?
   (Default: `scenario`. For apps that need to avoid collisions with other URL parameters,
   a project-specific name like `myAppScenario` is recommended — document it in the README.)"

**Record:**
- Target HTML filename (the one that survives)
- Scenario list: `[{id: "mockserver", description: "..."}, {id: "default", ...}]`
- Default scenario ID (recommended: `mockserver`)
- Parameter name (default: `"scenario"`; user may override to avoid collisions)
- Obsolete HTML files (everything except the target)

**URL Parameter Convention:**

The default parameter name is `"scenario"`. It is short and human-readable.
If multiple apps share the same browser context, use a project-specific prefix to avoid
parameter collisions (e.g. `"myAppScenario"`). Document the chosen name in the project's
README or migration guide.

| Scenario | Example URL (default param name) |
| --- | --- |
| Use default (no param) | `flpSandbox.html` |
| Explicit mockserver | `flpSandbox.html?scenario=mockserver` |
| Live backend | `flpSandbox.html?scenario=default` |
| Custom named scenario | `flpSandbox.html?scenario=cdm` |

If parameter is absent → default scenario runs (recommended default: `mockserver`).

## 5. Pre-Migration Checklist

Before writing any files, verify:
- `APP_ROOT` is set (Step 1 completed)
- Rollback point secured (Step 2 completed)
- Pattern inventory built (Step 3 completed)
- If multiple legacy HTML files found: Wizard answers available (Step 4 completed)

All good → proceed to Step 6.

## 6. Migrate

Execute all transformations. Work file by file. If any write operation fails, immediately
jump to ROLLBACK (Section 10).

> **SCOPE:** Modify only the files listed below. Files explicitly out of
> scope: `unitTests.qunit.html`, files under `unit/`, `*.qunit.js`.
>
> Files in scope:
> - All `flp*.html` files detected in §3 → full transformation (§6a-§6c)
> - OPA test-page HTMLs (default `webapp/test/integration/Journey.qunit.html`)
>   → bootstrap extraction (§6g)
> - OPA test runner HTML (default `webapp/test/integration/opaTests.qunit.html`)
>   → resource-root rebind (§6d)
> - QUnit test suite index (default `webapp/test/testsuite.qunit.html`)
>   → journey-URL rewrite (§6g)
> - OPA Common-helper file (default `webapp/test/integration/pages/Common.js`)
>   → URL-param injection (§6e)
> - `webapp/test/fioriSandboxAppConfig.json` → create / overwrite (§6b)
> - `webapp/test/sandbox/*.js` legacy hook files → rewrite in-place (§6c)
> - Files reachable from the `beforeFlpStart` transitive AMD graph
>   → auto-apply transformations from `references/native-replacements.md`
>   only (§6f)
> - OPA test code under `webapp/test/integration/` and (for §6h) app code
>   under `webapp/` → mechanical rewrites against the rules in §6h–§6l;
>   §6i is detect-only (advisory). §6k is detect-only (manual required —
>   hard runtime block, no sub-skill offered).
>
> When `flpSandboxMockServer.html` is referenced by `opaTests.qunit.html`,
> migrate it normally (§6a) AND rebind the OPA reference (§6d). Both must
> happen together.

**Detail.** Each subsection below states what the step does, when it
runs, and which layer it belongs to. The full algorithm — detection
patterns, regex, edge cases, recipes — lives in
[`references/operations.md`](references/operations.md). Each
subsection links into the matching section there.

### 6a. Transform legacy HTML file(s) in-place

**Layer:** core. Performed unconditionally on every legacy sandbox
HTML detected in §3.

What it does: removes the legacy ushell-config write, the
`sap-ushell-bootstrap` script tag, and obsolete bootstrap attributes;
adds `SandboxBootTask.js` (or its CDN variant), the boot-manifest
attributes, and the `<div id="canvas">` invariant; merges resource
roots across HTML variants and always adds the `sandbox` root.

→ **See** [`references/operations.md` §6a](references/operations.md#6a-transform-legacy-html-in-place).

### 6b. Create or update `fioriSandboxAppConfig.json`

**Layer:** core. The sandbox honors only the keys listed in
[`references/sandbox-config-surface.md` §2](references/sandbox-config-surface.md#2-configuration-surface-what-the-sandbox-reads)
— emit none beyond that set.

What it does: builds the JSON from the parsed legacy
`window["sap-ushell-config"]`. Splits each application key on the
first `-` into `semanticObject` + `action`. Strips query strings out
of `rootPath` and ensures a trailing slash. Aggregates tiles across
all HTML variants when the Wizard ran. Adds `beforeFlpStart`,
`rta`, `plugins` only when the inputs warrant it.

→ **See** [`references/operations.md` §6b](references/operations.md#6b-build-fiorisandboxappconfigjson).

### 6c. Create or rewrite hook module

**Layer:** core. Backs `beforeFlpStart` and runs before
`applyUshellConfig`. The contract lives in
[`references/sandbox-config-surface.md` §8](references/sandbox-config-surface.md#8-the-beforeflpstart-hook-contract):
the hook may not touch `globalThis["sap-ushell-config"]` and must not
eagerly require `sap/ushell/*`.

What it does: produces a single-scenario hook (mock-server only) or a
multi-scenario hook (URL-parameter switch) depending on whether the
Wizard ran. Rewrites legacy hook modules in place, preserving any
top-of-file namespace declarations. Falls back to a minimal no-op
when no scenario actually needs a mock server.

→ **See** [`references/operations.md` §6c](references/operations.md#6c-create-or-rewrite-hook-module).

### 6d. Rebind OPA resource roots

**Layer:** test-infra. Mechanical resource-root rewrite — applied
unconditionally because it does not change test semantics.

What it does: in the OPA test runner HTML (default
`webapp/test/integration/opaTests.qunit.html`), rewrites any
`data-sap-ui-resource-roots` value pointing at the legacy mockserver
HTML so it points at the migrated target HTML.

→ **See** [`references/operations.md` §6d](references/operations.md#6d-rebind-opa-resource-roots).

### 6e. Inject scenario URL parameter into Common.js

**Layer:** test-infra. Only triggered when the Wizard consolidated
multiple HTMLs into one and the chosen URL-parameter convention has
to be threaded through the iframe URL builder.

What it does: in the OPA Common-helper file, injects the scenario
parameter into the iframe URL *before* the `#` hash is appended (so
`window.location.search` still sees it).

→ **See** [`references/operations.md` §6e](references/operations.md#6e-inject-scenario-url-parameter-into-commonjs).

### 6f. Resolve hook-graph ushell dependencies

**Layer:** core. Hard runtime block H2 (see
[`references/sandbox-config-surface.md` §1](references/sandbox-config-surface.md#1-hard-runtime-blocks))
— no `sap/ushell/*` may be required eagerly from the hook's
transitive AMD graph.

What it does: walks the AMD closure starting at
`hookEntryModule` (§3a), classifies every `sap/ushell/*` hit as
trivial-replaceable / architectural-relocatable / manual-required,
and either auto-applies a recipe from
[`references/native-replacements.md`](references/native-replacements.md)
or emits a Gap-Report entry with a concrete suggestion.

→ **See** [`references/operations.md` §6f](references/operations.md#6f-resolve-hook-graph-ushell-dependencies).

### 6g. Extract OPA bootstrap into a sibling JS file

**Layer:** test-infra. Mechanical extraction of the OPA bootstrap
block out of an OPA test HTML so the page survives the loss of the
legacy `sandbox.js` include.

What it does: extracts the inline `<script>` block content into a
sibling `.js` file (default name `AllJourneys.js`). Converts
QUnit 1.x globals and `jQuery.sap.getUriParameters` into modern
equivalents. Updates the test-suite index (`testsuite.qunit.html`)
to use URLSearchParams-style journey URLs.

→ **See** [`references/operations.md` §6g](references/operations.md#6g-extract-opa-bootstrap-into-a-sibling-js-file).

### 6h. Detect bindings to legacy ushell-config values

**Layer:** test-infra (auto-fix where mechanical, report otherwise).
Identify code that hard-codes values which were free-form in the
legacy `window["sap-ushell-config"]` but are now derived from a
different source (or fixed entirely) under New Sandbox. Auto-fix the
safe, mechanical cases; report everything else.

A migrated app boots cleanly under New Sandbox even when this rule
does nothing — the consequence is a test failure or runtime mismatch
*later*, not a boot crash. That is why this is test-infra, not core:
the source change has already been performed by §6a (which removes
the legacy ushell-config write), and §6h only cleans up downstream
fall-out.

The set of values is enumerated in
[`references/sandbox-config-surface.md` §3 + §4](references/sandbox-config-surface.md#3-values-whose-runtime-source-moved).
Categories: A tile-derived (auto-fix), B user-profile (strict mode,
auto-fix), C personalization (strict mode, auto-fix), D fixed-by-
default (report only).

→ **See** [`references/operations.md` §6h](references/operations.md#6h-detect-bindings-to-legacy-ushell-config-values).

### 6i. QUnit 1.x → 2.x patterns in OPA test code (handoff)

**Layer:** advisory. The actual rewrite lives in the
`modernize-flp-sandbox-qunit` sub-skill.
The main skill detects, reports, and offers to invoke the sub-skill
on consumer request.

Why surfaced by the migration: §6a removes
`data-sap-ui-preload="async"` and adds `data-sap-ui-async="true"` on
the test bootstrap. In that load-timing mode, QUnit 1.x globals
(`module`, `ok`, `equal`, …) and the direct-call form
`QUnit.ok(...)` are no longer defined when journey/page modules
execute. Bare references throw `ReferenceError` at module load.

The root cause is independent of the sandbox migration — the test
code does not match the QUnit version. The migration just exposes
it. That is why the actual rewrite is delegated to a stand-alone
sub-skill the consumer can also invoke directly on apps that have
not migrated.

→ **See** [`references/operations.md` §6i](references/operations.md#6i-qunit-1x-2x-detection-handoff).

### 6j. FLP shell-control awareness in OPA test code (reporting)

**Layer:** test-infra (reporting only — no auto-rewrite). Detect OPA
test code that targets FLP shell controls directly and surface
concrete fix suggestions in the §8 report. Never rewrite test logic
without consumer consent.

Why surfaced by the migration: the FLP shell renders increasingly
through UI5 Web Components in newer UI5 versions. App-level controls
and the app's own behavior are unaffected, but OPA tests that match
shell controls by `sap.m.*` control type or that call non-WebComponent
APIs on the shell header break silently or throw at runtime. The
exact version at which a given shell control switches is a moving
target — this rule does not encode specific version thresholds, it
just identifies the test patterns that are at risk.

Patterns: S1 = `sap.m` control + shell-only id, S2 = `type:"Back"`
matcher, S3 = non-WebComponent calls on the shell header
(`getHeadItems`, `header.$("icon").click()`).

→ **See** [`references/operations.md` §6j](references/operations.md#6j-flp-shell-control-awareness-reporting).

### 6k. Deprecated ushell-services in app code (detection)

**Layer:** core detection. Every deprecated service is a hard runtime
block at `getService()` / `getServiceAsync()` time — see
[`references/sandbox-config-surface.md` §5](references/sandbox-config-surface.md#5-deprecated-services).
An app that still consumes any of them does not boot under New Sandbox.

The skill scans app code, records every hit, and surfaces all findings
in the Gap-Report under "Manual action required". No rewrite is
attempted and no sub-skill is offered — the rewrite is non-trivial
(sync→async transitions, API shape changes per service) and must be
done by the developer.

→ **See** [`references/operations.md` §6k](references/operations.md#6k-deprecated-ushell-services-detection).

### 6l. OPA tests that exercise FLP-shell features (detection + ask)

**Layer:** test-infra (detection + ask). Detect journey tests whose
behavior depends on the surrounding FLP shell, surface the list to
the consumer, and — only if a recognised iframe-toggle pattern is
present in the app — offer to apply it. Never modify a test without
consent.

Signals: (a) shell-control selectors from the §6j catalog,
(b) calls to deprecated-or-successor shell services from the §6k
list, (c) convention-named page-object methods (heuristic).

Probes: P1 = existing `startMyAppInAFrame` flag, P2 =
`iStartMyAppInAFrame` helper, P3 = bespoke iframe URL builder.

→ **See** [`references/operations.md` §6l](references/operations.md#6l-flp-shell-feature-tests-detection-ask).

## 8. Report

Always emit the Gap-Report, whether successful or failed:

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
     → <successor or removal instruction from sandbox-config-surface.md §5>
     (one line per finding; section omitted if no deprecated services found)

  ✗  Custom FakeLrep connector at <path>
     → Own connector code may have sap/ushell dependencies incompatible
       with beforeFlpStart. Migrate manually.
     (omitted if not present)

  ✗  Hook-graph — architectural-relocatable: <module> uses <sap/ushell/X>
     → [diff sketch]
     (one entry per hit; omitted if none)

  ✗  Hook-graph — manual-required: <module> uses <sap/ushell/X> at load time
     → [textual sketch]
     (one entry per hit; omitted if none)

  ✗  <Layer-2 step> — pattern not recognised
     → [description of what was expected and what was found instead]
     (one entry per unrecognised pattern; omitted if all Layer-2 steps ran cleanly)

── Advisory (no migration blocker) ───────────────────────────────────
  ℹ  <N> QUnit 1.x pattern(s) in <M> file(s) under webapp/test/integration/
     (omitted if none)

  ℹ  Shell-control test patterns flagged: <N> in <M> files (S1: ?, S2: ?, S3: ?)
     (omitted if none)

  ℹ  locate-reuse-libs.js: script tag removed — deprecated Fiori Tools pattern,
     removal is safe. (omitted if not present)

  ℹ  <description of any other non-standard pattern and how it was handled>
     → Consider documenting this pattern in the Migration Guide.
     (omitted if none)

[On failure: "Rolled back to original state. Partial attempt saved to webapp/test/.migration-attempt/"]
```

## 9. Legacy File Cleanup (REQUIRED — do not skip)

**This step is mandatory.** Execute it regardless of whether the migration completed successfully or failed.

- **No Wizard:** the original legacy HTML file(s) were transformed in-place — there are no extra files to delete. Skip this step.
- **Wizard was used:** delete all obsolete HTML files identified during the wizard (everything except the target HTML). The git history preserves them if ever needed.
- **Always:** delete each `externalUshellConfigFile[]` (external ushell config files whose content has already been parsed and moved to `fioriSandboxAppConfig.json`).

```bash
rm <obsolete-file-1> <obsolete-file-2> ...
```

**Verify:** confirm with `ls webapp/test/flp*.html` that only the migrated target file remains.

## 10. Rollback

On any failure during step 6 (Migrate):

**Save partial attempt:**
```bash
mkdir -p $APP_ROOT/webapp/test/.migration-attempt
cp $APP_ROOT/webapp/test/*.html $APP_ROOT/webapp/test/.migration-attempt/ 2>/dev/null
cp $APP_ROOT/webapp/test/fioriSandboxAppConfig.json $APP_ROOT/webapp/test/.migration-attempt/ 2>/dev/null
```

**Restore original state:**

If git stash was used:
```bash
cd $APP_ROOT
git checkout -- webapp/test/
git stash pop
```

If backup directory was used:
```bash
cp $APP_ROOT/webapp/test/.migration-backup/* $APP_ROOT/webapp/test/
```

Emit the Gap-Report with status FAILED and note what failed.

