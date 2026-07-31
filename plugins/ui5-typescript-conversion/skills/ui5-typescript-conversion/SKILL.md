---
name: ui5-typescript-conversion
description: A skill for converting UI5 (SAPUI5/OpenUI5) projects to TypeScript.
---

# UI5 TypeScript Conversion Guidelines

> This document outlines how a UI5 (SAPUI5/OpenUI5) project can be converted to TypeScript:
> 1. Important general rules
> 2. How the setup of the project needs to be changed
> 3. Converting the code itself
> 4. Converting tests (reference to separate file)


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
        // comment
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
        // comment
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

If dependencies changed, ensure `npm install` / `yarn install` is run. The `typescript-eslint` dependency is only relevant when the project already has eslint.

Also add `"ts-typecheck": "tsc --noEmit"` script to `package.json`.

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

Only when eslint is already set up: enhance with TypeScript-specific parts. Example eslint v9 `eslint.config.mjs`:

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
			globals: { ...globals.browser, sap: "readonly" },
			ecmaVersion: 2023,
			parserOptions: { project: true, tsconfigRootDir: import.meta.dirname }
		}
	},
	{ ignores: ["eslint.config.mjs"] }
);
```


## Application Code Conversion

### Step 1: Change UI5 class syntax to ES class syntax

Convert `SuperClass.extend(...)` to standard `class`. Properties in the config object become class members. Annotate with `@namespace` (must immediately precede the class) — the namespace is the part of the full name preceding the class name.

Before:
```js
var App = Controller.extend("ui5tssampleapp.controller.App", {
    onInit: function _onInit() {
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
        this.getView().addStyleClass((this.getOwnerComponent() as AppComponent).getContentDensityClass());
    }
}
```

### Step 2: Change to ECMAScript modules and imports

Convert `sap.ui.define(...)` to ES imports + `export default`. Convert `sap.ui.require(...)` to imports (no export). Avoid name clashes.

Before:
```js
sap.ui.define(["sap/ui/core/mvc/Controller"], function (Controller) {
    class App extends Controller { ... }
    return App;
});
```

After:
```ts
import Controller from "sap/ui/core/mvc/Controller";

/**
 * @namespace ui5tssampleapp.controller
 */
export default class App extends Controller { ... }
```

Dynamic `sap.ui.require` inside method bodies → dynamic import: `import("sap/m/MessageBox").then((MessageBox) => { ... })`.

> Hint: importing `sap/ui/core/Core` provides the singleton instance, not the class.

### Step 3: Standard TypeScript Code Adaptations

- Add type information to method parameters and variables
- Add missing private member class variables (with types) to the class beginning
- Convert `someFunction.bind(...)` to arrow functions (TypeScript doesn't propagate bound `this` type)
- Define further types and structures as needed

> IMPORTANT: Never use UI5 types with global namespace (like `sap.m.Button`). Always import from the module and use the imported name.

**Use UI5 control event types**, not browser events:

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

Use the most specific type: `KeyboardEvent`/`MouseEvent` not `Event` for browser events; `Button$PressEvent` not `sap/ui/base/Event`.

### Step 4: Casts for Return Values of Generic Methods

Generic methods (`this.byId()`, `this.getOwnerComponent()`, `control.getModel()`, `event.getSource()`, `component.getRootControl()`) return super-types. Cast to the specific sub-type when needed (derive from context). This often requires an additional import.

```ts
import AppComponent from "../Component";

public onInit(): void {
    this.getView().addStyleClass((this.getOwnerComponent() as AppComponent).getContentDensityClass());
}
```

Do not cast to a superclass when it's already the returned type. Avoid guessing — skip the cast if the actual type isn't clear.

### Step 5: Solving any Remaining Issues

Fix clearly recognizable remaining TypeScript errors. In case of doubt, mention them to the developer.


## UI5 Control TypeScript Conversion Guidelines

Converting custom UI5 controls requires specific patterns beyond the general conversion.

### The Runtime-Generated Methods Problem (CRITICAL)

UI5 generates getter/setter methods for properties, aggregations, associations, and events at **runtime**. TypeScript cannot see them at development time. A control with `"text": "string"` in metadata will have `getText()`/`setText()` at runtime, but TypeScript errors on `control.getText()`.

This affects: property getters/setters (`getText`, `setText`, `bindText`), aggregation methods (`addItem`, `removeItem`, `getItems`), association methods, event methods (`attachPress`, `firePress`), and constructor settings.

### The Solution: @ui5/ts-interface-generator

```sh
npm install --save-dev @ui5/ts-interface-generator@{{ts-interface-generator-version}}
```

Add script to `package.json`:
```json
{ "scripts": { "watch:controls": "npx @ui5/ts-interface-generator --watch" } }
```

NOTE: if the tsconfig is in a subdirectory, use `--config path/to/tsconfig.json`.

After converting all controls, run the generator:
```bash
npm run watch:controls
```

It generates `*.gen.d.ts` files with all runtime-generated method interfaces. Commit these files, never edit manually.

### Required Constructor Signatures (CRITICAL MANUAL STEP)

Copy constructor signatures from the generator's terminal output into the class body (before metadata):

```typescript
export default class MyControl extends Control {
    // The following three lines were generated and should remain as-is
    constructor(id?: string | $MyControlSettings);
    constructor(id?: string, settings?: $MyControlSettings);
    constructor(id?: string, settings?: $MyControlSettings) { super(id, settings); }

    static readonly metadata: MetadataOptions = { ... };
}
```

### Control Metadata Typing

```typescript
import type { MetadataOptions } from "sap/ui/core/Element";

export default class MyControl extends Control {
    static readonly metadata: MetadataOptions = {
        properties: { "text": "string" }
    };
}
```

- Import from `sap/ui/core/Element` (or closest base: `ManagedObject`, `Component`)
- Use `import type` (design-time only)
- Available since UI5 1.110; use `object` for earlier versions

### Namespace Annotation Required

```typescript
/**
 * @namespace ui5.typescript.helloworld.control
 */
export default class MyControl extends Control { ... }
```

### Export Pattern

**Must use `export default` immediately** — separate export breaks ts-interface-generator:

```typescript
// CORRECT:
export default class MyControl extends Control { ... }

// WRONG:
class MyControl extends Control { ... }
export default MyControl;
```

### Static Members for Metadata and Renderer

Both are `static` class members. Renderer can be inline or a separate file:

```typescript
import RenderManager from "sap/ui/core/RenderManager";

export default class MyControl extends Control {
    static readonly metadata: MetadataOptions = {
        properties: { "text": "string" },
        events: { "press": {} }
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

    onclick(): void { this.firePress(); }
}
```

For separate renderer files, import and assign: `static renderer = MyControlRenderer;`

### Library-Specific Guidelines

#### Library Module with Enums (CRITICAL — XSS risk!)

In `library.ts`, enums must be attached to the global library object:

```typescript
import ObjectPath from "sap/base/util/ObjectPath";

export enum ExampleColor { Red = "Red", Green = "Green", Blue = "Blue" }

// CRITICAL: Attach to global library object
const thisLib = ObjectPath.get("com.myorg.myui5lib") as {[key: string]: unknown};
thisLib.ExampleColor = ExampleColor;
```

**Why**: Control properties reference types as global names (`type: "com.myorg.myui5lib.ExampleColor"`). Without attachment, UI5 can't validate → unchecked content → XSS.

#### Path Mapping in tsconfig.json

For libraries: `"paths": { "com/myorg/mylib/*": ["./src/*"] }`

### Control Conversion Checklist

1. Convert to ES6 class/module
2. Add `@namespace` JSDoc annotation
3. Use `export default` immediately with class definition
4. Type metadata as `MetadataOptions`
5. Define metadata and renderer as `static` members
6. Install and run `@ui5/ts-interface-generator`
7. Copy constructor signatures from generator output
8. If in a library: attach enums to global library object
9. Preserve all JSDoc comments


## Test Conversion

There are critical, non-obvious patterns for converting UI5 test code from JavaScript to TypeScript. See [the test conversion document](./references/test_conversion.md) for details when tests need to be converted.
