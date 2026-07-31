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
  - OPA journeys call `iStartMyUIComponent` instead of `iStartMyAppInAFrame`
  - User asks to modernize tests, modernize test infrastructure, or adopt Test Starter
  Handles unit tests (Core.ready removal, sap.ui.define wrapping) and OPA challenges
  (page-object imports, Opa5 config, journey orchestration, QUnit 1.x assert modernization,
  in-window-to-iframe launcher migration).
  Trigger on: prefer-test-starter warnings, test modernization requests, iStartMyUIComponent.
---

# Modernize to Test Starter

This skill modernizes a UI5 project's entire test infrastructure — both unit tests and OPA5 integration tests — to the [Test Starter concept](https://ui5.sap.com/#/topic/032be2cb2e1d4115af20862673bedcdb).

Reference: [Blog post: Simplify Your Test Setup](https://community.sap.com/t5/technology-blog-posts-by-sap/simplify-your-test-setup-introducing-the-test-starter-concept-for-your-ui5/ba-p/14303076)

## Why Modernize

The Test Starter replaces per-test HTML bootstrapping with a single generic test page and a declarative `testsuite.qunit.js` configuration. Benefits: eliminates boilerplate HTML/JS, handles QUnit/Sinon/coverage setup automatically, ensures CSP compliance, provides consistent configuration, enables per-test isolation and parallel execution.

## NEVER Skip Test Starter Modernization

OPA5 test HTML files are ALWAYS convertible — they follow a mechanical pattern. Invalid excuses: "complex mock server" (lives in host, not entry point), "sap.ui.define monkey-patching" (same), "FLP sandbox bootstrap" (same), "too many files" (batch-process), "too complex" (invalid).

| Type | Example | Action |
|------|---------|--------|
| Test Driver | `opa/<Area>/<TestName>.qunit.html` | **CONVERT** to Test Starter |
| Test Host | `test<ServiceName>.html` | **KEEP AS-IS** (app-under-test in iframe) |
| Test Suite | `testsuite.qunit.html` | **REPLACE** with testsuite.qunit.js |
| Dev Sandbox | `flpSandbox.html` | **IGNORE** |

The only real technical challenge: OPA5 entry points may use `jQuery.sap.require()` for QUnit bootstrap libs — replace with `sap.ui.require` or note that Test Starter loads them automatically.

## Pre-requisites

Read `manifest.json` → `sap.app/id`. This is your namespace:
- **`<NAMESPACE>`** — dots → slashes (e.g., `my.app` → `my/app`)
- **`<NAMESPACE-WITH-DOTS>`** — raw value with dots

## Phase 0: Detection

### 0.1 Check for unit tests

Look for `webapp/test/unit/` containing `unitTests.qunit.html`, `unitTests.qunit.js`, `allTests.js`, `AllTests.js`, or `allTests.qunit.js`. Identify **all legacy aggregator files** — JS files whose only purpose is loading other test modules via `sap.ui.require`/`sap.ui.define` with no actual test logic (`QUnit.module`, `QUnit.test`, `assert.*`). Their contents will be inlined into `unitTests.qunit.js` and the files deleted.

### 0.2 Classify OPA launcher and FLP sandbox presence

Phase 5b is gated on `needsIframeMigration` = (`launcher === "in-window"` AND `flpSandbox === true`).

```bash
node <skill-dir>/scripts/parse-testsuite.js --detect-launcher webapp/test > /tmp/launcher.json
```

Returns `{ "launcher": "iframe"|"in-window"|"mixed"|"none", "flpSandbox": true|false, "needsIframeMigration": true|false }`.

| `launcher` | `flpSandbox` | Action |
|---|---|---|
| `iframe` | any | Pattern I — Phase 5 only, skip 5b |
| `in-window` | `true` | Pattern U — Phase 5 + Phase 5b |
| `in-window` | `false` | Plain in-window — skip 5b, leave `iStartMyUIComponent` |
| `mixed` | any | **Halt.** Log to `MODERNIZATION_ISSUES.md`, ask developer to reconcile |
| `none` | any | No OPA tests — skip OPA phases |

**Pattern U + Pattern B is unsupported.** If `needsIframeMigration === true` and Phase 0.3 reports Pattern B, halt and surface to the developer.

### 0.3 Check for OPA tests — identify pattern

**Pattern A — "Single HTML + AllJourneys"**: `opaTests.qunit.html` + `AllJourneys.js` orchestrator.
**Pattern B — "Many Individual HTML Files"**: Multiple `*.qunit.html` under `webapp/test/opa/`.

Detection:
```bash
find webapp/test -name "AllJourneys.js" -o -name "AllJourneys.json"
find webapp/test/opa -name "*.qunit.html" -type f 2>/dev/null | wc -l
```

### 0.4 Run the parse script

```bash
node <skill-dir>/scripts/parse-testsuite.js <testsuite.qunit.html> <test-base-dir> <namespace>
```

Outputs: `pattern` (A/B), `summary` (counts), `entries` (module→config mapping), `opaConfig` (for Pattern A). Save this — it drives the rest.

### 0.5 Report bootstrap overrides

```bash
node <skill-dir>/scripts/parse-testsuite.js --scan-bootstrap-overrides webapp/test > /tmp/bootstrap-overrides.json
```

Detects: `sap.ui.define = ...`, `sap.ui.require = ...`, `defineModuleSync(...)`. Append each finding to `MODERNIZATION_ISSUES.md`. Do NOT rewrite overrides — reporting is the deliverable.

## Phase 1: Create testsuite.qunit.js (Main)

Lists all tests: unit tests delegated via `"unit/unitTests"`, OPA journeys listed individually. Build OPA entries from parse script output — key = relative path from `webapp/test/` without `.qunit.js`.

```javascript
sap.ui.define(function() {
    "use strict";
    return {
        name: "QUnit test suite for <NAMESPACE-WITH-DOTS>",
        defaults: {
            page: "ui5://test-resources/<NAMESPACE>/Test.qunit.html?testsuite={suite}&test={name}",
            qunit: { version: 2 },
            sinon: { version: 4 },
            ui5: { theme: "sap_horizon" },
            loader: {
                map: { "*": {
                    "sap/ui/thirdparty/sinon": "sap/ui/thirdparty/sinon-4",
                    "sap/ui/thirdparty/sinon-qunit": "sap/ui/qunit/sinon-qunit-bridge"
                }},
                paths: { "<NAMESPACE>": "../" }
            },
            coverage: { only: ["<NAMESPACE>"], never: ["<NAMESPACE>/test"] }
        },
        tests: {
            // ----- Unit Tests -----
            "unit/unitTests": { title: "Unit Tests" },
            // ----- OPA Integration Tests -----
            "integration/NavigationJourney": { title: "Navigation Journey" }
        }
    };
});
```

Read `references/testsuite-configuration.md` for detailed option explanations.

Key points:
- `page` MUST use `ui5://` protocol prefix
- No `module` property needed — Test Starter appends `.qunit` to entry keys
- `{suite}` and `{name}` placeholders are mandatory

### Additional loader paths

**MANDATORY.** Extract ALL resource root mappings from ALL test HTML files:
```bash
grep -rh "data-sap-ui-resourceroots" webapp/test/ --include="*.html"
```

Convert dot-notation keys to slash-notation, add to `loader.paths`. All values resolve relative to `Test.qunit.html` (at `webapp/test/`) — recompute paths from subdirectory HTMLs accordingly.

If two HTMLs define the same key with different values, prefer the main `testsuite.qunit.html`/`opaTests.qunit.html` value. Minority tests get per-test `loader.paths` overrides.

## Phase 2: Create Test.qunit.html

```html
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <script src="../resources/sap/ui/test/starter/runTest.js"
        data-sap-ui-resource-roots='{ "test-resources.<NAMESPACE-WITH-DOTS>": "./" }'
    ></script>
</head>
<body class="sapUiBody">
    <div id="qunit"></div>
    <div id="qunit-fixture"></div>
</body>
</html>
```

## Phase 3: Update testsuite.qunit.html

```html
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>QUnit test suite for <NAMESPACE-WITH-DOTS></title>
    <script src="../resources/sap/ui/test/starter/createSuite.js"
        data-sap-ui-testsuite="test-resources/<NAMESPACE>/testsuite.qunit"
        data-sap-ui-resource-roots='{ "test-resources.<NAMESPACE-WITH-DOTS>": "./" }'
    ></script>
</head>
<body></body>
</html>
```

## Phase 4: Modernize Unit Test JS Files

### 4.0 FIRST — Delete redundant aggregators

A redundant aggregator has NO actual test logic — only `sap.ui.require([deps], function() { QUnit.start(); })` or load-only `sap.ui.define`. `QUnit.config.autostart = false` + `QUnit.start()` are boot scaffolding, NOT test logic.

**Action**: Note the test modules they load (for `unitTests.qunit.js`), then **DELETE** both `.js` and companion `.html` immediately.

### 4.1 Convert and rename real test files

Files with actual test logic (`QUnit.module`, `QUnit.test`, `assert.*`) need:
1. **Rename** to `.qunit.js` suffix (e.g., `App.controller.js` → `App.controller.qunit.js`)
2. **Convert** to `sap.ui.define` (remove `QUnit.config.autostart`, `Core.ready` wrappers)

```javascript
// Before (App.controller.js)
QUnit.config.autostart = false;
sap.ui.getCore().attachInit(function() {
    sap.ui.require(["my/app/model/formatter"], function(formatter) {
        QUnit.module("formatter");
        QUnit.test("formatValue", function(assert) { ... });
    });
});

// After (App.controller.qunit.js)
sap.ui.define(["my/app/model/formatter"], function(formatter) {
    "use strict";
    QUnit.module("formatter");
    QUnit.test("formatValue", function(assert) { ... });
});
```

### 4.2 Create unitTests.qunit.js aggregator

Directly lists all real unit test modules (from deleted aggregators + any additional `.qunit.js` files):

```javascript
sap.ui.define([
    "./controller/Main.qunit",
    "./model/formatter.qunit"
]);
```

Rules: relative `./` paths, include `.qunit` suffix (without `.js`).

### jsUnitTestSuite conversion

If old `testsuite.qunit.js` used `jsUnitTestSuite`, it's already replaced in Phase 1. Delete old content.

## Phase 5: Modernize OPA Tests

### Pattern A — Single HTML + AllJourneys

Read `references/pattern-a-modernization.md` for detailed instructions.

1. **Create OpaSetup.js** from AllJourneys.js — extract `Opa5.extendConfig` + page object imports. OpaSetup MUST NOT import `sap/ui/test/opaQunit`.
2. **Rename journey files** to `.qunit.js`
3. **Update journeys** — add `"./OpaSetup"` as side-effect dependency (relative path)
4. **Handle autoWait overrides** — per-journey `Opa5.extendConfig`
5. **Preserve testLibs config** in OpaSetup.js

```javascript
// OpaSetup.js (no opaQunit!)
sap.ui.define(["sap/ui/test/Opa5", "test-resources/<NAMESPACE>/integration/pages/App"
], function(Opa5) {
    "use strict";
    Opa5.extendConfig({ viewNamespace: "<APP-NAMESPACE>.view.", autoWait: true });
});

// Journey file (opaQunit here, OpaSetup relative)
sap.ui.define(["sap/ui/test/opaQunit", "sap/ui/test/Opa5", "./OpaSetup"
], function(opaTest, Opa5) {
    "use strict";
    // opaTest(...) calls
});
```

### Pattern B — Many Individual HTML Files

Read `references/pattern-b-modernization.md` for detailed instructions.

1. **Inventory utility modules** calling `Opa5.createPageObjects`
2. **Create OpaSetup.js** — consolidate utility imports + `Opa5.extendConfig`
3. **Rename journeys** to `.qunit.js`, add OpaSetup dependency
4. **Handle autoWait overrides** from parse script's `autoWaitFalseFiles`
5. **Multi-module HTML files** — emit ONE testsuite entry per module (never invent `*Combined` names). See `references/pattern-b-modernization.md` Step 6.

## Phase 5b: Migrate in-window OPA to bare-Component iframe

**Run only when Phase 0.2 reported `needsIframeMigration: true`.**

Read `references/pattern-u-iframe-migration.md` for full instructions. Summary:

1. **Create `opaIframe.qunit.html` + `opaIframeBoot.js`** — bare-Component iframe. HTML loads `sap/ushell` sandbox.js for stubs, no `sap-ushell-config`. Boot module runs `mockserver.init()` → `new ComponentContainer(...).placeAt("content")`. CSP-clean: `data-sap-ui-oninit="module:..."`, no inline script.
2. **Rewrite `arrangements/Common.js`** — `iStartMyApp` → `iStartMyAppInAFrame(...)`. Drop mockserver import, drop `_clearSharedData`.
3. **Rewrite journeys** — `iStartMyUIComponent({...})` → `iStartMyApp()` (forward hash/autoWait).
4. **Strip parent-frame mockserver init from OpaSetup.js** — now boots in iframe.
5. **Cross-window control instantiation** — UI5 controls in `waitFor` callbacks must resolve via `Opa5.getWindow().sap.ui.require(...)`. OPA-safe deps kept in parent: `sap/ui/test/*`, `sap/ui/core/routing/History`. Gate: `node <skill-dir>/scripts/detect-cross-window-imports.js <project-root>`.
6. **Cross-window jQuery/DOM** — replace bare `$(...)`, `document.*`, `window.*` with `Opa5.getJQuery()(...)`, `Opa5.getWindow().*`.
7. **Routing helpers** — plain Component-router hash, no `#app-tile&/` prefix.
8. **Mockserver `sap-message` envelopes** — POST handlers need `sap-message` header for message collectors.
9. **ErrorHandler null-guard** — guard `getElementsByTagName("message")[0].firstChild.data` against null.
10. **Do NOT register `<NAMESPACE>/test/integration/opaIframe` in `loader.paths`**.

Items 5–9 are project-specific; apply mechanically per detection grep in reference file.

## Phase 6: Delete Old Files

### Unit test files
- Delete `unitTests.qunit.html`, `legacyTests.qunit.html` (legacy bootstraps)
- Verify all redundant aggregators from Phase 4.0 are deleted

### OPA files — Pattern A
- Delete `opaTests.qunit.html`, `AllJourneys.js`, `AllJourneys.json`

### OPA files — Pattern U (only if `needsIframeMigration`)
- Delete `flpSandbox.qunit.html` if it exists from prior attempt
- Confirm no journey still calls `iStartMyUIComponent`

### OPA files — Pattern B
- Delete all `*.qunit.html` under `webapp/test/opa/` (count must match `summary.totalActive`)

### Do NOT delete
- `testsuite.qunit.html` (updated), `Test.qunit.html` (created)

## Phase 7: Verify

1. **Count check**: OPA entries in `testsuite.qunit.js` match parse script's OPA total.
2. **Dangling-entry check**: `node <skill-dir>/scripts/check-dangling-entries.js webapp/test` — exit 0 = OK.
3. **Linter**: `npx @ui5/linter` — no `prefer-test-starter` warnings remain.
4. **Structural review**: `Test.qunit.html` → `runTest.js`; `testsuite.qunit.html` → `createSuite.js`; `testsuite.qunit.js` → unit delegate + OPA journeys; all unit files use `sap.ui.define`; `OpaSetup.js` exists; every journey imports it; no stale HTML remains.
5. **Pattern U verification** (if `needsIframeMigration`):
   - `opaIframe.qunit.html` + `opaIframeBoot.js` exist; no inline `<script>` body; no `window["sap-ushell-config"]`
   - `grep -rn "iStartMyUIComponent\b" webapp/test` → zero hits
   - `grep -rn "#app-tile&/" webapp/test` → zero hits
   - `mockserver.init()` only in `opaIframeBoot.js`
   - No `loader.paths` alias for opaIframe/flpSandbox
   - `detect-cross-window-imports.js` exits 0
   - ErrorHandler XML-parse guarded or flagged

## Worked Examples

### Example A — Pattern A (Single HTML + AllJourneys)

Namespace: `com.mycompany.myapp`, 4 OPA journeys + 2 unit tests.
After: `testsuite.qunit.js` → 5 entries (1 unit + 4 OPA). `AllJourneys.js` → `OpaSetup.js` + individual entries. Deleted: `AllJourneys.json`, `opaTests.qunit.html`, `unitTests.qunit.html`.

### Example B — Pattern B (Many Individual HTML Files)

Namespace: `com.mycompany.myapp`, 45 OPA journeys + 3 unit tests.
After: `testsuite.qunit.js` → 46 entries (1 unit + 45 OPA). `OpaSetup.js` = union of utility imports. 3 journeys with `autoWait: false` override. Deleted: 46 HTML files + `unitTests.qunit.html`.

## Important Notes

- **`runTest.js` vs `createSuite.js`**: `createSuite.js` = testsuite overview. `runTest.js` = `Test.qunit.html` for individual tests.
- **`.qunit.js` suffix rule**: Only testsuite entry keys need `.qunit.js`. Dependencies loaded via `sap.ui.define` (page objects, `OpaSetup.js`) keep plain `.js`.
- **`.qunit` in dependency paths**: `"./FilterBar.qunit"` resolves to `FilterBar.qunit.js`. Without suffix → file not found.
- **`test-resources/` prefix**: Deps under `webapp/test/` use `test-resources/<NAMESPACE>/...` not `<NAMESPACE>/test/...`.
- **Convert existing `<NAMESPACE>/test/` deps**: After Phase 5, scan ALL test `.js` files and convert to `test-resources/<NAMESPACE>/`.
- **Relative vs `test-resources/`**: Same-directory → `./`. Cross-directory → `test-resources/<NAMESPACE>/...`.
- **OpaSetup.js must NOT import `sap/ui/test/opaQunit`** — belongs in each journey file.
- **Side-effect imports go at END of dependency array** — prepending shifts parameter positions.

## Completion Checklist

| # | Check |
|---|-------|
| 1 | `Test.qunit.html` exists with `runTest.js` |
| 2 | `testsuite.qunit.html` uses `createSuite.js` |
| 3 | `testsuite.qunit.js` has `"unit/unitTests"` + all OPA journeys |
| 4 | No redundant aggregators remain |
| 5 | No stale test HTML bootstraps remain |
| 6 | `unitTests.qunit.js` references only real test files |
| 7 | OPA entry count matches parse script total |
| 8 | Dangling-entry check passes (exit 0) |
| 9 | Bootstrap overrides reported in `MODERNIZATION_ISSUES.md` (if any) |
| 10 | Launcher + FLP classified; `mixed` halted |
| 11 | If `needsIframeMigration`: iframe files exist, no inline script, no `iStartMyUIComponent` |
| 12 | If `needsIframeMigration`: no FLP hash prefix, no loader alias |
| 13 | If `needsIframeMigration`: ErrorHandler guarded or flagged |
| 14 | If `needsIframeMigration`: `detect-cross-window-imports.js` exits 0 |

## Related Skills

- **fix-csp-compliance** — old HTML inline scripts violate CSP; Test Starter removes them.
- **fix-linter-blind-spots** — catches runtime-breaking patterns the linter misses.
- **fix-js-globals (cases 1b/1c)** — handles `sap.*` globals the linter reports.
