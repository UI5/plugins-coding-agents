---
name: fix-linter-blind-spots
description: |
  Fix runtime-breaking patterns in JS files that the UI5 linter does NOT report. Use this skill when:
  - Tests fail after modernization with "ReferenceError", "TypeError: Cannot read properties of undefined", or "X is not defined"
  - The linter shows zero remaining errors but tests still crash at runtime
  - Phase 3, Step 3.2 of the modernize-ui5-app workflow (runs after the parallel globals batch, before fix-cyclic-deps)
  - User mentions "runtime errors after modernization", "test failures after modernization", "global namespace still used"
  - After running fix-js-globals and fix-cyclic-deps, but tests STILL fail
  - User sees "X is not a constructor" or module loading errors in test output
  The linter only checks sap.* globals in JS. App-specific namespace patterns in JavaScript (e.g., com.example.app.utils.Module)
  are invisible to it. This skill detects and fixes those patterns across ALL JS files — app source AND test.
  NOTE: App-namespace globals in XML files ARE reported by the linter (`no-globals` rule) and are handled by
  `fix-xml-globals` in Phase 3 — NOT by this skill.
---

# Fix Linter Blind Spots

This skill fixes patterns that cause runtime failures but are **not reported by the UI5 linter**. The linter's `no-globals` rule only checks `sap.*` namespaces in JS files. App-specific global namespace patterns in JavaScript — assignments, cross-module references, QUnit 1.x assertions, and sinon mocking via global chains — are invisible to it.

**IMPORTANT — Scope clarification:** This skill handles app-namespace globals in **JavaScript files only**. App-namespace globals in **XML files** (event handlers, formatters, factory functions using dotted app paths) ARE reported by the linter under the `no-globals` rule and are handled by `fix-xml-globals` in Phase 3 — NOT by this skill. Do NOT fix XML app-namespace globals here.

These patterns work in the old bootstrap model (where `jQuery.sap.declare` builds global namespace chains) but fail under strict AMD module loading (Test Starter, modern UI5).

## Scope

Scans **ALL** `.js` files:
- App source: `webapp/controller/`, `webapp/utils/`, `webapp/model/`, etc.
- Test files: `webapp/test/unit/`, `webapp/test/integration/`, `webapp/test/opa/`, etc.

## Prerequisites

Read `manifest.json` to get the namespace:
- **`<NAMESPACE>`** — slashes (e.g., `com/example/app`)
- **`<NAMESPACE-WITH-DOTS>`** — dots (e.g., `com.example.app`)

## Detection — Initial Scan

Run the bundled detection script from `<skill-dir>/scripts/detect-blind-spots.js`:

```bash
node <skill-dir>/scripts/detect-blind-spots.js <project-root>
```

The script uses a character-level scanner to distinguish namespace occurrences in bare code (findings) from those inside string literals or comments (skipped). This avoids false positives like `sap.ui.controller("com.example.app.controller.Detail")` or `Controller.extend("com.example.app.controller.Main", {` which are string arguments, not global code references.

**Output** (JSON to stdout, progress to stderr):
- `findings[]` — actionable items classified by type: `global_assignment`, `global_read`, `global_return`, `global_mock`, `global_method_call`, `missing_assert_param`, `qunit_global_assertion`, `bare_global_assertion`
- `skipped[]` — namespace occurrences deliberately ignored (in strings/comments)
- `summary` — counts by type

Each namespace finding includes `moduleName` (extracted short name, e.g., "DataService") and `namespacePath` (full dotted path, e.g., "com.example.app.utils.DataService").

## Patterns to Fix

Fix patterns in this order — Pattern 1 must complete before Pattern 2 (because Pattern 2 relies on modules having proper `return` statements from Pattern 1 fixes). Patterns 3–4 apply during every Pattern 2 fix.

### Pattern 1: Global Namespace Assignment in sap.ui.define — JS Only (Case 1b)

A JS file wrapped in `sap.ui.define` assigns to a global namespace and returns the global reference. This is a leftover from `jQuery.sap.declare` removal where the global assignment was not cleaned up.

**Scope:** JavaScript files only. The linter does NOT report app-namespace globals in JS. (App-namespace globals in XML files ARE reported by the linter and are fixed by `fix-xml-globals` in Phase 3.)

**Detection:** Use `findings` from the detection script filtered by `type: "global_assignment"` and `type: "global_return"`.

