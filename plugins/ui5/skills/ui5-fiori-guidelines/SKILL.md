---
name: ui5-fiori-guidelines
description: Picks the correct SAP Fiori / UI5 control for a use case and prevents the usage of the wrong one. Use when choosing between UI5 controls, building or reviewing code with sap.m.*, sap.f.*, sap.uxap.*, sap.ui.table.*, or ui5-* web components (XML views, fragments, controllers, manifest.json). Catches the classic wrong-component mistakes that cause false usage, for example: sap.m.Bar used as a navigation bar / app header (use sap.f.ShellBar), a List used as side navigation (use sap.f.SideNavigation), a responsive sap.m.Table used for large or aggregated data (use sap.ui.table.Table / AnalyticalTable), a Dialog used for a plain error (use MessageBox or MessageStrip), a Page used for object details (use sap.uxap.ObjectPageLayout).
---

# SAP Fiori Component Selection

The job of this skill: pick the right control for the task or plan the correct Fiori application architecture / UX.

Two frameworks, two names for the same component. Always give both:
- **SAPUI5** — `sap.m.*`, `sap.f.*`, `sap.uxap.*`, `sap.ui.table.*` (XML views, S/4HANA, Fiori Elements).
- **UI5 Web Components** — `ui5-*` (React/Vue/Angular, framework-agnostic).

Not every control exists in both. Where it doesn't, say so — don't invent a tag.

## Wrong → Right

| Developer says / writes | WRONG | RIGHT (SAPUI5 · Web Component) | Why |
|---|---|---|---|
| "navigation bar", "app header", "top bar" | `sap.m.Bar` | `sap.f.ShellBar` · `ui5-shellbar` | Bar is a generic toolbar container; ShellBar is the app-level header (logo, search, notifications, profile, Joule). |
| "side menu", "left navigation" | `sap.m.List` | `sap.f.SideNavigation` · `ui5-side-navigation` | List has no nav semantics, no expand/collapse, no selection state. WC must sit in `ui5-navigation-layout`. |
| "tabs on a page", "sections" | `sap.m.TabContainer` | `sap.m.IconTabBar` · `ui5-tabcontainer` | TabContainer is for editable multi-document (like browser tabs); IconTabBar is in-page section/filter nav. |
| "header with title + actions on a detail page" | `sap.m.Bar` / `sap.m.Page` | `sap.uxap.ObjectPageLayout` · (no WC) | ObjectPage provides the standard header + anchored sections; Bar/Page don't compose with it. |
| "error popup", "confirmation dialog" | hand-built `sap.m.Dialog` | `sap.m.MessageBox` · `ui5-dialog` + `ui5-message-strip` | MessageBox gives semantic types (Error/Warning/Success/Confirm) and buttons for free. |
| "inline error / warning banner" | `sap.m.Dialog` / `MessageBox` | `sap.m.MessageStrip` · `ui5-message-strip` | Dialogs interrupt; strips are non-blocking, stay on the page. |
| "brief success confirmation" | `sap.m.MessageStrip` / `Dialog` | `sap.m.MessageToast` · (no WC — use `ui5-toast`) | Toast auto-dismisses; a strip persists and clutters. |
| "many validation errors at once" | repeated `MessageStrip` | `sap.m.MessagePopover` · (no direct WC) | One entry point, grouped by severity, navigable. |
| "big data table", "needs totals/subtotals" | `sap.m.Table` | `sap.ui.table.AnalyticalTable` · (no WC) | Responsive table has no aggregation/freeze and degrades past ~200 rows. |
| "grid table with thousands of rows" | `sap.m.Table` | `sap.ui.table.Table` · (no WC — `ui5-table` ≠ grid table) | `ui5-table` is popin-capable but not a grid/analytical replacement. |
| "hierarchy / tree" | grouped `AnalyticalTable` | `sap.ui.table.TreeTable` · (no WC) | Grouping clusters by value; TreeTable models real parent-child nodes. |
| "master–detail", "list + details side by side" | nested routes / custom CSS columns | `sap.f.FlexibleColumnLayout` · (no WC) | FCL handles column transitions, breakpoints, and back nav. |
| "object detail page" | `sap.m.Page` | `sap.uxap.ObjectPageLayout` · (no WC) | Page has no anchored section navigation. |
| "menu button / split button (WC)" | `ui5-menu-button` | `ui5-button` + `ui5-menu` · `sap.m.MenuButton` | No standalone `ui5-menu-button` exists. |
| "secondary button (WC)" | `design="Ghost"` | `design="Transparent"` · `sap.m.Button type="Transparent"` | `Ghost` is legacy SAPUI5-only; WC has no Ghost design. |
| "on/off setting" | `sap.m.CheckBox` for immediate effect | `sap.m.Switch` · `ui5-switch` | Switch = immediate effect; CheckBox = confirmed-on-save. |
| "pick one from a long list" | `sap.m.Select` | `sap.m.ComboBox` / value help · `ui5-combobox` | Select is for short fixed lists (~2–12); ComboBox filters/free-texts. |
| "pick a date" | `sap.m.Input` | `sap.m.DatePicker` · `ui5-date-picker` | Input has no calendar, parsing, or validation. |

