---
name: fix-js-globals
description: |
  Fix JavaScript `no-globals` errors that UI5 linter reports but cannot auto-fix. Use this skill when linter outputs:
  - `no-globals` rule with message "Access of global variable '...' (...)" in JS files
  Cases handled (linter CANNOT auto-fix):
  - Assignments to global namespaces: `sap.myNamespace = {...}`
  - Global namespace assignment/read inside sap.ui.define
  - Delete expressions: `delete sap.something`
  - sap.ui.core.Core direct access (class vs singleton)
  - jQuery/$ globals: add `sap/ui/thirdparty/jquery` — do NOT replace jQuery API calls
  - jQuery.sap.* utilities: replace with dedicated modules
  - Conditional/probing access: `if (sap.ui.something)`
  - Custom namespace definitions that aren't UI5 modules
  - sap.ui.controller() factory → Controller.extend (NOT Fiori Elements extensions)
  - jQuery.sap.declare/require: legacy modules without sap.ui.define
  Trigger when: "fix no-globals", "global variable error", "sap.ui.getCore", "jQuery.sap"
  Converts global namespace access to proper sap.ui.define module imports.
---

# Fix JavaScript Global Access (no-globals)

Fixes `no-globals` errors in JavaScript files that the UI5 linter detects but cannot auto-fix. Run `npx @ui5/linter --details` to get replacement suggestions and documentation links.

## Key Rules — Read Before Applying Any Fix

1. **jQuery/$ globals — preserve jQuery API calls**: When fixing jQuery/$ globals, ONLY add the `sap/ui/thirdparty/jquery` dependency and replace `$` with `jQuery`. Do NOT replace standard jQuery API calls (`jQuery.each`, `jQuery.extend`, `jQuery.proxy`, `jQuery.isEmptyObject`, etc.) with native JavaScript equivalents. These are standard jQuery methods, not deprecated SAP APIs.

2. **Case 9/10 — fix ALL globals in a single pass**: When converting a file from `jQuery.sap.declare`/`require` to `sap.ui.define` (Case 9 or 10), you MUST also fix ALL other global-access patterns inside the file body in the same pass. There is no second pass — everything must be handled at once. Read the "Apply ALL Applicable Cases in a Single Pass" section below.

3. **Dead code — delete, don't import**: If a global assignment stores a value that is never read anywhere else in the file (e.g., `this.BarColor = sap.ui.core.BarColor` where `this.BarColor` never appears again), delete the entire statement. Do NOT add an import for it.

4. **No intermediate forms for byId in controllers**: `sap.ui.getCore().byId("prefix--id")` or `jQuery("#prefix--id").control(0)` inside a controller → `this.byId("id")` directly. Never leave it as `Element.getElementById("prefix--id")`. After replacing, remove unused `Element` or `jQuery` imports.

5. **merge, not deepExtend**: `jQuery.sap.extend(true, ...)` → `merge()` from `sap/base/util/merge`. The module `sap/base/util/deepExtend` does NOT exist.

## Fix Strategies by Case

### 1. Assignments to Global Namespaces

**Problem**: Code creates custom namespaces on the global `sap` object.

```javascript
// Before
sap.ui.demo = sap.ui.demo || {};
sap.ui.demo.myApp = { formatter: function() { ... } };

// After — convert to AMD module
sap.ui.define("sap/ui/demo/myApp", [], function() {
    "use strict";
    return { formatter: function() { ... } };
});
```

### 1b. Global Namespace Assignment Inside sap.ui.define

**Problem**: File is already in `sap.ui.define` but still assigns to a global namespace and returns the global reference (leftover from `jQuery.sap.declare` removal).

**Not reported by linter** — search manually: `grep -rl "your\.project\.namespace\." webapp/ --include="*.js"`

```javascript
// Before
sap.ui.define([], function() {
    "use strict";
    com.example.app.utils.MyScripts = { runTests: function() { ... } };
    return com.example.app.utils.MyScripts;
});

// After — local variable replaces global assignment
sap.ui.define([], function() {
    "use strict";
    var MyScripts = { runTests: function() { ... } };
    return MyScripts;
});
```

