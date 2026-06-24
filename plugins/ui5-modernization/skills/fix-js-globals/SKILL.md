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

This skill fixes `no-globals` errors in JavaScript files that the UI5 linter detects but cannot auto-fix. The linter's auto-fix only works for simple read-access patterns; this skill handles the complex cases.

## Linter Rule

| Rule ID | Message Pattern |
|---------|-----------------|
| `no-globals` | Access of global variable '...' (...) |

## Getting More Information with --details

Run the linter with the `--details` flag to get additional information about deprecated APIs and their replacements:

```bash
npx @ui5/linter --details
```

This provides:
- Links to API documentation
- Suggested replacement modules
- Modernization guidance for deprecated APIs

Example output with --details:
```
App.controller.js:5:1 error Access of global variable 'getCore' (sap.ui.getCore)  no-globals
  Details: Do not use global variables to access UI5 modules or APIs.
  See: https://ui5.sap.com/#/topic/28fcd55b04654977b63dacbee0552712
```

## When Autofix Works vs When It Doesn't

### Linter CAN Auto-fix
- Simple property access: `sap.m.Button` → adds to `sap.ui.define` dependencies
- Method calls on known modules: `sap.ui.require(...)` (allowed)

### Linter CANNOT Auto-fix (This Skill Handles)
1. **Assignments to globals**: `sap.myNamespace = {...}`
1b. **Global namespace assignment inside sap.ui.define**: `my.app.Module = {...}; return my.app.Module;` — already in AMD module but still using global namespace for assignment/return
1c. **Global namespace read-only reference inside sap.ui.define**: `var x = com.example.app.utils.Helper` — already in AMD module but reads from a global namespace instead of importing it as a dependency
2. **Delete expressions**: `delete sap.something`
3. **sap.ui.core.Core access**: Global provides class, module provides singleton
4. **jQuery/$ globals**: `jQuery(...)`, `$(".selector")`, `jQuery.each()`, `jQuery.extend()`, `jQuery.proxy()` — add `sap/ui/thirdparty/jquery` dependency, replace `$` with dependency variable, keep all jQuery API calls unchanged
4b. **jQuery.sap.* utilities**: `jQuery.sap.log`, `jQuery.sap.uid`, etc. — replace with dedicated modules
5. **Conditional/probing access**: `if (sap.ui.something)`
6. **Custom namespace definitions**: Non-UI5 module namespaces
7. **Binding type strings**: `type: "sap.ui.model.type.Integer"` without import
8. **sap.ui.getCore() calls**: Needs special transformation
9. **sap.ui.controller() factory**: Controller definition or instantiation via deprecated global
10. **jQuery.sap.declare/require**: Legacy module definitions without sap.ui.define wrapper
11. **Runtime globals as module imports**: `sap.ushell.Container` and other runtime-provided modules accessed via global namespace chains — add as `sap.ui.define` dependency
12. **Sync XHR guards**: After modernizing `jQuery.sap.sjax` to native `XMLHttpRequest`, guard `xhr.responseText` with `readyState === 4 && status === 200`

## Key Rules — Read Before Applying Any Fix

1. **jQuery/$ globals — preserve jQuery API calls**: When fixing jQuery/$ globals, ONLY add the `sap/ui/thirdparty/jquery` dependency and replace `$` with `jQuery`. Do NOT replace standard jQuery API calls (`jQuery.each`, `jQuery.extend`, `jQuery.proxy`, `jQuery.isEmptyObject`, etc.) with native JavaScript equivalents. These are standard jQuery methods, not deprecated SAP APIs.

2. **Case 9/10 — fix ALL globals in a single pass**: When converting a file from `jQuery.sap.declare`/`require` to `sap.ui.define` (Case 9 or 10), you MUST also fix ALL other global-access patterns inside the file body in the same pass. After the structural conversion, scan the entire file for: `jQuery("#prefix--id").control(0)` → `this.byId("id")`, `sap.ui.getCore().byId(...)` → `this.byId(...)`, `jQuery.sap.*` utilities → dedicated modules, inline class references like `new sap.ui.model.json.JSONModel()` → imported dependency. There is no second pass — everything must be handled at once. Read the "Apply ALL Applicable Cases in a Single Pass" section below.

3. **Dead code — delete, don't import**: If a global assignment stores a value that is never read anywhere else in the file (e.g., `this.BarColor = sap.ui.core.BarColor` where `this.BarColor` never appears again), delete the entire statement. Do NOT add an import for it — that would introduce an unused dependency.

4. **No intermediate forms for byId in controllers**: `sap.ui.getCore().byId("prefix--id")` or `jQuery("#prefix--id").control(0)` inside a controller → `this.byId("id")` directly. Never leave it as `Element.getElementById("prefix--id")` — if the ID contains `--` and you're inside the owning controller, collapse it to `this.byId()` in one step. After replacing, if `Element` or `jQuery` are no longer used elsewhere in the file, remove them from the dependency array.

5. **merge, not deepExtend**: `jQuery.sap.extend(true, ...)` → `merge()` from `sap/base/util/merge`. The module `sap/base/util/deepExtend` does NOT exist — importing it will cause a runtime error. The module is called `merge` and it performs deep copy.

## Fix Strategies by Case

### 1. Assignments to Global Namespaces

**Problem**: Code creates custom namespaces on the global `sap` object.

```javascript
// Before - CANNOT be auto-fixed
sap.ui.demo = sap.ui.demo || {};
sap.ui.demo.myApp = {
    formatter: function() { ... }
};
```

**Fix Strategy**: Convert to proper AMD module definition.

```javascript
// After - myApp.js
sap.ui.define("sap/ui/demo/myApp", [], function() {
    "use strict";
    return {
        formatter: function() { ... }
    };
});
```

### 1b. Global Namespace Usage Inside sap.ui.define / sap.ui.require

**Problem**: File is already wrapped in `sap.ui.define` but still assigns to a deeply-nested global namespace and returns the global reference. This is a leftover from modernization where `jQuery.sap.declare` was removed but the global assignment pattern was not cleaned up.

