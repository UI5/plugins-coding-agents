---
name: modernize-test-starter
description: |
  Modernize QUnit unit tests and OPA5 integration tests to the UI5 Test Starter concept.
  Use this skill when:
  - The linter reports `prefer-test-starter` for *.qunit.html or *.qunit.js files
  - Test HTML files use manual sap-ui-core.js bootstrapping instead of Test Starter's runTest.js/createSuite.js
  - Test JS files use Core.ready(), Core.attachInit(), or jsUnitTestSuite instead of sap.ui.define
  - OPA test HTML files exist with per-test Opa5.extendConfig and manual bootstrapping
  - An AllJourneys.js orchestrator loads OPA journeys dynamically
  - OPA journeys call `iStartMyUIComponent` (in-window component launcher) instead of `iStartMyAppInAFrame` — skill migrates to a bare-Component iframe in Phase 5b
  - User asks to modernize tests, modernize test infrastructure, or adopt Test Starter
  Handles both unit tests (Core.ready removal, sap.ui.define wrapping) and OPA-specific challenges
  (page-object side-effect imports, Opa5 config, journey orchestration, QUnit 1.x assert modernization,
  in-window-to-iframe launcher migration).
  Trigger on: prefer-test-starter linter warnings, test modernization requests, "test runner" modernization,
  iStartMyUIComponent in-window OPA launchers.
---

# Modernize to Test Starter

This skill modernizes a UI5 project's entire test infrastructure — both unit tests and OPA5 integration tests — to the [Test Starter concept](https://ui5.sap.com/#/topic/032be2cb2e1d4115af20862673bedcdb).