**Key rules**: Extract short name from namespace end. Use `var ShortName` (scoping is essential). Replace all references to the full namespace within the file.

### 1c. Global Namespace Read-Only Reference Inside sap.ui.define

**Problem**: File reads from a global namespace via variable assignment instead of importing the module as a dependency.

**Not reported by linter** — search: `grep -rn "var .* = your\.project\.namespace\." webapp/ --include="*.js"`

```javascript
// Before
sap.ui.define(["sap/ui/core/mvc/Controller"], function(Controller) {
    var Helper = com.example.app.utils.Helper;
    // ...
});

// After — add as dependency, remove local var assignment
sap.ui.define([
    "com/example/app/utils/Helper",
    "sap/ui/core/mvc/Controller"
], function(Helper, Controller) {
    // Helper is now available via dependency parameter
});
```

**Key rules:**
1. Convert dot-notation to slash-notation: `com.example.app.utils.Helper` → `"com/example/app/utils/Helper"`
2. Add to dependency array at the **beginning** (see Notes), add corresponding parameter
3. Remove the `var X = global.namespace.X;` line
4. If multiple global reads exist, add all as dependencies in one pass
5. Verify parameter name matches the module's short name
6. **Atomicity**: Every global→local replacement MUST be paired with a `sap.ui.define` dependency. Cycles introduced here are resolved later by `fix-cyclic-deps`
7. **Post-fix validation**: Grep for every introduced variable name — confirm it resolves to a parameter, var/let/const, or `sap.ui.require` call

**Before replacing, read the target module's `return` statement:**

| Module's `return` | How to use the dependency parameter |
|---|---|
| Returns a class | `new MyClass()` or `MyClass.staticMethod()` |
| Returns a wrapper | `MyModule.getInstance()` |
| Returns an instance | `myInstance.method()` directly |
| Returns nothing (side-effect only) | Fix the target module first — add a `return` |

**Side-effect modules**: If the target ends with `});` without a `return`, open it, replace the global namespace assignment with a local var, and add `return varName;`. Then import normally in the consuming module.

### 2. sap.ui.getCore() Calls

**Problem**: `sap.ui.getCore()` is deprecated; its methods have moved to dedicated modules.

```javascript
// Before — standalone init script (NOT a controller)
sap.ui.getCore().attachInit(function() { ... });

// After
sap.ui.define(["sap/ui/core/Core"], function(Core) {
    Core.ready().then(function() { ... });
});
```

**Note**: `Core.ready()` is for boot-phase init scripts. Inside controllers, UI5 is already initialized — don't use it there.

**Key replacements** (full table in `references/core-api-replacements.md`):

| Deprecated | Module | Call |
|---|---|---|
| `sap.ui.getCore().attachInit(fn)` | `sap/ui/core/Core` | `Core.ready().then(fn)` |
| `sap.ui.getCore().byId(id)` | `sap/ui/core/Element` | `Element.getElementById(id)` — in controllers prefer `this.byId()` |
| `sap.ui.getCore().getEventBus()` | `sap/ui/core/EventBus` | `EventBus.getInstance()` |
| `sap.ui.getCore().getLibraryResourceBundle(lib)` | `sap/ui/core/Lib` | `Lib.getResourceBundleFor(lib)` |

Use the **UI5 MCP Server's `get_api_reference` tool** for additional Core method replacements.

### 3. sap.ui.core.Core Direct Access

Add `sap/ui/core/Core` to the dependency array and remove the global access:

```javascript
// Before: var Core = sap.ui.core.Core;
// After: add "sap/ui/core/Core" to deps, use Core parameter directly
```

### 4. jQuery/$ Global Access

**IMPORTANT**: The fix is adding the import, NOT replacing jQuery API calls. `jQuery.sap.*` (with `.sap.`) = deprecated, must be replaced (Case 4b). `jQuery.*` (without `.sap.`) or `jQuery(...)` = standard jQuery, keep as-is.

