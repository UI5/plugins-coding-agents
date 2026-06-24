# Pattern B Modernization: Many Individual HTML Files

> **Scope.** This reference assumes the launcher classification from Phase 0.2 is `iframe`. Pattern U (`in-window`, `iStartMyUIComponent`) is **not supported** in combination with Pattern B — the skill halts at Phase 0.3 if both are detected. Pattern U is currently only supported with Pattern A; see `pattern-u-iframe-migration.md`.

## Overview

Pattern B projects have a separate `*.qunit.html` file for each OPA test. Each HTML bootstraps `sap-ui-core.js`, loads utility modules, configures `Opa5.extendConfig`, and loads a journey JS file. The modernization consolidates all of this into:
- **OpaSetup.js** — union of all utility imports + common Opa5 configuration
- Individual journey entries listed directly in the main `testsuite.qunit.js` (each journey imports `OpaSetup` as a side-effect dependency)

## Step 1: Inventory Utility Modules

Find all OPA test HTML files and extract the union of utility module imports:

```bash
grep -rh "sap.ui.require" webapp/test/opa/**/*.qunit.html | head -20
```

For each HTML file, collect module paths that:
- Live under `<NAMESPACE>/test/opa/utils/` (or similar utility directories)
- Are NOT `sap/ui/test/Opa5`, `sap/ui/test/opaQunit`, or the journey module itself
- Call `Opa5.createPageObjects` (these are side-effect imports that register page objects)

Build the **union** across all HTML files. `Opa5.createPageObjects` is idempotent — re-registering is a no-op. Since each test runs in its own page (Test Starter isolation), loading ALL utilities for every test is safe. This lets you use ONE shared setup module instead of per-test dependency lists.

## Step 2: Extract Common Opa5 Config

Look at the `Opa5.extendConfig` calls across HTML files. The majority pattern is usually:
```javascript
Opa5.extendConfig({
    arrangements: new SomeArrangementClass(),
    autoWait: true,
    viewNamespace: "<NAMESPACE-WITH-DOTS>.view."
});
```

Note any deviations — the parse script flags `autoWait: false` files automatically.

## Step 3: Create OpaSetup.js

Create `webapp/test/opa/OpaSetup.js`:

```javascript
sap.ui.define([
    "sap/ui/test/Opa5",
    "sap/ui/test/opaQunit",
    // Arrangement class
    "test-resources/<NAMESPACE>/opa/utils/<ArrangementClass>",
    // ====================================================
    // Side-effect imports: utility modules that register
    // page objects via Opa5.createPageObjects().
    // Load ALL of them — it is safe because:
    //   1. Opa5.createPageObjects is idempotent
    //   2. Each test runs in its own page (Test Starter isolation)
    //   3. The small overhead is negligible vs. maintenance cost
    //      of tracking per-test dependency lists
    // ====================================================
    "test-resources/<NAMESPACE>/opa/utils/CommonActions",
    "test-resources/<NAMESPACE>/opa/utils/ListPageUtils",
    "test-resources/<NAMESPACE>/opa/utils/DetailPageUtils"
    // ... add ALL utility modules from the inventory
], function(Opa5, opaQunit, ArrangementClass) {
    "use strict";

    Opa5.extendConfig({
        arrangements: new ArrangementClass(),
        autoWait: true,
        viewNamespace: "<NAMESPACE-WITH-DOTS>.view."
    });
});
```

Only `Opa5` and the arrangement class (if used in the callback as `new ArrangementClass()`) need function parameters. Everything else is a side-effect import.

### Placement

Place at `webapp/test/opa/OpaSetup.js` so the import path is:
```javascript
"test-resources/<NAMESPACE>/opa/OpaSetup"
```

### Check for existing OpaSetup

Some projects already have an `OpaSetup.js` that was started but never fully wired up:
```bash
find webapp/test -name "OpaSetup*"
```
If one exists, read it to decide whether to extend or replace.

## Step 4: Update and Rename Journey Files

### Rename to `.qunit.js`

Pattern B journey files are typically plain `.js` files under `opa/view/`. Rename each one to `.qunit.js` so the Test Starter's default module resolution works without explicit `module` configuration:

- `opa/view/Order/DetailsPage/OrderDetails.js` → `opa/view/Order/DetailsPage/OrderDetails.qunit.js`
- `opa/view/Customer/Overview/CustomerOverview.js` → `opa/view/Customer/Overview/CustomerOverview.qunit.js`

After renaming, update all import paths that reference these files (e.g., cross-journey imports).

### Add OpaSetup dependency

Each journey file needs `OpaSetup` as a dependency:

**Before:**
```javascript
sap.ui.define(["sap/ui/test/opaQunit",
    "<NAMESPACE>/test/opa/utils/SomeUtils"
], function(opaTest) {
```

