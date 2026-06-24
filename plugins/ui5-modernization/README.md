# UI5 Modernization Plugin

A comprehensive plugin providing a complete toolkit for modernizing SAPUI5/OpenUI5 applications.

## Overview

This plugin provides:

- **Autonomous modernization workflow** with end-to-end orchestration in five phases
- **Specialized fix skills** for every UI5 linter rule category
- **Verification gates** at every phase boundary (full autonomous, half autonomous, or manual)
- **Validation** at every step via UI5 linter integration

## Installation

### Via Claude CLI

```bash
claude plugin install ui5-modernization@claude-plugins-official
```

### In Claude Code

```bash
/plugin install ui5-modernization@claude-plugins-official
```

## How It Works

The goal is to modernize your OpenUI5/SAPUI5 app — targeting manifest version 2.0.0 with a minimum framework version of 1.136.0. This means replacing deprecated APIs with their modern equivalents and enforcing strict module imports, eliminating reliance on globals and legacy patterns.

This plugin is built around the [UI5 linter](https://github.com/UI5/linter) (`@ui5/linter`) — a static analysis tool that detects deprecated APIs, global namespace access, and other incompatibilities. The linter serves two roles in the modernization workflow:

1. **Detection** — Each skill reads linter output to identify what needs fixing. The linter's rule IDs (e.g., `no-deprecated-api`, `no-globals`) map directly to specific fix skills.
2. **Verification** — After applying fixes, the linter is re-run to confirm errors are resolved. Zero remaining errors = phase complete.

A few issues cannot be detected by the linter (runtime-only patterns, cyclic dependencies). For these, the plugin includes its own detection scripts that fill the gap.

## Quick Start

### 1. Start With the Modernization Workflow

The main entry point is the orchestrator which runs all five phases:

```
/modernize-ui5-app
```

This will:
1. Ask which verification mode you want (full autonomous / half autonomous / manual)
2. Run Phase 1: UI5 linter autofix + test starter restructure
3. Run Phase 2: manifest.json + Component.js foundation
4. Run Phase 3: module system (globals, pseudo modules, cyclic dependencies, blind spots)
5. Run Phase 4: deprecated API replacements
6. Run Phase 5: CSP compliance
7. Generate `MODERNIZATION-REPORT.md` and `MODERNIZATION-ISSUES.md`

Each phase creates a git commit and runs the verification gate per your chosen mode.

### 2. Use Specialized Skills for Specific Issues

When you encounter specific error patterns, use the targeted skills directly:

```
# Test infrastructure (Phase 1)
/modernize-test-starter           # Test Starter modernization

# Foundation (Phase 2)
/fix-component-async              # Component.js async issues
/fix-manifest-json                # manifest.json issues

# Module system issues (Phase 3)
/fix-js-globals                   # no-globals errors in JS files
/fix-xml-globals                  # no-globals errors in XML views/fragments
/fix-pseudo-modules               # no-pseudo-modules, no-implicit-globals
/fix-linter-blind-spots           # Runtime patterns linter misses
/fix-cyclic-deps                  # Circular sap.ui.define dependencies

# Deprecated API modernizations (Phase 4)
/fix-bootstrap-params             # HTML bootstrap parameters
/fix-library-init                 # Library.init() apiVersion
/fix-control-renderer             # Control renderer issues
/fix-deprecated-controls          # Deprecated controls, classes, interfaces
/fix-fiori-elements-extensions    # Fiori Elements V2 controller extensions
/fix-partially-deprecated-apis    # Partially deprecated API calls
/fix-table-row-mode               # Deprecated Table row properties
/fix-xml-native-html              # Native HTML/SVG in XML views

# CSP compliance (Phase 5)
/fix-csp-compliance               # Unsafe inline scripts

# FLP sandbox
/modernize-flp-sandbox            # Dedicated FLP Sandbox modernization skill
```

## What Gets Changed

The modernization workflow modifies your project in predictable ways:

- **Files modified**: JS controllers, XML views/fragments, HTML test pages, `manifest.json`, `Component.js`
- **Files generated**: `MODERNIZATION-REPORT.md` (statistics), `MODERNIZATION-ISSUES.md` (unfixable errors)
- **Git commits**: One commit per phase (5–6 total)
- **Not touched**: `node_modules/`, `dist/`, build artifacts, or files outside the app source

### Rollback

Start with a clean working directory. Each phase is a separate git commit, so you can undo any phase:

```bash
git revert HEAD        # undo the last phase
git reset --hard HEAD~3  # undo the last 3 phases
```

## Skills Included

### Orchestrator

- **`/modernize-ui5-app`** - End-to-end workflow: runs five phases with verification gates, delegates to specialized skills via sub-agents, and generates a modernization report

### Phase 1: Mechanical Baseline

- **`/modernize-test-starter`** - Modernize QUnit unit tests and OPA5 integration tests to the Test Starter concept (handles both single-HTML + AllJourneys and many-individual-HTML patterns)

### Phase 2: Foundation

- **`/fix-manifest-json`** - Fix manifest.json issues: outdated manifest version, legacy OpenUI5/SAPUI5 version, deprecated libraries/components, deprecated view/model types, removed properties
- **`/fix-component-async`** - Fix Component.js async configuration: `IAsyncContentCreation` interface, manifest declaration, redundant async flags

### Phase 3: Module System & Globals

- **`/fix-js-globals`** - Fix JavaScript `no-globals` errors: global namespace assignments, `sap.ui.core.Core` direct access, jQuery/$ global calls, controller factories, legacy module wrapping
- **`/fix-xml-globals`** - Fix XML view/fragment globals: global variable access, ambiguous event handlers, formatters, type references in bindings, factory functions, app-namespace globals
- **`/fix-pseudo-modules`** - Fix pseudo module and implicit global issues: deprecated enum/DataType pseudo module access, direct `library.EnumName` access, OData expression addons
- **`/fix-linter-blind-spots`** - Fix runtime-breaking patterns the linter does NOT report: app-namespace globals in JS files, QUnit 1.x assertions, sinon mocking via global chains
- **`/fix-cyclic-deps`** - Detect and resolve cyclic module dependencies introduced during modernization (2-node direct cycles auto-fixed, 3+ node chains flagged)

### Phase 4: Deprecated APIs

- **`/fix-bootstrap-params`** - Fix HTML bootstrap parameter issues: missing/deprecated parameters (`async`, `compat-version`, `animation`, `binding-syntax`), deprecated theme values, deprecated libraries
- **`/fix-library-init`** - Fix Library.init() apiVersion issues and modernize library initialization
- **`/fix-control-renderer`** - Fix Control renderer issues: missing renderer declaration, string-based renderer, implicit auto-discovery, `apiVersion:2` configuration
- **`/fix-deprecated-controls`** - Fix deprecated controls, classes, interfaces, and types with modern replacements (e.g., `sap.m.MessagePage` to `IllustratedMessage`)
- **`/fix-fiori-elements-extensions`** - Handle Fiori elements V2 controller extensions during modernization (manifest-based `sap.ui.controllerExtensions`)
- **`/fix-partially-deprecated-apis`** - Fix partially deprecated API usage: `Parameters.get`, `JSONModel.loadData`, `Mobile.init`, `ODataModel.v2.createEntry`, `View.create`, `Fragment.load`, `Router` constructor
- **`/fix-table-row-mode`** - Modernize deprecated Table row properties (`visibleRowCountMode`, `visibleRowCount`, `rowHeight`, etc.) to structured `rowMode` aggregation
- **`/fix-xml-native-html`** - Fix native HTML and SVG usage in XML views/fragments: replace `html:div`, `html:span`, `html:a` with UI5 controls

### Phase 5: CSP Compliance

- **`/fix-csp-compliance`** - Fix Content Security Policy compliance: extract unsafe inline scripts to external files

### Other Skills

#### FLP Sandbox Modernization

- **`/modernize-flp-sandbox`** - Modernize legacy FLP sandbox HTML files to new FLP Sandbox format: converts inline `window["sap-ushell-config"]` to declarative JSON. Requires framework version >= 1.147. This is a dedicated skill not part of the `/modernize-ui5-app` workflow and needs to be triggered separately.

## Verification Modes

The orchestrator asks once at the start which verification mode to use at every phase boundary:

| Mode | Behavior |
|------|----------|
| **Full autonomous** | Run build + tests → attempt fix on failure → escalate after 3 retries |
| **Half autonomous** | Run build + tests → report results → wait for user input |
| **Manual** | Print summary → wait for user to verify externally |

## Prerequisites

Before using this plugin, ensure you have:

1. **Node.js Version v20.11.0, v22.0.0, or higher**
2. **OpenUI5/SAPUI5 application** with `ui5.yaml` in project root (required for linter)
3. **Git repository** with clean working directory
4. **Chrome DevTools MCP** (optional) — only needed for automated test verification in full/half autonomous modes

## Chrome DevTools MCP Integration

This plugin leverages the [Chrome DevTools MCP](https://www.npmjs.com/package/chrome-devtools-mcp) server for browser-based test verification and debugging. The MCP server is configured in `.mcp.json` and provides:

- **Automated test execution** — Run QUnit and OPA5 tests in a real browser during full/half autonomous verification modes
- **Page inspection** — Take accessibility snapshots, capture screenshots, and read console output to verify OpenUI5/SAPUI5 app behavior after modernization

The Chrome DevTools MCP is optional — it is only used when running in full or half autonomous verification mode. The manual mode does not require it.

## Troubleshooting

```bash
# Get fix guidance for all errors
npx @ui5/linter --details

# Get fix guidance for specific file
npx @ui5/linter --details path/to/file.js
```

## Resources

- [Modernization Guide for OpenUI5](https://sdk.openui5.org/#/topic/db492368adbe490fa5d4ec7ebd98b187?q=modern)
- [Modernization Guide for SAPUI5](https://ui5.sap.com/#/topic/db492368adbe490fa5d4ec7ebd98b187)
- [Deprecated Core API for OpenUI5](https://sdk.openui5.org/#/topic/798dd9abcae24c8194922615191ab3f5?q=Deprecated)
- [Deprecated Core API for SAPUI5](https://ui5.sap.com/#/topic/798dd9abcae24c8194922615191ab3f5?q=Deprecated%20Core)
- [UI5 MCP Server](https://github.com/UI5/mcp-server) — query deprecated APIs, find modern replacements, get code examples
- [Commit history](https://github.com/UI5/plugins-coding-agents/commits/main) — changelog
