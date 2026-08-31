# Component Selection

The full wrong to right map. SKILL.md carries the high-frequency subset; this file carries the long
tail and the decision criteria. Every entry gives both framework identifiers, or says when one
doesn't exist.

## Contents
- [Tables — the biggest offender](#tables--the-biggest-offender)
- [Inputs & selection](#inputs--selection)
- [Actions](#actions)
- [Navigation & structure](#navigation--structure)
- [Overlays & messaging](#overlays--messaging)
- [Controls with no Web Component](#controls-with-no-web-component)

---

## Tables — the biggest offender

Choose by **data shape**, never by appearance. This single decision causes more wrong-component
usage than anything else.

| Need | Control | SAPUI5 | Web Component |
|---|---|---|---|
| ≤ ~200 rows, mobile + desktop, simple | Responsive Table | `sap.m.Table` | `ui5-table` (popin mode) |
| Large data, many columns, desktop-first, cell comparison | Grid Table | `sap.ui.table.Table` | none — do not substitute `ui5-table` |
| Aggregation: sums/subtotals per group (OData) | Analytical Table | `sap.ui.table.AnalyticalTable` | none |
| True parent-child hierarchy (BOM, org, cost centers) | Tree Table | `sap.ui.table.TreeTable` | none |
| Card/tile visual layout, images, non-tabular | Grid List | `sap.f.GridList` | none |
| Simple vertical item list, not columnar | List | `sap.m.List` / `sap.m.StandardListItem` | `ui5-list` / `ui5-li` |

Decision order:
1. **Hierarchy?** → Tree Table.
2. **Aggregation/totals?** → Analytical Table.
3. **Large (>~200) or desktop cell-comparison?** → Grid Table.
4. **Visual cards, not columns?** → Grid List.
5. **Otherwise** → Responsive Table (`sap.m.Table`), or `ui5-table` in web-component apps.

Common misuses:
- **Responsive Table for 5,000 rows.** It loads and renders everything → DOM bloat, single-column pop-in mush. Use Grid Table.
- **Analytical Table with no aggregation** as a "nicer grid." Adds cost, drops mobile. Use Grid Table.
- **Grouping an Analytical Table to fake a hierarchy.** Grouping ≠ nodes. Use Tree Table.
- **Grid List for text-heavy tabular data** because "cards look nice." No column alignment/sort. Use Responsive Table.
- **`ui5-table` as a drop-in for the grid/analytical tables.** It supports `overflow-mode="Popin"` (≈ `sap.m.Table`) but has no aggregation or freeze. There is no web-component grid/analytical/tree table.

Smart/MDC tables (Fiori Elements): `sap.ui.comp.smarttable.SmartTable` (V2) / `sap.ui.mdc.Table` (V4) are annotation-driven wrappers — see `fiori-elements-vs-freestyle.md`. Don't hand-build these.

---

## Inputs & selection

Pick the simplest control that fits the cardinality and source.

| Need | Control | SAPUI5 | Web Component |
|---|---|---|---|
| Single-line free text | Input | `sap.m.Input` | `ui5-input` |
| Multi-line text | Text Area | `sap.m.TextArea` | `ui5-textarea` |
| Pick one, short fixed list (~2–12) | Select | `sap.m.Select` | `ui5-select` |
| Pick one, long list, type-ahead/free text | Combo Box | `sap.m.ComboBox` | `ui5-combobox` |
| Pick many from a list | Multi-Combo Box | `sap.m.MultiComboBox` | `ui5-multi-combobox` |
| Enter many tokens (with value help/suggestions) | Multi-Input | `sap.m.MultiInput` | `ui5-multi-input` |
| Pick one, all options visible, ≤ ~8 | Radio Button (group) | `sap.m.RadioButton` / `RadioButtonGroup` | `ui5-radio-button` |
| Toggle a confirmed-on-save flag | Checkbox | `sap.m.CheckBox` | `ui5-checkbox` |
| Toggle an immediate on/off state | Switch | `sap.m.Switch` | `ui5-switch` |
| Pick a date | Date Picker | `sap.m.DatePicker` | `ui5-date-picker` |
| Pick a date range | Date Range Selection | `sap.m.DateRangeSelection` | none — use `ui5-date-picker` with a range, or compose two |
| Pick date + time | Date/Time Picker | `sap.m.DateTimePicker` | none — compose `ui5-date-picker` + `ui5-time-picker` |
| Pick a time | Time Picker | `sap.m.TimePicker` | `ui5-time-picker` |
| Numeric with steppers | Step Input | `sap.m.StepInput` | `ui5-step-input` |
| Search a list/table | Search Field | `sap.m.SearchField` | `ui5-search` |
| Complex value selection (dialog + inline) | Value Help Dialog | `sap.m.ValueHelpDialog` / `sap.ui.mdc.ValueHelp` | none |

Common misuses:
- **Input for dates** → use Date Picker (parsing, calendar, validation come free).
- **Select for 200 items** → use Combo Box or Input + value help.
- **Checkbox for an immediate on/off** → use Switch; Checkbox implies "applies on save."
- **Multiple Inputs for multi-value entry** → use Multi-Input or Multi-Combo Box.
- **Select for a binary** → use Switch (setting) or Radio group (2 visible choices).

---

## Actions

| Need | Control | SAPUI5 | Web Component |
|---|---|---|---|
| Trigger an action | Button | `sap.m.Button` | `ui5-button` |
| Navigate to a page/anchor/URL | Link | `sap.m.Link` | `ui5-link` |
| Toggle a two-state toolbar action | Toggle Button | `sap.m.ToggleButton` | `ui5-toggle-button` |
| Choose one of a small option set | Segmented Button | `sap.m.SegmentedButton` | `ui5-segmented-button` |
| Button that opens a menu | Menu Button | `sap.m.MenuButton` | `ui5-button` + `ui5-menu` (no `ui5-menu-button`) |
| Default action + menu | Split Button | `sap.m.MenuButton` (split) | `ui5-split-button` |

Button emphasis:
- **Primary:** `type="Emphasized"` / `design="Emphasized"` — one per page/dialog.
- **Secondary:** `type="Default"` (or `"Transparent"` in header/footer toolbars) / `design="Transparent"`. `Ghost` is legacy SAPUI5; no Web Component equivalent.
- **Positive/Negative:** semantic `Accept`/`Reject` (SAPUI5) / `design="Positive"`/`"Negative"` (WC). Text buttons only.

Common misuses:
- **Button for navigation** → Link. **Link to submit** → Button.
- **`design="Ghost"` in web components** → doesn't exist; use `Transparent`.
- **`ui5-menu-button`** → doesn't exist; compose `ui5-button` + `ui5-menu`.

---

## Navigation & structure

| Need | Control | SAPUI5 | Web Component |
|---|---|---|---|
| App header (logo, search, notifications, profile, Joule) | Shell Bar | `sap.f.ShellBar` | `ui5-shellbar` (`assistant` slot = Joule) |
| Left navigation menu | Side Navigation | `sap.tnt.SideNavigation` | `ui5-side-navigation` (inside `ui5-navigation-layout`) |
| In-page section/facet navigation | Icon Tab Bar | `sap.m.IconTabBar` | `ui5-tabcontainer` |
| Editable multi-document tabs | Tab Container | `sap.m.TabContainer` | `ui5-tabcontainer` |
| Object detail floorplan | Object Page | `sap.uxap.ObjectPageLayout` | none |
| List → detail columns | Flexible Column Layout | `sap.f.FlexibleColumnLayout` | none |
| Breadcrumb trail | Breadcrumbs | `sap.m.Breadcrumbs` | `ui5-breadcrumbs` |
| Save/load view configurations | Variant Management | `sap.m.VariantManagement` / `sap.ui.fl.variants.VariantManagement` | none |

Common misuses:
- **Bar as app header** → ShellBar. Bar is a content-area toolbar (page/dialog header/footer).
- **List as side nav** → SideNavigation (nav semantics, expand/collapse, selection).
- **TabContainer for in-page sections** → IconTabBar. TabContainer is browser-tab-style editing.
- **`ui5-side-navigation` standalone** → wrap in `ui5-navigation-layout` or responsive behavior breaks.
- **Shell Bar `Back` button** → prefer the browser back button; only use ShellBar back when technically forced.

---

## Overlays & messaging

| Need | Control | SAPUI5 | Web Component |
|---|---|---|---|
| Modal that blocks and requires input | Dialog | `sap.m.Dialog` | `ui5-dialog` |
| Semantic error/warning/success/confirm dialog | Message Box | `sap.m.MessageBox` | `ui5-dialog` (build manually) |
| Non-blocking inline page message | Message Strip | `sap.m.MessageStrip` | `ui5-message-strip` |
| Transient success confirmation | Message Toast | `sap.m.MessageToast` | `ui5-toast` |
| Aggregate many messages | Message Popover | `sap.m.MessagePopover` | none |
| Contextual detail beside a trigger | Popover | `sap.m.Popover` | `ui5-popover` |
| Standardized object preview | Quick View | `sap.m.QuickView` | none |
| Responsive popover (full-screen on phone) | Responsive Popover | `sap.m.ResponsivePopover` | `ui5-responsive-popover` |

Common misuses:
- **Dialog for a plain error** → MessageBox (semantic type + buttons for free).
- **MessageBox/Dialog for inline feedback** → MessageStrip (non-blocking).
- **MessageStrip/Dialog for brief success** → MessageToast (auto-dismiss).
- **Popover for confirmation** → Dialog. Popover is non-modal, background stays interactive.
- **Custom Popover structure for object preview** → QuickView (standard) unless it truly can't fit.

---

## Controls with no Web Component

State this explicitly instead of inventing a `ui5-*` tag:
- `sap.ui.table.Table` / `AnalyticalTable` / `TreeTable` — no WC grid/analytical/tree table.
- `sap.uxap.ObjectPageLayout`, `sap.f.FlexibleColumnLayout`, `sap.f.GridList` — no WC equivalent.
- `sap.m.MessagePopover`, `sap.m.QuickView`, `sap.m.ValueHelpDialog`, `sap.m.VariantManagement` — no WC.
- `sap.m.MenuButton` — no `ui5-menu-button`; use `ui5-button` + `ui5-menu`.
- `sap.m.p13n.Popup` — no WC.