**Important — not reported by linter**: The UI5 linter does NOT flag this pattern as a `no-globals` error because the global namespace path (e.g., `com.example.app.test.utils.MyTestScripts`) is not in the `sap.*` namespace that the linter checks. You must **actively search** for this pattern using grep:

```bash
# Search for global namespace assignments inside sap.ui.define modules
grep -rl "your\.project\.namespace\." webapp/ --include="*.js"
```

Look for lines matching: `<project.namespace>.<path>.<ModuleName> = {` and `return <project.namespace>.<path>.<ModuleName>;`

```javascript
// Before - CANNOT be auto-fixed
sap.ui.define([], function() {
    "use strict";
    com.example.app.test.utils.MyTestScripts = {
        runTests: function(Given, When, Then) { ... },
        checkSomething: function() { ... }
    };
    return com.example.app.test.utils.MyTestScripts;
});
```

**Fix Strategy**: Replace the global namespace assignment with a local variable and return that instead. The module path in `sap.ui.define` already ensures this file is loadable by its namespace — the global assignment is redundant.

```javascript
// After
sap.ui.define([], function() {
    "use strict";
    var MyTestScripts = {
        runTests: function(Given, When, Then) { ... },
        checkSomething: function() { ... }
    };
    return MyTestScripts;
});
```

**Key rules:**
- Extract the short name from the end of the namespace (e.g., `com.example.app.test.utils.MyTestScripts` → `MyTestScripts`)
- Replace the assignment target with `var ShortName` — the `var` keyword is essential to scope the variable locally; omitting it would create an implicit global
- Replace the `return full.namespace.path.ShortName;` with `return ShortName;`
- Also replace any other references to the full namespace path within the same file with the local variable name
- This applies to any custom namespace, not just `sap.*`

### 1c. Global Namespace Read-Only Reference Inside sap.ui.define

**Problem**: File is already wrapped in `sap.ui.define` but reads from a global namespace via a local variable assignment instead of importing the module as a dependency. The referenced module exists as a proper AMD module elsewhere — but this consumer file still accesses it through the legacy global namespace.

This is a different pattern from 1b: there is **no assignment to** the global namespace, only a **read from** it. The file does not define the module — it consumes it.

**Important — not reported by linter**: Like 1b, the UI5 linter does NOT flag this pattern when the namespace is outside `sap.*`. Search for it with grep:

```bash
# Search for read-only global namespace references inside sap.ui.define modules
grep -rn "var .* = your\.project\.namespace\." webapp/ --include="*.js"
```

Look for lines matching: `var <LocalName> = <project.namespace>.<path>.<ModuleName>;`

```javascript
// Before - CANNOT be auto-fixed
sap.ui.define([
    "sap/ui/core/mvc/Controller"
], function(Controller) {
    "use strict";

    var Helper = com.example.app.utils.Helper;

    return Controller.extend("com.example.app.controller.Main", {
        onInit: function() {
            Helper.doSomething();
        }
    });
});
```

**Fix Strategy**: Add the referenced module as a dependency to `sap.ui.define` and remove the local variable assignment. The dependency parameter replaces the local variable — since they typically share the same name, all downstream usage works without further changes.

```javascript
// After
sap.ui.define([
    "com/example/app/utils/Helper",
    "sap/ui/core/mvc/Controller"
], function(Helper, Controller) {
    "use strict";

    return Controller.extend("com.example.app.controller.Main", {
        onInit: function() {
            Helper.doSomething();
        }
    });
});
```

**Key rules:**
- Convert the dot-notation namespace to a slash-notation module path: `com.example.app.utils.Helper` → `"com/example/app/utils/Helper"`
- Add the module path to the `sap.ui.define` dependency array (at the **beginning**, per the dependency insertion rule in the Notes section)
- Add a corresponding parameter name to the factory function (matching the local variable name that was used)
- Remove the `var <Name> = <global.namespace>;` line — the dependency parameter now serves the same purpose
- If the file has **multiple** read-only global namespace references, add all of them as dependencies in a single pass
- **Parameter name verification**: Before replacing a global reference, verify that the `sap.ui.define` function parameter name matches the module's short name. If the module is already a dependency but the parameter has a different name (e.g., `function(Formatter)` for a `DataService` module), rename the parameter to match the module name first, then replace global references. Delete any resulting `var X = X;` self-assignment lines.
- **Atomicity — never rename without an import**: Every global→local replacement MUST be paired with a `sap.ui.define` dependency. A renamed variable without a declaration causes `ReferenceError` — worse than leaving the global. Do NOT attempt to detect cycles at this stage — cycles introduced here will be detected and resolved by `fix-cyclic-deps` in Phase 3, Step 3.3 after all fix steps complete.
- **Post-fix validation**: After fixing a file, grep for every introduced variable name and confirm it resolves to a function parameter, `var`/`let`/`const` declaration, or `sap.ui.require` call. Well-known globals that don't need imports: `window`, `document`, `console`, `sap`, `jQuery`, `QUnit`, `sinon`, `assert`.

  **Concrete example — stashed enum/constant that is never consumed:**
  ```javascript
  // Before (app_before): global stash that nothing ever reads
  this.BarColor = sap.ui.core.BarColor;  // ← this.BarColor never used elsewhere

  // WRONG fix: importing the library just to keep the dead assignment
  // sap.ui.define(["sap/ui/core/library"], function(coreLibrary) {
  //     this.BarColor = coreLibrary.BarColor;  ← STILL dead code!

  // CORRECT fix: DELETE both the assignment and the import entirely
  // (no sap/ui/core/library import, no this.BarColor line)
  ```

  **How to verify**: grep the entire project (JS files, XML views, JSON models) for any read of `this.BarColor`, `BarColor`, or `{BarColor}`. If the only occurrence is the assignment itself → it's dead code → delete it.

**CRITICAL — Before replacing global access, read the target module's `return` statement:**

