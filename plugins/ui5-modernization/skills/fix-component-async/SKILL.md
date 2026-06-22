---
name: fix-component-async
description: |
  Fix Component.js async configuration issues that UI5 linter reports but cannot auto-fix. Use this skill when linter outputs these rules:
  - `async-component-flags` - For missing IAsyncContentCreation interface, missing manifest declaration, redundant async flags, async:false errors
  - `no-removed-manifest-property` - For async flags in inline manifest v2
  Trigger on Component.js files with errors about async loading, IAsyncContentCreation, manifest declaration.
  Automatically adds the IAsyncContentCreation interface and configures manifest properly.
---

# Fix Component.js Async Configuration

This skill fixes Component.js async configuration issues that the UI5 linter detects but cannot auto-fix because they may require understanding of the component's loading behavior.

## Linter Rules Handled

| Rule ID | Message Pattern | This Skill's Action |
|---------|-----------------|---------------------|
| `async-component-flags` | Component is not configured for asynchronous loading | Add `IAsyncContentCreation` interface |
| `async-component-flags` | Component does not specify that it uses the descriptor via the manifest.json file | Add `manifest: "json"` |
| `async-component-flags` | Component implements the sap.ui.core.IAsyncContentCreation interface. The redundant 'async' flag ... should be removed | Remove async flag from manifest |
| `async-component-flags` | The 'async' property at '...' must be removed | Remove `async: false` |
| `no-removed-manifest-property` | Property '...' has been removed in Manifest Version 2 | Remove async property |

## When to Use

Apply this skill when you see linter output like:
```
Component.js:5:1 error Component is not configured for asynchronous loading.  async-component-flags
Component.js:5:1 warning Component does not specify that it uses the descriptor via the manifest.json file  async-component-flags
Component.js:10:5 warning Component implements the sap.ui.core.IAsyncContentCreation interface. The redundant 'async' flag at '/sap.ui5/rootView/async' should be removed  async-component-flags
manifest.json:25:9 error The 'async' property at '/sap.ui5/rootView/async' must be removed  async-component-flags
```

**Important during full modernization workflows:** Also apply this skill unconditionally to every Component.js, even if the linter did not flag `async-component-flags`. The linter can only detect the missing interface AFTER redundant `async: true` flags are removed from manifest.json — so in early modernization phases the error won't appear yet. Always add `IAsyncContentCreation` proactively.

## Critical Rules

### Never Import IAsyncContentCreation

`IAsyncContentCreation` is a **marker interface** — the UI5 runtime checks for its name as a string in the `interfaces` array. It must NOT be imported as a module dependency. Adding it to the `sap.ui.define` dependency array causes a runtime error because `sap/ui/core/IAsyncContentCreation` is not a loadable module.

```javascript
// WRONG — do NOT import it
sap.ui.define([
  "sap/ui/core/UIComponent",
  "sap/ui/core/IAsyncContentCreation"  // ← WRONG: will fail at runtime
], function(UIComponent, IAsyncContentCreation) {
  ...
});

// CORRECT — only reference it as a string in interfaces
sap.ui.define([
  "sap/ui/core/UIComponent"
], function(UIComponent) {
  return UIComponent.extend("my.app.Component", {
    metadata: {
      manifest: "json",
      interfaces: ["sap.ui.core.IAsyncContentCreation"]  // ← string reference only
    }
  });
});
```

If you see `"sap/ui/core/IAsyncContentCreation"` in an existing dependency array, remove it and its corresponding function parameter.

### Correct Placement of `interfaces`

`interfaces` is a property of the `metadata` object — it must be nested **inside** `metadata: { }`. The UIComponent.extend() config object has two levels:

```
UIComponent.extend("name", {
  metadata: {          ← level 1: component config
    manifest: "json",  ← level 2: metadata properties
    interfaces: [...]  ← level 2: THIS IS WHERE interfaces GOES
  },
  init: function() {}  ← level 1: component config
});
```

The UI5 runtime only reads `interfaces` from the `metadata` object. Placing it at level 1 (as a sibling of `metadata`) silently fails — the component will not be recognized as async.

After writing your edit, verify: is `interfaces` indented one level deeper than `metadata:`? If not, you put it in the wrong place.

## Fix Strategy

### 1. `async-component-flags` - Add IAsyncContentCreation Interface

The `IAsyncContentCreation` interface is the modern way to declare that a component loads content asynchronously.

**Correct — `interfaces` nested inside `metadata`:**

```javascript
// Before
sap.ui.define([
  "sap/ui/core/UIComponent"
], function(UIComponent) {
  "use strict";

  return UIComponent.extend("my.app.Component", {
    metadata: {
      manifest: "json"
    }
  });
});

// After
sap.ui.define([
  "sap/ui/core/UIComponent"
], function(UIComponent) {
  "use strict";

  return UIComponent.extend("my.app.Component", {
    metadata: {
      manifest: "json",
      interfaces: ["sap.ui.core.IAsyncContentCreation"]
    }
  });
});
```

**WRONG — `interfaces` at the wrong nesting level:**

