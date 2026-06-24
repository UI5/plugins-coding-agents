---
name: fix-library-init
description: |
  Fix Library.init() apiVersion issues and modernize enums to DataType.registerEnum. Use this skill when linter outputs:
  - `no-deprecated-api` with message "Deprecated call to ... Use the {apiVersion: 2} parameter instead"
  Trigger on library.js files with errors about: "Deprecated call to", "Lib.init", "Library.init", "{apiVersion: 2} parameter"
  Adds apiVersion: 2 to Library.init() calls and modernizes enum definitions to use DataType.registerEnum, which is required for type validation when using apiVersion: 2.
---

# Fix Library.init() Modernization

This skill fixes `Library.init()` / `Lib.init()` calls that the UI5 linter detects as missing `apiVersion: 2`, and modernizes enum definitions to use `DataType.registerEnum` — which is required when using `apiVersion: 2`.

## Linter Rules Handled

| Rule ID | Message Pattern | This Skill's Action |
|---------|-----------------|---------------------|
| `no-deprecated-api` | Deprecated call to Library.init(). Use the {apiVersion: 2} parameter instead | Add `apiVersion: 2` to the init call |
| `no-deprecated-api` | Deprecated call to Lib.init(). Use the {apiVersion: 2} parameter instead | Add `apiVersion: 2` to the init call |
| `no-deprecated-api` | Deprecated call to init(). Use the {apiVersion: 2} parameter instead | Add `apiVersion: 2` (destructured init) |

## When to Use

Apply this skill when you see linter output like:
```
library.js:9:2 error Deprecated call to Library.init(). Use the {apiVersion: 2} parameter instead  no-deprecated-api
library.js:11:2 error Deprecated call to Lib.init(). Use the {apiVersion: 2} parameter instead  no-deprecated-api
library.js:51:2 error Deprecated call to init(). Use the {apiVersion: 2} parameter instead  no-deprecated-api
```

## Background: What Library.init() Does

`sap/ui/core/Lib.init()` registers a UI5 library with the framework, declaring its metadata: name, dependencies, controls, elements, types (enums), and interfaces. The `apiVersion: 2` parameter signals that the library uses the modern initialization pattern.

**Important**: Only `apiVersion: 2` is valid for `Lib.init()`. Unlike control renderers where `apiVersion: 4` is also valid, library initialization only accepts `2`.

## Fix Strategy

### 1. No Arguments

**Problem**: `Lib.init()` called with no arguments at all.

```javascript
// Before — triggers no-deprecated-api
sap.ui.define([
    "sap/ui/core/Lib"
], function(Library) {
    "use strict";

    Library.init();
});
```

**Fix**: Add an object argument with `apiVersion: 2`.

```javascript
// After
sap.ui.define([
    "sap/ui/core/Lib"
], function(Library) {
    "use strict";

    Library.init({
        apiVersion: 2
    });
});
```

### 2. Object Argument Without apiVersion

**Problem**: `Lib.init()` receives an object but it has no `apiVersion` property.

```javascript
// Before — triggers no-deprecated-api
Library.init({
    name: "my.lib",
    dependencies: ["sap.ui.core", "sap.m"]
});
```

**Fix**: Add `apiVersion: 2` as the first property in the object.

```javascript
// After
Library.init({
    apiVersion: 2,
    name: "my.lib",
    dependencies: ["sap.ui.core", "sap.m"]
});
```

### 3. apiVersion Is Not a Number

**Problem**: `apiVersion` is a string instead of a numeric literal.

```javascript
// Before — triggers no-deprecated-api
Library.init({
    apiVersion: "2"
});
```

**Fix**: Change to numeric literal `2`.

```javascript
// After
Library.init({
    apiVersion: 2
});
```

### 4. apiVersion Is Wrong Number

**Problem**: `apiVersion` is a number but not `2`.

```javascript
// Before — triggers no-deprecated-api
Library.init({
    apiVersion: 1
});
```

**Fix**: Change to `2`.

```javascript
// After
Library.init({
    apiVersion: 2
});
```

### 5. Element Access Syntax

The same patterns apply when `init` is called via bracket notation:

```javascript
// Before
Library["init"]({
    apiVersion: 1,
    dependencies: ["sap.ui.core"]
});

// After
Library["init"]({
    apiVersion: 2,
    dependencies: ["sap.ui.core"]
});
```

### 6. Destructured or Assigned init

The linter also detects these patterns:

```javascript
// Assignment
const LibInit = Library.init;
LibInit({ apiVersion: 1 });

// Destructuring
const {init} = Library;
init({ apiVersion: 1 });

// Destructuring with rename
const {init: libInit} = Library;
libInit({ apiVersion: 1 });
```

**Fix**: Same — change `apiVersion` to `2` in each call.

## Modernize Enums to DataType.registerEnum

When upgrading `Lib.init()` to `apiVersion: 2`, the old approach of defining enums on the global namespace no longer works. The framework cannot resolve type strings used in control metadata without explicit registration, which can lead to **XSS vulnerabilities** because type checking is silently skipped.

This skill must **find existing enum definitions** in the library.js and **modernize them** to use `DataType.registerEnum`.

### How to Find Enums