Not every module exports a usable value. Before replacing `global.namespace.Module` with a dependency parameter, open the target module file and check what it returns:

| Module's `return` | Dependency parameter | How to use |
|---|---|---|
| Returns a class (`return MyClass;`) | `MyClass` | `new MyClass()` or `MyClass.staticMethod()` |
| Returns a wrapper (`return { getInstance: fn }`) | `MyModule` | `MyModule.getInstance()` — NOT `new MyModule()` |
| Returns an instance (`return new MyClass()`) | `myInstance` | `myInstance.method()` directly |
| Returns nothing (side-effect only) | Fix the module first — see below | Then import normally |

**Side-effect modules (no AMD export) — fix the target module first:**

Some libraries (especially custom reuse libraries) register on the global namespace but do NOT return a value. Instead of working around this with an unused `_` parameter, **fix the target module** to export properly:

1. Open the target side-effect module
2. Identify the object being assigned to the global namespace (e.g., `com.example.lib.myLibrary = {...}`)
3. Add a `return` statement that returns that object
4. Remove the global namespace assignment

```javascript
// BEFORE — side-effect module (no AMD export, registers on global):
sap.ui.define(["sap/base/Log"], function(Log) {
    "use strict";
    com.example.lib.myLibrary = {
        doSomething: function() { Log.info("done"); }
    };
});

// AFTER — proper AMD module with return:
sap.ui.define(["sap/base/Log"], function(Log) {
    "use strict";
    var myLibrary = {
        doSomething: function() { Log.info("done"); }
    };
    return myLibrary;
});
```

Then in the **consuming module**, import normally via the dependency parameter:

```javascript
// Consuming module — use the dependency parameter, NOT the global
sap.ui.define([
    "com/example/lib/myLibrary",
    "sap/base/Log"
], function(myLibrary, Log) {
    "use strict";
    myLibrary.doSomething();
});
```

**How to detect side-effect modules:** The target module ends with `});` without a preceding `return`, or assigns to a global (`com.x.y = {...}`) without returning it.

**Procedure for all Case 1c fixes:**
1. Open the target module file
2. Find the `return` statement at the end of the `sap.ui.define` factory
3. Match the export shape to the table above
4. Write the replacement call accordingly

### 2. sap.ui.getCore() Calls

**Problem**: `sap.ui.getCore()` returns the Core singleton, but `sap.ui.core.Core` is the class.

**Note**: `attachInit` / `Core.ready()` is for the early boot phase of UI5, typically used in standalone scripts or index.html initialization, NOT inside controllers. When a controller's `onInit` is called, UI5 is already fully initialized.

```javascript
// Before - in a standalone init script (NOT a controller)
sap.ui.getCore().attachInit(function() {
    // Bootstrap application
    new sap.m.Shell({
        app: new sap.ui.core.ComponentContainer({ ... })
    }).placeAt("content");
});
```

**Fix Strategy**: Use the modern replacement APIs via sap.ui.define.

```javascript
// After - in a standalone init script
sap.ui.define([
    "sap/ui/core/Core",
    "sap/m/Shell",
    "sap/ui/core/ComponentContainer"
], function(Core, Shell, ComponentContainer) {
    "use strict";

    Core.ready().then(function() {
        // Bootstrap application
        new Shell({
            app: new ComponentContainer({ ... })
        }).placeAt("content");
    });
});
```

**Common sap.ui.getCore() Method Replacements:**

| Deprecated | Replacement Module | Replacement Call |
|------------|-------------------|------------------|
| `sap.ui.getCore().attachInit(fn)` | `sap/ui/core/Core` | `Core.ready().then(fn)` |
| `sap.ui.getCore().byId(id)` | `sap/ui/core/Element` | `Element.getElementById(id)` — BUT see Case 4a: inside a **controller**, if the ID contains the view prefix (e.g., `"container-myapp---viewName--controlId"`), prefer `this.byId("controlId")` instead |
| `sap.ui.getCore().getEventBus()` | `sap/ui/core/EventBus` | `EventBus.getInstance()` |
| `sap.ui.getCore().getLibraryResourceBundle(lib)` | `sap/ui/core/Lib` | `Lib.getResourceBundleFor(lib)` |
| `sap.ui.getCore().loadLibrary(lib, {async:true})` | `sap/ui/core/Lib` | `Lib.load({name: lib})` |

**Important: Most Core APIs Have Been Moved**

In modern UI5, most methods on `sap.ui.core.Core` have been moved to dedicated modules. Use the **UI5 MCP Server's `get_api_reference` tool** to check deprecation status and find replacements.

For complete replacement tables including extended Core methods, removed APIs, and jQuery.sap.* replacements, read `references/core-api-replacements.md`.

### 3. sap.ui.core.Core Direct Access

**Problem**: Accessing the Core class directly vs the singleton.

```javascript
// Before - CANNOT be auto-fixed
sap.ui.define([
    "sap/ui/core/mvc/Controller"
], function(Controller) {
    var Core = sap.ui.core.Core;
    // ...
});
```

**Fix Strategy**: Add the module to sap.ui.define dependencies.

```javascript
// After
sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/core/Core"
], function(Controller, Core) {
    // Use Core directly
});
```

### 4. jQuery/$ Global Access (All Standard jQuery APIs)

**Problem**: Using `jQuery` or `$` as a global without importing the jQuery module.

**IMPORTANT**: The fix is NOT to replace jQuery API calls. **All standard jQuery APIs are fine to use** — both instance methods (`.find()`, `.addClass()`, etc.) and static methods (`jQuery.each()`, `jQuery.extend()`, `jQuery.proxy()`, etc.). The only issue is that `jQuery`/`$` must be loaded through a proper module dependency.

**How to tell the difference**: `jQuery.sap.*` (with `.sap.`) = deprecated UI5 utility, must be replaced (see 4b below). `jQuery.*` (without `.sap.`) or `jQuery(...)` = standard jQuery, keep as-is, just add import.

