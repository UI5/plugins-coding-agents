# UI Lists and Tables

## Contents
- [Table Type Decision](#table-type-decision)
- [Responsive Table](#responsive-table)
- [Grid Table](#grid-table)
- [Analytical Table](#analytical-table)
- [Tree Table](#tree-table)
- [Grid List](#grid-list)
- [List](#list)
- [Pull to Refresh](#pull-to-refresh)
- [Upload Set with Table Plugin](#upload-set-with-table-plugin)

---

## Table Type Decision

Choose by **data shape**, never by appearance.

| Need | Control | Class (OpenUI5 / SAPUI5) |
|---|---|---|
| General-purpose, mobile + desktop, up to ~200 loaded items; simple column totals in the footer | Responsive Table | `sap.m.Table` |
| Large data, desktop-first, cell comparison | Grid Table | `sap.ui.table.Table` |
| Multilevel grouping with subtotals per group (OData V2 analytical binding) | Analytical Table | `sap.ui.table.AnalyticalTable` |
| Deep or large (>~200 items) parent-child hierarchy with data per node (bill of materials, cost centers) | Tree Table | `sap.ui.table.TreeTable` |
| Simple hierarchy, up to ~200 items, mainly to identify/select items; responsive | Tree | `sap.m.Tree` |
| Card/tile visual layout with images, non-tabular | Grid List | `sap.f.GridList` |
| Simple vertical item list, not columnar | List | `sap.m.List` |

Decision order:
1. **Hierarchy?** Two levels → grouped list/table. Simple, ≤~200 items → `sap.m.Tree`. Deep, large, or with many columns → Tree Table.
2. **Multilevel grouping + subtotals?** → Analytical Table. A total for one column → Responsive Table footer.
3. **More than ~200 items loaded at once, or desktop cell-comparison?** → Grid Table.
4. **Visual cards/tiles, not columns?** → Grid List.
5. **Otherwise** → Responsive Table (`sap.m.Table`).

"~200" counts the items loaded into the front end, not database rows — with filters and growing, a Responsive Table can front a large database. Complex items lower the limit; simple items raise it.

**OData V4:** `AnalyticalTable` and `TreeTable` work with OData V2 / JSON only. For V4, use `sap.ui.table.Table` with the `sap.ui.table.plugins.ODataV4Aggregation` (analytical) or `sap.ui.table.plugins.ODataV4Hierarchy` (tree) plugin (since 1.140).

Smart/MDC tables: `sap.ui.comp.smarttable.SmartTable` (**SAPUI5**, OData V2) / `sap.ui.mdc.Table` (**OpenUI5 / SAPUI5**, OData V4) are annotation-driven wrappers. Do not hand-build these.

Table personalization (columns, sort, filter, group) is not hand-built either: use the `sap.m.p13n` library (`sap.m.p13n.Engine` with `sap.m.p13n.Popup` and its panels) instead of custom dialogs.

Common misuses:
- **Responsive Table for large and complex data** → DOM bloat, single-column pop-in mush. Use Grid Table.
- **Analytical Table with no aggregation** → adds cost, breaks mobile. Use Grid Table (without aggregation it looks the same as a grid table).
- **Grouping an Analytical Table to fake a hierarchy** → grouping is not nodes. Use Tree Table.
- **Using `sap.m.Table` as a drop-in for grid/analytical/tree tables** → responsive table has no group subtotals, freeze, or hierarchy (only footer totals).
- **Analytical Table just for one column total** → use a Responsive Table with the total in the column `footer`.
- **Grid List for text-heavy tabular data** because "cards look nice" → no column alignment or sort. Use Responsive Table.

---

## Responsive Table

- **OpenUI5 / SAPUI5:** `sap.m.Table`
- **Use when:** Up to ~200 loaded items; needs to work on mobile and desktop; content is line-item oriented; pop-in behavior for narrow screens is acceptable.
- **Do NOT use when:** More than ~200 items must be loaded at once → use Grid Table; multilevel grouping with subtotals → use Analytical Table; true hierarchy → use Tree / Tree Table; cell-comparison across many columns on desktop → use Grid Table.
- **Rules:**
  - Use `sap.m.Column` + `sap.m.ColumnListItem` (or template items) — do not hand-build raw HTML table rows inside the control.
  - Configure pop-in via column `demandPopin` / `minScreenWidth` for responsive column behavior.
  - `rememberSelections` should be `false` when a Filter Bar triggers search — reset selections on each search.
  - Show no more columns than fit ~80% of use cases; use pop-in / column hide for the rest.
  - Totals go in the column `footer` (`sap.m.Column`). Don't show totals or a toolbar item count in growing mode — it's unclear what is aggregated.
- **Gotchas:** `sap.m.Table` is not a drop-in replacement for `sap.ui.table.Table`, `AnalyticalTable`, or `TreeTable`.

---

## Grid Table

- **OpenUI5 / SAPUI5:** `sap.ui.table.Table`
- **Use when:** Large datasets (hundreds to thousands of rows), desktop-first, many columns requiring horizontal scroll and freeze, cell-level comparison.
- **Do NOT use when:** Mobile is a requirement → use Responsive Table with an adaptive fallback; aggregation with OData analytical binding → use Analytical Table; hierarchy → use Tree Table.
- **Rules:**
  - Always pair with a toolbar (`sap.m.OverflowToolbar`) — the grid table does not have a built-in title area.
  - For column personalization, use `sap.m.p13n.Popup` (P13n Dialog) via `sap.m.p13n.Engine` — with only a `SelectionPanel` for simple show/hide/reorder. Not `sap.m.ViewSettingsDialog` and not the deprecated `sap.m.TablePersoDialog` (since 1.115).
  - Set the visible row count with the `rowMode` aggregation (`sap.ui.table.rowmodes.Auto` / `Fixed` / `Interactive`). `visibleRowCount`, `visibleRowCountMode`, and `minAutoRowCount` are deprecated since 1.119, even though the guideline still names them.
  - Use the multi-selection plug-in (`sap.ui.table.plugins.MultiSelectionPlugin`) over `selectionMode="MultiToggle"` for reliable select-all behavior with server-side data.
  - Set `selectionBehavior` explicitly: `RowSelector` when row-click is used for navigation; `Row` otherwise.
  - Horizontal scroll appears automatically when column widths exceed the table width — do not use percentage widths for tables with many columns.
- **Gotchas:** Not responsive on phones — provide a separate UI (e.g. Responsive Table or charts) for S screen sizes.

---

## Analytical Table

- **OpenUI5 / SAPUI5:** `sap.ui.table.AnalyticalTable`
- **Use when:** Aggregated data with OData V2 analytical binding — multilevel grouping with summed/subtotaled cells per group, financial analysis, waterfall views, >1,000 rows with aggregation.
- **Do NOT use when:** No aggregation is needed → use Grid Table; only a total for one column → Responsive Table footer; OData V4 → `sap.ui.table.Table` + `ODataV4Aggregation`; hierarchy (bill of materials, org) → use Tree Table; mobile is required → Analytical Table is desktop/tablet only.
- **Rules:**
  - Use `sap.ui.table.AnalyticalColumn` with `summed` property for aggregation columns.
  - Multi-selection: strongly prefer the `MultiSelectionPlugin` over `selectionMode="MultiToggle"` — it handles server-side data correctly.
  - When setting a selection limit, enable `enableNotification` to show users when the limit is reached.
  - Column freeze: set `enableColumnFreeze` on the table; freeze is triggered from the column header menu.
  - Do not use grouping to simulate a hierarchy — use Tree Table for real parent-child nodes.
- **Gotchas:** Not responsive — requires an adaptive approach (separate UI or chart fallback) for smartphones. `condensed` density must always be set together with `compact` — never use `condensed` alone or mix with `cozy`.

---

## Tree Table

- **OpenUI5 / SAPUI5:** `sap.ui.table.TreeTable`
- **Use when:** True parent-child hierarchy data — bill of materials, org charts, cost center hierarchies, any structure where nodes have real children.
- **Do NOT use when:** Data is flat with value-based grouping only → use Analytical Table's group feature; only two levels → grouped list or Responsive Table; simple hierarchy with ≤~200 items → `sap.m.Tree` (responsive); OData V4 → `sap.ui.table.Table` + `ODataV4Hierarchy`.
- **Rules:**
  - Bind to a JSONModel or OData V2 model tree binding — do not simulate a tree by manual nesting. `sap.ui.model.odata.v2.ODataTreeBinding` is deprecated since 1.150 (moving to OData V4 recursive hierarchies).
  - Expand/collapse controls are automatic — do not add custom chevrons. Set recursive collapse with the `collapseRecursive` binding parameter; the `TreeTable` property of the same name is deprecated since 1.76.
  - For personalization with many columns, use `sap.m.p13n.Popup`.
  - Column freeze, sort, and filter follow the same rules as Grid Table.
- **Gotchas:** Desktop/tablet only — same adaptive requirement as Analytical and Grid tables. Do not use `sap.ui.table.AnalyticalTable` with grouping as a tree substitute — grouping clusters rows by value, it does not model parent-child nodes.

---

## Grid List

- **OpenUI5 / SAPUI5:** `sap.f.GridList`
- **Use when:** Visual card/tile layout with images or rich preview content, non-tabular; tile-grid patterns on dashboards or catalog pages.
- **Do NOT use when:** Data is columnar and requires sorting/filtering per column → use Responsive Table; items are simple text lines → use List.
- **Rules:**
  - Use `sap.f.GridListItem` (or custom items) — do not place raw `<div>` tiles inside `GridList`.
  - Grid List does not provide column headers, column sort, or pop-in — do not add them manually.
  - For selection, use the built-in `mode` property (`SingleSelectMaster`, `MultiSelect`, `Delete`). `SingleSelect` is deprecated since 1.143; avoid `SingleSelectLeft` unless you need two separate click areas. In single-select modes, preselect one item.
- **Gotchas:** `sap.f.GridList` uses CSS Grid layout via `sap.ui.layout.cssgrid.GridBoxLayout` — do not try to control tile sizing with external CSS without considering the grid layout API.

---

## List

- **OpenUI5 / SAPUI5:** `sap.m.List` / `sap.m.StandardListItem` / `sap.m.CustomListItem`
- **Use when:** Simple vertical item list — menus, settings lists, notification items, object lists without columnar data.
- **Do NOT use when:** Data is columnar with headers → use Responsive Table; items need persistent left-nav selection and expand/collapse → use `sap.tnt.SideNavigation`; visual card layout → use Grid List.
- **Rules:**
  - Use typed list items (`StandardListItem`, `CustomListItem`, `GroupHeaderListItem`) — do not put unstructured HTML as the only content.
  - Set `mode` explicitly: `None` (default), `SingleSelectMaster`, `MultiSelect`, `Delete`. Use `SingleSelectMaster` for list-detail selection (e.g. in FCL). `SingleSelect` is deprecated since 1.143; avoid `SingleSelectLeft` unless you need two separate click areas.
  - Use `growing="true"` with `growingTriggerText` or scroll-based growing for large lists — do not load all items upfront when performance matters.
  - Use `sticky` on the header when the list has a header and long scroll content.
- **Gotchas:** `sap.m.List` has no nav semantics and no expand/collapse state — do not use it as application side navigation. `StandardListItem` with `type="Navigation"` supports list-to-detail patterns but does not replace `SideNavigation` for persistent app nav.

---

## Pull to Refresh

- **OpenUI5 / SAPUI5:** `sap.m.PullToRefresh` — API-based, no guideline page
- **Use when:** Users on touch devices need to reload a list or feed whose data changes on the server (inbox, notifications, task list) by pulling the list down.
- **Do NOT use when:** The data does not change while the page is open; the page does not scroll (`enableScrolling="false"`) — the control does not work there; the content is a `sap.ui.table.*` grid table; desktop-only apps → offer a Refresh button in the toolbar instead.
- **Rules:**
  - Place it as the **first** control in the content of a scrollable `sap.m.Page` or `sap.m.ScrollContainer`, above the list.
  - In the `refresh` handler, reload the data and call `hide()` when loading has finished — the control does not hide itself.
  - Use `description` for context such as "Last updated 10:42".
  - Show it on touch devices only if the app also runs on desktop: bind `visible` to `device>/support/touch`, and give desktop users a toolbar Refresh button.
- **Gotchas:** On touch devices it is hidden until the user pulls; on non-touch devices it is always visible as a clickable area, which looks out of place in desktop layouts. Custom icons are scaled down to a maximum height of 50 px.

---

## Upload Set with Table Plugin

- **OpenUI5 / SAPUI5:** `sap.m.plugins.UploadSetwithTable` (plugin on a Responsive, Grid, Tree, or MDC table)
- **Use when:** Managed file upload with progress, status, retry, and remove — a list of files to be uploaded or already uploaded, with full lifecycle management. Also for download-only attachment lists (users may only download files others uploaded) — set `uploadEnabled="false"`.
- **Do NOT use when:** Single-file pick with no lifecycle management → use `sap.ui.unified.FileUploader`.
- **Rules:**
  - `sap.m.UploadCollection` (deprecated since 1.88) and `sap.m.upload.UploadSet` (deprecated since 1.129) must not be used for new development. Use `sap.m.plugins.UploadSetwithTable` instead.
  - On the plugin, set `uploadUrl` and handle `beforeUploadStarts` / `uploadCompleted` events — do not handle the HTTP upload manually outside the control.
- **Gotchas:** See `ui-upload.md` for the full entry.
