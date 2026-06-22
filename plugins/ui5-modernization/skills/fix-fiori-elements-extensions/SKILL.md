---
name: fix-fiori-elements-extensions
description: |
  Handle Fiori Elements V2 controller extensions during UI5 modernization. Use this skill when:
  - Extension controllers use `sap.ui.controller()` AND the manifest has a matching `controllerName` entry (Case B → report only, do not modernize)
  - Extension controllers use `Controller.extend()` with manifest `controllerName` registration (Case B → report only, do not modernize)
  - Code contains `registerControllerExtensions` calls (Case A → ControllerExtension.extend + override)
  - Manifest.json has `sap.ui5/extends/extensions/sap.ui.controllerExtensions` with `controllerName` entries
  Case B (plain object) is by far the most common. For Case B, do NOT modify controller files — report them and move on. Case A requires actual code modernization.
  For plain controller definitions in custom (non-Fiori-Elements) apps where `sap.ui.controller()` is just defining a standalone controller, use `fix-js-globals` (Case 9) instead.
---

# Fix Fiori Elements Controller Extensions

This skill handles Fiori Elements V2 controller extensions during UI5 modernization. There are two cases with different actions:

- **Case B (most common)**: Extensions registered via `controllerName` in manifest → **Report only. Do NOT modify the controller files.** Leave them as-is and inform the user which files need manual attention.
- **Case A (rare)**: Extensions using `registerControllerExtensions` → Perform the full modernization to `ControllerExtension.extend()` + manifest registration.

## Linter Rules Handled

| Rule ID | Message Pattern | This Skill's Action |
|---------|-----------------|---------------------|
| `no-deprecated-api` | Use of deprecated `registerControllerExtensions` | Case A: Modernize to manifest + ControllerExtension |
| `no-deprecated-api` | Use of deprecated `sap.ui.controller` | Case B (if manifest has `controllerName`): **report only, do not fix**; Case A (if `registerControllerExtensions`): ControllerExtension class |
| `no-deprecated-api` | Use of deprecated `Controller` (from `sap/ui/core/mvc/Controller`) | Case B: **report only, do not fix** |

## Quick Decision: Which Case Am I?

```
Is there a `controllerName` entry in manifest.json under
sap.ui5/extends/extensions/sap.ui.controllerExtensions with a SIMPLE key
(no "#" in the key)?
  ├── YES → Case B: DO NOT MODERNIZE. Report the file(s) and move on.
  │         (regardless of whether source uses sap.ui.controller() or Controller.extend())
  └── NO  → Is there a registerControllerExtensions call in JS?
              ├── YES → Case A: modernize to ControllerExtension.extend() + manifest with #stableId key
              └── NO  → This skill does not apply
```

## When to Use

**Case B (most common)** — Detected when the manifest already has a `controllerName` entry under a simple key, and the controller file uses either `sap.ui.controller()` or `Controller.extend()`:

```json
// manifest.json — controllerName registration already present (simple key, no "#")
"sap.ui.controllerExtensions": {
    "sap.suite.ui.generic.template.ListReport.view.ListReport": {
        "controllerName": "my.app.ext.controller.ListReportExt"
    }
}
```

The source controller might look like either of these:
```javascript
// Variant 1: sap.ui.controller() — NO sap.ui.define wrapper
sap.ui.controller("my.app.ext.controller.ListReportExt", {
    onInit: function() { ... },
    onCustomAction: function() { ... }
});
```
```javascript
// Variant 2: Controller.extend() — inside sap.ui.define
sap.ui.define(["sap/ui/core/mvc/Controller", ...], function(Controller, ...) {
    return Controller.extend("my.app.ext.controller.ListReportExt", { ... });
});
```

Linter output triggering Case B:
```
MyExtension.controller.js:1:1 error Use of deprecated function 'sap.ui.controller'  no-deprecated-api
MyExtension.controller.js:3:5 error Use of deprecated function 'Controller' (from 'sap/ui/core/mvc/Controller')  no-deprecated-api
```

> **Action for Case B: Do NOT modify these files.** Report them to the user and continue with the rest of the modernization.

