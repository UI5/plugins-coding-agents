# UI5 Plugin for Coding Agents

## Key Features

- Helps with the creation of new UI5 projects when working with coding agents
- Supports the developer to detect and fix UI5-specific errors
- Provides additional UI5-specific information for coding agents


## Installation


### Claude Code

Via Claude CLI:
```bash
claude plugin install ui5@claude-plugins-official
```

In Claude Code:
```
/plugin install ui5@claude-plugins-official
```

## Installing Skills Only

If your coding agent doesn't support plugins, install the skills directly using the [skills](https://www.npmjs.com/package/skills) package:

```bash
npx skills add UI5/plugins-coding-agents
```

> **Note:** When installing the skills only, you will need to install the [UI5 MCP server](https://github.com/UI5/mcp-server) manually.
