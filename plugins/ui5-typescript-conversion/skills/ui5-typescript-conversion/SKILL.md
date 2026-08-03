---
name: ui5-typescript-conversion
description: A skill for converting UI5 (SAPUI5/OpenUI5) projects to TypeScript.
---

# UI5 TypeScript Conversion Guidelines

> How to convert a UI5 (SAPUI5/OpenUI5) project to TypeScript: general rules, project setup changes, code conversion, and test conversion (separate file).

## General Conversion Rules

### Preserve ALL comments

You MUST preserve existing JSDoc, documentation and comments - never remove JSDoc or comments during the conversion. When converting to a class, add `@namespace` but keep ALL existing JSDoc.

Before:
```js
/**
 * My cool controller, it does things.
 */
return Controller.extend("com.myorg.myapp.controller.BaseController", {
    /**
     * Convenience method for accessing the component of the controller's view.
     * @returns {sap.ui.core.Component} The component of the controller's view
     */
    getOwnerComponent: function () {
        return Controller.prototype.getOwnerComponent.call(this);
    },
});
```

After:
```ts
/**
 * My cool controller, it does things.
 * @namespace com.myorg.myapp.controller
 */
export default class BaseController extends Controller {
    /**
     * Convenience method for accessing the component of the controller's view.
     * @returns {sap.ui.core.Component} The component of the controller's view
     */
    public getOwnerComponent(): UIComponent {
        return super.getOwnerComponent() as UIComponent;
    }
}
```

### Be diligent

Carefully respect all guidelines in this document. Before each conversion step, consider all relevant details.

### Go step-by-step

Convert step by step: TypeScript project setup first, then central files other files depend on, so typed versions are available for consumers. `"allowJs": true` in `tsconfig.json` allows semi-converted projects.

### Avoid `any` type

Find the proper type or create an interface instead of `any`:
```ts
// BAD: (this.getOwnerComponent() as any).getContentDensityClass();
// GOOD:
(this.getOwnerComponent() as AppComponent).getContentDensityClass()
```

### Avoid `unknown` casts

Import and use actual UI5 control types. Inspect the XMLView to find which control type you get from `this.byId(...)`. Use specific event types like `Route$PatternMatchedEvent`.

```ts
// BAD: (this.byId("form") as unknown as {setVisible: (v: boolean) => void}).setVisible(false);
// GOOD:
import SimpleForm from "sap/ui/layout/form/SimpleForm";
(this.byId("form") as SimpleForm).setVisible(false);
```

### Create shared type definitions

Create shared types in a central location like `src/types/`.

## Project Setup Conversion

### 1. package.json

Add the following dev dependencies if not already present:

{{dependencies}}

Do not increase existing major versions. Do not remove existing dependencies.

**IMPORTANT**: Also add `@sapui5/types` (or `@openui5/types`) matching the UI5 project version as dev dependency. Framework type and version from ui5.yaml or `get_project_info` MCP tool.

If dependencies changed, ensure `npm install` / `yarn install` is run. The `typescript-eslint` dependency is only relevant when the project already has eslint. Also add `"ts-typecheck": "tsc --noEmit"` script to `package.json`.

### 2. tsconfig.json

Add a tsconfig.json. Use this as reference, adapt paths to the project:

```json
{
	"compilerOptions": {
		"target": "es2023",
		"module": "es2022",
		"moduleResolution": "node",
		"skipLibCheck": true,
		"allowJs": true,
		"strict": true,
		"strictNullChecks": false,
		"strictPropertyInitialization": false,
		"outDir": "./dist",
		"rootDir": "./webapp",
		"types": ["@sapui5/types", "@types/jquery", "@types/qunit"],
		"paths": {
			"com/myorg/myapp/*": ["./webapp/*"],
			"unit/*": ["./webapp/test/unit/*"],
			"integration/*": ["./webapp/test/integration/*"]
		}
	},
	"exclude": ["./webapp/test/e2e/**/*"],
	"include": ["./webapp/**/*"]
}
```

