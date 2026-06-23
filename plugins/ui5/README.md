# UI5 Plugin for Coding Agents

Complete SAPUI5 / OpenUI5 plugin for coding agents with MCP tools, API documentation access, linting capabilities, development and integration testing guidelines.

---

## Key Features

### 🛠️ MCP Tools
- **Create and validate UI5 projects** - Project scaffolding and validation
- **Access API documentation** - Query UI5 control APIs and documentation
- **Run UI5 linter** - Code quality validation and best practices checks
- **UI5 tooling integration** - Version info and project management

### 📋 Skills

#### ui5-best-practices

Development guidelines and coding standards derived from official SAP UI5 guidelines:
- **Async module loading** - sap.ui.define patterns
- **Data binding with OData types** - Type-safe data binding
- **CSP compliance** - Content Security Policy best practices
- **TypeScript event handlers** - Modern event handling (UI5 >= 1.115.0)
- **CAP integration** - Integration with SAP Cloud Application Programming Model
- **Form creation rules** - Form and SimpleForm patterns
- **i18n management** - Internationalization workflows
- **Component initialization** - ComponentSupport patterns

**Note**: For TypeScript conversion specifically, use the separate [`ui5-typescript-conversion`](https://github.com/UI5/plugins-coding-agents/tree/main/plugins/ui5-typescript-conversion) plugin.

#### ui5-best-practices-integration-cards

Development guidelines for UI Integration Cards (also known as UI5 Integration Cards):
- **Declarative card types** - List, Table, Calendar, Timeline, Object, Analytical
- **Building a card** - Structure of the declarative `manifest.json` format for a UI Integration Card
- **Parameter and destination binding** - `{parameters>/key/value}` and `{{destinations.name}}` syntax
- **Data rules** - Where the data block goes (`sap.card/data`/`content/data`/`header/data`), wrapping URLs in destinations, and requiring JSON responses
- **Manifest validation** - JSON, schema, and deprecated-property checks before declaring done
- **Local preview workflow** - Reusing existing entry points or serving via a `<ui-integration-card>` HTML page
- **Configuration Editor patterns** - `dt/Configuration.js` paired with `manifest.json`, mirroring fields and `manifestpath` targets
- **Analytical cards** - 44 chart types with required UIDs, feeds, and per-type examples
- **i18n** - Bind all user-facing strings to the i18n model; never hardcode
- **Actions** - Use the `actions` property for links and interactions; never inline `<a>` tags or hand-roll URL handlers

#### ui5-best-practices-qunit

Coding standards and modernization patterns for QUnit unit test files in UI5 libraries:

- **Variable declarations** - `const`/`let` over `var`; one declaration per line
- **Async patterns** - `await nextUIUpdate()` over `Core.applyChanges()`; `async/await` over `assert.async()`; `waitForEvent` helper pattern
- **Fake timer safety** - When to keep `Core.applyChanges()` instead of converting (fake timers, shared helpers, load callbacks)
- **assert.expect(N)** - Required in every async test to guard against silent passes
- **Module isolation** - `beforeEach`/`afterEach` lifecycle; `try/finally` teardown in helpers
- **Sinon sandbox** - `sinon.createSandbox()` over deprecated `sinon.sandbox.create()`
- **Test naming** - Descriptive sentences; no "it should"; unique names per module
- **File hygiene** - Remove unused imports; ISO 8859-1 compliance; ESLint 0 errors

#### ui5-best-practices-opa5

Guidelines and debugging workflow for OPA5 integration tests:

- **Failure inspection** - Pause-on-failure mode (`sap.ui.test.qunitPause.pauseRule`) keeps the app live at the failure point for browser inspection
- **TestRecorder tooling** - Temporary `sap.ui.testrecorder.ControlTree` integration to inspect the live control tree and generate reliable OPA5 snippets (UI5 ≥ 1.147)
- **Page object organization** - Placement of actions and assertions across views
- **App teardown** - Cleanup patterns in OPA5 journey tests

---

## Installation

### Via Claude CLI
```bash
claude plugin install ui5@claude-plugins-official
```

### In Claude Code
```
/plugin install ui5@claude-plugins-official
```

## Installing Skills Only

If your coding agent doesn't support plugins, install the skills directly using the [skills](https://www.npmjs.com/package/skills) package:

```bash
npx skills add UI5/plugins-coding-agents
```

> **Note:** When installing the skills only, you will need to install the [UI5 MCP server](https://github.com/UI5/mcp-server) manually.