**Before:**
```javascript
sap.ui.define(["sap/base/Log"], function(Log) {
    "use strict";
    com.example.app.utils.DataService = {
        fetchData: function() { Log.info("fetching"); },
        processData: function(aItems) { return aItems.map(/*...*/); }
    };
    return com.example.app.utils.DataService;
});
```

**After:**
```javascript
sap.ui.define(["sap/base/Log"], function(Log) {
    "use strict";
    var DataService = {
        fetchData: function() { Log.info("fetching"); },
        processData: function(aItems) { return aItems.map(/*...*/); }
    };
    return DataService;
});
```

**Rules:**
- Extract the short name from the last segment of the namespace path
- Replace `<FULL.NAMESPACE.PATH>.ModuleName = {` with `var ModuleName = {`
- Replace `return <FULL.NAMESPACE.PATH>.ModuleName;` with `return ModuleName;`
- Replace any other in-file references to the full namespace with the local variable
- The `var` keyword is essential — omitting it creates an implicit global

### Pattern 2: Cross-Module Global Namespace References in JS (Case 1c Extended)

A JS file references another module via the global namespace chain instead of importing it. Three sub-cases:

**Detection:** Use `findings` from the detection script filtered by `type: "global_read"`, `type: "global_method_call"`, or `type: "global_mock"`. The script's character-level scanner automatically skips namespace occurrences inside string literals and comments — no manual filtering needed.

**Sub-case A — Module already imported under a different name:**
```javascript
// Before: dep loaded as oDependency but also accessed via global
sap.ui.define(["com/example/app/utils/Helper"], function(oDependency) {
    var oHelper = com.example.app.utils.Helper;  // redundant global read
    oHelper.doSomething();
});

// After: delete the redundant line, use the function parameter
sap.ui.define(["com/example/app/utils/Helper"], function(oDependency) {
    oDependency.doSomething();
});
```

If the parameter name doesn't match the module name (as here: `oDependency` vs `Helper`), also apply Pattern 3 to rename it.

**Sub-case B — Module not imported:**
```javascript
// Before: no import, accessed via global
sap.ui.define(["sap/base/Log"], function(Log) {
    var oHelper = com.example.app.utils.Helper;
    oHelper.doSomething();
});

// After: add as dependency
sap.ui.define([
    "com/example/app/utils/Helper",
    "sap/base/Log"
], function(Helper, Log) {
    Helper.doSomething();
});
```

**CRITICAL — Before applying Sub-case B, read the target module's `return` statement** to determine the correct replacement pattern. Not every module exports a usable value — some are side-effect-only (no AMD export). For side-effect modules, fix the target module first by adding a `return` statement and removing the global namespace assignment, then import normally. See `fix-js-globals/SKILL.md § Case 1 → "Before replacing global access, read the target module's return statement"` for the full decision table and procedure.

For test files, use `test-resources/<NAMESPACE>/` prefix instead of `<NAMESPACE>/test/`.

**Sub-case C — Self-reference (module references itself via global):**
```javascript
// Before: module object assigned to local var, then referenced via global
var DataService = { /*...*/ };
var svc = com.example.app.utils.DataService;  // self-reference
svc.process();

// After: use the local variable directly
var DataService = { /*...*/ };
DataService.process();
```