1. **Check the `types` array** in the `Lib.init()` call — it lists the fully qualified names of all types (enums) defined by the library
2. **Search for global namespace assignments** — e.g. `my.lib.ValueColor = { ... }` where `my.lib` is the library namespace
3. **Look for existing enum objects** defined as plain objects with string key-value pairs

### Modernization Steps

1. **Capture the return value** of `Lib.init()` in a variable if not already done:
   ```javascript
   // Before
   Library.init({ name: "my.lib", apiVersion: 2, types: ["my.lib.ValueColor"] });

   // After
   var oThisLibrary = Library.init({ name: "my.lib", apiVersion: 2, types: ["my.lib.ValueColor"] });
   ```

2. **Move enum definitions** from the global namespace to the library object:
   ```javascript
   // Before — global namespace
   my.lib.ValueColor = { Color1: "Color1", Color2: "Color2" };

   // After — on library object
   oThisLibrary.ValueColor = { Color1: "Color1", Color2: "Color2" };
   ```

3. **Add `DataType.registerEnum` call** immediately after each enum definition:
   ```javascript
   oThisLibrary.ValueColor = { Color1: "Color1", Color2: "Color2" };
   DataType.registerEnum("my.lib.ValueColor", oThisLibrary.ValueColor);
   ```

4. **Add `sap/ui/base/DataType`** to the `sap.ui.define` dependency list if not already present:
   ```javascript
   sap.ui.define([
       "sap/ui/base/DataType",  // Add this
       "sap/ui/core/Lib"
   ], function(DataType, Library) {
   ```

### Key Rules

- The first argument to `registerEnum` must **exactly match** the string used as `type` in control metadata (e.g. `"my.lib.ValueColor"`)
- All enum definitions should stay in `library.js` for library preload compatibility
- Each enum listed in the `types` array needs its own `registerEnum` call

## Complete Example

### Before

```javascript
/*!
 * ${copyright}
 */
sap.ui.define([
    "sap/ui/core/Lib"
], function(Library) {
    "use strict";

    Library.init({
        name: "my.lib",
        dependencies: ["sap.ui.core", "sap.m"],
        types: [
            "my.lib.ValueColor",
            "my.lib.StatusType"
        ],
        controls: [
            "my.lib.MyControl"
        ]
    });

    // Enums defined on global namespace
    my.lib.ValueColor = {
        Good: "Good",
        Critical: "Critical",
        Error: "Error",
        Neutral: "Neutral"
    };

    my.lib.StatusType = {
        Active: "Active",
        Inactive: "Inactive"
    };
});
```

### After

```javascript
/*!
 * ${copyright}
 */
sap.ui.define([
    "sap/ui/base/DataType",
    "sap/ui/core/Lib"
], function(DataType, Library) {
    "use strict";

    var oThisLibrary = Library.init({
        apiVersion: 2,
        name: "my.lib",
        dependencies: ["sap.ui.core", "sap.m"],
        types: [
            "my.lib.ValueColor",
            "my.lib.StatusType"
        ],
        controls: [
            "my.lib.MyControl"
        ]
    });

    oThisLibrary.ValueColor = {
        Good: "Good",
        Critical: "Critical",
        Error: "Error",
        Neutral: "Neutral"
    };
    DataType.registerEnum("my.lib.ValueColor", oThisLibrary.ValueColor);

    oThisLibrary.StatusType = {
        Active: "Active",
        Inactive: "Inactive"
    };
    DataType.registerEnum("my.lib.StatusType", oThisLibrary.StatusType);

    return oThisLibrary;
});
```

## Implementation Steps

1. **Run linter with --details** to get additional context:
   ```bash
   npx @ui5/linter --details
   ```

2. **Read the library.js file** and identify:
   - The `Lib.init()` / `Library.init()` call and its current arguments
   - Whether the return value is captured in a variable
   - Any enum definitions (check `types` array and global namespace assignments)

3. **Fix the apiVersion**:
   - If no arguments: add `{ apiVersion: 2 }`
   - If object without apiVersion: add `apiVersion: 2` as the first property
   - If apiVersion is wrong value or type: change to numeric `2`

4. **Modernize enums** (if any exist):
   - Capture `Lib.init()` return value in a variable if not already done
   - Move each enum from global namespace to the library object
   - Add `DataType.registerEnum` call for each enum
   - Add `sap/ui/base/DataType` to the dependency list

5. **Ensure the module returns the library object** (`return oThisLibrary;`)

6. **Verify the fix** by re-running the linter

## Notes

- Only `apiVersion: 2` is valid for `Lib.init()` — `apiVersion: 4` is NOT valid (that is for renderers only)
- `apiVersion` must be a numeric literal, not a string
- Libraries without enums only need the `apiVersion: 2` fix (no `DataType.registerEnum` needed)
- If the library already returns the init result and has no global enum definitions, only the apiVersion fix is needed
- The `types` array in the init call is your guide to which enums need `registerEnum` calls

## Related Skills

- **fix-control-renderer**: For renderer `apiVersion` issues (missing `apiVersion: 2` or `4` in renderer objects) — different from library init apiVersion
- **fix-pseudo-modules**: If consumer code imports enums via pseudo-modules (e.g. `sap.ui.require(["my/lib/ValueColor"])`), use fix-pseudo-modules to convert them to library module imports
- **fix-js-globals**: If library.js also has global access patterns beyond enum definitions (e.g. `sap.ui.getCore()`), use fix-js-globals for those
