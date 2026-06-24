# Changelog

## [0.1.5](https://github.com/UI5/plugins-coding-agents/compare/v0.1.4...v0.1.5) (2026-06-24)


### Features

* **ui5-modernization:** Add UI5 modernization plugin ([#77](https://github.com/UI5/plugins-coding-agents/issues/77)) ([5d07411](https://github.com/UI5/plugins-coding-agents/commit/5d074117383dc2735a14c8163768fb5aa60f66e4))
* **ui5:** Add table best practices skill ([#78](https://github.com/UI5/plugins-coding-agents/issues/78)) ([52ac3b5](https://github.com/UI5/plugins-coding-agents/commit/52ac3b5c8a1053b02dd7d46615b8d552c3a4d712))

## [0.1.4](https://github.com/UI5/plugins-coding-agents/compare/v0.1.3...v0.1.4) (2026-06-10)


### Features

* **ui5:** Add OPA5 guidelines as Skills ([#64](https://github.com/UI5/plugins-coding-agents/issues/64)) ([1ddbcd2](https://github.com/UI5/plugins-coding-agents/commit/1ddbcd2c4d9012d8bb1c69cc4597d47d4ecea444))

## [0.1.3](https://github.com/UI5/plugins-coding-agents/compare/v0.1.2...v0.1.3) (2026-06-03)


### Features

* Support GitHub Copilot ([#65](https://github.com/UI5/plugins-coding-agents/issues/65)) ([44a72cd](https://github.com/UI5/plugins-coding-agents/commit/44a72cdaa530cb24fdb39f934e2a2026d5ad6a43))


### Bug Fixes

* Make plugin.json prettier-stable after release-please bumps ([d6f3783](https://github.com/UI5/plugins-coding-agents/commit/d6f3783607c7b848feeff6c48db0a1a6d3b907dd))
* Update release-please extra-files to current plugin.json paths ([afd95cb](https://github.com/UI5/plugins-coding-agents/commit/afd95cb4852181925f68d8c7f2c537e6c911420a))

## [0.1.2](https://github.com/UI5/plugins-coding-agents/compare/v0.1.1...v0.1.2) (2026-05-27)


### Bug Fixes

* Trigger release workflow ([#60](https://github.com/UI5/plugins-coding-agents/issues/60)) ([78f657e](https://github.com/UI5/plugins-coding-agents/commit/78f657e6a5004b5cdd1b998aabea616023eeabbb))

## [0.1.1](https://github.com/UI5/plugins-coding-agents/compare/v0.1.0...v0.1.1) (2026-05-26)


### Features

* **ui5:** Add UI Integration Cards Guidelines as Skills ([#51](https://github.com/UI5/plugins-coding-agents/issues/51)) ([11e3c4b](https://github.com/UI5/plugins-coding-agents/commit/11e3c4bfcdabeb8fa63454fe6a5046b2a571f584))
* **ui5:** Add UI5 Guidelines as Skills ([#49](https://github.com/UI5/plugins-coding-agents/issues/49)) ([5eca5d0](https://github.com/UI5/plugins-coding-agents/commit/5eca5d066dc7d936e1bc978cc43438dca18b3013))

## [0.1.0](https://github.com/UI5/plugins-claude/compare/v0.0.1...v0.1.0) (2026-03-27)


## Plugin: `ui5` — Your UI5 Development Companion

The UI5 plugin equips Claude Code with deep knowledge of the SAPUI5 and OpenUI5 ecosystem. It helps you:

- **Create new UI5 projects** — get scaffolded, best-practice project structures without manual setup.
- **Detect and fix UI5-specific errors** — Claude understands UI5 linting rules and can apply fixes informed by the official guidelines.
- **Access UI5 API documentation** — get accurate, framework-aware answers about controls, modules, events, and APIs rather than generic JavaScript suggestions.

Technically, its just a wrapper around the UI5 MCP server. In future, we might add further capabilities e.g. skills to this plugin.

Install it with a single command:

```bash
claude plugin install ui5@claude-plugins-official
```

Or from within Claude Code:

```
/plugin install ui5@claude-plugins-official
```

## Plugin: `ui5-typescript-conversion` — Migrate to TypeScript with Confidence

Migrating a JavaScript UI5 project to TypeScript is notoriously tricky. The UI5 class system, the `sap.ui.define` module loader, runtime-generated getter/setter methods on controls, and library-specific patterns all require non-obvious transformations that generic AI tools get wrong. This plugin provides a step-by-step conversion playbook.

Install it with:

```bash
claude plugin install ui5-typescript-conversion@claude-plugins-official
```