**What the detection script automatically skips — string literals:**
These contain the namespace but are NOT code references (they appear in the script's `skipped[]` output):
- Fragment names: `"com.example.app.fragment.Dialog"`
- Class extend names: `Controller.extend("com.example.app.controller.Main", {`
- Log messages: `Log.info("com.example.app.utils.Helper initialized")`
- XML fragment paths: `"com/example/app/fragment/Dialog"`
- UI5 API string arguments: `sap.ui.controller("com.example.app.controller.Detail")`

Only fix patterns where the namespace is used as a **value** (assigned to a variable, used in a property access chain, or passed as a function argument that expects an object, not a string).

### Pattern 3: Case 1c Parameter Name Verification

Before replacing a global reference with a local variable name, verify the `sap.ui.define` function parameter name matches the module's short name.

**Problem scenario:**
```javascript
sap.ui.define(["com/example/app/utils/DataService"], function(Formatter) {
    // Parameter named "Formatter" but module is "DataService"
    var oSvc = com.example.app.utils.DataService;  // global read
});
```

Naively replacing the global with `DataService` fails — the parameter is `Formatter`, not `DataService`.

**Fix steps:**
1. Parse the `sap.ui.define` dependency array and function parameter list
2. Find which parameter corresponds to the module being referenced
3. If the parameter name differs from the module name:
   - Rename the function parameter to match the module's short name
   - Update all references in the file from the old parameter name to the new one
4. Replace the global reference with the (now correct) parameter name
5. Delete any resulting self-assignment lines (`var X = X;`)

### Pattern 4: Case 1c Atomicity — Never Rename Without Import

Every global→local rename **must** be paired with an import. A renamed variable without a declaration causes `ReferenceError` — worse than leaving the global.

**Rules:**
- When replacing a global reference, always add a `sap.ui.define` dependency. Do NOT attempt to detect cycles at this stage — cycles introduced here will be detected and resolved by `fix-cyclic-deps` in Phase 3, Step 3.3 after all fix phases complete.
- After fixing a file, validate: grep for every introduced variable name and confirm it resolves to a function parameter, `var`/`let`/`const` declaration, or `sap.ui.require` call
- Well-known globals that don't need imports: `window`, `document`, `console`, `sap`, `jQuery`, `QUnit`, `sinon`

### Pattern 5: Missing `assert` Parameter in QUnit.test Callbacks

QUnit 2.x (enforced by Test Starter) requires `assert` as a function parameter. QUnit 1.x made it a global.

**Detection:** Use `findings` from the detection script filtered by `type: "missing_assert_param"`.

**Before:**
```javascript
QUnit.test("formats value correctly", function() {
    assert.equal(formatter.format(1), "One");
    assert.ok(formatter.isValid("test"));
});
```

**After:**
```javascript
QUnit.test("formats value correctly", function(assert) {
    assert.equal(formatter.format(1), "One");
    assert.ok(formatter.isValid("test"));
});
```

### Pattern 6: QUnit Global Assertions → assert / Opa5.assert

QUnit 1.x allowed calling assertion methods directly on the `QUnit` object (`QUnit.ok(...)`, `QUnit.equal(...)`). QUnit 2.x removed these — assertions go through the `assert` parameter (unit tests) or `Opa5.assert` (OPA tests).

**Detection:** Use `findings` from the detection script filtered by `type: "qunit_global_assertion"` and `type: "bare_global_assertion"`. Each finding includes `assertionName` and `replacement` (either `assert.<name>` or `Opa5.assert.<name>` depending on file location).

**Context detection:**
- File under `test/opa/` or `test/integration/` AND inside a `waitFor` success/error callback → `Opa5.assert.<assertion>`
- File under `test/unit/` or `.qunit.js` inside a `QUnit.test` callback → `assert.<assertion>` (using the function parameter)

**OPA example:**
```javascript
// Before:
success: function(aItems) {
    QUnit.ok(aItems.length > 0, "Items found");
    ok(true, "Test passed");  // bare global
}

// After:
success: function(aItems) {
    Opa5.assert.ok(aItems.length > 0, "Items found");
    Opa5.assert.ok(true, "Test passed");
}
```

Verify the file imports `sap/ui/test/Opa5` before using `Opa5.assert`. If not, add it as a dependency.

**Unit test example:**
```javascript
// Before:
QUnit.test("test name", function(assert) {
    QUnit.ok(result);
    QUnit.equal(a, b);
});

// After:
QUnit.test("test name", function(assert) {
    assert.ok(result);
    assert.equal(a, b);
});
```

**Full list of assertions to replace:**
`ok`, `equal`, `notEqual`, `deepEqual`, `notDeepEqual`, `strictEqual`, `notStrictEqual`, `propEqual`, `notPropEqual`, `throws`, `expect`, `push`

### Pattern 7: Global Namespace Mocking → sinon.stub

Tests that mock dependencies by overwriting properties on the global namespace chain fail when the chain doesn't exist.

**Detection:** Use `findings` from the detection script filtered by `type: "global_mock"`. These cover both the jQuery.extend backup and the function-override patterns that involve the **app namespace**. Mocking patterns that back up `sap.*` sub-namespaces (e.g., `sap.ushell.Container`) are out of scope — those are framework globals, not app-namespace globals.

Look for the backup-override-restore pattern:
```javascript
var oBackup = jQuery.extend(true, {}, com.example.app.utils);
com.example.app.utils.Module.method = function() { /*mock*/ };
// ... test ...
com.example.app.utils = oBackup;
```

**Before (test):**
```javascript
sap.ui.define(["com/example/app/model/formatter"], function(Formatter) {
    QUnit.test("show button", function(assert) {
        var oBackup = jQuery.extend(true, {}, com.example.app.utils);
        com.example.app.utils.Actions.getInvalidItems = function() { return []; };
        // ... test using Formatter which calls Actions.getInvalidItems ...
        com.example.app.utils = oBackup;
    });
});
```

**After (test):**
```javascript
sap.ui.define([
    "com/example/app/model/formatter",
    "com/example/app/utils/Actions"
], function(Formatter, Actions) {
    QUnit.test("show button", function(assert) {
        var oStub = sinon.stub(Actions, "getInvalidItems").returns([]);
        // ... test ...
        oStub.restore();
    });
});
```

`sinon` is globally available via the Test Starter infrastructure — no need to import it as a `sap.ui.define` dependency.

**Companion fix required:** If the app source module (e.g., `Formatter.js`) also accesses the stubbed module via the global namespace, fix it to import that module as a `sap.ui.define` dependency. Otherwise the sinon stub won't intercept the call — the app code would be accessing a different object. These cases will already appear in the detection script's `findings[]` as `global_read` or `global_method_call` — fix them as part of Pattern 2.

### Pattern 8: Legacy `"jquery.sap.global"` Dependency Path

The dependency `"jquery.sap.global"` is deprecated and must be replaced with `"sap/ui/thirdparty/jquery"`.

**Detection:** Use `findings` from the detection script filtered by `type: "legacy_jquery_dep"`. Each finding includes a `replacement` field with the correct value (`"sap/ui/thirdparty/jquery"`).

**Before:**
```javascript
sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "jquery.sap.global"
], function(Controller, jQuery) {
    "use strict";
    // ...
});
```

**After:**
```javascript
sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/thirdparty/jquery"
], function(Controller, jQuery) {
    "use strict";
    // ...
});
```

**Rules:**
- Replace `"jquery.sap.global"` with `"sap/ui/thirdparty/jquery"` in the dependency array
- Keep the corresponding function parameter name unchanged (typically `jQuery`)
- This applies to both `sap.ui.define` and `sap.ui.require` dependency arrays

## Implementation Steps

1. Read `manifest.json` for namespace. Compute `<NAMESPACE>`, `<NAMESPACE-WITH-DOTS>`, `<NS-ESCAPED>`
2. Run the detection script: `node <skill-dir>/scripts/detect-blind-spots.js <project-root>`
3. Apply Pattern 1 (global assignments) — filter findings by `type: "global_assignment"` and `type: "global_return"`. This must complete before Pattern 2, because Pattern 2 relies on modules returning local variables
4. Apply Pattern 2 (cross-module global refs) — filter findings by `type: "global_read"` and `type: "global_method_call"`. This resolves the majority of namespace references
5. Apply Pattern 3 (parameter name verification) and Pattern 4 (atomicity validation) during every Pattern 2 fix
6. Apply Patterns 5-6 (QUnit assertions) — filter findings by `type: "missing_assert_param"`, `type: "qunit_global_assertion"`, `type: "bare_global_assertion"`. Use the `replacement` field from each finding
7. Apply Pattern 7 (sinon mocking) — filter findings by `type: "global_mock"`
8. Apply Pattern 8 (legacy jQuery dependency) — filter findings by `type: "legacy_jquery_dep"`. Replace each occurrence with the value in the `replacement` field
9. Re-run the detection script and verify `findings[]` is empty (or only contains items that couldn't be fixed — e.g., Pattern 7 items that need manual review)
10. Run `npx @ui5/linter --details` as a secondary check — no new errors should be introduced
11. For findings that can't be automatically fixed (complex mocking patterns, ambiguous module boundaries), document them in MODERNIZATION-ISSUES.md with the file path, line number, and reason

## Completion Gate

Before reporting this skill as complete, verify ALL of the following:

1. **Detection script returns zero findings:** Re-run `node <skill-dir>/scripts/detect-blind-spots.js <project-root>` and confirm `summary.total === 0` (or all remaining items are documented in MODERNIZATION-ISSUES.md with justification)
2. **No new linter errors:** Run `npx @ui5/linter --details` and confirm no new errors were introduced

## Related Skills

- **fix-js-globals** — applies the same transformations (Patterns 1-4) but only for cases the linter explicitly reports as `no-globals` errors (i.e., `sap.*` globals). This skill handles app-namespace globals the linter CANNOT detect. Both skills produce the same kind of fix; the difference is how the problem is discovered.
- **fix-cyclic-deps** — runs after this skill (Phase 3, Step 3.3) to detect and resolve cyclic dependencies introduced by the `sap.ui.define` edges added in Pattern 2
- **modernize-test-starter** — test infrastructure modernization that often reveals these patterns