**Case A (rare, older apps only)** — Apply when you see linter output like:
```
Component.js:25:5 error Use of deprecated function 'registerControllerExtensions'  no-deprecated-api
```

Or when an app has patterns like:
```javascript
// In Component.js or elsewhere — NO manifest entry exists yet
this.getExtensionComponent().registerControllerExtensions("sap.suite.ui.generic.template.ListReport.view.ListReport", {
    onInit: function() { ... },
    onAction: function() { ... }
});
```

## Fix Strategy

The action depends on **how the extension is registered in the manifest**. Determine which case applies before proceeding.

### Case Detection

| Manifest Registration | Source Code (any of) | Action |
|---|---|---|
| `controllerName` in manifest (simple key, no `#stableId`) | `sap.ui.controller()`, `Controller.extend()`, or plain object | **Case B: Report only — do NOT modify files** |
| `registerControllerExtensions` in JS (no manifest entry) | `sap.ui.controller()` or inline object | Case A: `ControllerExtension.extend()` + `override` + add manifest entry with `#stableId` key |

**The key differentiator is the manifest registration format:**
- **Case B** (most common): `controllerName` already in manifest under a **simple key** (e.g., `"sap.suite.ui.generic.template.ListReport.view.ListReport": { "controllerName": "..." }`). **Do not modernize these files.** Report them and move on.
- **Case A**: No `controllerName` in manifest yet — extension is registered programmatically via `registerControllerExtensions`. The modernization adds a manifest entry with the `#stableId` key format AND uses `ControllerExtension.extend()`.

**Detection commands:**
```bash
# Check manifest registration format
grep -B1 -A2 "controllerName" webapp/manifest.json

# Case B indicator: controllerName in manifest with simple key (no # in key)
# If the key does NOT contain "#", it's the merging mechanism → Case B → REPORT ONLY

# Case A indicator: registerControllerExtensions in JS
grep -rl "registerControllerExtensions" webapp/ --include="*.js"
```

---

### Case B: Report and Skip (Most Common)

For extensions registered via `controllerName` in the manifest (simple key without `#stableId`), **do NOT modify the controller files**. These require careful manual modernization and are left to the developer.

**Steps:**

1. Identify all controller files referenced by `controllerName` entries in manifest.json (under keys that do NOT contain `#`)
2. Report them to the user with this format:

```
⚠️ Fiori Elements controller extensions (Case B) — skipped, requires manual modernization:
  - webapp/ext/controller/ListReportExt.controller.js
  - webapp/ext/controller/ObjectPageExt.controller.js
These files use deprecated APIs (sap.ui.controller / Controller.extend) but are Fiori Elements
controller extensions registered via controllerName in the manifest. They require careful manual
modernization to a plain-object return pattern. The linter errors for these files will persist until
they are modernized manually.
```

3. **Do NOT** (within this skill):
   - Modify the controller .js files to change the controller extension pattern (no plain-object conversion)
   - Change the manifest registration
   - Add linter disable comments
   - Attempt the plain-object modernization pattern
4. **Other skills CAN still process these files** for unrelated fixes (e.g., `fix-js-globals` replacing `sap.ui.getCore()` calls within method bodies, `fix-linter-blind-spots` for namespace patterns). Only the `sap.ui.controller()` / `Controller.extend()` structure itself is left untouched.
5. Continue with the rest of the modernization (other skills, other linter findings)

---

### Case A: Step 1 — Move Registration from JS to manifest.json

*Only for Case A (extensions using `registerControllerExtensions` in JS).*

Move controller extension registrations from JavaScript code to the manifest under `sap.ui.controllerExtensions`.

**Key format**: `<FLOORPLAN_CONTROLLER>#<STABLE_ID_OF_VIEW>`

```json
// Before - no controller extensions in manifest

// After - manifest.json
{
  "sap.ui5": {
    "extends": {
      "extensions": {
        "sap.ui.controllerExtensions": {
          "sap.suite.ui.generic.template.ListReport.view.ListReport#myApp::sap.suite.ui.generic.template.ListReport.view.ListReport::EntitySet": {
            "controllerName": "my.app.ext.ListReportExtension"
          },
          "sap.suite.ui.generic.template.ObjectPage.view.Details#myApp::sap.suite.ui.generic.template.ObjectPage.view.Details::EntitySet": {
            "controllerName": "my.app.ext.ObjectPageExtension"
          }
        }
      }
    }
  }
}
```