## Use case → Component

| I need to… | Use (SAPUI5 · WC) | NOT |
|---|---|---|
| App-level nav: logo, search, notifications, profile | `sap.f.ShellBar` · `ui5-shellbar` | Bar, Toolbar |
| Left-hand navigation menu | `sap.f.SideNavigation` · `ui5-side-navigation` | List, VerticalLayout |
| Navigate between facets of one object | `sap.m.IconTabBar` · `ui5-tabcontainer` | TabContainer, SegmentedButton |
| Switch a small set of views (2–3) | `sap.m.SegmentedButton` · `ui5-segmented-button` | RadioButtonGroup, Select |
| Persistent page-level error/warning | `sap.m.MessageStrip` · `ui5-message-strip` | MessageBox, Dialog |
| One-time success confirmation | `sap.m.MessageToast` · `ui5-toast` | MessageStrip, Dialog |
| Show entity details (header + sections) | `sap.uxap.ObjectPageLayout` | Page, Panel |
| List → detail split layout | `sap.f.FlexibleColumnLayout` | custom columns |
| Empty / no-data / error state | `sap.m.IllustratedMessage` · `ui5-illustrated-message` | plain Text/Label |
| Contextual detail without leaving page | `sap.m.Popover` · `ui5-popover` | Dialog (that's modal) |
| Personalize 20+ table columns | `sap.m.p13n.Popup` · (no WC) | ViewSettingsDialog |

## Reference files — read on demand

| Topic | File | Read when |
|---|---|---|
| Full wrong→right + long tail, table-type decision | `references/component-selection.md` | Any control-choice question not fully answered above |
| CSS tokens, semantic colors, density tiers | `references/theming-tokens.md` | Colors, theming, cozy/compact/condensed |
| Buttons, links, toggle/segmented/menu buttons | `references/ui-actions.md` | Choosing an action control |
| Inputs, selects, combo/multi, pickers, filter bar | `references/ui-inputs.md` | Form/input/filter design |
| Containers: cards, dialog, popover, shell bar, toolbars | `references/ui-containers.md` | Overlays, cards, shell structure |
| Navigation: icon tab bar, side nav, shell search | `references/ui-navigation.md` | Tab/section/side navigation |
| Tables and lists (Responsive/Grid/Analytical/Tree/List) | `references/ui-lists-tables.md` | Choosing a table or list |
| Avatar, progress, busy, illustrated message | `references/ui-display.md` | Status/empty-state display |
| Message strip / popover / box / toast | `references/ui-messages.md` | Message pattern and placement |
| AI/Joule: AI button, guided/quick prompts, notice | `references/ui-ai.md` | AI-powered features |
| Upload (File Uploader vs Upload Set) | `references/ui-upload.md` | File upload |
| Implementation review checklist | `references/implementation-checklist.md` | Reviewing a built app |

## Rules that stop the most mistakes

- **One emphasized/primary button per page or dialog.** Everything else is Default/Transparent.
- **Icon-only buttons need a tooltip** and a recognizable, worldwide-consistent icon metaphor.
- **App header = ShellBar, never Bar.** Bar is a content-area toolbar.
- **Button text is an imperative verb** — Save, Edit, Create. Not "OK to save?".
- **Table choice is by data, not looks:** ≤~200 rows → Responsive; large/desktop → Grid; totals → Analytical; hierarchy → Tree.
- **Links navigate, buttons act.** Don't use a Button to go to a page or a Link to submit.
- **Popover is non-modal contextual; Dialog is modal.** Don't use a Popover for anything requiring focus or confirmation.
