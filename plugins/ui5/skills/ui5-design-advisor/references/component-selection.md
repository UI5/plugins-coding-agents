# Component Selection

The full wrong to right map. SKILL.md carries the high-frequency subset; this file carries the long
tail and the decision criteria. Every entry names the `sap.*` control and OpenUI5 vs SAPUI5 availability.

## Contents
- [Tables — the biggest offender](#tables--the-biggest-offender)
- [Inputs & selection](#inputs--selection)
- [Actions](#actions)
- [Navigation & structure](#navigation--structure)
- [Overlays & messaging](#overlays--messaging)
- [Display & status](#display--status)
- [SAPUI5-only controls](#sapui5-only-controls)

---

## Tables — the biggest offender

Choose by **data shape**, never by appearance. This single decision causes more wrong-component
usage than anything else.

| Need | Control | Class |
|---|---|---|
| ≤ ~200 loaded items, mobile + desktop; simple column totals in the footer | Responsive Table | `sap.m.Table` |
| Large data, desktop-first, cell comparison | Grid Table | `sap.ui.table.Table` |
| Multilevel grouping with subtotals per group (OData V2) | Analytical Table | `sap.ui.table.AnalyticalTable` |
| Deep or large (>~200 items) parent-child hierarchy (bill of materials, cost centers) | Tree Table | `sap.ui.table.TreeTable` |
| Simple hierarchy, ≤~200 items, responsive | Tree | `sap.m.Tree` |
| Card/tile visual layout, images, non-tabular | Grid List | `sap.f.GridList` |
| Simple vertical item list, not columnar | List | `sap.m.List` / `sap.m.StandardListItem` |

Decision order:
1. **Hierarchy?** Two levels → grouped list/table; simple ≤~200 items → `sap.m.Tree`; deep or large → Tree Table.
2. **Multilevel grouping + subtotals?** → Analytical Table. One column total → Responsive Table footer.
3. **More than ~200 items loaded at once, or desktop cell-comparison?** → Grid Table.

"~200" counts items loaded in the front end, not database rows. For OData V4, use `sap.ui.table.Table` with the `ODataV4Aggregation` / `ODataV4Hierarchy` plugin instead of `AnalyticalTable` / `TreeTable` (V2 / JSON only).
4. **Visual cards, not columns?** → Grid List.
5. **Otherwise** → Responsive Table (`sap.m.Table`).

Common misuses:
- **Responsive Table for large and complex data.** It loads and renders everything → DOM bloat, single-column pop-in mush. Use Grid Table.
- **Analytical Table with no aggregation** → adds cost, drops mobile. Use Grid Table (without aggregation it looks the same as a grid table).
- **Grouping an Analytical Table to fake a hierarchy.** Grouping ≠ nodes. Use Tree Table.
- **Grid List for text-heavy tabular data** because "cards look nice." No column alignment/sort. Use Responsive Table.
- **`sap.m.Table` as a drop-in for grid/analytical/tree tables** → responsive table has no group subtotals, freeze, or hierarchy (only footer totals).

Smart/MDC tables (Fiori Elements): `sap.ui.comp.smarttable.SmartTable` (**SAPUI5**, OData V2) / `sap.ui.mdc.Table` (**OpenUI5 / SAPUI5**, OData V4) are annotation-driven wrappers — see the `ui5-best-practices-smart-controls` and `ui5-best-practices-mdc` skills. Don't hand-build these, and don't hand-build table personalization either — use `sap.m.p13n` (`Engine` + `Popup`).

---

## Inputs & selection

Pick the simplest control that fits the cardinality and source.

| Need | Control | Class |
|---|---|---|
| Single-line free text | Input | `sap.m.Input` |
| Multi-line text | Text Area | `sap.m.TextArea` |
| Pick one, short fixed list (~2–12) | Select | `sap.m.Select` |
| Pick one, long list (13–200), type-ahead/free text | Combo Box | `sap.m.ComboBox` |
| Pick many from a list | Multi-Combo Box | `sap.m.MultiComboBox` |
| Enter many tokens (with value help/suggestions) | Multi-Input | `sap.m.MultiInput` |
| Pick one, all options visible, ≤ ~8 | Radio Button (group) | `sap.m.RadioButton` / `RadioButtonGroup` |
| Toggle a confirmed-on-save flag | Checkbox | `sap.m.CheckBox` |
| Toggle an immediate on/off state | Switch | `sap.m.Switch` |
| Pick a date | Date Picker | `sap.m.DatePicker` |
| Pick a date range | Date Range Selection | `sap.m.DateRangeSelection` |
| Pick date + time | Date/Time Picker | `sap.m.DateTimePicker` |
| Pick a time | Time Picker | `sap.m.TimePicker` |
| Numeric with steppers | Step Input | `sap.m.StepInput` |
| Search a list/table | Search Field | `sap.m.SearchField` |
| Complex value selection (dialog + inline) | Value Help | `sap.ui.mdc.ValueHelp` (OpenUI5 / SAPUI5) / `sap.ui.comp.valuehelpdialog.ValueHelpDialog` (**SAPUI5**) |

Common misuses:
- **Input for dates** → use Date Picker (parsing, calendar, validation come free).
- **Select for 200 items** → use Combo Box or Input + value help.
- **Checkbox for an immediate on/off** → use Switch; Checkbox implies "applies on save."
- **Multiple Inputs for multi-value entry** → use Multi-Input or Multi-Combo Box.
- **Select for a binary** → use Switch (setting) or Radio group (2 visible choices).

---

## Actions

| Need | Control | Class |
|---|---|---|
| Trigger an action | Button | `sap.m.Button` |
| Navigate to a page/anchor/URL | Link | `sap.m.Link` |
| Toggle a two-state toolbar action | Toggle Button | `sap.m.ToggleButton` |
| Choose one of a small option set | Segmented Button | `sap.m.SegmentedButton` |
| Button that opens a menu | Menu Button | `sap.m.MenuButton` |
| Default action + menu | Split Button | `sap.m.MenuButton` (split) |

Button emphasis:
- **Primary:** `type="Emphasized"` — one per page/dialog.
- **Secondary:** header/footer toolbars → `type="Ghost"`; content toolbars → most important button `type="Ghost"`, the rest `type="Transparent"`.
- **Negative path (Cancel):** `type="Transparent"`.
- **Positive/Negative:** semantic `Accept`/`Reject`, header/footer only. Text buttons only.

Common misuses:
- **Button for navigation** → Link. **Link to submit** → Button.
- **Cancel styled as secondary** (`Default`/`Ghost`) → negative path is `type="Transparent"`.
- **Custom menu button markup** → use `sap.m.MenuButton` (or split mode) instead.

---

## Navigation & structure

| Need | Control | Class |
|---|---|---|
| App header (logo, search, notifications, profile, Joule) | Shell Bar | `sap.f.ShellBar` |
| Left navigation menu | Side Navigation | `sap.tnt.SideNavigation` |
| In-page section/facet navigation | Icon Tab Bar | `sap.m.IconTabBar` |
| Editable multi-document tabs | Tab Container | `sap.m.TabContainer` |
| Switch between products of a suite (Shell Bar) | Product Switch | `sap.f.ProductSwitch` |
| App shell with header + left navigation | Tool Page | `sap.tnt.ToolPage` |
| Page with title, collapsible header, floating footer | Dynamic Page | `sap.f.DynamicPage` |
| Object detail floorplan | Object Page | `sap.uxap.ObjectPageLayout` |
| List → detail columns | Flexible Column Layout | `sap.f.FlexibleColumnLayout` |
| Root container for full-page navigation | App | `sap.m.App` |
| Page drill-down inside a popover/dialog | Nav Container | `sap.m.NavContainer` |
| Breadcrumb trail | Breadcrumbs | `sap.m.Breadcrumbs` |
| Save/load view configurations | Variant Management | `sap.m.VariantManagement` / `sap.ui.fl.variants.VariantManagement` |

Common misuses:
- **Bar as app header** → ShellBar. Bar is a content-area toolbar (page/dialog header/footer).
- **List as side nav** → SideNavigation (nav semantics, expand/collapse, selection).
- **`sap.f.SideNavigation`** → does not exist. The class is `sap.tnt.SideNavigation`.
- **TabContainer for in-page sections** → IconTabBar. TabContainer is browser-tab-style editing.
- **`sap.tnt.SideNavigation` standalone** → put it in the `sideContent` of `sap.tnt.ToolPage` or responsive behavior breaks.
- **Shell Bar `Back` button** → prefer the browser back button; only use ShellBar back when technically forced.
- **`sap.m.Page` with a hand-built collapsible header** → Dynamic Page (title stays visible, header snaps on scroll).
- **`sap.m.SplitApp` for new list-detail apps** → Flexible Column Layout.
- **FCL layout set with `setLayout` in controllers** → drive the layout from the router (`{layout}` route parameter) with `FlexibleColumnLayoutSemanticHelper`.
- **`app.to()` for app-level navigation** → use the router so the URL hash, back, and bookmarks work.

---

## Overlays & messaging

| Need | Control | Class |
|---|---|---|
| Modal that blocks and requires input | Dialog | `sap.m.Dialog` |
| Semantic error/warning/success/confirm dialog | Message Box | `sap.m.MessageBox` |
| Non-blocking inline page message | Message Strip | `sap.m.MessageStrip` |
| Transient success confirmation | Message Toast | `sap.m.MessageToast` |
| Aggregate many messages | Message Popover | `sap.m.MessagePopover` |
| Contextual detail beside a trigger | Popover | `sap.m.Popover` |
| Standardized object preview | Quick View | `sap.m.QuickView` |
| Responsive popover (full-screen on phone) | Responsive Popover | `sap.m.ResponsivePopover` |

Common misuses:
- **Dialog for a plain error** → MessageBox (semantic type + buttons for free).
- **MessageBox/Dialog for inline feedback** → MessageStrip (non-blocking).
- **MessageStrip/Dialog for brief success** → MessageToast (auto-dismiss).
- **Popover for confirmation** → Dialog. Popover is non-modal, background stays interactive.
- **Custom Popover structure for object preview** → QuickView (standard) unless it truly can't fit.

---

## Display & status

| Need | Control | Class |
|---|---|---|
| Picture or logo as content | Image | `sap.m.Image` |
| Person / object thumbnail | Avatar | `sap.m.Avatar` |
| Status in a table cell, list, or form | Object Status | `sap.m.ObjectStatus` |
| KPI or situation in a page header | Generic Tag | `sap.m.GenericTag` |
| "Saving draft..." / "Draft saved" feedback | Draft Indicator | `sap.m.DraftIndicator` |
| Object editing-status marker (Draft, Locked, Unsaved) | Object Marker | `sap.m.ObjectMarker` |
| Refresh a list by pulling down (touch) | Pull to Refresh | `sap.m.PullToRefresh` |
| Empty / no-data / error state | Illustrated Message | `sap.m.IllustratedMessage` |

Common misuses:
- **`sap.m.Image` with only `alt`** → `decorative` defaults to `true`, so `alt` is ignored. Set `decorative="false"` for meaningful images.
- **`sap.m.Image` for icons** → `sap.ui.core.Icon`. **For person thumbnails** → `sap.m.Avatar`.
- **`ObjectStatus` for header KPIs** → Generic Tag. **Generic Tag in table cells** → ObjectStatus.
- **MessageToast for every draft autosave** → Draft Indicator in the footer.
- **Pull to Refresh on desktop-only pages** → a Refresh button in the toolbar.

---

## SAPUI5-only controls

Mark these **SAPUI5** (libraries not shipped with OpenUI5):
- `sap.ui.comp.smarttable.SmartTable`, `sap.ui.comp.smartfilterbar.SmartFilterBar`, and related `sap.ui.comp.*` smart controls.
- `sap.fe.*` (SAP Fiori elements for OData V4), `sap.suite.ui.*`, and `sap.ushell.*` (SAP Fiori launchpad).

These ship with **both** OpenUI5 and SAPUI5 — do not mark them SAPUI5-only:
- `sap.m`, `sap.f`, `sap.uxap`, `sap.ui.table`, `sap.ui.layout`, `sap.ui.unified`.
- `sap.tnt` (`SideNavigation`, `ToolPage`, `ToolHeader`).
- `sap.ui.mdc`, `sap.ui.fl` (including `sap.ui.fl.variants.VariantManagement`), `sap.ui.integration`.
- `sap.m.plugins.UploadSetwithTable` (replaces the deprecated `sap.m.upload.UploadSet` and `sap.m.UploadCollection`).