Reference: [Blog post: Simplify Your Test Setup](https://community.sap.com/t5/technology-blog-posts-by-sap/simplify-your-test-setup-introducing-the-test-starter-concept-for-your-ui5/ba-p/14303076)

## Why Modernize

The Test Starter replaces per-test HTML bootstrapping with a single generic test page and a declarative `testsuite.qunit.js` configuration. Benefits:
- Eliminates boilerplate HTML/JS code
- Handles QUnit, Sinon, and coverage setup automatically
- Ensures CSP compliance (no inline scripts)
- Provides consistent test configuration across all tests
- Enables per-test isolation and parallel execution

## NEVER Skip Test Starter Modernization

OPA5 test HTML files are ALWAYS convertible. They follow a mechanical pattern:
bootstrap → require utils → extendConfig → require test modules → QUnit.start().

**Common "excuses" that are INVALID reasons to skip:**
- "Complex mock server setup" → Mocks live in a SEPARATE host file (e.g., `test*.html`), NOT in the entry point HTML files. The host file stays unchanged.
- "sap.ui.define monkey-patching" → Same: lives in the host, not the entry points.
- "FLP sandbox bootstrap" → Same: lives in the host, not the entry points.
- "125+ files is too many" → They're mechanical. Batch-process them.
- "Custom service implementations" → Loaded by the host, not by entry points. Entry points just declare a resource root pointing to the host.
- "Too complex" or "too many hurdles" → INVALID. This modernization has been done successfully on projects of this scale before.

### Test Driver vs Test Host Distinction

| Type | Example | Contains | Action |
|------|---------|----------|--------|
| Test Driver | `opa/<Area>/<SubArea>/<TestName>.qunit.html` | Opa5 config + test module requires | **CONVERT** to Test Starter |
| Test Host | `test<ServiceName>.html` | Mock servers, ushell config, monkey-patching | **KEEP AS-IS** |
| Test Suite | `testsuite.qunit.html` | Manual addTestPage() list | **REPLACE** with testsuite.qunit.js |
| Dev Sandbox | `flpSandbox.html` | Developer tool, not a test | **IGNORE** |

The test host HTML (e.g., `test<ServiceName>.html`) is NOT an entry point — it is the application-under-test started inside an iframe by the OPA initializer's `iStartMyApp()`. Do NOT attempt to convert the host file. Only convert the test DRIVER HTML files.

### What Actually Blocks (vs What Doesn't)

The only real technical challenge: OPA5 entry points may use `jQuery.sap.require()` (deprecated) for QUnit bootstrap libs. The shared `OpaSetup.js` needs to replace these with `sap.ui.require` equivalents — or note that QUnit/qunit-css are loaded via Test Starter config automatically and can simply be removed.

Everything else is mechanical transformation. Do NOT refuse or defer this modernization.

## Pre-requisites

Read the project's `manifest.json` to get `sap.app/id`. This is your namespace:
- **`<NAMESPACE>`** — dots replaced by slashes (e.g., `my.app` → `my/app`)
- **`<NAMESPACE-WITH-DOTS>`** — raw value with dots (e.g., `my.app`)

## Phase 0: Detection

Scan the project to classify what exists before making changes.

### 0.1 Check for unit tests

Look for a `webapp/test/unit/` directory containing `unitTests.qunit.html`, `unitTests.qunit.js`, `allTests.js`, `AllTests.js`, or `allTests.qunit.js`. Identify **all legacy aggregator files** — these are JS files whose only purpose is to load other test modules via `sap.ui.require` or `sap.ui.define` dependencies, with no actual QUnit test logic (no `QUnit.module`, `QUnit.test`, or `assert.*` calls). Common names include `allTests.js`, `AllTests.js`, `legacyTests.qunit.js`, but ANY file matching this pattern is a legacy aggregator. Their contents will be inlined into `unitTests.qunit.js` and the files deleted.

### 0.2 Classify the OPA launcher (iframe vs in-window) and FLP sandbox presence

Phase 5b (bare-Component iframe migration) is gated on **two** signals, not one:

1. The OPA app-launcher shape — `iStartMyAppInAFrame` (iframe) vs `iStartMyUIComponent` (in-window).
2. Whether any legacy test HTML loads the FLP sandbox — either `sap/ushell/bootstrap/sandbox.js` (or older `flpSandbox.js`) or declares `window["sap-ushell-config"]`.

The bare-Component iframe only buys something when the app actually depends on the FLP runtime. Plain in-window apps with no FLP coupling stay on `iStartMyUIComponent` — Phase 5b would force them into an iframe they don't need.

Run the combined scan:

```bash
node <skill-dir>/scripts/parse-testsuite.js --detect-launcher webapp/test \
  > /tmp/launcher.json
```

The script returns:

```json
{
  "launcher": "iframe" | "in-window" | "mixed" | "none",
  "flpSandbox": true | false,
  "needsIframeMigration": true | false,
  ...
}
```

`needsIframeMigration` is `true` iff `launcher === "in-window"` AND `flpSandbox === true`. That single flag drives the decision:

| `launcher` | `flpSandbox` | `needsIframeMigration` | Action |
|---|---|---|---|
| `iframe` | any | `false` | Pattern I. Proceed with Phase 5 only; **skip Phase 5b**. |
| `in-window` | `true` | `true` | Pattern U. Phase 5 (Pattern A wiring) **plus** Phase 5b (iframe migration). |
| `in-window` | `false` | `false` | Plain in-window app. **Skip Phase 5b.** Run Phase 5 for testsuite/journey wiring; leave `iStartMyUIComponent` calls untouched. |
| `mixed` | any | `false` | **Halt.** Append a section to `MODERNIZATION_ISSUES.md` listing every iframe and in-window hit, ask the developer to reconcile to one shape, then re-run. |
| `none` | any | `false` | Project has no OPA tests. Skip all OPA phases (5, 5b, OPA parts of 6/7). |

**Pattern U + Pattern B is unsupported.** This skill only handles `needsIframeMigration === true` projects whose Phase 0.3 classification is Pattern A (single `AllJourneys.js` aggregator). If `needsIframeMigration === true` and Phase 0.3 reports Pattern B, halt and surface to the developer — Phase 5b assumes a single shared `Common.js` / `OpaSetup.js` to rewrite.

Save the combined verdict; it gates Phase 5b and several Completion Checklist rows.

### 0.3 Check for OPA tests and identify the pattern

**Pattern A — "Single HTML + AllJourneys"**: The most common pattern.
- `webapp/test/integration/opaTests.qunit.html` exists (single bootstrap file)
- `AllJourneys.js` orchestrates Opa5.extendConfig and dynamically loads journeys
- Often has `AllJourneys.json` listing journey names

**Pattern B — "Many Individual HTML Files"**: Less common, larger projects.
- Multiple `*.qunit.html` files under `webapp/test/opa/` (one per test)
- Each HTML has its own `Opa5.extendConfig` and utility module imports

Detection:
```bash
find webapp/test -name "AllJourneys.js" -o -name "AllJourneys.json"
find webapp/test/integration -name "opaTests.qunit.html"
find webapp/test/opa -name "*.qunit.html" -type f 2>/dev/null | wc -l
```

If `AllJourneys.js` exists → **Pattern A**. If many HTML files under `opa/` → **Pattern B**.

### 0.4 Run the parse script

This skill bundles a script that extracts test entries from the legacy testsuite. It auto-detects the pattern:

```bash
node <skill-dir>/scripts/parse-testsuite.js <testsuite.qunit.html> <test-base-dir> <namespace>
```

The script outputs a JSON object with:
- **`pattern`** — `"A"` or `"B"` (auto-detected)
- **`summary`** — counts of active, commented-out, autoWait:false, and multi-journey entries
- **`entries`** — complete mapping from module path to `{ title, skip?, ... }`
- For Pattern A: **`opaConfig`** — extracted `Opa5.extendConfig` details and page object imports from AllJourneys.js

Save this output — it drives the rest of the modernization.

### 0.5 Report bootstrap overrides for manual review

Some test host HTML files (or the testsuite HTML itself) monkey-patch the UI5 module loader — typically to mock a module that is missing from the DIST layer (e.g. `sap/ushell_abap/pbServices/ui2/Page`). These patterns CANNOT be migrated mechanically because the right replacement (e.g. `sap.ui.predefine`, deletion, refactor) depends on what the original code was trying to achieve and which modules it must intercept. They must be reviewed by a human.

Run the bootstrap-override scan and append every finding to `MODERNIZATION_ISSUES.md` at the project root:

```bash
node <skill-dir>/scripts/parse-testsuite.js --scan-bootstrap-overrides webapp/test \
  > /tmp/bootstrap-overrides.json
```

The scan reports any of:
- `sap.ui.define = ...`  (loader-define override)
- `sap.ui.require = ...` (loader-require override)
- `sap.ui.loader._.defineModuleSync(...)` or bare `defineModuleSync(...)`

For each finding, append a section to `MODERNIZATION_ISSUES.md` (create the file if it does not exist) using this template:

```markdown
## Bootstrap override — manual review required

- File: `<path>` (line `<n>`)
- Pattern: `<patternId>`
- Snippet: `<trimmed line>`
- Note: <patternId-specific note from the scan output>
- Action: not auto-migrated. Review the original intent (usually mocking a missing-from-DIST module). Replace `defineModuleSync` / `sap.ui.define` overrides with `sap.ui.predefine` placed before any `sap.ui.require`, or remove the workaround if the missing module is now available.
```

Do NOT attempt to rewrite the override during this skill's run. Reporting it is the deliverable; the developer decides the correct fix afterwards.

If the scan finds zero overrides, skip writing to `MODERNIZATION_ISSUES.md`.

## Phase 1: Create testsuite.qunit.js (Main)

The main testsuite lists all tests with a hybrid approach:
- **Unit tests**: Delegated via a single `"unit/unitTests"` entry (which loads all unit test modules through `unitTests.qunit.js`)
- **OPA/integration tests**: Listed individually — one entry per journey file (e.g., `"integration/NavigationJourney"`)

This gives full visibility of every OPA journey (which are typically the large, slow tests developers want to run selectively) while keeping unit tests bundled as a fast-running group.

Build the OPA entries from the parse script output. Each entry key is the relative path from `webapp/test/` without the `.qunit.js` suffix. Test Starter appends `.qunit` automatically to resolve the module.

```javascript
// Full example — unit delegated, OPA journeys listed individually:
sap.ui.define(function() {
    "use strict";

    return {
        name: "QUnit test suite for <NAMESPACE-WITH-DOTS>",
        defaults: {
            page: "ui5://test-resources/<NAMESPACE>/Test.qunit.html?testsuite={suite}&test={name}",
            qunit: {
                version: 2
            },
            sinon: {
                version: 4
            },
            ui5: {
                theme: "sap_horizon"
            },
            loader: {
                map: {
                    "*": {
                        "sap/ui/thirdparty/sinon": "sap/ui/thirdparty/sinon-4",
                        "sap/ui/thirdparty/sinon-qunit": "sap/ui/qunit/sinon-qunit-bridge"
                    }
                },
                paths: {
                    "<NAMESPACE>": "../"
                }
            },
            coverage: {
                only: ["<NAMESPACE>"],
                never: ["<NAMESPACE>/test"]
            }
        },
        tests: {
            // ----- Unit Tests -----
            "unit/unitTests": {
                title: "Unit Tests"
            },
            // ----- OPA Integration Tests -----
            "integration/NavigationJourney": {
                title: "Navigation Journey"
            },
            "integration/SearchJourney": {
                title: "Search Journey"
            }
        }
    };
});
```

If the project has NO integration/OPA tests, the test entries contain only `"unit/unitTests"`. If unit tests don't exist (rare), only individual OPA entries appear.

Use section comments (`// ----- Unit Tests -----`, `// ----- OPA Integration Tests -----`) to visually group entries.

Read `references/testsuite-configuration.md` for detailed explanation of each configuration option.

Key points:
- The `page` property MUST use the `ui5://` protocol prefix — without it, Test Starter cannot resolve test pages
- No `module` property is needed — Test Starter appends `.qunit` to entry keys, resolving `"integration/NavigationJourney"` to `integration/NavigationJourney.qunit.js`
- Files referenced by testsuite entry keys must follow the `.qunit.js` suffix convention
- Files loaded only as `sap.ui.define` dependencies (utility modules, page objects, arrangement classes) keep their `.js` extension

### Additional loader paths

**MANDATORY step.** Extract ALL resource root mappings from ALL test HTML files before creating `testsuite.qunit.js`:

```bash
grep -rh "data-sap-ui-resourceroots" webapp/test/ --include="*.html"
```

Parse every key-value pair from the JSON attributes. Convert dot-notation keys to slash-notation and add them to `loader.paths`.

**Path adjustment**: All `loader.paths` values resolve relative to `Test.qunit.html` (located at `webapp/test/`). When a resource root is extracted from an HTML file in a subdirectory (e.g., `webapp/test/opa/Area/Test.qunit.html` with path `"../../flpSandboxMockServer"`), you must recompute the path relative to `webapp/test/`. To do this:
1. Determine what the original relative path resolves to from the source HTML's directory
2. Re-express that target relative to `webapp/test/`

Example: `webapp/test/opa/SalesOrder/CreateSalesOrder.qunit.html` has `"flpSandboxMockServer": "../../flpSandboxMockServer"`. From `test/opa/SalesOrder/`, `../../flpSandboxMockServer` resolves to `test/flpSandboxMockServer`. Relative to `Test.qunit.html` at `test/`, this becomes `"./flpSandboxMockServer"` (or simply `"flpSandboxMockServer"`).

Example: `webapp/test/integration/opaTests.qunit.html` has `"flpSandboxMockServer": "../flpSandboxMockServer"`. From `test/integration/`, `../flpSandboxMockServer` resolves to `test/flpSandboxMockServer`. Relative to `test/`, this becomes `"./flpSandboxMockServer"`.

The app's own paths (`"<NAMESPACE>"` and `"<NAMESPACE>/app"`) are always needed but NOT sufficient. Common additional paths that must be carried over:
- Fiori Elements test libraries (`sap/suite/ui/generic/template/integration/testLibrary`)
- Generic `test-resources` mappings
- Reuse library test aliases

If two HTML files define the same resource root key with different values, compare which path the majority of tests use. Prefer the value from the main `testsuite.qunit.html` or `opaTests.qunit.html` over individual test HTMLs. If a minority of tests needs a different mapping, use a per-test `loader.paths` override in their testsuite entry rather than changing the default.

## Phase 2: Create Test.qunit.html

Create `webapp/test/Test.qunit.html`:

```html
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <script
        src="../resources/sap/ui/test/starter/runTest.js"
        data-sap-ui-resource-roots='{
            "test-resources.<NAMESPACE-WITH-DOTS>": "./"
        }'
    ></script>
</head>
<body class="sapUiBody">
    <div id="qunit"></div>
    <div id="qunit-fixture"></div>
</body>
</html>
```

This single file replaces ALL individual test HTML files. Test Starter uses URL query parameters to select which test to run.

## Phase 3: Update testsuite.qunit.html

Replace the contents of `webapp/test/testsuite.qunit.html`:

```html
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>QUnit test suite for <NAMESPACE-WITH-DOTS></title>
    <script
        src="../resources/sap/ui/test/starter/createSuite.js"
        data-sap-ui-testsuite="test-resources/<NAMESPACE>/testsuite.qunit"
        data-sap-ui-resource-roots='{
            "test-resources.<NAMESPACE-WITH-DOTS>": "./"
        }'
    ></script>
</head>
<body>
</body>
</html>
```

This replaces `qunit-redirect.js` or `sap-ui-core.js` bootstrapping with `createSuite.js`.

## Phase 4: Modernize Unit Test JS Files

### 4.0 FIRST — Identify and delete redundant aggregators

**Before converting any file**, scan `webapp/test/unit/` for redundant aggregators. A redundant aggregator is a JS file that:
- Uses `sap.ui.require([...], function() { QUnit.start(); })` to load other test modules, OR
- Uses `sap.ui.define([...])` to list dependencies with no test body, OR
- Contains NO actual test logic (`QUnit.module`, `QUnit.test`, `assert.*` calls)

**IMPORTANT**: `QUnit.config.autostart = false` and `QUnit.start()` are NOT test logic — they are boot scaffolding. A file that ONLY does `sap.ui.require([deps], function() { QUnit.start(); })` is a redundant aggregator, even though it mentions QUnit.

Common filenames: `allTests.js`, `AllTests.js`, `legacyTests.qunit.js`, `allTests.qunit.js` — but ANY file matching this "load-only, no tests" pattern is a redundant aggregator.

**Action**: Note the test modules they load (these will go into `unitTests.qunit.js`), then **DELETE** the aggregator file immediately. Do NOT convert it to `sap.ui.define` format. Do NOT add QUnit.test stubs. Do NOT keep it as a test entry. Also delete its companion HTML file (e.g., `legacyTests.qunit.html`). DELETE BOTH FILES.

Example — this is a redundant aggregator (DELETE both .js and .html):
```javascript
QUnit.config.autostart = false;
sap.ui.require([
    "my/app/test/unit/controller/App.controller"
], function() {
    "use strict";
    QUnit.start();
});
```
It has no `QUnit.module`/`QUnit.test` of its own — it just loads another module and starts QUnit. Delete it.

### 4.1 Convert and rename real test files

Unit test JS files that **contain actual test logic** (`QUnit.module`, `QUnit.test`, `assert.*`) and use `Core.ready()`, `Core.attachInit()`, or `sap.ui.require` with `QUnit.start()` need TWO changes:

1. **Rename the file** to add `.qunit.js` suffix (e.g., `App.controller.js` → `App.controller.qunit.js`)
2. **Convert the content** to `sap.ui.define` format (remove QUnit.config.autostart, Core.ready wrappers)

**⚠️ CRITICAL — File Rename**: Every real unit test file MUST be renamed to `.qunit.js` suffix. This is required because Test Starter resolves test entries by appending `.qunit` to the module path. Without the rename, the test cannot be found at runtime.

Examples:
- `controller/App.controller.js` → `controller/App.controller.qunit.js`
- `model/formatter.js` → `model/formatter.qunit.js`
- `util/Helper.js` → `util/Helper.qunit.js`

**Before** — old style with Core.ready (`webapp/test/unit/controller/App.controller.js`):
```javascript
QUnit.config.autostart = false;
sap.ui.getCore().attachInit(function() {
    "use strict";
    sap.ui.require([
        "my/app/model/formatter"
    ], function(formatter) {
        QUnit.module("formatter");
        QUnit.test("formatValue", function(assert) {
            assert.equal(formatter.formatValue(1), "One");
        });
    });
});
```

**After** — Test Starter style (`webapp/test/unit/controller/App.controller.qunit.js`):
```javascript
sap.ui.define([
    "my/app/model/formatter"
], function(formatter) {
    "use strict";

    QUnit.module("formatter");
    QUnit.test("formatValue", function(assert) {
        assert.equal(formatter.formatValue(1), "One");
    });
});
```

### 4.2 Create unitTests.qunit.js aggregator

The main testsuite entry `"unit/unitTests"` resolves to `unit/unitTests.qunit.js`. This file must directly list all **real** unit test modules (files with QUnit.module/QUnit.test).

Build the list from:
- Test modules extracted from deleted aggregators (Step 4.0)
- Any additional `.qunit.js` files in `webapp/test/unit/` that contain actual tests

Do NOT include deleted aggregator files in this list.

**After** (`unitTests.qunit.js` — directly lists all tests):
```javascript
sap.ui.define([
    "./controller/Main.qunit",
    "./model/formatter.qunit"
]);
```

Key rules for the aggregator:
- Use **relative paths** starting with `./`, not absolute namespace paths
- Add the **`.qunit` suffix** to each dependency (without `.js`) because the actual files were renamed to `.qunit.js` in Step 4.1
- Example: if file was renamed to `controller/App.controller.qunit.js`, reference it as `"./controller/App.controller.qunit"`

### jsUnitTestSuite conversion

If the old `testsuite.qunit.js` used `jsUnitTestSuite`, it's already replaced in Phase 1. Delete the old content.

## Phase 5: Modernize OPA Tests

This phase differs based on the detected pattern. Read the full instructions in the corresponding reference file.

### Pattern A — Single HTML + AllJourneys

Read `references/pattern-a-modernization.md` for detailed instructions.

Summary:
1. **Create OpaSetup.js** from AllJourneys.js — extract `Opa5.extendConfig` and all page object/utility imports. OpaSetup.js must NOT import `sap/ui/test/opaQunit` — that module belongs in each individual journey file.
2. **Rename journey files** to `.qunit.js` suffix so Test Starter can resolve them without a `module` override
3. **Update journey files** — add OpaSetup as a side-effect dependency using relative path `"./OpaSetup"` (same directory). Do NOT use `test-resources/` for same-directory imports.
4. **Handle autoWait overrides** — journeys needing `autoWait: false` get a per-journey `Opa5.extendConfig` override
5. **Preserve testLibs config** — Fiori Elements `testLibs` settings move to OpaSetup.js

**Correct OpaSetup.js structure** (page objects use `test-resources/`, but opaQunit is absent):
```javascript
sap.ui.define([
    "sap/ui/test/Opa5",
    "test-resources/<NAMESPACE>/integration/pages/App"
], function(Opa5) {
    "use strict";

    Opa5.extendConfig({
        viewNamespace: "<APP-NAMESPACE>.view.",
        autoWait: true
    });
});
```

**Correct journey file structure** (opaQunit here, OpaSetup via relative path):
```javascript
sap.ui.define([
    "sap/ui/test/opaQunit",
    "sap/ui/test/Opa5",
    "./OpaSetup"
], function(opaTest, Opa5) {
    "use strict";
    // ... opaTest(...) calls
});
```

### Pattern B — Many Individual HTML Files

Read `references/pattern-b-modernization.md` for detailed instructions.

Summary:
1. **Inventory utility modules** — find all modules that call `Opa5.createPageObjects` (side-effect imports)
2. **Create OpaSetup.js** — consolidate all utility imports + `Opa5.extendConfig` from the HTML files
3. **Rename journey files** to `.qunit.js` suffix and add OpaSetup as a side-effect dependency
4. **Handle autoWait overrides** — use the parse script's `autoWaitFalseFiles` list
5. **Handle multi-module HTML files** — when a legacy `*.qunit.html` loads more than one journey module in a single `sap.ui.require`, emit ONE testsuite entry per module. Never invent a synthetic combined name (e.g. `<First>Combined`) — the file does not exist and the resulting entry is dangling. The parse script does this automatically via `_fromMultiModuleHtml`. Halt if any of the loaded modules has no corresponding `.qunit.js` file under `webapp/test/`. See `references/pattern-b-modernization.md` Step 6.


## Phase 5b: Migrate in-window OPA launcher to bare-Component iframe

**Run this phase only when Phase 0.2 reported `needsIframeMigration: true`** (i.e. `launcher === "in-window"` AND `flpSandbox === true`). Skip entirely for any other combination — including plain in-window apps with no FLP sandbox load, where `iStartMyUIComponent` should stay as-is.

Phase 5b assumes Phase 5 has already produced `OpaSetup.js`, renamed journey files, and the main `testsuite.qunit.js` — it then rewrites the launcher path so journeys run inside a fresh same-origin iframe loading the Component directly (no FLP shell).

Read `references/pattern-u-iframe-migration.md` for the full step-by-step instructions. Summary:

1. **Create `webapp/test/integration/opaIframe.qunit.html` + `opaIframeBoot.js`** — bare-Component iframe entry. HTML loads `sap/ushell` sandbox.js for API stubs but defines no `sap-ushell-config`, so no FLP shell renderer is built. Bootstrap uses `data-sap-ui-oninit="module:<NAMESPACE>/test/integration/opaIframeBoot"` (no inline `<script>`, CSP-clean) — the boot module runs `mockserver.init()` then `new ComponentContainer(...).placeAt("content")`.
2. **Rewrite `arrangements/Common.js`** — `iStartMyApp` now calls `iStartMyAppInAFrame({ source: getFrameUrl(hash), … })`. Drop the `localService/mockserver` import, drop any `_clearSharedData` helper that resets parent-frame `ODataModel.mSharedData`, drop the in-window `componentConfig`.
3. **Rewrite every journey file** — `Given.iStartMyUIComponent({...})` → `Given.iStartMyApp()` (forward `hash` / `autoWait` if originally passed).
4. **Strip parent-frame mockserver init from `OpaSetup.js`** — mockserver now boots inside the iframe.
5. **Cross-window control instantiation in page objects** — UI5 controls instantiated in `waitFor` callbacks must be resolved through the iframe's loader: `Opa5.getWindow().sap.ui.require("sap/m/Token")`. Drop those dependencies from the parent `sap.ui.define`. **Iterate every file** under `webapp/test/integration/pages/` (do not rely on which files you happened to edit for other reasons). The gate detects misuse by **usage shape**, not by module-path enumeration — UI5 has too many libraries (`sap/m`, `sap/ui/core`, `sap/uxap`, `sap/suite`, `sap/viz`, `sap/ndc`, `sap/f`, `sap/ui/layout`, `sap/gantt`, project libs …) to whitelist. OPA-safe dep paths kept in the parent: `sap/ui/test/*` and `sap/ui/core/routing/History`. Run `node <skill-dir>/scripts/detect-cross-window-imports.js <project-root>` after the rewrite — non-zero exit halts Phase 5b. See `references/pattern-u-iframe-migration.md` §5b.6.2.
6. **Cross-window jQuery / DOM lookups** — replace bare `$(...)`, `jQuery(...)`, `document.*`, `window.*` references that target app-rendered DOM with `Opa5.getJQuery()(...)`, `Opa5.getWindow().document.*`, `Opa5.getWindow().*`. Detection is folded into the same `detect-cross-window-imports.js` gate run for item 5 — bare DOM/jQuery lines that don't already route through `Opa5.getJQuery()` / `Opa5.getWindow()` are reported alongside the constructor / `instanceof` findings.
7. **Routing helpers** — plain Component-router hash, no `#app-tile&/` prefix, no `sap.ushell.Container.setDirtyFlag(false)`.
8. **Mockserver `sap-message` envelopes** — function-import POST handlers consumed by an app-side message collector that dereferences `aErrorMsg[0]` need a `sap-message` header so the collector array is non-empty.
9. **ErrorHandler null-guard for non-XML responses** — guard `xmlDoc.getElementsByTagName("message")[0].firstChild.data` against null nodes; fall back to the raw response text. Ship with the migration or flag in `MODERNIZATION_ISSUES.md`.
10. **Do NOT register `<NAMESPACE>/test/integration/opaIframe` in `loader.paths`** — `sap.ui.require.toUrl("test-resources/<NAMESPACE>/integration/opaIframe")` resolves through the existing resource root. A custom alias breaks the packaged-WAR path.

Items 5–9 are project-specific in scope: items 5 and 6 are gated by `detect-cross-window-imports.js`; items 7–9 use the detection greps in the reference file. Apply each match mechanically. The exact set of UI5 classes / endpoints / collectors varies per project — do not enumerate from training data.


## Phase 6: Delete Old Files

### Unit test files
- Delete `unitTests.qunit.html` (or equivalent legacy bootstrap HTML)
- Delete `legacyTests.qunit.html` (or any other per-test HTML bootstraps)
- Verify that all redundant aggregators identified in Phase 4.0 were already deleted (e.g., `legacyTests.qunit.js`, `allTests.js`, `AllTests.js`). If any remain, delete them now.

### OPA test files — Pattern A
- Delete `opaTests.qunit.html`
- Delete `AllJourneys.js` (replaced by OpaSetup.js; journeys now listed individually in `testsuite.qunit.js`)
- Delete `AllJourneys.json` (journeys now listed in main testsuite)

### OPA test files — Pattern U (only if `needsIframeMigration` was true)
- Delete `webapp/test/integration/flpSandbox.qunit.html` **only if it exists** from a prior intermediate attempt. Greenfield Pattern U projects do not have it. Phase 5b never authors this file.
- Confirm no journey or page object still calls `iStartMyUIComponent` (verified again in Phase 7).

### OPA test files — Pattern B
- Delete all individual `*.qunit.html` files under `webapp/test/opa/`
- Count files before deleting — must match the parse script's `summary.totalActive`

### Do NOT delete
- `testsuite.qunit.html` (updated in Phase 3)
- `Test.qunit.html` (created in Phase 2)

## Phase 7: Verify

1. **Count check**: Confirm the number of OPA journey entries in the main `testsuite.qunit.js` matches the parse script's OPA total. The main testsuite should have 1 unit entry (`"unit/unitTests"`) plus all individual OPA journeys.

2. **Dangling-entry check**: Every entry key in `testsuite.qunit.js` must resolve to a real `.qunit.js` file under `webapp/test/`. Test Starter appends `.qunit` automatically, so an entry `"integration/Foo"` requires `webapp/test/integration/Foo.qunit.js` to exist. Run:

   ```bash
   node <skill-dir>/scripts/check-dangling-entries.js webapp/test
   ```

   Exit code 0 prints `OK: <n> entries all resolve`. Exit code 1 prints the dangling entry list to stderr — this is the multi-module-HTML failure mode (synthetic `*Combined` name with no backing file). Fix any dangling entries before reporting done.

3. **Run UI5 linter**: `npx @ui5/linter` — check that no `prefer-test-starter` warnings remain for the modernized files.

4. **Structural review**:

   - `Test.qunit.html` exists with `runTest.js`
   - `testsuite.qunit.html` uses `createSuite.js`
   - `testsuite.qunit.js` has `"unit/unitTests"` delegate + all individual OPA journeys
   - All unit test JS files use `sap.ui.define` (no `Core.ready`)
   - OPA: `OpaSetup.js` exists and imports all utility/page-object modules
   - OPA: every journey file imports `OpaSetup`
   - No stale individual test HTML files remain

5. **Pattern U verification** (only if `needsIframeMigration` was true):

   - `webapp/test/integration/opaIframe.qunit.html` exists and loads `sap-ui-core.js` + `sap/ushell/bootstrap/sandbox.js`, with **no** `window["sap-ushell-config"]` block and **no inline `<script>` body** (boot logic lives in `opaIframeBoot.js`, loaded via `data-sap-ui-oninit="module:..."`).
   - `webapp/test/integration/opaIframeBoot.js` exists and calls `mockserver.init()` + `new ComponentContainer(...).placeAt("content")`.
   - `grep -rn "iStartMyUIComponent\b" webapp/test` → zero hits.
   - `grep -rn "#app-tile&/" webapp/test` → zero hits (no FLP hash prefix in routing helpers).
   - `mockserver.init()` appears only inside `opaIframeBoot.js` (loaded by `opaIframe.qunit.html` via `data-sap-ui-oninit`), not in `OpaSetup.js` or `arrangements/Common.js`.
   - `loader.paths` in `testsuite.qunit.js` does **not** alias `<NAMESPACE>/test/integration/opaIframe` or `flpSandbox`.
   - Cross-window misuse gate: `node <skill-dir>/scripts/detect-cross-window-imports.js <project-root>` exits `0`. Non-zero halts. The gate detects by usage shape: `new <Identifier>(...)` and `<x> instanceof <Identifier>` where `<Identifier>` is a `sap.ui.define` dep param NOT on the OPA-safe allowlist (`sap/ui/test/*`, `sap/ui/core/routing/History`); plus bare `$(`, `jQuery(`, `document.`, `window.` not routed through `Opa5.getJQuery()` / `Opa5.getWindow()`. Fix per finding: drop the dep from parent `sap.ui.define` and re-resolve at use site via `Opa5.getWindow().sap.ui.require("<path>")`, or rewrite the DOM access through `Opa5.getJQuery()` / `Opa5.getWindow()`.
   - ErrorHandler XML-parse null-guard applied (or flagged in `MODERNIZATION_ISSUES.md`): `grep -rnE 'getElementsByTagName\("message"\)\[0\]\.firstChild' webapp` returns no unguarded hits.

## Worked Examples

### Example A — Pattern A (Single HTML + AllJourneys)

Project namespace: `com.mycompany.myapp`, 4 OPA journeys + 2 unit tests.

**After modernization**:
- `testsuite.qunit.html` → `createSuite.js`, `testsuite.qunit.js` → 5 entries (1 unit delegate + 4 individual OPA journeys)
- `Test.qunit.html` → `runTest.js`
- `AllJourneys.js` → split into `OpaSetup.js` + individual journey entries in `testsuite.qunit.js`
- Deleted: `AllJourneys.json`, `opaTests.qunit.html`, `unitTests.qunit.html`

### Example B — Pattern B (Many Individual HTML Files)

Project namespace: `com.mycompany.myapp`, 45 OPA journeys + 3 unit tests.

**After modernization**:
- `testsuite.qunit.html` → `createSuite.js`, `testsuite.qunit.js` → 46 entries (1 unit delegate + 45 individual OPA journeys)
- `Test.qunit.html` → `runTest.js`
- `OpaSetup.js` → union of all utility imports + common `Opa5.extendConfig`
- All 45 journey files → OpaSetup added as dependency, 3 with `autoWait: false` override
- Deleted: all 46 individual HTML files, `unitTests.qunit.html`

## Related Skills

- **fix-csp-compliance** — the old HTML files contain inline scripts that violate CSP. Modernizing to Test Starter removes them.
- **fix-linter-blind-spots** — runs later in the modernization workflow (Phase 3, Step 3.2) to catch runtime-breaking patterns the linter misses (app-namespace globals in JS, QUnit assertions, sinon mocking).
- **fix-js-globals (cases 1b and 1c)** — handles the `sap.*` globals the linter reports. The linter-blind-spots skill handles app-namespace globals the linter misses.

## Important Notes

- **`runTest.js` vs `createSuite.js`**: `createSuite.js` is for the testsuite overview pages. `runTest.js` is for `Test.qunit.html` that runs individual tests. Do not mix them up.
- **`.qunit.js` suffix rule**: Only files referenced by a testsuite entry key need `.qunit.js` — unit test files, OPA journey files, and aggregators. Files loaded as `sap.ui.define` dependencies (OPA utilities, page objects, `OpaSetup.js`) keep plain `.js`.
- **`.qunit` suffix in `sap.ui.define` dependency paths**: When a `.qunit.js` file references another `.qunit.js` file via `sap.ui.define`, the dependency path must include the `.qunit` suffix (without `.js`). The UI5 module loader appends `.js` automatically, so `"./FilterBar.qunit"` resolves to `FilterBar.qunit.js`. Without the suffix, `"./FilterBar"` resolves to `FilterBar.js` (file not found). Exception: plain `.js` files like `OpaSetup.js` do NOT get the suffix. This applies to top-level aggregators (`unitTests.qunit.js`) AND individual test files that combine other `.qunit.js` files.
- **`test-resources/` prefix**: Any `sap.ui.define` dependency pointing to a file under `webapp/test/` must use `test-resources/<NAMESPACE>/...` instead of `<NAMESPACE>/test/...`. The `test/` segment disappears because the `test-resources` resource root already maps to `webapp/test/`.
- **Convert existing `<NAMESPACE>/test/` deps**: After all journey file updates (Phase 5), scan ALL `.js` files under test directories for dependency paths using `<NAMESPACE>/test/` and convert to `test-resources/<NAMESPACE>/` (drop the `test/` segment). This applies to both `.qunit.js` test files and plain `.js` utility/page-object files.
- **Relative paths vs `test-resources/`**: Aggregators and same-directory imports use relative `./` paths. Cross-directory imports (e.g., journey → page object) use `test-resources/<NAMESPACE>/...`. Specifically: journey files import `OpaSetup` via `"./OpaSetup"` (same directory), NOT via `"test-resources/<NAMESPACE>/integration/OpaSetup"`.
- **OpaSetup.js must NOT import `sap/ui/test/opaQunit`**: The `opaQunit` module (which provides the `opaTest` function) belongs in each individual journey `.qunit.js` file, not in the shared setup. OpaSetup.js only contains `Opa5.extendConfig` and page object side-effect imports.
- **`{suite}` and `{name}` placeholders are mandatory** in the `page` property — without them, Test Starter cannot locate the right test to run.
- **Side-effect imports go at the END of the dependency array**: Dependencies that don't map to a function parameter (e.g., `OpaSetup` loaded for its `Opa5.extendConfig` side effect) must be appended at the END of the `sap.ui.define` dependency array, after all named dependencies. Prepending them shifts function parameter positions, causing wrong modules to be passed to existing code. When appending, ensure no double-comma (`,,`) — check whether the preceding entry already has a trailing comma before inserting one.

## Completion Checklist

**Before reporting this skill as done, verify ALL of the following. If any item fails, go back and fix it.**

| # | Check | How to verify |
|---|-------|---------------|
| 1 | `Test.qunit.html` exists | `ls webapp/test/Test.qunit.html` |
| 2 | `testsuite.qunit.html` uses `createSuite.js` | Check `<script src=` in the file |
| 3 | `testsuite.qunit.js` has correct entries | `"unit/unitTests"` delegate + all individual OPA journeys |
| 4 | No redundant aggregators remain | `legacyTests.qunit.js`, `allTests.js`, `AllTests.js` etc. must be deleted |
| 5 | No stale test HTML bootstraps remain | `unitTests.qunit.html`, `legacyTests.qunit.html`, `opaTests.qunit.html` must be deleted |
| 6 | `unitTests.qunit.js` only references real test files | No references to deleted aggregators |
| 7 | Main testsuite OPA entry count matches parse script OPA total | Count OPA entries in `testsuite.qunit.js` against `summary.totalActive` minus unit count |
| 8 | Every testsuite entry resolves to a real `.qunit.js` file | Run the Phase 7 dangling-entry check; output must be `OK: <n> entries all resolve` |
| 9 | Bootstrap overrides reported, not silently migrated | If `--scan-bootstrap-overrides` produced findings, `MODERNIZATION_ISSUES.md` contains one section per finding; if no findings, file may be absent |
| 10 | Launcher + FLP sandbox classified | Phase 0.2 `--detect-launcher` verdict recorded (`launcher`, `flpSandbox`, `needsIframeMigration`); `mixed` halted the skill |
| 11 | If `needsIframeMigration`: `opaIframe.qunit.html` + `opaIframeBoot.js` exist; HTML has no inline script body; no in-window launcher remains | `ls webapp/test/integration/opaIframe.qunit.html webapp/test/integration/opaIframeBoot.js`; `grep -nE '<script>[[:space:]]*$' webapp/test/integration/opaIframe.qunit.html` returns nothing (only `<script src=...>` and `<script ... data-sap-ui-oninit=...>` allowed); `grep -rn "iStartMyUIComponent\b" webapp/test` (zero hits) |
| 12 | If `needsIframeMigration`: no FLP hash prefix, no `loader.paths` alias for the iframe | `grep -rn "#app-tile&/" webapp/test` (zero hits); `testsuite.qunit.js` has no `<NAMESPACE>/test/integration/opaIframe` or `flpSandbox` alias |
| 13 | If `needsIframeMigration`: ErrorHandler XML parse guarded or flagged | `grep -rnE 'getElementsByTagName\("message"\)\[0\]\.firstChild' webapp` returns no unguarded hits, or the issue is logged in `MODERNIZATION_ISSUES.md` |
| 14 | If `needsIframeMigration`: cross-window misuse gate clean | `node <skill-dir>/scripts/detect-cross-window-imports.js <project-root>` exits `0`; no page-object file uses a non-OPA-safe `sap.ui.define` dep param as a constructor / `instanceof`, and no bare `$(`, `jQuery(`, `document.`, `window.` reaches app DOM without going through `Opa5.getJQuery()` / `Opa5.getWindow()` |
