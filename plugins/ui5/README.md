# UI5 Plugin for Coding Agents

Complete SAPUI5 / OpenUI5 plugin for Claude Code with MCP tools, API documentation access, linting capabilities, and development guidelines.

---

## Key Features

### 🛠️ MCP Tools
- **Create and validate UI5 projects** - Project scaffolding and validation
- **Access API documentation** - Query UI5 control APIs and documentation
- **Run UI5 linter** - Code quality validation and best practices checks
- **UI5 tooling integration** - Version info and project management

### 📋 Skills: ui5-best-practices

Development guidelines and coding standards derived from official SAP UI5 guidelines:
- **Async module loading** - sap.ui.define patterns
- **Data binding with OData types** - Type-safe data binding
- **CSP compliance** - Content Security Policy best practices
- **TypeScript event handlers** - Modern event handling (UI5 >= 1.115.0)
- **CAP integration** - Integration with SAP Cloud Application Programming Model
- **Form creation rules** - Form and SimpleForm patterns
- **i18n management** - Internationalization workflows
- **Component initialization** - ComponentSupport patterns

**Note**: For TypeScript conversion specifically, use the separate [`ui5-typescript-conversion`](https://github.com/UI5/plugins-claude/tree/main/plugins/ui5-typescript-conversion) plugin.

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