```javascript
// Before - CANNOT be auto-fixed (jQuery/$ used as global)
sap.ui.define([
    "sap/ui/core/mvc/Controller"
], function(Controller) {
    return Controller.extend("my.app.App", {
        onAfterRendering: function() {
            jQuery("#myElement").addClass("highlight");
            $(".container").css("display", "block");
            jQuery.each(aItems, function(i, item) { /* ... */ });
            var oMerged = jQuery.extend(true, {}, oDefaults, oSettings);
            var fnCallback = jQuery.proxy(this._handleResult, this);
        }
    });
});
```

**Fix Strategy**: Add `sap/ui/thirdparty/jquery` to dependencies. Replace bare `$` with `jQuery`. Keep all jQuery API calls as-is — do NOT replace `jQuery.each` with `forEach`, do NOT replace `jQuery.extend` with `Object.assign`, do NOT replace `jQuery.proxy` with `Function.prototype.bind`.

```javascript
// After - jQuery loaded as a proper dependency
sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/thirdparty/jquery"
], function(Controller, jQuery) {
    return Controller.extend("my.app.App", {
        onAfterRendering: function() {
            jQuery("#myElement").addClass("highlight");
            jQuery(".container").css("display", "block");
            jQuery.each(aItems, function(i, item) { /* ... */ });
            var oMerged = jQuery.extend(true, {}, oDefaults, oSettings);
            var fnCallback = jQuery.proxy(this._handleResult, this);
        }
    });
});
```

