# SAP Fiori Component Selection Skill

Picks the correct SAP Fiori / UI5 control for a use case — and stops the wrong one (a `sap.m.Bar` used as an
app header, a responsive table used for 5,000 rows). This skill catches those before the code ships.

Built for AI coding assistants working alongside application developers.

## What it does

- **Wrong → Right mapping.** The exact wrong control → the correct one, with both the SAPUI5 class and the `ui5-*` web component tag.
- **Use-case → Component map.** "I need to show app navigation" → `ShellBar`, not `Bar`.
- **Decision-first reference files.** Every component: when to use, when NOT (with the alternative), machine-checkable rules, gotchas. No anatomy, no fluff.

## Usage

Starts automatically on SAP Fiori / UI5 questions and on code containing UI5 control names. Example triggers:

- "How do I build a navigation bar in Fiori?"
- "I'm using sap.m.Bar for my app header" (→ ShellBar)
- "Which table should I use for 5,000 rows?"
- "Which control for a brief success confirmation?" (→ MessageToast)

## Contents

`SKILL.md` is the router: Wrong→Right table, Use-case→Component map, reference routing, critical one-liners.

| Reference file | Topic |
|---|---|
| `component-selection.md` | Full wrong→right + table-type decision + long tail |
| `theming-tokens.md` | CSS tokens, semantic colors, density tiers |
| `ui-actions.md` | Buttons, links, toggle/segmented/menu buttons |
| `ui-inputs.md` | Inputs, selects, combo/multi, pickers, filter bar, value help |
| `ui-containers.md` | Cards, dialog, popover, shell bar, toolbars, user menu |
| `ui-navigation.md` | Icon tab bar, tab container, side nav, shell search, breadcrumbs |
| `ui-lists-tables.md` | Responsive / Grid / Analytical / Tree table, Grid List, List |
| `ui-display.md` | Avatar, progress, busy, illustrated message |
| `ui-messages.md` | Message strip / box / toast / popover |
| `ui-ai.md` | AI button, guided/quick prompts, regenerate, local AI notice |
| `ui-upload.md` | File Uploader vs Upload Set |
| `implementation-checklist.md` | Code-review checklist for a built app |

## Maintenance

`REFRESH.md` documents the repeatable, agent-driven process to re-sync against latest SAP sources
(diff + human review, no unattended writes).

## Version

Source: SAP Fiori Design Guidelines. Component tags verified against `ui5.sap.com`,
`sap.github.io/ui5-webcomponents`, and the UI5 Web Components MCP server.
