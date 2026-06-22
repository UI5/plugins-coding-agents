# operations.md — Skill-internal algorithm reference

This file contains the full per-step algorithms that `nsbx-migrate`
executes. `SKILL.md` §6 is the schematic overview; everything that goes
beyond *what* a step does — detection patterns, regex, edge cases,
recipe details, troubleshooting heuristics — lives here.

**Audience:** the skill itself (and humans reading the skill). For a
human-readable manual-migration walkthrough, see
[`../../docs/consumer/migration-guide.md`](../../docs/consumer/migration-guide.md);
that document is the consumer guide and is maintained by
`/nsbx-consolidate` — not hand-edited in lock-step with this file.

**Related references:**
- [`sandbox-config-surface.md`](sandbox-config-surface.md) — what
  New Sandbox allows, blocks, and silently overrides at runtime. All
  steps below cite this file for runtime contracts.
- [`native-replacements.md`](native-replacements.md) — auto-fix
  registry for the hook-graph rewrite step (§6f).

## Contents

- [§6a Transform legacy HTML in-place](#6a-transform-legacy-html-in-place)
- [§6b Build `fioriSandboxAppConfig.json`](#6b-build-fiorisandboxappconfigjson)
- [§6c Create or rewrite hook module](#6c-create-or-rewrite-hook-module)
- [§6d Rebind OPA resource roots](#6d-rebind-opa-resource-roots)
- [§6e Inject scenario URL parameter into Common.js](#6e-inject-scenario-url-parameter-into-commonjs)
- [§6f Resolve hook-graph ushell dependencies](#6f-resolve-hook-graph-ushell-dependencies)
- [§6g Extract OPA bootstrap into a sibling JS file](#6g-extract-opa-bootstrap-into-a-sibling-js-file)
- [§6h Detect bindings to legacy ushell-config values](#6h-detect-bindings-to-legacy-ushell-config-values)
- [§6i QUnit 1.x → 2.x detection (handoff)](#6i-qunit-1x-2x-detection-handoff)
- [§6j FLP shell-control awareness (reporting)](#6j-flp-shell-control-awareness-reporting)
- [§6k Deprecated ushell-services detection (handoff)](#6k-deprecated-ushell-services-detection-handoff)
- [§6l FLP-shell-feature tests (detection + ask)](#6l-flp-shell-feature-tests-detection-ask)

---

## §6a Transform legacy HTML in-place

**Scope.** Every legacy FLP sandbox HTML found in §3.

**Remove from the HTML:**
- The entire `<script>` block containing `window["sap-ushell-config"]`
- The `<script src="...sandbox.js" id="sap-ushell-bootstrap">` tag
- Any `<script src="...sandbox2.js">` tag (old-style New Sandbox
  bootstrap — replaced by `SandboxBootTask.js`)
- Any `<script>` block containing `attachInit` or
  `createRenderer().placeAt`
- Any `<script>` block containing `sap.ui.getCore().attachInit`
- `data-sap-ui-bindingSyntax` attribute
- `data-sap-ui-preload` attribute
- `data-sap-ui-onInit` / `data-sap-ui-on-init` attribute
- `data-sap-ui-flexibilityServices` attribute
- `<script>` tag referencing `locate-reuse-libs.js` (non-standard —
  flag in Gap-Report)
- `data-sap-ui-componentName` attribute (from locate-reuse-libs script)
- Any `<script src="...">` tag whose `src` resolves to an
  `externalUshellConfigFile` (per §3 detection rule)

**Add before `<script id="sap-ui-bootstrap">`:**
```html
<script src="../resources/sap/ushell/sandbox/SandboxBootTask.js"></script>
```

The path must be `../resources/` (with `../`) — the HTML file is in
`webapp/test/`, so resources are one level up. Never write
`resources/` without the `../` prefix.

**CDN variant.** If the sandbox script being removed (`sandbox.js` or
`sandbox2.js`) was loaded from an absolute CDN URL (e.g.
`src="https://ui5.sap.com/resources/sap/ushell/bootstrap/sandbox2.js"`),
detect the CDN origin (everything up to `/resources/`) and use it as
the prefix for `SandboxBootTask.js`:
```html
<script src="https://ui5.sap.com/resources/sap/ushell/sandbox/SandboxBootTask.js"></script>
```
The `sap-ui-core.js` src will already use the CDN origin — carry it
over unchanged. Do not mix local `../resources/` and CDN
`https://...` paths in the same HTML.

**Add to `<script id="sap-ui-bootstrap">` attributes** (if missing):
- `data-sap-ui-compat-version="edge"`
- `data-sap-ui-boot-manifest="sap/ushell/sandbox/sandboxManifest.json"`
- `data-sap-ui-async="true"`

**Rename attributes on `<script id="sap-ui-bootstrap">`:**
- `data-sap-ui-resourceroots` → `data-sap-ui-resource-roots` (camelCase
  to kebab-case)

**Keep as-is:**
- `data-sap-ui-libs` (carry over unchanged)
- `data-sap-ui-theme` (carry over unchanged)
- `data-sap-ui-language` (carry over unchanged)
- `data-sap-ui-resource-roots` values (just rename the attribute)
- `data-sap-ui-frameOptions` (carry over unchanged)

**Body / canvas invariant** (see
[`sandbox-config-surface.md` §7](sandbox-config-surface.md#7-boot-time-canvas-body)):

- Remove ANY `id=` attribute from the `<body>` tag (regardless of
  value: `content`, `canvas`, anything else).
- Ensure the body's first child is `<div id="canvas"></div>` — create
  it if absent. Replace any pre-existing `<div id="content">` with
  `<div id="canvas">`.

Rationale: New Sandbox mounts to `#canvas`. If `<body>` carries the
same id, the sandbox renders into the body element instead of the
inner div and breaks rendering.

**Resource-root merge across HTML variants.** When multiple legacy HTML
variants are merged into one target HTML (Wizard scenario), collect
`data-sap-ui-resource-roots` (or `data-sap-ui-resourceroots`) from
**every** source HTML and union all entries into the target. Do NOT
drop custom roots like `"rootFolder"`, `"localService"`, or other
non-App-namespace entries — `mockserver.js` and other modules may rely
on them via `jQuery.sap.getModulePath()` or `sap.ui.require.toUrl()`.
Dropping a custom root causes a silent 404 at runtime that is hard to
diagnose.

**Always add the `sandbox` resource root.** Add `"sandbox": "./sandbox"`
to the `data-sap-ui-resource-roots` value in every HTML variant, even
when no `beforeFlpStart` is currently configured — it costs nothing and
avoids a hard-to-debug 404 if `beforeFlpStart` is added later.

**Known limitation.** A single `fioriSandboxAppConfig.json` cannot
conditionally enable `beforeFlpStart` per HTML variant. A future
New Sandbox feature (URL-parameter-based conditional config) may
eliminate the need for separate HTML files entirely.

---

## §6b Build `fioriSandboxAppConfig.json`

**Source key.** New Sandbox honors only the keys listed in
[`sandbox-config-surface.md` §2](sandbox-config-surface.md#2-configuration-surface-what-the-sandbox-reads)
— emit none beyond that set.

**Build the JSON from the extracted `window["sap-ushell-config"]`** (parsed in §3).

**Tile-key splitting:**
- The application key (e.g. `"SemanticObject-action"`) splits on the
  **first** `-`: left part → `semanticObject`, right part → `action`.

**`rootPath` rules:**
- Comes from the application's `url` value (e.g. `"../"`).
- Strip any query string before writing `rootPath` (query params go
  into `parameters` — see below).
- **Always ensure `rootPath` ends with `/`** — append a trailing slash
  if missing (e.g. `"../my_app_path"` → `"../my_app_path/"`). Sandbox
  2.0 resolves `manifest.json` at `{rootPath}manifest.json`; a missing
  trailing slash produces a broken URL like
  `.../my_app_pathmanifest.json`.

**`rootIntent` rule:**
- Only set if `renderers.fiori2.componentData.config.rootIntent` was
  explicitly present in the legacy `window["sap-ushell-config"]`. Do
  NOT derive it from the first tile.
- If not set, omit the field entirely — the Shell default
  (`"Shell-home"`) remains active, which is required for NotFound
  routing and hash-change tests to work correctly.

**Wizard aggregation.** When the Wizard was used, aggregate tiles from
**all** legacy HTML variants — every `applications` entry across every
`flp*.html` file goes into the single `tiles` array. Deduplicate by
`semanticObject`+`action`: if the same key appears in multiple HTMLs,
use the entry from the wizard-selected target HTML (it is the
canonical source).

**Minimum tile shape:**
```json
{
    "tiles": [
        {
            "semanticObject": "<SemanticObject from application key>",
            "action": "<action from application key>",
            "rootPath": "<url value, stripped of query string, trailing slash ensured>"
        }
    ]
}
```

**URL parameters in tiles.** If the legacy application `url` contains
query parameters (e.g. `"url": "../?mode=edit"`), extract them into a
`parameters` object on the tile instead of keeping them in `rootPath`:
```json
{
    "semanticObject": "MyApp",
    "action": "edit",
    "rootPath": "../",
    "parameters": {
        "mode": "edit"
    }
}
```

**Add if mock server OR multi-scenario hook present:**
```json
"beforeFlpStart": "module:sandbox/<hookModuleNameWithoutExtension>"
```
The value must use the `module:` prefix and point to the `sandbox/`
subdirectory, e.g. `"module:sandbox/scenarioInit"` or
`"module:sandbox/mockServerInit"`. Do NOT use a plain module path like
`"acme/long/dotted/namespace/localService/mockserver"` — that is not a
valid `beforeFlpStart` value and will be silently ignored or cause a
runtime error.

**Add if RTA / fakeLrep present:**
```json
"rta": "<exact filename of fakeLrep.json / fakeLRep.json>"
```

**Add if custom plugins present** (excluding `RuntimeAuthoringPlugin`):
```json
"plugins": {
    "<PluginName>": {
        "component": "<component value>"
    }
}
```

**Write to:** `$APP_ROOT/webapp/test/fioriSandboxAppConfig.json`.

---

## §6c Create or rewrite hook module

The hook module backs `beforeFlpStart` and runs before
`applyUshellConfig`. Observe the contract in
[`sandbox-config-surface.md` §8](sandbox-config-surface.md#8-the-beforeflpstart-hook-contract)
— in particular: the hook must not touch `globalThis["sap-ushell-config"]`
and its static AMD dependency graph must not include any `sap/ushell/*`
module. Lazy `sap.ui.require([...], cb)` calls inside async paths are
technically permitted, but if the hook's returned Promise awaits such a
lazy require the load races with `applyUshellConfig` and can reproduce
H2 intermittently. The safest hook has no `sap/ushell/*` dependency at
all — see [`sandbox-config-surface.md` §8](sandbox-config-surface.md#8-the-beforeflpstart-hook-contract)
for the full rationale.

### Single-scenario (no Wizard)

Decide based on §3 classification:

- **No `*.js` in `sandbox/`** → create
  `$APP_ROOT/webapp/test/sandbox/mockServerInit.js`.
- **Only `legacy` modules found** → rewrite the legacy file in place
  (keep its filename). Prepend `preservedDeclarations[]` (captured in
  §3) above the `sap.ui.define` call.
- **A `modern` module found** → keep untouched. Ensure
  `beforeFlpStart` in the JSON points to it correctly.

The module imports the mock server via the **full app namespace path**
(dots → slashes from `sap.app.id`):

```javascript
// <preservedDeclarations[] go here, verbatim, when rewriting a legacy file>

sap.ui.define([
    "<app/namespace/with/slashes>/localService/mockserver"
], (server) => {
    "use strict";

    return {
        execute: server.init
    };
});
```

For `sap.app.id = "acme.long.dotted.namespace"` the import is
`"acme/long/dotted/namespace/localService/mockserver"`.

When rewriting a legacy file, namespace declarations like
`acme ??= {}; acme.foo ??= {};` MUST be preserved verbatim above the
`sap.ui.define(...)` block — other modules rely on those globals.

### Multi-scenario variant (Wizard was used)

Create `$APP_ROOT/webapp/test/sandbox/scenarioInit.js` with a
URL-parameter switch. `beforeFlpStart` must be
`"module:sandbox/scenarioInit"`.

The parameter name is `"scenario"` by default (see `SKILL.md` §4 for the
recommendation and the note on app-specific prefixes to avoid collisions).

Template — adapt imports, the `PARAM_NAME` constant, the `DEFAULT_SCENARIO`
constant, and the `if/else if` cases to the actual Wizard output:

```javascript
sap.ui.define([
    "<app/namespace/with/slashes>/localService/mockserver"
], (mockserver) => {
    "use strict";

    // PARAM_NAME: use the value agreed in the Wizard (default: "scenario").
    // For collision safety, a project-specific prefix is recommended, e.g.
    // "myAppScenario" — document in the migration guide / README.
    const PARAM_NAME = "scenario";

    // DEFAULT_SCENARIO: the scenario that runs when no URL param is present.
    // Wizard default recommendation: "mockserver" (works offline, no proxy).
    const DEFAULT_SCENARIO = "mockserver";

    return {
        execute: async () => {
            const scenario = new URLSearchParams(window.location.search).get(PARAM_NAME)
                ?? DEFAULT_SCENARIO;

            if (scenario === "mockserver") {
                await mockserver.init();
            }
            // Add further else-if branches for additional scenarios.
        }
    };
});
```

Use `if/else if` chains — not `switch/case`. Only import modules that
at least one scenario actually uses.

### When no scenario needs a mock server

Do NOT create a hook module and do NOT add `beforeFlpStart`. If the
app had legacy modules that only called `createRendererInternal`,
rewrite them to a minimal no-op so they no longer reference deprecated
APIs:

```javascript
sap.ui.define([], () => {
    "use strict";
    return { execute: () => {} };
});
```

Do NOT wire no-op modules via `beforeFlpStart`.

---

## §6c.1 Apps using sap-fe-mockserver (no beforeFlpStart needed)

**When this applies.** An app whose `ui5-mock.yaml` (or any `ui5*.yaml` in the app root)
configures `name: sap-fe-mockserver` under `server.customMiddleware` runs its mock server
at the HTTP layer — it intercepts OData requests server-side before they reach the browser.
There is no `localService/mockserver.js` and no client-side initialization code.

**Detection.** During §3 analysis, scan all `ui5*.yaml` files in `$APP_ROOT` for entries
matching:

```yaml
customMiddleware:
  - name: sap-fe-mockserver
```

or the older form `name: "@sap-ux/ui5-middleware-fe-mockserver"`. If found, set
`hasFeMockserver: true` on the app inventory.

**Effect on §6c.** When `hasFeMockserver: true`:
- Do NOT create `webapp/test/sandbox/mockServerInit.js`.
- Do NOT add `beforeFlpStart` to `fioriSandboxAppConfig.json`.
- Emit a Gap-Report info entry:
  > "App uses `sap-fe-mockserver` middleware (server-side mock). No `beforeFlpStart`
  > hook is needed — the mockserver runs at HTTP level and is independent of the New
  > Sandbox bootstrap. The `webapp/test/sandbox/` directory will not be created."

**Why this matters.** Developers unfamiliar with the distinction between client-side and
server-side mocks may expect a `sandbox/` directory after migration. The Gap-Report entry
ensures they understand the absence of `beforeFlpStart` is correct, not a skill omission.

**The `npm run start-mock` command** (if present) still works after migration: it starts
the `sap-fe-mockserver` middleware via Fiori Tools and serves `flpSandbox.html` from disk
— no New Sandbox configuration changes are required for it.

---

## §6d Rebind OPA resource roots

If §3 found an OPA test runner HTML (default location
`webapp/test/integration/opaTests.qunit.html`) with a
`data-sap-ui-resource-roots` entry pointing at the legacy mockserver
HTML (e.g. `"my.app": "../flpSandboxMockServer"`), rewrite that single
value to point at the migrated target HTML.

**Rule:**
- Read the file's `data-sap-ui-resource-roots` attribute (a JSON-ish
  object).
- For any value matching `"../flpSandboxMockServer"` (no `.html`
  extension, possibly with a trailing path segment), rewrite the value
  to `"../flpSandbox"` — or, when the wizard chose a different target
  HTML, that file's basename without extension.
- All other entries in the resource-roots object stay untouched.

**Idempotency:** if the value already points at the migrated target
(e.g. `"../flpSandbox"`), do not modify the file.

**Skip silently** if the file does not exist or the attribute does not
contain a legacy entry.

---

## §6e Inject scenario URL parameter into Common.js

If §3 detected an OPA Common-helper file (default location
`webapp/test/integration/pages/Common.js`, fallback per §3) and the
Wizard consolidated multiple HTMLs, inject the scenario URL parameter
into the iframe URL builder.

**Rule:**
- Locate the URL-build expression. Heuristic:
  `var sUrl = sap.ui.require.toUrl(...) + ".html"` or any assignment
  to a variable that subsequently gets a hash fragment appended.
- Inject the scenario parameter **before the `#` hash fragment is
  appended** to `sUrl`. URL query parameters after the `#` are not
  accessible via `window.location.search` — the mockserver would never
  initialize if the param is placed after the hash.
- Find the line `sUrl += "#..."` (or equivalent) and insert the
  injection ABOVE it, using the `PARAM_NAME` and `DEFAULT_SCENARIO`
  values from the Wizard output (see `SKILL.md` §4):
  ```js
  // PARAM_NAME = value chosen in Wizard (default: "scenario")
  // DEFAULT_SCENARIO = default scenario id (default: "mockserver")
  if (!sUrl.includes("<PARAM_NAME>=")) {
      sUrl += (sUrl.includes("?") ? "&" : "?") + "<PARAM_NAME>=<DEFAULT_SCENARIO>";
  }
  sUrl += "#...";   // hash line stays here, unchanged
  ```
  The injected value is the default scenario so that OPA tests run
  against the expected scenario without a manual URL parameter.
- **Critical:** use `sUrl.includes("?") ? "&" : "?"` so the separator
  is correct regardless of whether other query params were already
  added.

**Idempotency:** skip if the file already mentions `<PARAM_NAME>=` (using
the actual param name from the Wizard, not the literal `<PARAM_NAME>`).

**Failure path:** if the candidate file is found but the URL-build
pattern cannot be reliably identified (no recognisable `sUrl`
variable), do NOT modify — emit a Gap-Report entry:
> "Common.js detected but URL-build pattern unclear. Apply manually:"
> followed by the snippet.

**Skip silently** if no candidate file is found at all (info entry in
Gap-Report).

---

## §6f Resolve hook-graph ushell dependencies

Run AFTER §6a–§6e have produced the migrated hook. This step walks the
`beforeFlpStart` transitive AMD graph, classifies each `sap/ushell/*`
hit, and either auto-rewrites it (trivial-replaceable) or emits a
Gap-Report entry with a concrete suggestion.

The architectural rationale lives in
[`sandbox-config-surface.md` §1 H2 + §8](sandbox-config-surface.md#1-hard-runtime-blocks)
— eager `sap/ushell/*` imports anywhere in the hook-graph cause
`applyUshellConfig` to throw at runtime. The auto-fix registry lives
in [`native-replacements.md`](native-replacements.md); §6f may
auto-apply ONLY entries listed there.

**Algorithm:**

1. **Build closure** starting from `hookEntryModule` (§3a):
   - Parse the file with regex
     `sap\.ui\.define\(\s*\[([\s\S]*?)\]` and
     `sap\.ui\.require\(\s*\[([\s\S]*?)\]`. Extract every quoted
     string in each array.
   - Resolve each dep to a `webapp/...` path using
     `data-sap-ui-resource-roots` (captured in §3) plus the `sandbox`
     root added in §6a.
   - Do NOT recurse into framework namespaces: `sap/ushell/*`,
     `sap/m/*`, `sap/ui/core/*`, `sap/ui/util/*`, `sap/base/*`,
     `jquery.sap.*`. These are framework, not app code — but
     `sap/ushell/*` deps are still **recorded as hits**.
   - Recurse on each resolved app-local dep. Track a visited set to
     terminate cycles.

2. **Collect ushell hits.** For every dep string matching
   `^sap/ushell/`, record:
   ```
   {
     moduleFile:   "webapp/localService/mockrequests/search.js",
     importString: "sap/ushell/services/URLParsing",
     factoryParam: "URLParsing",
     callSites:    ["URLParsing.parseParameters(...)"]
   }
   ```
   `callSites` are found by grepping the file for the bound symbol
   used as member access (`<param>.<method>`). Best-effort —
   incomplete grep is acceptable as long as it's flagged in the
   report.

3. **Classify each hit:**
   - **trivial-replaceable** — `importString` exists in
     `native-replacements.md` AND every call site uses a method
     covered by the entry. Action: auto-apply the recipe.
   - **architectural-relocatable** — not in registry, but every call
     site is inside an async path (heuristic: enclosed in
     `function (` body that is itself an event handler / `attachAfter`
     / `attach...` / `setTimeout` / `Promise.then` / similar
     callback). Action: gap-report with relocation diff.
   - **manual-required** — not in registry, AND at least one call
     site is at module load time (heuristic: appears outside any
     inner `function (` body, evaluated when the factory runs).
     Action: gap-report with textual sketch only. Conservative
     default: if classification is ambiguous, choose
     `manual-required` — never auto-apply.

4. **Apply the recipe (trivial-replaceable only):**
   - Use the recipe from `native-replacements.md`.
   - Constraints:
     - May only edit files reachable in the hook graph.
     - May only delete dep entries listed in
       `native-replacements.md`.
     - May only insert helper functions named in the recipe.
     - Idempotent: skip if `importString` is already absent from the
       dep array.
   - Failure path: if the recipe regex cannot match a call site, do
     NOT mutate the file. Demote the hit to gap-report-with-diff and
     continue.

5. **Emit gap-report entries** for non-trivial hits:
   - **architectural-relocatable** — produce a unified diff sketch
     showing how to move the import into a lazy
     `sap.ui.require([...], cb)` inside the async path. Example for
     `URLParsing` used inside `attachAfter`:
     ```
     - sap.ui.define(["sap/ui/core/util/MockServer", "sap/ushell/services/URLParsing"], function (MockServer, URLParsing) {
     + sap.ui.define(["sap/ui/core/util/MockServer"], function (MockServer) {
           ...
           oMockServer.attachAfter(GET, function (oEvent) {
     +         sap.ui.require(["sap/ushell/services/URLParsing"], function (URLParsing) {
                  var params = URLParsing.parseParameters(...);
                  ...
     +         });
           });
     ```
     Suggestion only — never applied automatically.
   - **manual-required** — produce a textual sketch describing what
     needs to change and why. Example:
     > "`sap/ushell/services/Container` used at module load time in
     > `webapp/...`. Manual rewrite required: refactor to consume
     > Container only inside an event handler or async path; consider
     > using `sap.ushell.Container.getServiceAsync('Navigation')` from
     > inside a lazy require block."

6. **Output to §8 report:** counts by classification + per-module
   summary.

**Unparseable modules:** if AMD parsing fails for a module (dynamic
deps, computed paths, malformed code), emit an info entry: "Hook-graph
scan: `<module>` not statically analyzable — review manually." Do not
block migration.

---

## §6g Extract OPA bootstrap into a sibling JS file

Triggered when §3 detected an OPA test-page (the HTML matches the
"OPA test-page (does not get SandboxBootTask/boot-manifest)" criteria
in §3).

Extract the inline `<script>` block content into a sibling `.js` file
next to the OPA test HTML. The default name is `AllJourneys.js` (a SAP
Fiori convention widely used in the unified.shell ecosystem); pick a
different name only if a file with that name already exists in the
target directory and would be overwritten — in that case append a
numeric suffix and emit a Gap-Report note. The HTML's
`<script src=...>` reference must point at whichever name the file
was given.

**Conversion rules applied during extraction:**
- `jQuery.sap.getUriParameters().mParams` →
  `new URLSearchParams(window.location.search)`
- Journey param detection (e.g. `mParams[0].indexOf("journey") > -1`)
  → `new URLSearchParams(...).get("journey")`
- `window.QUnit = { config: { autostart: false } }` →
  `QUnit.config.autostart = false;` at top of file
- `sap.ui.require([..., "qunit-css", "qunit", "qunit-junit", ...], function () { ... })`
  → remove; QUnit is now loaded as direct script tags
- The inner
  `sap.ui.getCore().attachInit(function () { sap.ui.require(allPages, ...) })`
  block → becomes the body of the extracted file
- Any inner
  `sap.ui.require(["sap/ui/test/Opa5"], function (Opa5) { QUnit.start(); })`
  wrapper → collapse to a direct `QUnit.start()` call (Opa5 is already
  available when tests load; no lazy require needed)
- The extracted file MUST NOT contain any `sap.ui.require(` call —
  all module loading is done via `<script>` tags in the HTML

**Test-suite URL rewrite.** If a QUnit test suite index file is
present (default location `webapp/test/testsuite.qunit.html`; the SAP
Fiori convention) and references journey runner pages by the legacy
URL pattern `<file>.qunit.html?integration.journeys.<X>`, rewrite the
references to the URLSearchParams-friendly form
`<file>.qunit.html?journey=integration/journeys/<X>`. Skip silently
when the file is absent or the legacy pattern is not found.

---

## §6h Detect bindings to legacy ushell-config values

Identify code that hard-codes values which were free-form in the
legacy `window["sap-ushell-config"]` but are now derived from a
different source (or fixed entirely) under New Sandbox. Auto-fix the
safe, mechanical cases; report everything else.

**Why this matters.** A migrated app boots cleanly under New Sandbox
even when this rule does nothing — the consequence is a *test failure
or runtime mismatch later*, not a boot crash. The rule still runs
because the underlying source change is mandatory: once the legacy
`window["sap-ushell-config"]` write path is gone (Hard Constraint H1
in [`sandbox-config-surface.md` §1](sandbox-config-surface.md#1-hard-runtime-blocks)),
the values the app code sees at runtime can change. App and test code
that compared against the old values will silently observe the new
ones.

**Source of truth.** The set of values whose runtime source moved or
became fixed is enumerated in
[`sandbox-config-surface.md` §3 + §4](sandbox-config-surface.md#3-values-whose-runtime-source-moved).
This subsection is the operational mapping from those entries to
detection-and-rewrite rules. When the surface document gains a new
row, this subsection should grow a corresponding rule.

**When to run.** After §6a–§6c have produced the migrated HTML, JSON,
and hook module — i.e. after the legacy ushell-config has been parsed
and is available as a structured object.

### 6h.1 Build the diff between legacy ushell-config and New Sandbox actuals

For each value in the legacy config (parsed in §3), determine whether
the new runtime source agrees. Walk the categories below.

**Category A: tile-derived values.** For each application entry in
`applications[<key>]` whose `url` resolves to the current app
(`./`, `../`, or any path that maps back into `$APP_ROOT/webapp/`),
load the local `manifest.json`:

| Legacy field | Compare to | Action on mismatch |
|--------------|-----------|--------------------|
| `applications[<key>].title` | `manifest.json sap.app.title` | Auto-fix (see 6h.2) |
| `applications[<key>].subTitle` | `manifest.json sap.app.description` | Auto-fix |
| `applications[<key>].icon` | `manifest.json sap.ui.icons.icon` | Auto-fix |

For applications whose `url` points outside the local webapp
(cross-app tiles), do NOT attempt to load the foreign manifest. Emit a
Gap-Report entry instead:
> "Cross-app tile `<key>` references an app at `<url>` that is not
> part of this repository. If any test or app code compares against
> its legacy `<field>` value `<old>`, it will need a manual update."

**Category B: user-profile values — strict mode.** Only proceed if the
legacy ushell-config explicitly overrode user-profile defaults. The
path of interest is

```
services.Container.adapter.config.userProfile.defaults.<field>
```

If the legacy config does not set this path at all, *skip Category B
entirely* — apps that never customized user defaults can only have
coded against UI5 defaults, which are unaffected.

If at least one field is present in the legacy config, build a rename
map `{<field>: {legacyValue, sandboxValue}}` per the table in
[`sandbox-config-surface.md` §4.1](sandbox-config-surface.md#41-user-profile)
(`email` → `john.doe@sap.com`, `firstName` → `John`, etc.). Skip
entries where `legacyValue === sandboxValue` (no observable change).

**Category C: editable-properties / personalization values.** Same
strict mode: only build a rename map if the legacy config overrode
`userProfilePersonalization.<field>`.

**Category D: other fixed-by-default values** (renderer config, theme
list, spaces mode — see
[`sandbox-config-surface.md` §4.3–§4.5](sandbox-config-surface.md#43-renderer-configuration)).
Auto-fix is too risky because these values rarely appear as literal
strings in app code. If the legacy config touched them, emit a
Gap-Report entry with the legacy and sandbox values, leave the code
alone.

If all four categories yield empty rename maps, this subsection is a
no-op — skip silently.

### 6h.2 Apply mechanical rewrites (auto-fix)

For each `{field, legacyValue, sandboxValue}` entry, scan the app for
literal-string matches that are unambiguously bindings to *this*
field. The detection patterns below are conservative on purpose: they
only fire when the surrounding context is a known-shape getter or
matcher, never on a bare string equality.

**Tile-derived (Category A) detection patterns.** Scope:
`$APP_ROOT/webapp/test/integration/` recursively, `.js` files only.

- *Functional matcher comparing a tile getter:*
  `<getterName>\(\)\s*===\s*"<legacyValue>"` →
  `<getterName>() === "<sandboxValue>"`. Also match `==` and the
  single-quoted variant. The `<getterName>` mapping per field:
  - `title` → `getHeader`
  - `subTitle` → `getSubheader`
  - `icon` → `getIcon`
- *Property matcher (`PropertyStrictEquals` constructor or plain
  matcher object):* match a constructor call across newlines that
  contains `name:\s*"<propName>"` AND `value:\s*"<legacyValue>"`.
  Replace only the `value` string. The `<propName>` mapping per
  field:
  - `title` → `header`
  - `subTitle` → `subheader`
  - `icon` → `icon`

**User-profile (Category B) detection patterns.** Scope: all `.js`
under `$APP_ROOT/webapp/` (excluding `webapp/test/unit/`,
`resources/`, `*.min.js`).

The legacy `sap.ushell.Container.getUser()` returns an `sap/ushell/User`
instance with a getter per profile field. For each `<field>` in the
rename map:

- `<userVar>\.get(?:Email|FirstName|LastName|FullName|Id|Language|LanguageBcp47|SapDateFormat|SapTimeFormat|TimeZone|NumberFormat|Rtl)\(\)\s*===\s*"<legacyValue>"`
  — restrict the matched getter name to the one corresponding to
  `<field>` (mapping is direct: `email` → `getEmail`, `firstName` →
  `getFirstName`, etc.). Replace `legacyValue` → `sandboxValue`.

**Conservative limits — do NOT replace:**
- Strings inside line comments (`//`) or block comments
  (`/* … */`).
- Strings that look like part of a longer literal — use
  `\b<legacyValue>\b` boundaries inside the value match.
- Any occurrence outside the scope listed for the category above.
- Any context that does not match one of the explicit patterns. When
  in doubt, the rule defers to 6h.3 (report, don't rewrite).

**Quote preservation.** Match the original quote style (single or
double) and re-emit the same style. Do not normalize.

**Idempotency.** Re-running the rule on already-migrated code matches
nothing, modifies nothing.

### 6h.3 Report unsafe and ambiguous cases

Every entry in the rename maps that has not been auto-fixed produces a
Gap-Report line with: legacy field, legacy value, new value (or
"fixed default"), files where the legacy value appears as a literal
string but not in a recognised pattern. The consumer then decides
whether to follow up manually.

### 6h.4 Report counters

Per file, log:
> `Legacy ushell-config binding rewrite: <file> — N replacements (A: ?, B: ?, C: ?, D: ?)`

Aggregate into the §8 report.

---

## §6i QUnit 1.x → 2.x detection (handoff)

**Scope.** Every `.js` file under `$APP_ROOT/webapp/test/integration/`
(recursive).

**Detection patterns.** Match any of:

- A line of shape `^\s*module\(` outside any inner function body.
- A bare assertion identifier (`ok(`, `equal(`, `strictEqual(`,
  `notEqual(`, `notStrictEqual(`, `deepEqual(`, `notDeepEqual(`,
  `propEqual(`, `notPropEqual(`, `throws(`) preceded by NOT a word
  character / dot / quote — i.e. the regex
  `(?<![\w."'])<assertName>\(`.
- The direct-call form `QUnit.<assertName>(` for any name from the
  list above.

If at least one pattern hits, record per-file counts.

**Action.** If the rename map is empty: skip silently. Otherwise:

- In an interactive run, ask the consumer:
  > "Found `<N>` QUnit 1.x patterns across `<M>` files. Run
  > `/nsbx-qunit-modernize` against this app to rewrite them?"

  On consent, invoke the sub-skill with `$APP_ROOT` as its argument
  and roll the sub-skill's per-file replacement counts into this
  skill's §8 report.
- In a non-interactive run (test mode, scripted invocation), do NOT
  apply the rewrite. Emit a Gap-Report entry per file with the matched
  counts:
  > "`<file>`: `<N>` QUnit 1.x patterns. Run
  > `/nsbx-qunit-modernize` to rewrite."

**Cross-reference.** §6g extracts the inline OPA bootstrap block out
of the OPA test HTML. That is a structural edit on the HTML; this
subsection is a sweep over the journey/page modules. The two operate
on different files and are independent.

---

## §6j FLP shell-control awareness (reporting)

Detect OPA test code that targets FLP shell controls directly and
surface concrete fix suggestions in the §8 report. Never rewrite test
logic without consumer consent.

**Scope.** Only OPA test code that interacts directly with the shell.
Tests that exercise the app's own controls — even when the app runs
inside the shell — are unaffected. The detection patterns below are
chosen so app-control assertions never match.

### 6j.1 Detection patterns

Scan every `.js` file under `$APP_ROOT/webapp/test/integration/`
(recursive). For each file, count matches of any of the patterns
below.

**Pattern S1 — match by `sap.m` control + shell-only id.** The shell
exposes a small set of stable identifiers: `backBtn`, `homeBtn`,
`logoutBtn`, `aboutBtn`, `userActionsMenuHeaderButton`,
`userSettingsBtn`, `recentActivitiesBtn`, `frequentActivitiesBtn`,
`ContactSupportBtn`, `ActionModeBtn`, `endItemsOverflowBtn`,
`productSwitchBtn`, `NotificationsCountButton`, `openCatalogBtn`,
`sideMenuExpandCollapseBtn`, `shell-header`. If a `waitFor({...})`
block names `controlType: "sap.m.<X>"` *and* matches one of these ids
(by `id:` property or by
`PropertyStrictEquals name:"id" value:"<id>"`), flag it. Do not match
id values that are not in the shell list — these are app controls.

**Pattern S2 — match by `type: "Back"` matcher.** A `waitFor`
containing `PropertyStrictEquals` (or a plain matcher object) with
`name:"type"` and `value:"Back"` resolves to the shell back button
when no `id` is given. The match is brittle even today (a non-shell
back button would accidentally match too), and likely to break under
WebComponent shell because the back-button control type changes. Flag
it.

**Pattern S3 — non-WebComponent calls on the shell header.** Any of:
- `<receiver>.getHeadItems()` — the WebComponent header is a
  `ComponentContainer` and does not expose this getter.
- `<receiver>.$("icon").click()` — the WebComponent shell does not
  render the logo as a `<img>` inside the header element.

For each match, capture file path, line number, control id (or
`null` if matched by type), and the exact text of the offending
statement.

### 6j.2 Report

For every match, emit a §8 Gap-Report entry. The entry names the
file, the pattern (S1 / S2 / S3), and a concrete suggested rewrite
the consumer can apply manually.

Suggested rewrites — included as code sketches only, not applied
automatically:

- **S1 (id already named):** the test is likely fine as long as the
  shell preserves the id across renderers. Flag it as "verify that
  the id `<id>` still resolves under the migrated shell". No code
  change needed in the common case.
- **S2:** advise adding `id: "backBtn"` (or the matching shell id)
  alongside the existing `controlType + type:"Back"` matcher. Opa5
  short-circuits on the id when present, so the existing matcher
  stays as a fallback for the classic shell.
  ```diff
   waitFor({
  +    id: "backBtn",
       controlType: "sap.m.Button",
       matchers: new PropertyStrictEquals({ name: "type", value: "Back" }),
       ...
   })
  ```
- **S3 / `getHeadItems`:** the head-items concept is shell-internal
  and has no public WebComponent equivalent. If the assertion still
  matters, re-express it via the affected app behavior; otherwise
  drop it. The skill cannot decide which is correct, so it never
  deletes the line.
- **S3 / icon-click home-navigation:** the iframe-safe,
  renderer-agnostic substitute is a direct URL hash assignment
  `Opa5.getWindow().location.hash = "#Shell-home";`. Suggest it as a
  replacement; do not apply automatically.

  *(This recommendation is for OPA test code that sets the browser
  URL directly. It is unrelated to the `nsbx-deprecated-services-migrate`
  recommendation that `Navigation.navigate({ target: { shellHash: "#" } })`
  should use `"#"` rather than `"#Shell-home"` as the navigate
  argument — that is a different API surface.)*

**Counter:** the §8 report carries a single line:
> `Shell-control test patterns flagged: <N> in <M> files (S1: ?, S2: ?, S3: ?)`

### 6j.3 No auto-rewrite

This subsection never modifies test files. The decision to rewrite —
and the choice of replacement — is the consumer's. The skill's
contribution is the inventory plus suggestions.

---

## §6k Deprecated ushell-services detection (handoff)

**Detection.** Scan all `.js` files under `$APP_ROOT/webapp/`
excluding `webapp/test/`, `resources/`, and `*.min.js`. The 12-name
allow-list is in
[`sandbox-config-surface.md` §5](sandbox-config-surface.md#5-deprecated-services)
and is kept in lock-step with that table. The detection regex is
documented there as the informational form; this step computes it
from the table at run time.

For each match, record file path, line, service name, and (where
present) the variable bound to the resolved service.

**Action.** If the detection set is empty, skip silently. Otherwise:

- In an interactive run, present the consumer with a per-service file
  list and ask:
  > "Found `<N>` calls to `<M>` deprecated ushell services across
  > `<K>` files. Run `/nsbx-deprecated-services-migrate` against this
  > app? (You can also limit the scope to specific services.)"

  On consent, invoke the sub-skill with `$APP_ROOT` (and optional
  service-name filter) as arguments and roll the sub-skill's per-file
  replacement counts into this skill's §8 report.

- In a non-interactive run (test mode, scripted invocation), do NOT
  apply the rewrite. Emit a Gap-Report entry per file listing every
  service name found and the canonical successor (or "no successor —
  remove" for Group C services). The migration as a whole still
  succeeds — the main skill only fails the migration if the *core*
  layer hits a hard block. App code that calls a deprecated service
  will fail at runtime when the consumer first opens the app, which
  is the right error surface for a follow-up the consumer must
  consciously approve.

**Cross-reference.** The test-side counterpart (deprecated-service
calls in `webapp/test/`) is out of scope here. Test code that compares
shell behavior against legacy expectations is covered by §6l (signal
b) and §6h (legacy ushell-config bindings).

---

## §6l FLP-shell-feature tests (detection + ask)

Detect journey tests whose behavior depends on the surrounding FLP
shell, surface the list to the consumer, and — only if a recognised
iframe-toggle pattern is present in the app — offer to apply it.
Never modify a test without consent.

**Why detection + ask, not auto-fix.** The opt-in mechanism is not
part of the New Sandbox contract. Different apps express it
differently:

- An `iStartMyApp({ startMyAppInAFrame: true })` flag handled in the
  app's own page-object code (the most common pattern in the
  unified.shell ecosystem).
- A `Common.js` helper that builds an iframe URL and starts an OPA
  iframe via `iStartMyAppInAFrame(<url>)`.
- A bespoke harness that the app maintains itself.
- No iframe support at all — the app may have decided to keep all
  shell-feature tests out of OPA and verify them manually.

The skill cannot guess which case applies. It identifies *which tests
need iframe mode* (the part that is truly Sandbox-2.0-specific) and
delegates the *how* to the consumer.

### 6l.1 Identify shell-feature tests

For every `.js` file under
`$APP_ROOT/webapp/test/integration/journeys/` parse top-level
`opaTest("...", function (Given, When, Then) { ... })` blocks
(brace-balanced scan from the opening `{` of the test body to its
matching close). Per block, mark it as *shell-feature-dependent* if
its body contains at least one of the shell-feature signals below.

**Shell-feature signals.** Drawn from §6j.1 (shell-control patterns)
and §6k (deprecated-services list); both already enumerate the
shell-side surface.

- **(a) Shell-control selectors.** Any `waitFor` whose `id`,
  `controlType + type:"Back"`, or matcher string targets a shell id
  from the catalog in §6j.1 or matches §6j's S2/S3 patterns.
- **(b) Calls into shell-only services.** Any `getServiceAsync(<X>)`
  / `getService(<X>)` inside the test body where `<X>` is one of the
  12 deprecated services from
  [`sandbox-config-surface.md` §5](sandbox-config-surface.md#5-deprecated-services)
  *or* one of their successors (`Navigation`, `BookmarkV2`, etc. —
  the successor service requires the shell at runtime just as much
  as the deprecated one did).
- **(c) Convention-named page-object methods.** A best-effort
  heuristic on widely-used SAP Fiori page-object names that imply
  shell interaction. The exact list is not authoritative — only
  treat a match here as *one* of multiple possible signals, never
  as the sole evidence:
  - `theBookmarkButtonIsVisible(`, `iAddABookmark(`,
    `iPressTheHomeButton(`
  - `navigateToAppEntity(` or any method whose name contains
    `crossAppNavigate` or `navigateExternal`

A test that triggers only signal (c) and nothing from (a) or (b) is
*possibly* shell-dependent — flag with lower confidence.

### 6l.2 Probe the app for an iframe-toggle pattern

If at least one test was flagged, look for a recognised opt-in
mechanism inside `$APP_ROOT/webapp/test/`. The probes:

- **Probe P1 — `startMyAppInAFrame` flag:** any existing
  `iStartMyApp({...})` call already containing
  `startMyAppInAFrame:`. If found, record the page-object file, the
  variable name of the start helper, and a representative usage.
- **Probe P2 — `iStartMyAppInAFrame` helper:** any function
  definition named `iStartMyAppInAFrame` (typically in
  `pages/Common.js`).
- **Probe P3 — bespoke iframe URL builder:** a function whose body
  contains both `sap.ui.require.toUrl(` and an explicit `.html` URL
  construction with iframe-related Opa5 calls.

### 6l.2 Probe the app for an iframe-toggle pattern

If at least one test was flagged, look for a recognised opt-in
mechanism inside `$APP_ROOT/webapp/test/`. The probes:

- **Probe P1 — `startMyAppInAFrame` flag:** any existing
  `iStartMyApp({...})` call already containing
  `startMyAppInAFrame:`. If found, record the page-object file, the
  variable name of the start helper, and a representative usage.
- **Probe P2 — `iStartMyAppInAFrame` helper:** any function
  definition named `iStartMyAppInAFrame` (typically in
  `pages/Common.js`).
- **Probe P3 — bespoke iframe URL builder:** a function whose body
  contains both `sap.ui.require.toUrl(` and an explicit `.html` URL
  construction with iframe-related Opa5 calls.

Record which probes hit. If none hit, the app does not appear to
have a mechanism in place; the rule reports the test list and stops
there.

**For each flagged test, also check whether it already uses the
discovered iframe pattern** (idempotency check):

- P1: the `iStartMyApp({...})` call in that test block already contains
  `startMyAppInAFrame: true`.
- P2/P3: the test block calls the discovered helper function instead of
  the regular start helper.

Partition the flagged tests into:
- `alreadyInIframe[]` — use the pattern already; no action needed.
- `needsIframe[]` — do not yet use the pattern; action needed.

### 6l.3 Ask the consumer

**If `needsIframe` is empty** (all flagged tests already use the iframe
pattern): do NOT ask the consumer anything. Emit only a §8 report entry:

> "Found `<N>` shell-feature tests — all already run in iframe mode.
> No changes needed."

Skip to §6l.4.

**If `needsIframe` is non-empty** and a probe was found, ask:

> "Found `<N>` OPA tests in `<M>` files that interact with the FLP shell
> (e.g. shell controls like `backBtn`, or cross-app navigation). These
> tests need to run inside an FLP iframe to work correctly after the
> sandbox migration.
>
> `<X>` of these tests do not yet use the iframe start pattern
> (`<probe-name>`). Apply it now? (You can also accept per-file or skip.)"

**If `needsIframe` is non-empty** and no probe was found:

> "Found `<N>` OPA tests in `<M>` files that interact with the FLP shell.
> These tests need to run inside an FLP iframe, but the app does not
> appear to have an iframe-start pattern yet. Review manually — see Gap-Report."

Apply the pattern only on consent, to `needsIframe[]` tests only. The
applicator is recipe-specific: for P1 it inserts `startMyAppInAFrame: true`
as the first property of `iStartMyApp({...})` on each flagged block; for
P2/P3 it rewrites the flagged blocks to call the discovered helper instead
of the regular start helper.

### 6l.4 Report

The §8 report carries the inventory regardless of consumer decision:

```
FLP-shell-feature tests detected: <N> in <M> files
  Strong signals (a/b): <X>
  Heuristic signal (c only): <Y>
  Already in iframe mode: <alreadyInIframe count>
  Need iframe mode:       <needsIframe count>
  Iframe-toggle pattern detected: <probe-name | none>
  Consumer decision: applied <Z> | declined | skipped | not prompted (all already in iframe)
```