```javascript
// Before
jQuery("#el").addClass("x");
$(".container").css("display", "block");
jQuery.each(items, function(i, item) { ... });

// After — add dependency, rename $ to jQuery, keep all API calls unchanged
sap.ui.define([..., "sap/ui/thirdparty/jquery"], function(..., jQuery) {
    jQuery("#el").addClass("x");
    jQuery(".container").css("display", "block");
    jQuery.each(items, function(i, item) { ... });
});
```

**NEVER replace these standard jQuery methods** — they are not deprecated in UI5: `jQuery.each`, `jQuery.extend`, `jQuery.proxy`, `jQuery.isEmptyObject`, `jQuery.isArray`, `jQuery.inArray`, `jQuery.grep`, `jQuery.map`, `jQuery.type`, `jQuery.trim`.

### 4a. jQuery DOM Lookup for UI5 Controls → this.byId()

**Problem**: `jQuery("#prefix--id").control(0)` or `Element.closestTo()` to get a UI5 control inside a controller.

**Detection patterns** — all collapse to `this.byId("<local-id>")`:
- `jQuery("#<anything>--<id>").control(0)`
- `Element.closestTo(jQuery("#<anything>--<id>")[0])`
- `sap.ui.getCore().byId("<full-id>")` where ID contains view prefix
- `Element.getElementById("<full-id>")` where ID contains `--`

The local ID is the part after the last `--`. After replacing, remove unused `jQuery`/`Element` imports.

### 4b. jQuery.sap.* Utility Access

**Problem**: `jQuery.sap.*` calls are deprecated UI5 utilities with dedicated replacement modules.

```javascript
// Before
jQuery.sap.log.info("msg");
var sId = jQuery.sap.uid();

// After
sap.ui.define([..., "sap/base/Log", "sap/base/util/uid"], function(..., Log, uid) {
    Log.info("msg");
    var sId = uid();
});
```

Run `npx @ui5/linter --details` for suggested replacements. Full table in `references/core-api-replacements.md`.

**`jQuery.sap.extend` decision:**
- Deep copy (`true` as first arg) → `sap/base/util/merge` → `merge({}, obj1, obj2)`
- Flat objects (single-level properties) → `Object.assign({}, obj1, obj2)` (no import needed)
- **NEVER** convert to `jQuery.extend(...)` (introduces unnecessary dependency)
- **NEVER** use `sap/base/util/deepExtend` (does NOT exist)

### 5. Conditional/Probing Global Access

**Problem**: Code checks if a global exists: `if (sap.ui.fl && sap.ui.fl.Utils) { ... }`

**Fix**: For always-available modules, add as `sap.ui.define` dependency. For truly optional modules, use synchronous `sap.ui.require`:

```javascript
var FlUtils = sap.ui.require("sap/ui/fl/Utils");
if (FlUtils) { FlUtils.getComponentClassName(this); }
```

For lazy loading, use async: `sap.ui.require(["module/path"], function(Mod) { ... })`.

### 6. Custom Namespace Definitions

Same pattern as Case 1 but for non-SAP namespaces (`window.mycompany.myapp = {...}`). Convert to `sap.ui.define` module returning the object. Consumers import via dependency.

### 7. Binding Type Strings Without Import

```javascript
// Before — global reference as string
value: { path: "/amount", type: "sap.ui.model.type.Float" }

// After — import type module, use class reference
value: { path: "/amount", type: new FloatType() }  // FloatType from "sap/ui/model/type/Float"
```

### 8. Delete Expressions

`delete sap.ui.core.someTempProperty` — usually a code smell. Remove entirely or use a local object.

### 9. sap.ui.controller() — Controller Definition via Global Factory

**Scope**: Plain controller definitions. NOT Fiori Elements V2 extensions (use `fix-fiori-elements-extensions` for those).