```javascript
// WRONG — interfaces as a sibling of metadata (level 1 instead of level 2)
return UIComponent.extend("my.app.Component", {
  interfaces: ["sap.ui.core.IAsyncContentCreation"],  // ← WRONG: outside metadata
  metadata: {
    manifest: "json"
  }
});
```

### 2. `async-component-flags` - Add Manifest Declaration

If the component doesn't declare it uses a manifest, add `manifest: "json"` to the metadata.

```javascript
// Before
metadata: {
  // no manifest declaration
}

// After
metadata: {
  manifest: "json"
}
```

### 3. `async-component-flags` - Remove Redundant Async Flags

When `IAsyncContentCreation` interface is implemented, the async flags in manifest.json become redundant and should be removed.

**In manifest.json:**

```json
// Before
{
  "sap.ui5": {
    "rootView": {
      "viewName": "my.app.view.Main",
      "type": "XML",
      "async": true
    },
    "routing": {
      "config": {
        "async": true,
        ...
      }
    }
  }
}

// After
{
  "sap.ui5": {
    "rootView": {
      "viewName": "my.app.view.Main",
      "type": "XML"
    },
    "routing": {
      "config": {
        ...
      }
    }
  }
}
```

### 4. `async-component-flags` - Remove async: false

If `async: false` is explicitly set, this must be removed as it prevents asynchronous loading.

### 5. Handle Inline Manifest in Component.js

If the manifest is defined inline in Component.js (not in a separate manifest.json), apply the same fixes to the inline manifest object. Note that `interfaces` still goes inside `metadata` — it is a sibling of the inline `manifest` property, both nested under `metadata`:

```javascript
// Before
metadata: {
  manifest: {
    "sap.ui5": {
      "rootView": {
        "async": true,
        ...
      }
    }
  }
}

// After
metadata: {
  manifest: {
    "sap.ui5": {
      "rootView": {
        ...
      }
    }
  },
  interfaces: ["sap.ui.core.IAsyncContentCreation"]  // ← still INSIDE metadata
}
```

## Implementation Steps

1. Read the Component.js file
2. Determine the syntax style (sap.ui.define or ES6 class)
3. For `async-component-flags` errors:
   - Check if `IAsyncContentCreation` interface is already declared
   - If not, add `interfaces: ["sap.ui.core.IAsyncContentCreation"]` as a property inside the `metadata: { }` object (sibling of `manifest`, NOT sibling of `metadata` itself)
   - Check if `manifest: "json"` is declared, add if missing
4. Verify placement: `interfaces` must be indented one level deeper than `metadata:` — if it's at the same level, it's wrong
5. Check the manifest.json (or inline manifest) for redundant async flags
6. Remove `async` properties from rootView and routing/config
7. Write the updated files
8. Run the gate script to verify: `node <skill-dir>/scripts/verify-component.js <project-root>` — must exit 0

## Example Fix

Given linter output:
```
Component.js:5:1 error Component is not configured for asynchronous loading.  async-component-flags
```

**Component.js transformation:**

```javascript
// Before
sap.ui.define([
  "sap/ui/core/UIComponent",
  "sap/ui/model/json/JSONModel"
], function(UIComponent, JSONModel) {
  "use strict";

  return UIComponent.extend("my.app.Component", {
    metadata: {
      manifest: "json"
    },

    init: function() {
      UIComponent.prototype.init.apply(this, arguments);
      // ...
    }
  });
});

// After — interfaces goes INSIDE metadata, not next to init/metadata
sap.ui.define([
  "sap/ui/core/UIComponent",
  "sap/ui/model/json/JSONModel"
], function(UIComponent, JSONModel) {
  "use strict";

  return UIComponent.extend("my.app.Component", {
    metadata: {
      manifest: "json",
      interfaces: ["sap.ui.core.IAsyncContentCreation"]
    },

    init: function() {
      UIComponent.prototype.init.apply(this, arguments);
      // ...
    }
  });
});
```

## Notes

- The `IAsyncContentCreation` interface was introduced in UI5 1.89 - ensure minUI5Version is compatible
- When adding the interface, also ensure `manifest: "json"` is present for proper async loading
- The interface makes `async: true` flags redundant - they can be safely removed
- Components that extend UIComponent (not just Component) can use IAsyncContentCreation
- If the component inherits from a custom base component that already implements IAsyncContentCreation, no changes are needed
- **`IAsyncContentCreation` vs manifest v2**: These are independent concerns. Updating manifest `_version` to `"2.0.0"` does NOT automatically enable async content creation — `IAsyncContentCreation` must still be explicitly implemented in Component.js. Conversely, adding `IAsyncContentCreation` does not require manifest v2.

## Related Skills

- **fix-manifest-json**: When adding `IAsyncContentCreation`, the manifest.json `async` flags become redundant — use fix-manifest-json to update `_version`, remove async properties, and rename routing configuration
- **fix-js-globals**: If Component.js uses global access patterns (e.g., `sap.ui.getCore()`), use fix-js-globals to convert them to proper module imports
