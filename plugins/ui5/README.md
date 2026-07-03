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

#### ui5-best-practices-accessibility

Accessibility guidelines and review checklist for UI5 views, fragments, and controllers:

- **Landmarks** - `landmarkInfo` and `accessibleRole` for `DynamicPage`, `Page`, `Panel`, `ObjectPage`, `FlexibleColumnLayout`
- **Labeling** - `<Label labelFor>` for inputs, `ariaLabelledBy` for tables, tooltips for icon-only buttons, `alt` for standalone icons and images
- **Heading levels** - Explicit `level` on `<Title>`, no heading level jumps within a view
- **Focus handling** - `initialFocus` on `Dialog`/`Popover`, fast navigation groups, no `tabindex > 0`
- **Keyboard shortcuts** - `CommandExecution` for action buttons that should support keyboard shortcuts
- **Invisible messaging** - `InvisibleMessage.announce()` for dynamic state changes visible to sighted users only
- **Reading order** - Controls not visually reordered out of DOM sequence; `ariaDescribedBy` pointing to correct DOM order
- **Target size** - `reactiveAreaMode` for interactive controls in dense layouts

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

#### ui5-best-practices-mdc

Development guidelines for `sap.ui.mdc` model-driven controls with OData V4 and JSON models (SAPUI5 1.136+ LTS):

- **Delegate pattern** - Base delegates, `fetchProperties`, `updateBindingInfo`, PropertyInfo structure
- **Per-control references** - FilterBar, Chart, Field, FilterField, ValueHelp, Link, MultiValueField
- **JSON model support** - Custom delegates, TypeMap registration, manual PropertyInfo
- **Core rules** - Delegate configuration, `p13nMode`, condition handling, type namespaces

#### ui5-best-practices-opa5

Guidelines and debugging workflow for OPA5 integration tests:

- **Failure inspection** - Pause-on-failure mode (`sap.ui.test.qunitPause.pauseRule`) keeps the app live at the failure point for browser inspection
- **TestRecorder tooling** - Temporary `sap.ui.testrecorder.ControlTree` integration to inspect the live control tree and generate reliable OPA5 snippets (UI5 ≥ 1.147)
- **Page object organization** - Placement of actions and assertions across views
- **App teardown** - Cleanup patterns in OPA5 journey tests

#### ui5-best-practices-smart-controls

Development guidelines for `sap.ui.comp` annotation-driven smart controls with OData V2 (SAPUI5 1.136+ LTS):

- **Per-control references** - SmartField, SmartForm, SmartFilterBar, SmartChart, SmartLink, SmartMultiInput, FilterBar, ValueHelpDialog
- **Core rules** - Annotation requirements, `entitySet` binding, `initialise` event, SmartForm hierarchy
- **Selection matrix** - When to use each smart control vs. alternatives
- **Common errors** - Annotation mistakes, rendering issues, binding problems

#### ui5-best-practices-tables

Authoritative development guidelines for all UI5 table controls (SAPUI5 1.136+ LTS):

- **Control selection matrix** - When to use `sap.m.Table`, `sap.ui.table.Table`, `TreeTable`, `SmartTable`, or `sap.ui.mdc.Table`
- **Core rules and prohibitions** - Mandatory patterns and common mistakes to avoid
- **Common errors** - Symptom/cause/fix table for the most frequent table bugs
- **Container structures** - Valid and invalid layout containers for tables
- **Per-control API guidance** - Binding syntax, key properties, minimal examples, and events for each table type
- **Drag & drop** - Correct `DragDropInfo` and `DragInfo`/`DropInfo` configuration
- **Personalization** - `sap.m.p13n.Engine` integration
- **Cell templates & alignment** - Type-based alignment and model type namespace rules

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