**After:**
```javascript
sap.ui.define(["sap/ui/test/opaQunit",
    "test-resources/<NAMESPACE>/opa/OpaSetup",
    "test-resources/<NAMESPACE>/opa/utils/SomeUtils"
], function(opaTest) {
```

`OpaSetup` is a side-effect import — do NOT add a function parameter for it.

### Finding all journey files

Journey files use `sap.ui.define` with `opaQunit`:
```bash
grep -rl "sap/ui/test/opaQunit\|opaTest" webapp/test/opa/view/
```

Verify the count matches the number of unique journey modules from the parse script.

## Step 5: Handle autoWait Overrides

For journey files in the parse script's `autoWaitFalseFiles` array, add a per-journey override:

```javascript
sap.ui.define(["sap/ui/test/opaQunit",
    "test-resources/<NAMESPACE>/opa/OpaSetup",
    "sap/ui/test/Opa5"
], function(opaTest, OpaSetup, Opa5) {
    "use strict";

    Opa5.extendConfig({ autoWait: false });

    QUnit.module("...");
    // ... existing test code
});
```

Since `Opa5.extendConfig` is additive, this overrides `autoWait: true` from OpaSetup. The override only affects this test's page.

## Step 6: Handle Multi-Journey HTML Files

Some legacy `*.qunit.html` pages load **more than one journey module** in the same `sap.ui.require` array, e.g.:

```js
sap.ui.require([
    "my/app/test/opa/view/Area/ApplicationTab",
    "my/app/test/opa/view/Area/SACStoryOPDetailsPage"
], function (oApplicationTab, oOPDetails) { ... });
```

Under Test Starter every entry key must resolve to a real `.qunit.js` file. The migration is therefore **one entry per loaded module**, not one entry per HTML file. Concretely:

1. **Do NOT invent a synthetic combined name** (e.g. `ApplicationTabCombined`). It looks plausible but produces a dangling testsuite entry — the file never exists, and the test runner fails to load it.
2. **Emit one testsuite entry per module** loaded by the HTML. The parse script does this automatically: when `_multiJourney` is detected it now emits one entry per element of the modules array, each with `_fromMultiModuleHtml` set to the source HTML for traceability.
3. **Halt the migration if any of the loaded modules is not present as a `.qunit.js` file** under `webapp/test/`. The legacy HTML may have aliased a non-existent module (e.g. when journeys were partially deleted but the HTML wasn't updated). Surface this as a manual review item rather than emitting a broken entry.

You can spot-check the entries the script produced:

```bash
node <skill-dir>/scripts/parse-testsuite.js webapp/test/testsuite.qunit.html webapp/test <NAMESPACE> \
  | jq -r '.entries | to_entries[] | "\(.key)\t\(.value._fromMultiModuleHtml // "")"'
```

Any entry whose target file is missing should fail the dangling-entry check in Phase 7 of the main SKILL.md.

If multiple modules genuinely need to be loaded together (shared in-page setup, ordering constraints), prefer expressing that inside `OpaSetup.js` — load both modules from there as side-effect imports — instead of synthesizing a combined wrapper.

## Building Main Testsuite Entries

### Mapping HTML paths to journey module paths

HTML files and journey files often differ in path structure:

| HTML path | Journey JS path (after rename) |
|-----------|----------------|
| `opa/Order/DetailsPage/OrderDetails.qunit.html` | `opa/view/Order/DetailsPage/OrderDetails.qunit.js` |

The parse script extracts the correct journey module path from each HTML's inner `sap.ui.require` call. Use the script output as the authoritative source for entry keys.

### Entry format

Entries go directly in the main `testsuite.qunit.js` alongside the `"unit/unitTests"` delegate. Entry keys are relative to `webapp/test/`:

```javascript
tests: {
    "unit/unitTests": { title: "Unit Tests" },
    "opa/view/Order/DetailsPage/OrderDetails": {
        title: "Order - Details"
    }
}
```

### Module property

All journey files must use the `.qunit.js` suffix so the Test Starter's default module resolution works without explicit `module` configuration. Rename plain `.js` journey files to `.qunit.js` during the modernization (see Step 4 above). After renaming, no `module: "./{name}"` override is needed in the main testsuite defaults.

### Skipped tests

For previously commented-out `addTestPage` calls:
```javascript
"view/SomeArea/SomeTest": {
    title: "Some Test (disabled)",
    skip: true
}
```

## Edge Cases

### Multiple arrangement classes

If different tests use different arrangement classes:
1. Use the most common one in OpaSetup.js
2. Override in specific journey files

### Utility modules with circular dependencies

The AMD loader handles dependency resolution. List imports in any consistent order (alphabetical is fine).

### Tests without page objects

Some OPA tests don't use page objects. They still need OpaSetup for `Opa5.extendConfig`. The extra registrations are harmless.
