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

## Installing skills only

If your coding agent does not support plugins, you can install the skills directly using the [skills](https://www.npmjs.com/package/skills) package:

```bash
npx skills add UI5/plugins-coding-agents
```

> **Note:** You also need to install the [UI5 MCP server](https://github.com/UI5/mcp-server) manually. When using the plugin, this is handled automatically.