**Finding the correct key:**
1. The key has format: `<FloorplanController>#<StableViewId>`
2. The floorplan controller name matches the view name (e.g., `sap.suite.ui.generic.template.ListReport.view.ListReport`)
3. The stable view ID is typically: `<AppId>::<FloorplanViewName>::<EntitySet>`
4. Check the app's existing manifest for `sap.ui.generic.app` / `pages` configuration to find entity sets and page IDs

### Case A: Step 2 — Restructure Controller Files

> **⚠️ This step only applies to Case A** (extensions using `sap.ui.controller()` factory).
> If the extension already uses `Controller.extend()` with manifest `controllerName` registration, use **Case B** below instead.

Convert controller files from `sap.ui.controller` style to `ControllerExtension` class.

**Before:**
```javascript
sap.ui.controller("my.app.ext.ListReportExtension", {
    onInit: function() {
        // lifecycle code
    },
    onBeforeRebindTable: function(oEvent) {
        // framework override
    },
    onCustomAction: function(oEvent) {
        // custom method
    }
});
```

**After:**
```javascript
sap.ui.define([
    "sap/ui/core/mvc/ControllerExtension"
], function(ControllerExtension) {
    "use strict";

    return ControllerExtension.extend("my.app.ext.ListReportExtension", {
        // Lifecycle and framework overrides go inside "override"
        override: {
            onInit: function() {
                // extensionAPI is injected by the framework into the extension instance
                this._extensionAPI = this.extensionAPI;
            },
            onBeforeRebindTable: function(oEvent) {
                // framework override
            }
        },

        // Custom methods go OUTSIDE "override"
        onCustomAction: function(oEvent) {
            // custom method
        }
    });
});
```

**Key rules for restructuring:**
- Extend `sap/ui/core/mvc/ControllerExtension` instead of using `sap.ui.controller`
- **Lifecycle methods** (`onInit`, `onExit`, `onBeforeRendering`, `onAfterRendering`) → inside `override`
- **Framework callback methods** (`onBeforeRebindTable`, `onBeforeRebindChart`, `onListNavigationExtension`, `adaptNavigationParameterExtension`, etc.) → inside `override`
- **Custom action methods** (handlers for custom buttons/actions) → OUTSIDE `override`
- Access `extensionAPI` via `this.extensionAPI` (the framework injects it into the extension instance)

---

### Case A: Step 3 — Update Handler References

In the manifest and XML annotations, update all event handler references from the old format to the new qualified format.

**Before:**
```json
// In manifest extensions or annotations
"Actions": {
    "MyAction": {
        "id": "MyAction",
        "text": "Do Something",
        "press": "onCustomAction"
    }
}
```

**After:**
```json
"Actions": {
    "MyAction": {
        "id": "MyAction",
        "text": "Do Something",
        "press": ".extension.my.app.ext.ListReportExtension.onCustomAction"
    }
}
```

**Reference format**: `.extension.<full.controller.name>.<methodName>`

**Important**: Use the **dotted module name** as declared in `ControllerExtension.extend("my.app.ext.ListReportExtension", ...)` and in the manifest's `controllerName` — **not** the slash-separated path used in `sap.ui.define` imports (e.g., `"my/app/ext/ListReportExtension"`).

This applies to:
- `press` handlers in manifest action definitions
- Custom column/section handler references
- Any event handler references that previously used just the method name

## Implementation Steps

### Case B Implementation (Report Only)

1. **Identify extension controllers** registered via `controllerName` in manifest (simple key, no `#`)
2. **Report them** to the user — list each file path and note that they require manual modernization
3. **Do not modify** these files, their manifest entries, or their handler references
4. **Continue** with other modernization tasks

### Case A Implementation (registerControllerExtensions → ControllerExtension)