### 3. ui5.yaml

Add `ui5-tooling-transpile-task` and `ui5-tooling-transpile-middleware`:

```yaml
builder:
  customTasks:
    - name: ui5-tooling-transpile-task
      afterTask: replaceVersion
server:
  customMiddleware:
    - name: ui5-tooling-transpile-middleware
      afterMiddleware: compression
    - name: ui5-middleware-livereload
      afterMiddleware: compression
```

Avoid duplicate entries — add to existing `server`/`builder` sections if they exist.

### 4. Eslint configuration

Only when eslint is already set up, enhance it with TypeScript-specific parts. Example eslint v9 `eslint.config.mjs`:

```js
import eslint from "@eslint/js";
import globals from "globals";
import tseslint from "typescript-eslint";

export default tseslint.config(
	eslint.configs.recommended,
	...tseslint.configs.recommended,
	...tseslint.configs.recommendedTypeChecked,
	{
		languageOptions: {
			globals: {
				...globals.browser,
				sap: "readonly"
			},
			ecmaVersion: 2023,
			parserOptions: {
				project: true,
				tsconfigRootDir: import.meta.dirname
			}
		}
	},
	{
		ignores: ["eslint.config.mjs"]
	}
);
```

## Application Code Conversion

### Step 1: Change UI5 class syntax to ES class syntax

Convert `SuperClass.extend(...)` to a standard `class`. Properties in the config object (second `extend` parameter) become class members. Annotate the class with `@namespace` in a JSDoc comment (it must immediately precede the class declaration) — the namespace is the part of the full name (first `extend` parameter) that precedes the class name.

Before:
```js
var App = Controller.extend("ui5tssampleapp.controller.App", {
    onInit: function _onInit() {
        // apply content density mode to root view
        this.getView().addStyleClass(this.getOwnerComponent().getContentDensityClass());
    }
});
```

After:
```ts
/**
 * @namespace ui5tssampleapp.controller
 */
export default class App extends Controller {
    public onInit(): void {
        // apply content density mode to root view
        this.getView().addStyleClass((this.getOwnerComponent() as AppComponent).getContentDensityClass());
    }
}
```

### Step 2: Change to ECMAScript modules and imports

Convert `sap.ui.define(...)` to ES imports + `export default`. Convert `sap.ui.require(...)` to imports (no export). Avoid name clashes between imported modules.

Before:
```js
sap.ui.define(["sap/ui/core/mvc/Controller"], function (Controller) {
    class App extends Controller {
        // ... as above
    }
    return App;
});
```

After:
```ts
import Controller from "sap/ui/core/mvc/Controller";

/**
 * @namespace ui5tssampleapp.controller
 */
export default class App extends Controller {
    // ... as above
}
```

Dynamic `sap.ui.require` inside method bodies → dynamic import:
```ts
import("sap/m/MessageBox").then((MessageBox) => { /* ... */ });
```

> Hint: importing `sap/ui/core/Core` provides the singleton instance, not the class.

### Step 3: Standard TypeScript Code Adaptations

- Add type information to method parameters and variables where needed.
- Add missing private member class variables (with types) to the beginning of the class definition. (In JavaScript they are often created on-the-fly during the instance lifetime.)
- Convert `someFunction.bind(...)` to arrow functions (TypeScript does not propagate the bound `this` type into the function body).
- Define further types and structures as needed.

> IMPORTANT: Never use a UI5 type with its global namespace (like `sap.m.Button`). Always import it from the module (like `sap/m/Button`) and use the imported name.

Wrong:
```ts
const b: sap.m.Button;
function getPopup(): sap.ui.core.Popup { /* ... */ }
```

Correct:
```ts
import Button from "sap/m/Button";
import Popup from "sap/ui/core/Popup";

const b: Button;
function getPopup(): Popup { /* ... */ }
```

**Use UI5 control event types**, not browser events like `Event` or `MouseEvent` — UI5 events are different:

```ts
import Button from "sap/m/Button";
import { Button$PressEvent } from "sap/m/Button";
import { Table$RowSelectionChangeEvent } from "sap/ui/table/Table";

export default class Main extends BaseController {
    onPress(oEvent: Button$PressEvent): void {
        const button = oEvent.getSource() as Button;
    }

    onRowSelectionChange(oEvent: Table$RowSelectionChangeEvent): void {
        const selectedContext = oEvent.getParameter("rowContext");
    }
}
```

> For any event XYZ of a UI5 control ABC, types `ABC$XYZEvent` and `ABC$XYZEventParameters` are available.

Use the most specific type that provides all needed properties: `KeyboardEvent`/`MouseEvent` not `Event` for browser events; `Button$PressEvent` not `sap/ui/base/Event`.

### Step 4: Casts for Return Values of Generic Methods

Generic methods return the super-type of all possible types although in practice it will usually be a specific sub-type. Cast the return value to the specific sub-type when needed; derive the actual type from context. This often requires an additional import. Most prominently affected: `core.byId()`/`view.byId()`, `control.getBinding()`, `ownerComponent.getModel()`, `event.getSource()`, `component.getRootControl()`, `this.getOwnerComponent()`.

For the app controller example above, this adds an import of the app's component (`AppComponent`) so the cast can be done — without it, `getOwnerComponent()` returns a `sap.ui.core.Component`, which does not have the `getContentDensityClass` method.

```ts
import Controller from "sap/ui/core/mvc/Controller";
import AppComponent from "../Component";

/**
 * @namespace ui5tssampleapp.controller
 */
export default class App extends Controller {
    public onInit(): void {
        // apply content density mode to root view
        this.getView().addStyleClass((this.getOwnerComponent() as AppComponent).getContentDensityClass());
    }
}
```

Do not cast to a superclass when it's already the returned type. Avoid guessing — skip the cast if the actual type isn't clear.

### Step 5: Solving any Remaining Issues

At this point remaining TypeScript errors should be vastly reduced. Fix clearly recognizable ones. In case of doubt, mention the last remaining issues to the developer.

## UI5 Control TypeScript Conversion Guidelines

Converting custom UI5 controls requires specific patterns beyond the general conversion. This applies to single custom controls within applications and to control libraries.

### The Runtime-Generated Methods Problem (CRITICAL)

**This is the most important aspect to understand.**

UI5 generates getter/setter (and more) methods for properties, aggregations, associations, and events at **runtime**. TypeScript cannot see them at development time. A control with a `text` property in its metadata will have `getText()`/`setText()` at runtime, but TypeScript errors on `control.getText()`. TypeScript also does not know the constructor's settings-object structure. This affects property getters/setters (`getText`, `setText`, `bindText`), aggregation methods (`addItem`, `removeItem`, `getItems`), association methods (`getLabel`, `setLabel`), event methods (`attachPress`, `detachPress`, `firePress`), and the constructor settings object.

### The Solution: @ui5/ts-interface-generator

```sh
npm install --save-dev @ui5/ts-interface-generator@{{ts-interface-generator-version}}
```

Add a script to `package.json` to make subsequent development easier:
```json
{
    "scripts": {
        "watch:controls": "npx @ui5/ts-interface-generator --watch"
    }
}
```

NOTE: if the tsconfig covering the controls is in a subdirectory or has a different name, use `--config path/to/tsconfig.json`.

After converting all controls, run the generator once:
```bash
npm run watch:controls
```

It generates `*.gen.d.ts` files with interfaces for all runtime-generated methods, which TypeScript merges with the control class. Commit these files; never edit them manually.

### Required Constructor Signatures (CRITICAL MANUAL STEP)

Copy the constructor signatures from the generator's terminal output into the beginning of the class body, before the metadata definition:

```ts
export default class MyControl extends Control {
    // The following three lines were generated and should remain as-is to make TypeScript aware of the constructor signatures
    constructor(id?: string | $MyControlSettings);
    constructor(id?: string, settings?: $MyControlSettings);
    constructor(id?: string, settings?: $MyControlSettings) { super(id, settings); }

    static readonly metadata: MetadataOptions = {
        // ...
    };
}
```

