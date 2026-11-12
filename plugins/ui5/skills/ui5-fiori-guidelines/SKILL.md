---
name: ui5-fiori-guidelines
description: Picks the correct SAP Fiori / UI5 control for a use case and prevents the usage of the wrong one; also reviews built OpenUI5/SAPUI5 apps against the Fiori guidelines. Use when (1) choosing between UI5 controls or planning page and app layout (DynamicPage, FlexibleColumnLayout, ObjectPageLayout, ShellBar, ToolPage, App), or (2) the user asks to review, audit, or check an existing Fiori app, view, or fragment against the Fiori guidelines. Covers sap.m.*, sap.f.*, sap.tnt.*, sap.uxap.*, sap.ui.table.* in XML views, fragments, controllers, and manifest.json. Catches classic wrong-component mistakes, for example sap.m.Bar as app header (use sap.f.ShellBar), List as side navigation (use sap.tnt.SideNavigation), responsive sap.m.Table for large data (use sap.ui.table.Table) or group subtotals (use AnalyticalTable), Dialog for a plain error (use MessageBox or MessageStrip), Page for object details (use sap.uxap.ObjectPageLayout).
---

# SAP Fiori Component Selection

The job of this skill: pick the right control for the task or plan the correct Fiori application architecture / UX.

## Two modes

- **Select** (default) — the user is choosing a control or planning a layout. Answer from the tables below; open one reference file only when they do not answer it.
- **Review** — the user asks to review, audit, or check existing code against the Fiori guidelines. Read `references/implementation-checklist.md` and check every item against the code. Report each failing item under its checklist section with the file, the control, and the fix. If nothing fails, reply "No Fiori guideline violations found."

## OpenUI5 vs SAPUI5

OpenUI5 and SAPUI5 share almost all `sap.*` controls. Label availability explicitly:
- **OpenUI5 / SAPUI5** — `sap.m`, `sap.f`, `sap.tnt`, `sap.uxap`, `sap.ui.table`, `sap.ui.layout`, `sap.ui.unified`, `sap.ui.mdc`, `sap.ui.fl`, `sap.ui.integration`.
- **SAPUI5** only — `sap.ui.comp.*` (smart controls), `sap.fe.*`, `sap.suite.ui.*`, `sap.ushell.*`.

## Wrong → Right

| Developer says / writes | WRONG | RIGHT | Why |
|---|---|---|---|
| "navigation bar", "app header", "top bar" | `sap.m.Bar` | `sap.f.ShellBar` | Bar is a generic toolbar; ShellBar is the app-level header (logo, search, notifications, profile, Joule). |
| "side menu", "left navigation" | `sap.m.List` | `sap.tnt.SideNavigation` | List has no nav semantics, expand/collapse, or selection state. |
| "tabs on a page", "sections" | `sap.m.TabContainer` | `sap.m.IconTabBar` | TabContainer is editable multi-document tabs; IconTabBar is in-page section/filter nav. |
| "header with title + actions on a detail page" | `sap.m.Bar` / `sap.m.Page` | `sap.uxap.ObjectPageLayout` | ObjectPage provides standard header + anchored sections. |
| "error popup", "confirmation dialog" | hand-built `sap.m.Dialog` | `sap.m.MessageBox` | MessageBox gives semantic types and standard buttons. |
| "inline error / warning banner" | `sap.m.Dialog` / `MessageBox` | `sap.m.MessageStrip` | Dialogs interrupt; strips are non-blocking. |
| "brief success confirmation" | `sap.m.MessageStrip` / `Dialog` | `sap.m.MessageToast` | Toast auto-dismisses; a strip persists. |
| "many validation errors at once" | repeated `MessageStrip` | `sap.m.MessagePopover` | One entry point, grouped by severity. |
| "big data table", "grid table with thousands of rows" | `sap.m.Table` | `sap.ui.table.Table` | Responsive table degrades past ~200 loaded items; grid table is for large desktop datasets and column comparison. |
| "subtotals per group", "multilevel grouping" | `sap.m.Table` | `sap.ui.table.AnalyticalTable` (V4: `Table` + `ODataV4Aggregation`) | Responsive table only has footer totals, no group subtotals. A single column total stays in `sap.m.Table`. |
| "hierarchy / tree" | grouped `AnalyticalTable` | `sap.ui.table.TreeTable` | Grouping clusters by value; TreeTable models parent-child nodes. |
| "master–detail", "list + details side by side" | nested routes / custom CSS columns / `sap.m.SplitApp` | `sap.f.FlexibleColumnLayout` | FCL handles column transitions, breakpoints, and back nav. |
| "page with title and collapsible header" | `sap.m.Page` + hand-built header | `sap.f.DynamicPage` | Title stays visible, header snaps on scroll, floating footer. |
| "app with header and left menu" | custom layout around `SideNavigation` | `sap.tnt.ToolPage` | ToolPage places ShellBar and SideNavigation with correct responsive behavior. |
| "object detail page" | `sap.m.Page` | `sap.uxap.ObjectPageLayout` | Page has no anchored section navigation. |
| "menu button" | custom split markup | `sap.m.MenuButton` | Use MenuButton (or split mode) instead of ad-hoc menus. |
| "secondary button in header/footer toolbar" | `type="Transparent"` | `type="Ghost"` | Ghost gives the guideline's default style there; Transparent is for negative path (Cancel) and the less important buttons in content toolbars. |
| "on/off setting" | `sap.m.CheckBox` for immediate effect | `sap.m.Switch` | Switch = immediate effect; CheckBox = confirmed-on-save. |
| "pick one from a long list" | `sap.m.Select` | `sap.m.ComboBox` / value help | Select is for short fixed lists (~2–12). |
| "pick a date" | `sap.m.Input` | `sap.m.DatePicker` | Input has no calendar, parsing, or validation. |