**Key rules:**
- Add `"sap/ui/thirdparty/jquery"` to the dependency array, name the parameter `jQuery`
- Replace `$` references with `jQuery` (since `$` is a global alias that won't exist once globals are removed)
- Do NOT replace any standard jQuery API calls — just add the import

**NEVER replace standard jQuery methods with native equivalents. This is WRONG:**

| WRONG (do NOT do this) | CORRECT (keep as-is) |
|---|---|
| `jQuery.proxy(fn, ctx)` → `fn.bind(ctx)` | Keep `jQuery.proxy(fn, ctx)` unchanged |
| `jQuery.each(arr, fn)` → `arr.forEach(fn)` | Keep `jQuery.each(arr, fn)` unchanged |
| `jQuery.extend({}, a, b)` → `Object.assign({}, a, b)` | Keep `jQuery.extend({}, a, b)` unchanged |
| `jQuery.isArray(x)` → `Array.isArray(x)` | Keep `jQuery.isArray(x)` unchanged |
| `jQuery.isEmptyObject(x)` → `Object.keys(x).length === 0` | Keep `jQuery.isEmptyObject(x)` unchanged |
| `jQuery.inArray(v, arr)` → `arr.indexOf(v)` | Keep `jQuery.inArray(v, arr)` unchanged |
| `jQuery.grep(arr, fn)` → `arr.filter(fn)` | Keep `jQuery.grep(arr, fn)` unchanged |
| `jQuery.map(arr, fn)` → `arr.map(fn)` | Keep `jQuery.map(arr, fn)` unchanged |
| `jQuery.type(x)` → `typeof x` | Keep `jQuery.type(x)` unchanged |
| `jQuery.trim(s)` → `s.trim()` | Keep `jQuery.trim(s)` unchanged |

Standard jQuery APIs are **not deprecated in UI5**. UI5 ships jQuery as `sap/ui/thirdparty/jquery` and all standard jQuery methods remain fully supported. The only fix needed is adding the module dependency — never rewrite the API calls themselves. Replacing jQuery methods with native equivalents would change behavior (e.g., `jQuery.extend` does deep copy with `true` flag, `jQuery.each` handles both arrays and objects, `jQuery.proxy` preserves identity for later unbinding) and is not required by the linter.

### 4a. jQuery DOM Lookup for UI5 Controls → this.byId()

**Problem**: Using `jQuery("#<component-prefix>--<control-id>")` followed by `.control(0)` or `Element.closestTo()` to get a reference to a UI5 control inside a controller. This is fragile (depends on generated ID prefixes) and unnecessary when you're inside the controller that owns the view.

```javascript
// Before — fragile jQuery lookup with hardcoded ID prefix
onAfterRendering() {
    const avatarDOM = jQuery("#container-todo---app--avatar-profile");
    const avatarCtr = avatarDOM.control(0);  // or Element.closestTo(avatarDOM[0])
    avatarCtr.setSrc(Helper.resolvePath('./img/logo_ui5.png'));
}
```

**Fix Strategy**: Replace with `this.byId("<local-id>")`. The local ID is the part after the last `--` separator. This eliminates the need for both the jQuery import and the `Element.closestTo` import (if they are not used elsewhere in the file).

```javascript
// After — clean controller API
onAfterRendering() {
    const oAvatar = this.byId("avatar-profile");
    oAvatar.setSrc(Helper.resolvePath('./img/logo_ui5.png'));
}
```

**Detection patterns:**
- `jQuery("#<anything>--<id>").control(0)` → `this.byId("<id>")`
- `Element.closestTo(jQuery("#<anything>--<id>")[0])` → `this.byId("<id>")`
- `sap.ui.getCore().byId("<full-id>")` inside a controller where the ID contains the view prefix → `this.byId("<local-id>")`
- `Element.getElementById("<full-id>")` inside a controller where the ID contains `--` (view prefix separator) → `this.byId("<local-id>")` (strip everything up to and including the last `--`)

**IMPORTANT**: Apply Case 4a AFTER Case 2 (sap.ui.getCore().byId → Element.getElementById). If Case 2 produces `Element.getElementById("container-app---view--controlId")` inside a controller, immediately convert it to `this.byId("controlId")` in the same pass — do NOT leave the intermediate form.

**After replacing**: If `jQuery` and/or `Element` are no longer used anywhere else in the file, remove them from the dependency array and function parameters.

### 4b. jQuery.sap.* Utility Access

**Problem**: Using `jQuery.sap.*` utility methods — these are deprecated APIs with dedicated replacement modules. This is a **different case** from plain jQuery DOM access above.

```javascript
// Before - CANNOT be auto-fixed
sap.ui.define([
    "sap/ui/core/mvc/Controller"
], function(Controller) {
    return Controller.extend("my.app.App", {
        onInit: function() {
            jQuery.sap.log.info("Controller initialized");
            var sId = jQuery.sap.uid();
        }
    });
});
```

**Fix Strategy**: Replace `jQuery.sap.*` calls with their dedicated replacement modules.

```javascript
// After
sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/base/Log",
    "sap/base/util/uid"
], function(Controller, Log, uid) {
    return Controller.extend("my.app.App", {
        onInit: function() {
            Log.info("Controller initialized");
            var sId = uid();
        }
    });
});
```

**Common jQuery.sap.* Replacements:**

Run `npx @ui5/linter --details` to get the suggested replacement module for each jQuery.sap.* API. For the complete table, read `references/core-api-replacements.md`.

| Deprecated | Replacement Module | Replacement Call |
|------------|-------------------|------------------|
| `jQuery.sap.log.*` | `sap/base/Log` | `Log.info()`, `Log.error()`, etc. |
| `jQuery.sap.uid` | `sap/base/util/uid` | `uid()` |
| `jQuery.sap.extend(true, ...)` | See below | See below |
| `jQuery.sap.encodeHTML` | `sap/base/security/encodeXML` | `encodeXML(text)` |

**`jQuery.sap.extend` replacement decision:**
- If the first argument is `true` (deep copy): use `sap/base/util/merge` → `merge({}, obj1, obj2)`. **Note**: The module name is `merge`, NOT `deepExtend` — there is no `sap/base/util/deepExtend` module.
- If the merged objects are **flat** (single-level properties, no nested objects/arrays that need recursive copying), use native `Object.assign({}, obj1, obj2)` — no import needed.
- If the merged objects contain **nested objects** that must be deep-copied, use `sap/base/util/merge` → `merge({}, obj1, obj2)`.
- **Prefer `Object.assign`** unless deep copy is demonstrably required. Inspect the objects being merged — if all properties are primitives or you only need a shallow copy, `Object.assign` is the correct modern replacement.
- **NEVER convert `jQuery.sap.extend(...)` to `jQuery.extend(...)`** — that would introduce a new dependency on `sap/ui/thirdparty/jquery` for no reason. `jQuery.sap.extend` is a deprecated wrapper and must be replaced with either `Object.assign` or `merge()`, never with the raw jQuery equivalent.
- **NEVER use `sap/base/util/deepExtend`** — this module does NOT exist. The correct deep-copy module is `sap/base/util/merge`.

### 5. Conditional/Probing Global Access

**Problem**: Code checks if a global exists before using it.

```javascript
// Before - CANNOT be auto-fixed (conditional access)
sap.ui.define([
    "sap/ui/core/mvc/Controller"
], function(Controller) {
    return Controller.extend("my.app.App", {
        onInit: function() {
            if (sap.ui.fl && sap.ui.fl.Utils) {
                sap.ui.fl.Utils.getComponentClassName(this);
            }
        }
    });
});
```

**Fix Strategy**: For modules that are always available in your target environment, add them as a `sap.ui.define` dependency (see Case 11 for runtime globals like `sap.ushell.Container`). For truly optional modules that may not be loaded, use synchronous `sap.ui.require` which returns `undefined` if the module is not loaded:

```javascript
// After — synchronous require for truly optional modules
sap.ui.define([
    "sap/ui/core/mvc/Controller"
], function(Controller) {
    return Controller.extend("my.app.App", {
        onInit: function() {
            var FlUtils = sap.ui.require("sap/ui/fl/Utils");
            if (FlUtils) {
                FlUtils.getComponentClassName(this);
            }
        }
    });
});
```

**Alternative**: For lazy loading, use async `sap.ui.require(["sap/ushell/Container"], function(Container) { ... }, function() { /* error */ })` with a callback.

### 6. Custom Namespace Definitions

**Problem**: Application defines its own namespace structure.

```javascript
// Before - CANNOT be auto-fixed
window.mycompany = window.mycompany || {};
window.mycompany.myapp = window.mycompany.myapp || {};
window.mycompany.myapp.utils = {
    helper: function() { ... }
};
```

**Fix Strategy**: Convert to proper sap.ui.define module.

```javascript
// After - mycompany/myapp/utils.js
sap.ui.define([], function() {
    "use strict";

    return {
        helper: function() { ... }
    };
});
```

Other files then consume it via `sap.ui.define(["mycompany/myapp/utils"], function(utils) { ... })`.

### 7. Binding Type Strings Without Import

**Problem**: Using type as string in binding without importing the module.

```javascript
// Before - triggers no-globals (inside a controller)
var oInput = new Input({
    value: {
        path: "/amount",
        type: "sap.ui.model.type.Float"  // Global reference as string
    }
});
```

**Fix Strategy**: Import the type module and use the class reference.

```javascript
// After - add "sap/ui/model/type/Float" to sap.ui.define dependencies
var oInput = new Input({
    value: {
        path: "/amount",
        type: new FloatType()  // FloatType from dependency
    }
});
```

### 8. Delete Expressions

**Problem**: Deleting properties from global namespace.

```javascript
// Before - CANNOT be auto-fixed
delete sap.ui.core.someTempProperty;
```

**Fix Strategy**: This is usually a code smell. Either:
- Remove the code entirely if it's cleanup of old patterns
- If legitimately needed, use a local object instead of globals

### 9. sap.ui.controller() — Controller Definition via Global Factory

**Problem**: Using the deprecated `sap.ui.controller()` global factory to define a controller. This is the two-argument form that **defines** a controller class.

**Scope**: This case handles plain controller definitions in custom UI5 apps. It does NOT handle Fiori Elements V2 extensions using `registerControllerExtensions` — use `fix-fiori-elements-extensions` for those (the indicator is `sap.ui.controllerExtensions` in manifest.json or `registerControllerExtensions` in Component.js).

**Detection**:
```bash
grep -rn 'sap\.ui\.controller(' webapp/ --include="*.js" | grep -v "^\s*//"
```
Categorize each match:
- **Two arguments** `sap.ui.controller("name", { ... })` — **definition**, fix it here
- **One argument** `sap.ui.controller("name")` — **instance lookup**, document in `MODERNIZATION-ISSUES.md` (sync-to-async refactoring required)

#### Pattern A: Definition inside existing `sap.ui.define` wrapper

The most common case: file already uses `sap.ui.define` but defines the controller via the deprecated global.

```javascript
// Before
sap.ui.define([
    "sap/m/MessageBox",
    "sap/base/Log"
], function(MessageBox, Log) {
    "use strict";

    return sap.ui.controller("my.app.controller.Main", {
        onInit: function() {
            Log.info("initialized");
        },
        onPress: function() {
            MessageBox.show("Hello");
        }
    });
});
```

```javascript
// After
sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/m/MessageBox",
    "sap/base/Log"
], function(Controller, MessageBox, Log) {
    "use strict";

    return Controller.extend("my.app.controller.Main", {
        onInit: function() {
            Log.info("initialized");
        },
        onPress: function() {
            MessageBox.show("Hello");
        }
    });
});
```

Steps:
1. Add `"sap/ui/core/mvc/Controller"` to the dependency array (first position)
2. Add `Controller` as the corresponding function parameter
3. Replace `sap.ui.controller("name", {` with `Controller.extend("name", {`

#### Pattern B: Definition without `sap.ui.define` (legacy module system)

Files using `jQuery.sap.declare`/`jQuery.sap.require` or no module wrapper at all.

```javascript
// Before
jQuery.sap.declare("my.app.controller.Detail");
jQuery.sap.require("sap.ui.core.mvc.Controller");

sap.ui.controller("my.app.controller.Detail", {
    onInit: function() {
        // ...
    }
});
```

```javascript
// After
sap.ui.define([
    "sap/ui/core/mvc/Controller"
], function(Controller) {
    "use strict";

    return Controller.extend("my.app.controller.Detail", {
        onInit: function() {
            // ...
        }
    });
});
```

Steps:
1. Remove `jQuery.sap.declare` and `jQuery.sap.require` calls
2. Wrap in `sap.ui.define([...], function(...) { ... });`
3. Add all required dependencies (convert dot-notation to slash-notation paths)
4. Replace `sap.ui.controller("name", {` with `Controller.extend("name", {`
5. Add `return` before `Controller.extend(...)` so the module exports the controller class
6. Add `"use strict";` inside the factory function
7. **CRITICAL — Apply all inline fixes to the file body** (see "Apply ALL Applicable Cases in a Single Pass" section above): replace `jQuery("#prefix--id").control(0)` → `this.byId("id")`, replace `sap.ui.getCore().byId("prefix--id")` → `this.byId("id")`, replace `jQuery.sap.*` utilities → dedicated modules, replace inline `sap.ui.model.Filter` etc. → dependency imports

#### Pattern C: Mixed file with both definition AND instance lookups

A controller file defines itself with `sap.ui.controller("name", {...})` AND uses `sap.ui.controller("otherName")` (single argument) to look up other controller instances.

**Action:**
- Fix the definition (Pattern A/B above)
- Leave the instance lookups untouched — they require manual sync-to-async refactoring (EventBus, shared services, or stored references)
- Document the instance lookups in `MODERNIZATION-ISSUES.md`

#### Edge Cases

**Missing `return` statement**: The old `sap.ui.controller()` API registered the controller globally as a side effect. `Controller.extend()` only returns the class — it doesn't register globally. If the original code doesn't return the result, you must add `return`:

```javascript
// Before (broken after modernization without return)
sap.ui.define(["sap/ui/core/mvc/Controller"], function(Controller) {
    "use strict";
    sap.ui.controller("my.app.controller.Main", { /* ... */ });
    // No return! Works with sap.ui.controller but NOT with Controller.extend
});

// After (fixed)
sap.ui.define(["sap/ui/core/mvc/Controller"], function(Controller) {
    "use strict";
    return Controller.extend("my.app.controller.Main", { /* ... */ });
});
```

**Module-level variables before definition**: Keep them as-is — just wrap the `Controller.extend(...)` with `return`.

**Controller name must match file path**: The string in `Controller.extend("my.app.controller.Main", {...})` should match the file's module path. A file at `webapp/controller/Main.controller.js` in an app with namespace `my.app` should be `"my.app.controller.Main"`. If the existing name doesn't match the file path, keep the existing name (may be intentional).

**Key rules:**
- If the file already has `sap.ui.define`, do NOT wrap again — just add the `sap/ui/core/mvc/Controller` dependency if missing
- `sap.ui.controller("name", { ... })` (with object literal = **definition**) → `Controller.extend("name", { ... })`
- `sap.ui.controller("name")` (no object literal = **instantiation**) → document in `MODERNIZATION-ISSUES.md`, do NOT auto-fix
- If extending a custom base controller, import that base controller instead of `sap/ui/core/mvc/Controller`

### 10. jQuery.sap.declare/require — Legacy Module Definitions

**Problem**: Using deprecated `jQuery.sap.declare()` and `jQuery.sap.require()` for module management.

```javascript
// Before - CANNOT be auto-fixed (no-deprecated-api: jQuery.sap.declare, jQuery.sap.require)
jQuery.sap.declare("my.app.util.Formatter");
jQuery.sap.require("sap.ui.core.format.DateFormat");

my.app.util.Formatter = {
    formatDate: function(oDate) {
        var oDateFormat = sap.ui.core.format.DateFormat.getDateTimeInstance();
        return oDateFormat.format(oDate);
    }
};
```

**Fix Strategy**: Wrap in `sap.ui.define`, convert `jQuery.sap.require` calls to dependency array, remove global assignment, return the module object.

```javascript
// After
sap.ui.define([
    "sap/ui/core/format/DateFormat"
], function(DateFormat) {
    "use strict";

    return {
        formatDate: function(oDate) {
            var oDateFormat = DateFormat.getDateTimeInstance();
            return oDateFormat.format(oDate);
        }
    };
});
```

**Key rules:**
- Remove all `jQuery.sap.declare()` statements — module names are inferred from file paths in AMD
- Convert `jQuery.sap.require("sap.m.Button")` to dependency `"sap/m/Button"` (dot notation → path notation)
- Remove global namespace assignment (`my.app.util.Formatter = {...}`) and `return` the object from the factory function
- If the file already has `sap.ui.define`, do NOT wrap again — merge remaining `jQuery.sap.require` calls into the existing dependency array
- If `jQuery.sap.require` is inside a function (dynamic/conditional), replace with `sap.ui.require(["sap/m/MessageBox"], function(MessageBox) { ... })` instead
- If the file has multiple `jQuery.sap.declare` calls or no clear single export, flag for manual review — do not attempt automatic modernization
- **After structural conversion, apply all inline fixes** (see "Apply ALL Applicable Cases in a Single Pass" section): replace `jQuery("#prefix--id").control(0)` → `this.byId("id")`, replace `sap.ui.getCore().byId(...)` → `this.byId(...)`, replace remaining `jQuery.sap.*` → dedicated modules, replace inline class references (e.g., `new sap.ui.model.json.JSONModel(...)`) → imported dependency variables

### 11. Runtime Globals as Module Imports

**Problem**: Runtime-provided modules like `sap.ushell.Container` are accessed via global namespace chains. Under strict AMD loading or Test Starter, these globals may not exist because the FLP shell isn't bootstrapped.

```javascript
// Before - global namespace chain access
sap.ui.define(["sap/ui/core/mvc/Controller"], function(Controller) {
    return Controller.extend("com.example.app.controller.Main", {
        onNavBack: function() {
            if (sap.ushell && sap.ushell.Container) {
                var oNav = sap.ushell.Container.getService("CrossApplicationNavigation");
                oNav.toExternal({ target: { shellHash: "#" } });
            }
        },
        onSave: function() {
            sap.ushell.Container.setDirtyFlag(true);
        }
    });
});
```

**Fix Strategy**: Add the runtime module as a `sap.ui.define` dependency. Replace all global namespace chain access with the imported variable. Convert guarded access patterns to guard on the imported variable.

```javascript
// After - proper module import
sap.ui.define([
    "sap/ushell/Container",
    "sap/ui/core/mvc/Controller"
], function(Container, Controller) {
    return Controller.extend("com.example.app.controller.Main", {
        onNavBack: function() {
            if (Container && Container.getService) {
                var oNav = Container.getService("CrossApplicationNavigation");
                oNav.toExternal({ target: { shellHash: "#" } });
            }
        },
        onSave: function() {
            Container.setDirtyFlag(true);
        }
    });
});
```

**Test-side pattern**: Because UI5's `sap.ui.define` loader caches module return values, the test and app source both receive the same object reference. Stub the imported module directly — do NOT set up global namespace chains. `sinon` is globally available via the Test Starter infrastructure — no need to import it:

```javascript
// WRONG — setting up global namespace in test
window.sap.ushell = { Container: { setDirtyFlag: function() {} } };

// CORRECT — stub the imported module (sinon is a Test Starter global)
sap.ui.define(["sap/ushell/Container"], function(Container) {
    var oSandbox = sinon.createSandbox();
    // ...
    QUnit.module("Navigation", {
        afterEach: function() { oSandbox.restore(); }
    });
    QUnit.test("setDirtyFlag is called", function(assert) {
        oSandbox.stub(Container, "setDirtyFlag");
        // ... trigger action ...
        assert.ok(Container.setDirtyFlag.calledOnce);
    });
});
```

**Common runtime globals to convert:** `sap.ushell.Container` and other runtime-provided modules accessed via global namespace chains. Cross-reference `fix-linter-blind-spots` for the broader detection pass across all files.

### 12. Sync XHR Guards After jQuery.sap.sjax Modernization

**Problem**: When modernizing `jQuery.sap.sjax` to native synchronous `XMLHttpRequest`, the resulting code blindly uses `xhr.responseText` or `JSON.parse(xhr.responseText)` without checking whether the request succeeded. If the target file doesn't exist or the server returns an error (e.g., 404 HTML), `JSON.parse` throws on HTML content.

```javascript
// Before — jQuery.sap.sjax (deprecated)
var oResponse = jQuery.sap.sjax({
    url: sUrl,
    dataType: "json"
});
if (oResponse.data) { ... }

// After modernization (WRONG — no guard)
var xhr = new XMLHttpRequest();
xhr.open("GET", sUrl, false);
xhr.send();
var oData = JSON.parse(xhr.responseText);  // crashes if file missing or 404

// After modernization (CORRECT — with guard)
var xhr = new XMLHttpRequest();
xhr.open("GET", sUrl, false);
xhr.send();
if (xhr.readyState === 4 && xhr.status === 200) {
    var oData = JSON.parse(xhr.responseText);
    // ... use oData ...
} else {
    Log.error("Failed to load: " + sUrl);
}
```

**Fix Strategy**: Always wrap `xhr.responseText` usage with a `readyState === 4 && status === 200` check. Choose the fallback based on context:

| Context | Guard Pattern | Fallback |
|---------|--------------|----------|
| Mock server response handler | `if (xhr.readyState === 4 && xhr.status === 200)` | `oXhr.respondJSON(200, {}, JSON.stringify({"d": {"results": []}}))` |
| JSON.parse of response | `if (xhr.readyState === 4 && xhr.status === 200)` | Return empty object `{}` — lets existing `if (oResponse.data)` guards work |
| Init-time config/manifest loading | `if (xhr.readyState !== 4 \|\| xhr.status !== 200) { Log.error(...); return; }` | Early return with error log |
| Shared helper function | Check inside the helper, return `{}` on failure | All callers already guard with `oResponse.data` |

**Detection**: After modernizing `jQuery.sap.sjax`, scan for `xhr.responseText` or `JSON.parse(xhr.responseText)` that is NOT preceded by a `readyState`/`status` check within the same block.

## CRITICAL: Apply ALL Applicable Cases in a Single Pass

When a file triggers Case 9 or Case 10 (structural conversion from legacy module system to `sap.ui.define`), you MUST also fix ALL other global-access patterns in the **same file** during the **same pass**. Do NOT stop after the structural conversion — scan the entire file body for:

- Case 2: `sap.ui.getCore().byId("prefix--id")` → `this.byId("id")` (in controllers)
- Case 4a: `jQuery("#prefix--id").control(0)` → `this.byId("id")` (in controllers)
- Case 4b: `jQuery.sap.*` utilities → dedicated replacement modules
- Case 4: Remaining `jQuery`/`$` global references → add `sap/ui/thirdparty/jquery` import
- Case 3: `sap.ui.core.Core` direct access → add module dependency
- Case 1: `sap.ui.demo.myApp.Module` global namespace → use imported dependency

The structural conversion (Case 9/10) creates the `sap.ui.define` wrapper, but the code INSIDE the controller methods still contains inline global patterns. These inline patterns MUST be fixed in the same operation. Do not leave them for a "second pass" — there is no second pass.

**Checklist after Case 9/10 conversion:**
1. Are there any `jQuery("#...")` or `jQuery(...)` calls? → Apply Case 4a or Case 4
2. Are there any `sap.ui.getCore().byId(...)` calls? → Apply Case 2 (and then Case 4a if inside a controller)
3. Are there any `jQuery.sap.*` calls remaining? → Apply Case 4b
4. Are there any `sap.ui.model.*`, `sap.m.*`, `sap.ui.core.*` inline class references? → Convert to dependency imports
5. Are there any app-namespace global references (e.g., `sap.ui.demo.todo.util.Helper`)? → Convert to dependency imports
6. After all replacements, are any imports now unused? → Remove them from the dependency array and parameters
7. Are there any `this.X = importedModule.X` assignments where `this.X` is never read elsewhere in the file or referenced in XML views? → DELETE the assignment AND the import — it's dead code (a stashed global reference that nothing consumes)

## Implementation Steps

1. **Run linter with --details** to get replacement suggestions:
   ```bash
   npx @ui5/linter --details
   ```
2. **Identify the error pattern** from linter output
3. **Determine the case type** (assignment, getCore, jQuery, conditional, etc.)
4. **Apply the appropriate transformation**:
   - Add required modules to `sap.ui.define` dependency array
   - Add corresponding parameter names to the function
   - Replace global access with the parameter variable
   - After replacing jQuery DOM lookups with `this.byId()`, remove `jQuery`/`Element` imports if no longer referenced
   - Remove dead code: unused variables, stale comments describing old patterns
5. **Update any dependent code** that expects the global
6. **Verify no other files depend on the global** if it was an assignment

## Example Fix Session

For a comprehensive before/after example combining multiple case types (jQuery.sap.*, jQuery DOM, conditional globals), read `references/example-fix-session.md`.

## Notes

- **Dependency insertion position — critical**: Always add new dependencies and their corresponding function parameters **at the beginning** of their respective lists, not at the end or in alphabetical order. Many legacy UI5 files have mismatches between the dependency array length and the function parameter count (e.g., trailing side-effect imports without parameters, or arrays that drifted out of sync over time). Inserting in the middle or at the end can shift the mapping between existing dependencies and parameters, silently passing the wrong module to existing code. Inserting at the beginning preserves all existing positional mappings.

  ```javascript
  // Before — existing code may have a dep/param mismatch (3 deps, 2 params)
  sap.ui.define([
      "sap/ui/core/mvc/Controller",
      "sap/m/MessageToast",
      "some/sideEffect/Module"
  ], function(Controller, MessageToast) {
      var oCore = sap.ui.getCore();  // global access to fix
  });

  // After — new dependency added at the BEGINNING
  sap.ui.define([
      "sap/ui/core/Element",
      "sap/ui/core/mvc/Controller",
      "sap/m/MessageToast",
      "some/sideEffect/Module"
  ], function(Element, Controller, MessageToast) {
      var oControl = Element.getElementById("myId");
  });
  ```

- The function parameter names should match the module's default export name (e.g., `Log` for `sap/base/Log`)
- Some globals like `QUnit` and `sinon` are intentionally allowed in test files
- `sap.ui.define`, `sap.ui.require`, and `sap.ui.loader.config` are allowed globals
- Use `sap.ui.require("module/path")` (synchronous, returns undefined if not loaded) for optional runtime dependencies
- Use `sap.ui.require(["module/path"], callback)` (async) for lazy loading

## Related Skills

- **fix-fiori-elements-extensions**: For `sap.ui.controller()` in Fiori Elements V2 apps with `registerControllerExtensions` or manifest `sap.ui.controllerExtensions` — that's a different modernization path (ControllerExtension class + manifest registration + handler reference updates)
- **fix-pseudo-modules**: For `no-pseudo-modules` and `no-implicit-globals` errors (enum imports, DataType imports, OData expression functions), use fix-pseudo-modules
- **fix-control-renderer**: For renderer-specific issues (`no-deprecated-control-renderer-declaration`, `apiVersion`, `IconPool`, `rerender`), use fix-control-renderer
- **fix-xml-globals**: For `no-globals` in XML views/fragments (formatters, event handlers via `core:require`), use fix-xml-globals
- **fix-linter-blind-spots**: For runtime-breaking global namespace patterns the linter doesn't detect (app-specific namespaces outside `sap.*`), use fix-linter-blind-spots. Cases 1b and 1c overlap with patterns 1-4 in that skill.
- **fix-cyclic-deps**: When Case 1c fixes would create cyclic dependencies, use lazy `sap.ui.require` instead of normal `sap.ui.define` deps — see fix-cyclic-deps for cycle detection