1. **Identify all `registerControllerExtensions` calls** in the codebase (typically in Component.js or helper files)
2. **For each registration**:
   a. Determine the floorplan controller name and view stable ID
   b. Determine the extension controller name/path
   c. Add entry to `manifest.json` under `sap.ui5/extends/extensions/sap.ui.controllerExtensions`
3. **For each extension controller file**:
   a. Replace `sap.ui.controller(...)` with `sap.ui.define([ControllerExtension], ...)`
   b. Move lifecycle/framework methods into `override` section
   c. Keep custom methods outside `override`
   d. Update `extensionAPI` access pattern
4. **For all handler references**:
   a. Search manifest.json for action `press` handlers using simple method names
   b. Search XML annotation files for handler references
   c. Update to `.extension.<module>.<method>` format
5. **Remove the `registerControllerExtensions` calls** from Component.js
6. **Verify** by re-running the linter

## Example Full Modernization

**Before — Component.js:**
```javascript
sap.ui.define([
    "sap/suite/ui/generic/template/lib/AppComponent"
], function(AppComponent) {
    "use strict";

    return AppComponent.extend("my.app.Component", {
        metadata: {
            manifest: "json"
        },
        init: function() {
            AppComponent.prototype.init.apply(this, arguments);
            this.getExtensionComponent().registerControllerExtensions(
                "sap.suite.ui.generic.template.ListReport.view.ListReport", {
                    onInit: function() {
                        // lifecycle code
                    },
                    onCustomAction: function(oEvent) {
                        // custom handler
                    }
                }
            );
        }
    });
});
```

**After — Component.js:**
```javascript
sap.ui.define([
    "sap/suite/ui/generic/template/lib/AppComponent"
], function(AppComponent) {
    "use strict";

    return AppComponent.extend("my.app.Component", {
        metadata: {
            manifest: "json"
        }
        // registerControllerExtensions call removed — now in manifest.json
    });
});
```

**After — manifest.json (additions):**
```json
{
  "sap.ui5": {
    "extends": {
      "extensions": {
        "sap.ui.controllerExtensions": {
          "sap.suite.ui.generic.template.ListReport.view.ListReport#my.app::sap.suite.ui.generic.template.ListReport.view.ListReport::Products": {
            "controllerName": "my.app.ext.ListReportExtension"
          }
        }
      }
    }
  }
}
```

**After — ext/ListReportExtension.controller.js:**
```javascript
sap.ui.define([
    "sap/ui/core/mvc/ControllerExtension"
], function(ControllerExtension) {
    "use strict";

    return ControllerExtension.extend("my.app.ext.ListReportExtension", {
        override: {
            onInit: function() {
                this._extensionAPI = this.extensionAPI;
            }
        },

        onCustomAction: function(oEvent) {
            // Custom action handler — accessible as
            // ".extension.my.app.ext.ListReportExtension.onCustomAction"
        }
    });
});
```

## Notes

- This modernization only applies to **Fiori Elements V2** template apps (using `sap.suite.ui.generic.template`)
- Fiori Elements V4 (using `sap.fe.templates`) uses a different extension mechanism — this skill does not apply
- **Case B is far more common** in practice — extensions registered via `controllerName` in the manifest. These are **not auto-modernized** — the agent reports them and moves on
- Case A only appears in older apps that never modernized from `registerControllerExtensions`
- The stable view ID format varies by floorplan and configuration — check the running app's DOM or the floorplan documentation
- If the app uses `templateSpecific.json` for handler references, those must also be updated (Case A only)
- After Case A modernization, the extension controller file should be placed under a path matching its module name

## Related Skills

- **fix-js-globals**: For plain `sap.ui.controller()` definitions in custom apps (Case 9), or if extension controllers also use global access patterns (`sap.ui.getCore()`, `jQuery.sap.*`). Other skills CAN still be applied to Case B controller files for issues unrelated to the controller extension pattern itself (e.g., replacing global API usage within method bodies).
- **fix-manifest-json**: The manifest changes for controller extensions are additive — they don't conflict with version/routing updates from fix-manifest-json
- **fix-linter-blind-spots**: Can still fix namespace patterns and other blind spots within Case B controller files
