# SAP Fiori Component Selection Skill

Picks the correct SAP Fiori / UI5 control for a use case — and stops the wrong one (a `sap.m.Bar` used as an
app header, a responsive table used for large and complex data). This skill catches those before the code ships.

Built for AI coding assistants working alongside application developers.

## What it does

- **Wrong → Right mapping.** The exact wrong control → the correct one, with the `sap.*` class and OpenUI5 / SAPUI5 availability.
- **Use-case → Component map.** "I need to show app navigation" → `ShellBar`, not `Bar`.
- **Decision-first reference files.** Every component: when to use, when NOT (with the alternative), machine-checkable rules, gotchas. No anatomy, no fluff.

## Usage

Starts automatically on SAP Fiori / UI5 questions and on code containing UI5 control names. Example triggers:

- "How do I build a navigation bar in Fiori?"
- "I'm using sap.m.Bar for my app header" (→ ShellBar)
- "Which table should I use for large and complex data?"
- "Which control for a brief success confirmation?" (→ MessageToast)
- "Review my Fiori app against the guidelines" (→ review mode, implementation checklist)

## Contents

`SKILL.md` is the router: Wrong→Right table, Use-case→Component map, reference routing, critical one-liners.

| Reference file | Topic |
|---|---|
| `component-selection.md` | Full wrong→right + table-type decision + long tail |
| `theming-tokens.md` | CSS tokens, semantic colors, density tiers |
| `ui-actions.md` | Buttons, links, toggle/segmented/menu buttons, menu, table toolbar |
| `ui-inputs.md` | Inputs, selects, combo/multi, pickers, mask, filter bar, facet filter, value help |
| `ui-layouts.md` | Dynamic page, flexible column layout, side panel, app / nav container |
| `ui-containers.md` | Cards, dialog, popover, quick view, color palette, P13n, variant management |
| `ui-navigation.md` | Shell bar, user menu, product switch, icon tab bar, tab container, side nav, shell search, breadcrumbs |
| `ui-lists-tables.md` | Responsive / Grid / Analytical / Tree table, Grid List, List, pull to refresh |
| `ui-display.md` | Avatar, progress, busy, illustrated message, carousel, tag, generic tag, expandable text, image, draft indicator |
| `ui-messages.md` | Message strip / box / toast / popover |
| `ui-ai.md` | AI button, guided/quick prompts, regenerate, local AI notice |
| `ui-upload.md` | File Uploader vs Upload Set |
| `implementation-checklist.md` | Code-review checklist for a built app (review mode) |

## Tests

`tests/eval.json` holds manual evaluation cases: control-selection prompts, reference-dispatch checks,
and review-mode fixtures under `tests/fixtures/`. See `tests/README.md`.

## Maintenance

`REFRESH.md` documents the repeatable, agent-driven process to re-sync against latest SAP sources
(diff + human review, no unattended writes).

## Version

Source: SAP Fiori Design Guidelines (`sap.com/design-system/fiori-design-web/`). Control names verified against `ui5.sap.com`.

| Area | Guideline version | UI5 API version | Refreshed |
|---|---|---|---|
| Button (`ui-actions.md` Button + Split Button) | v1.151 | 1.153.0 | 2026-10-21 |
| Everything else | not stamped (pre-refresh snapshot) | — | — |