## Use case → Component

| I need to… | Use | NOT |
|---|---|---|
| App-level nav: logo, search, notifications, profile | `sap.f.ShellBar` | Bar, Toolbar |
| Left-hand navigation menu | `sap.tnt.SideNavigation` | List, VerticalLayout |
| Navigate between facets of one object | `sap.m.IconTabBar` | TabContainer, SegmentedButton |
| Switch a small set of views (2–3) | `sap.m.SegmentedButton` | RadioButtonGroup, Select |
| Persistent page-level error/warning | `sap.m.MessageStrip` | MessageBox, Dialog |
| One-time success confirmation | `sap.m.MessageToast` | MessageStrip, Dialog |
| Show entity details (header + sections) | `sap.uxap.ObjectPageLayout` | Page, Panel |
| List → detail split layout | `sap.f.FlexibleColumnLayout` | custom columns, SplitApp |
| Page with title, collapsible header, footer | `sap.f.DynamicPage` | Page with custom header |
| Switch between suite products from the header | `sap.f.ProductSwitch` | Menu, custom popover grid |
| KPI / situation in a page header | `sap.m.GenericTag` | ObjectStatus, Text |
| Empty / no-data / error state | `sap.m.IllustratedMessage` | plain Text/Label |
| Contextual detail without leaving page | `sap.m.Popover` | Dialog (that's modal) |
| Personalize 20+ table columns | `sap.m.p13n.Popup` | ViewSettingsDialog |

## Reference files — read on demand

| Topic | File | Read when |
|---|---|---|
| Full wrong→right + long tail, table-type decision | `references/component-selection.md` | Any control-choice question not fully answered above |
| CSS tokens, semantic colors, density tiers | `references/theming-tokens.md` | Colors, theming, cozy/compact/condensed |
| Buttons, links, toggle/segmented/menu buttons, menu, table toolbar | `references/ui-actions.md` | Choosing an action control |
| Inputs, selects, combo/multi, pickers, mask, filter bar, facet filter | `references/ui-inputs.md` | Form/input/filter design |
| Layouts: dynamic page, flexible column layout, side panel, app / nav container | `references/ui-layouts.md` | Page structure, list-detail, app root |
| Containers: cards, panel, wizard, dialog, popover, color palette, P13n, variant management | `references/ui-containers.md` | Overlays, cards, panels, wizards, personalization |
| Navigation: shell bar, user menu, product switch, icon tab bar, side nav, breadcrumbs | `references/ui-navigation.md` | Shell header, tab/section/side navigation |
| Tables and lists (Responsive/Grid/Analytical/Tree/List), pull to refresh | `references/ui-lists-tables.md` | Choosing a table or list |
| Avatar, image, carousel, tags, tokens, rating, draft indicator, progress, busy, illustrated message | `references/ui-display.md` | Status/empty-state display |
| Message strip / popover / box / toast | `references/ui-messages.md` | Message pattern and placement |
| AI/Joule: AI button, guided/quick prompts, notice | `references/ui-ai.md` | AI-powered features |
| Upload (File Uploader vs Upload Set) | `references/ui-upload.md` | File upload |
| Implementation review checklist | `references/implementation-checklist.md` | Review mode — always read it first |

## Rules that stop the most mistakes

- **One emphasized/primary button per page or dialog.** Everything else is Default/Transparent.
- **Icon-only buttons need a tooltip** and a recognizable, worldwide-consistent icon metaphor.
- **App header = ShellBar, never Bar.** Bar is a content-area toolbar.
- **Button text is an imperative verb** — Save, Edit, Create. Not "OK to save?".
- **Table choice is by data, not looks:** ≤~200 loaded items → Responsive (footer totals OK); large/desktop → Grid; multilevel grouping + subtotals → Analytical; simple hierarchy → `sap.m.Tree`, deep/large → TreeTable.
- **Links navigate, buttons act.** Don't use a Button to go to a page or a Link to submit.
- **Popover is non-modal contextual; Dialog is modal.** Don't use a Popover for anything requiring focus or confirmation.