**Detection**: `grep -rn 'sap\.ui\.controller(' webapp/ --include="*.js"`
- Two arguments `sap.ui.controller("name", {...})` = **definition** → fix here
- One argument `sap.ui.controller("name")` = **instance lookup** → document in `MODERNIZATION-ISSUES.md`

#### Pattern A: Inside existing sap.ui.define

```javascript
// Before
sap.ui.define(["sap/m/MessageBox"], function(MessageBox) {
    return sap.ui.controller("my.app.controller.Main", { ... });
});

// After — add Controller dep, replace factory with extend
sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/m/MessageBox"
], function(Controller, MessageBox) {
    return Controller.extend("my.app.controller.Main", { ... });
});
```

#### Pattern B: Without sap.ui.define (legacy module system)

```javascript
// Before
jQuery.sap.declare("my.app.controller.Detail");
jQuery.sap.require("sap.ui.core.mvc.Controller");
sap.ui.controller("my.app.controller.Detail", { onInit: function() { ... } });

// After
sap.ui.define(["sap/ui/core/mvc/Controller"], function(Controller) {
    "use strict";
    return Controller.extend("my.app.controller.Detail", { onInit: function() { ... } });
});
```

Steps: Remove `jQuery.sap.declare`/`require`. Wrap in `sap.ui.define`. Convert dot-notation deps to slash-notation. Replace `sap.ui.controller` with `Controller.extend`. Add `return`. Add `"use strict"`. **Apply all inline fixes to file body** (see "Apply ALL" section).

#### Edge cases
- **Missing `return`**: `Controller.extend()` only returns the class — always add `return` before it
- **Module-level variables before definition**: Keep as-is, just wrap the extend call with `return`
- **Controller name must match file path**: Keep existing name even if mismatched (may be intentional)
- **Mixed file (definition + instance lookups)**: Fix the definition, document instance lookups in `MODERNIZATION-ISSUES.md`

### 10. jQuery.sap.declare/require — Legacy Module Definitions

Same structural conversion as Case 9 Pattern B but for non-controller modules:

```javascript
// Before
jQuery.sap.declare("my.app.util.Formatter");
jQuery.sap.require("sap.ui.core.format.DateFormat");
my.app.util.Formatter = { formatDate: function(oDate) { ... } };

// After
sap.ui.define(["sap/ui/core/format/DateFormat"], function(DateFormat) {
    "use strict";
    return { formatDate: function(oDate) { ... } };
});
```

**Key rules**: Remove `jQuery.sap.declare`. Convert `jQuery.sap.require` to deps. Remove global assignment, `return` the object. If already has `sap.ui.define`, merge remaining requires into existing dep array. Dynamic/conditional requires → `sap.ui.require(["..."], callback)`. Multiple declares or unclear exports → flag for manual review. **Apply all inline fixes** (see "Apply ALL" section).

### 11. Runtime Globals as Module Imports

**Problem**: Runtime modules like `sap.ushell.Container` accessed via global namespace chains.

```javascript
// Before
if (sap.ushell && sap.ushell.Container) {
    sap.ushell.Container.getService("CrossApplicationNavigation");
}

// After — add as dependency
sap.ui.define(["sap/ushell/Container", ...], function(Container, ...) {
    if (Container && Container.getService) {
        Container.getService("CrossApplicationNavigation");
    }
});
```

**Test-side**: Stub the imported module directly with `sinon`. Do NOT set up global namespace chains (`window.sap.ushell = {...}`). `sinon` and `QUnit` are Test Starter globals — no import needed.

```javascript
sap.ui.define(["sap/ushell/Container"], function(Container) {
    var oSandbox = sinon.createSandbox();
    QUnit.test("...", function(assert) {
        oSandbox.stub(Container, "setDirtyFlag");
        // ...
    });
});
```

### 12. Sync XHR Guards After jQuery.sap.sjax Modernization

After modernizing `jQuery.sap.sjax` to native `XMLHttpRequest`, always guard `xhr.responseText` with a status check:

```javascript
var xhr = new XMLHttpRequest();
xhr.open("GET", sUrl, false);
xhr.send();
if (xhr.readyState === 4 && xhr.status === 200) {
    var oData = JSON.parse(xhr.responseText);
} else {
    Log.error("Failed to load: " + sUrl);
}
```

| Context | Fallback on failure |
|---------|---|
| Mock server response handler | `oXhr.respondJSON(200, {}, JSON.stringify({"d": {"results": []}}))` |
| JSON.parse of response | Return `{}` (lets existing `if (oResponse.data)` guards work) |
| Init-time config loading | Early return with `Log.error(...)` |

## CRITICAL: Apply ALL Applicable Cases in a Single Pass

When a file triggers Case 9 or 10, fix ALL global-access patterns in the same pass:

1. `jQuery("#...")` or `jQuery(...)` calls? → Case 4a or 4
2. `sap.ui.getCore().byId(...)` calls? → Case 2, then Case 4a if in controller
3. `jQuery.sap.*` calls? → Case 4b
4. `sap.ui.model.*`, `sap.m.*`, `sap.ui.core.*` inline class references? → dependency imports
5. App-namespace global references? → dependency imports
6. Unused imports after replacements? → remove from dep array and parameters
7. `this.X = importedModule.X` where `this.X` is never read elsewhere? → DELETE (dead code)

## Implementation Steps

1. Run `npx @ui5/linter --details` to get replacement suggestions
2. Identify error pattern and determine case type
3. Apply the appropriate transformation (add deps, replace globals, remove dead code)
4. After replacing jQuery DOM lookups with `this.byId()`, remove unused imports
5. Verify no other files depend on a removed global assignment

## Notes

- **Dependency insertion position — critical**: Always add new dependencies at the **beginning** of the array (and corresponding parameters at the beginning of the function). Many legacy files have dep/param count mismatches (trailing side-effect imports without parameters). Inserting at the end shifts existing mappings; inserting at the beginning preserves them.

  ```javascript
  // Before (3 deps, 2 params — mismatch is common in legacy code)
  sap.ui.define(["sap/ui/core/mvc/Controller", "sap/m/MessageToast", "some/sideEffect/Module"
  ], function(Controller, MessageToast) { ... });

  // After — new dep added at BEGINNING
  sap.ui.define(["sap/ui/core/Element", "sap/ui/core/mvc/Controller", "sap/m/MessageToast", "some/sideEffect/Module"
  ], function(Element, Controller, MessageToast) { ... });
  ```

- Parameter names should match the module's default export name (e.g., `Log` for `sap/base/Log`)
- `QUnit`, `sinon` are intentionally allowed globals in test files
- `sap.ui.define`, `sap.ui.require`, `sap.ui.loader.config` are allowed globals
- Use `sap.ui.require("module/path")` (sync, returns undefined if not loaded) for optional deps
- Use `sap.ui.require(["module/path"], callback)` (async) for lazy loading

## Example Fix Session

For a comprehensive before/after example combining multiple case types, read `references/example-fix-session.md`.

## Related Skills

- **fix-fiori-elements-extensions**: For `sap.ui.controller()` in Fiori Elements V2 apps with `registerControllerExtensions` or manifest `sap.ui.controllerExtensions`
- **fix-pseudo-modules**: For `no-pseudo-modules` and `no-implicit-globals` errors (enum imports, DataType imports, OData expression functions)
- **fix-control-renderer**: For renderer-specific issues (`no-deprecated-control-renderer-declaration`, `apiVersion`, `IconPool`, `rerender`)
- **fix-xml-globals**: For `no-globals` in XML views/fragments (formatters, event handlers via `core:require`)
- **fix-linter-blind-spots**: For runtime-breaking global namespace patterns the linter doesn't detect (app-specific namespaces outside `sap.*`). Cases 1b and 1c overlap with patterns 1-4 in that skill.
- **fix-cyclic-deps**: When Case 1c fixes would create cyclic dependencies, use lazy `sap.ui.require` instead of normal `sap.ui.define` deps
