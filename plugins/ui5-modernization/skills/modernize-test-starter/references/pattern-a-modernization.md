# Pattern A Modernization: Single HTML + AllJourneys

> **Scope.** This reference assumes the launcher classification from Phase 0.2 is `iframe` — i.e. the project's OPA journeys already call `iStartMyAppInAFrame` and the iframe entry HTML exists. Pattern U (`in-window`, `iStartMyUIComponent`) projects must additionally run Phase 5b after this pattern's wiring; see `pattern-u-iframe-migration.md`.

## Overview

Pattern A projects have a single `opaTests.qunit.html` that loads `AllJourneys.js`, which orchestrates all OPA test configuration and journey loading. The modernization transforms this into:
- **OpaSetup.js** — centralized Opa5 configuration and page object loading
- Individual journey entries listed directly in the main `testsuite.qunit.js` (each journey imports `OpaSetup` as a side-effect dependency)

## Step 1: Analyze AllJourneys.js

Read `AllJourneys.js` to extract:
1. **Opa5.extendConfig** settings (arrangements class, autoWait, viewNamespace, timeout, appParams, testLibs)
2. **Page object imports** (modules loaded in the `sap.ui.require` dependency array that are NOT framework modules or journeys)
3. **Journey loading mechanism** (does it use `AllJourneys.json`, hardcoded list, or query param filtering?)

Typical structure:
```javascript
// Legacy AllJourneys.js
jQuery.sap.require("sap.ui.qunit.qunit-css");
jQuery.sap.require("sap.ui.thirdparty.qunit");
QUnit.config.autostart = false;

sap.ui.require([
    "sap/ui/test/Opa5",
    "<NAMESPACE>/test/integration/pages/Common",
    "sap/ui/test/opaQunit",
    "<NAMESPACE>/test/integration/pages/ListReportPage",
    "<NAMESPACE>/test/integration/pages/ObjectPage",
    // Framework test libraries (Fiori Elements)
    "sap/suite/ui/generic/template/integration/testLibrary/ListReport/pages/ListReport",
    "sap/suite/ui/generic/template/integration/testLibrary/ObjectPage/pages/ObjectPage"
], function(Opa5, Common) {
    Opa5.extendConfig({
        arrangements: new Common(),
        viewNamespace: "<NAMESPACE-WITH-DOTS>.ext.view.",
        autoWait: true,
        timeout: 60,
        appParams: { "sap-ui-animation": false },
        testLibs: {
            fioriElementsTestLibrary: {
                Common: {
                    appId: '<NAMESPACE-WITH-DOTS>',
                    entitySet: 'SomeEntitySet'
                }
            }
        }
    });

    var sJourney = jQuery.sap.getUriParameters().get("journey");
    // ... dynamic journey loading from AllJourneys.json
});
```

## Step 2: Create OpaSetup.js

Create `webapp/test/integration/OpaSetup.js` by extracting configuration from AllJourneys.js:

```javascript
sap.ui.define([
    "sap/ui/test/Opa5",
    "sap/ui/test/opaQunit",
    // Arrangement class
    "test-resources/<NAMESPACE>/integration/pages/Common",
    // Page objects (side-effect imports — register via Opa5.createPageObjects or extend the test library)
    "test-resources/<NAMESPACE>/integration/pages/ListReportPage",
    "test-resources/<NAMESPACE>/integration/pages/ObjectPage",
    // Framework test libraries (if used)
    "sap/suite/ui/generic/template/integration/testLibrary/ListReport/pages/ListReport",
    "sap/suite/ui/generic/template/integration/testLibrary/ObjectPage/pages/ObjectPage"
], function(Opa5, opaQunit, Common) {
    "use strict";

    Opa5.extendConfig({
        arrangements: new Common(),
        viewNamespace: "<NAMESPACE-WITH-DOTS>.ext.view.",
        autoWait: true,
        timeout: 60,
        appParams: {
            "sap-ui-animation": false
        },
        testLibs: {
            fioriElementsTestLibrary: {
                Common: {
                    appId: "<NAMESPACE-WITH-DOTS>",
                    entitySet: "SomeEntitySet"
                }
            }
        }
    });
});
```

Key points:
- Only `Opa5` and the arrangement class need function parameters. Everything else is a side-effect import.
- `opaQunit` is loaded for its side effect (making `opaTest` available).
- Preserve ALL `testLibs` configuration exactly as found in AllJourneys.js.
- Preserve `timeout`, `appParams`, and any other non-default settings.

## Step 3: Rename Journey Files to `.qunit.js`

The main `testsuite.qunit.js` does not set `module: "./{name}"`, so Test Starter appends `.qunit` to each entry key when resolving modules. Journey files must use the `.qunit.js` suffix to match.

Rename each journey file:
- `ListReportJourney.js` → `ListReportJourney.qunit.js`
- `ObjectPageJourney.js` → `ObjectPageJourney.qunit.js`
- etc.

After renaming, update all import paths that reference these files (e.g., cross-journey imports). The old `AllJourneys.js` is replaced as follows:
- Opa5 configuration → `OpaSetup.js`
- Journey list → individual entries in the main `testsuite.qunit.js`
- Query param routing → no longer needed (Test Starter handles per-test isolation)

## Step 4: Update Journey Files — Add OpaSetup Dependency

Each journey file needs `OpaSetup` as a dependency to ensure page objects are registered before tests run:

**Before:**
```javascript
sap.ui.define(["sap/ui/test/opaQunit"], function(opaTest) {
```

**After:**
```javascript
sap.ui.define(["sap/ui/test/opaQunit",
    "test-resources/<NAMESPACE>/integration/OpaSetup"
], function(opaTest) {
```

`OpaSetup` is a side-effect import — do NOT add a function parameter for it.

## Step 5: Handle Fiori Elements Test Libraries

If the project uses Fiori Elements test library page objects (e.g., `sap/suite/ui/generic/template/integration/testLibrary/...`), ensure these are preserved in OpaSetup.js. They register page objects like `onTheGenericListReport` and `onTheGenericObjectPage` that journeys depend on.

The `testLibs` configuration in `Opa5.extendConfig` is essential for Fiori Elements — it configures the `appId` and `entitySet` that the generic test library uses to find the right app context.

## Step 6: Handle Actions Modules

Some Pattern A projects have separate `actions/` directories with action modules. These are typically imported directly by page objects or journeys, not as side effects. Verify whether they need to be in OpaSetup.js by checking if they use `Opa5.createPageObjects` or `Action.extend`.

## Edge Cases

### jQuery.sap.require in AllJourneys.js

Legacy `jQuery.sap.require("sap.ui.qunit.qunit-css")` etc. are removed entirely — the Test Starter handles QUnit/Sinon loading.

### QUnit.config.autostart = false

Removed — the Test Starter manages QUnit lifecycle.

### jQuery.sap.getUriParameters routing

The `?journey=` query parameter filtering in AllJourneys.js is no longer needed. Test Starter runs each testsuite entry in its own page, providing natural isolation. Remove the entire routing block.

### Multiple arrangement classes

If different journeys use different arrangement classes, use the most common one in OpaSetup.js and override in specific journey files using `Opa5.extendConfig({ arrangements: new OtherArrangement() })`.