### Control Metadata Typing

The control metadata must be typed as `MetadataOptions`:

```ts
import type { MetadataOptions } from "sap/ui/core/Element";

export default class MyControl extends Control {
    static readonly metadata: MetadataOptions = {
        properties: {
            "text": "string"
        }
    };
}
```

- Import from `sap/ui/core/Element` (or the closest base class: `ManagedObject`, `Component`); use `import type` (design-time only).
- Available since UI5 1.110; use `object` for earlier versions.
- Typing prevents issues when inheriting from the control (inherited properties should not be repeated).

### Namespace Annotation Required

The `@namespace` JSDoc annotation is **required** for the transformer to generate correct UI5 class names:

```ts
/**
 * @namespace ui5.typescript.helloworld.control
 */
export default class MyControl extends Control {
    // ...
}
```

### Export Pattern

**Must use `export default` immediately** — a separate export breaks ts-interface-generator:

```ts
// CORRECT:
export default class MyControl extends Control {
    // ...
}

// WRONG:
class MyControl extends Control {
    // ...
}
export default MyControl;
```

### Static Members for Metadata and Renderer

Both metadata and renderer are `static` class members. The renderer can be inline or in a separate file:

```ts
import Control from "sap/ui/core/Control";
import type { MetadataOptions } from "sap/ui/core/Element";
import RenderManager from "sap/ui/core/RenderManager";

/**
 * @namespace ui5.typescript.helloworld.control
 */
export default class MyControl extends Control {
    static readonly metadata: MetadataOptions = {
        properties: {
            "text": "string"
        },
        events: {
            "press": {}
        }
    };

    static renderer = {
        apiVersion: 2,
        render: function (rm: RenderManager, control: MyControl): void {
            rm.openStart("div", control);
            rm.openEnd();
            rm.text(control.getText());
            rm.close("div");
        }
    };

    onclick(): void {
        this.firePress();
    }
}
```

When the renderer is in a separate file (common in libraries), it should stay separate — import it (`import MyControlRenderer from "./MyControlRenderer";`) and assign `static renderer = MyControlRenderer;`.

### Library-Specific Guidelines

When converting entire control libraries (not just single controls in apps), additional steps are required.

#### Library Module with Enums (CRITICAL to avoid XSS issues!)

In `library.ts`, enums must be attached to the global library object for UI5 runtime compatibility:

```ts
import ObjectPath from "sap/base/util/ObjectPath";

export enum ExampleColor {
    Red = "Red",
    Green = "Green",
    Blue = "Blue"
}

// CRITICAL: Attach to global library object
const thisLib = ObjectPath.get("com.myorg.myui5lib") as {[key: string]: unknown};
thisLib.ExampleColor = ExampleColor;
```

**Why this is critical for every enum in the library:**
- Control properties reference types as global names: `type: "com.myorg.myui5lib.ExampleColor"`.
- The UI5 runtime needs to find the enum via this global path to validate the property type.
- Without the attachment, UI5 cannot validate the type → unchecked content can be written to HTML → XSS vulnerability.

#### Path Mapping in tsconfig.json

For libraries, add path mappings for the library namespace:

```json
{
    "compilerOptions": {
        "paths": {
            "com/myorg/mylib/*": ["./src/*"]
        }
    }
}
```

### Control Conversion Checklist

Convert to ES6 class/module with `@namespace` and immediate `export default`; type metadata as `MetadataOptions`; define metadata and renderer as `static` members; install and run `@ui5/ts-interface-generator` and copy the constructor signatures from its output; attach enums to the global library object if in a library; preserve all JSDoc.

## Test Conversion

There are critical, non-obvious patterns for converting UI5 test code from JavaScript to TypeScript. See [the test conversion document](./references/test_conversion.md) for details when tests need to be converted.
