# UI Lists and Tables

## Contents
- [Table Type Decision](#table-type-decision)
- [Responsive Table](#responsive-table)
- [Grid Table](#grid-table)
- [Analytical Table](#analytical-table)
- [Tree Table](#tree-table)
- [Grid List](#grid-list)
- [List](#list)
- [Upload Set with Table Plugin](#upload-set-with-table-plugin)

---

## Table Type Decision

Choose by **data shape**, never by appearance.

| Need | Control | SAPUI5 | Web Component |
|---|---|---|---|
| General-purpose, mobile + desktop, simple, up to ~200 rows | Responsive Table | `sap.m.Table` | `ui5-table` (popin mode) |
| Large data, many columns, desktop-first, cell comparison | Grid Table | `sap.ui.table.Table` | none |
| Aggregation: sums/subtotals per group (OData analytical binding) | Analytical Table | `sap.ui.table.AnalyticalTable` | none |
| True parent-child hierarchy (BOM, org chart, cost centers) | Tree Table | `sap.ui.table.TreeTable` | none |
| Card/tile visual layout with images, non-tabular | Grid List | `sap.f.GridList` | none |
| Simple vertical item list, not columnar | List | `sap.m.List` | `ui5-list` |

Decision order:
1. **Hierarchy?** → Tree Table.
2. **Aggregation/totals?** → Analytical Table.
3. **Large (>~200 rows) or desktop cell-comparison?** → Grid Table.
4. **Visual cards/tiles, not columns?** → Grid List.
5. **Otherwise** → Responsive Table / `ui5-table`.

Smart/MDC tables: `sap.ui.comp.smarttable.SmartTable` (V2) / `sap.ui.mdc.Table` (V4) are annotation-driven wrappers. Do not hand-build these.

Common misuses:
- **Responsive Table for 5,000 rows** → DOM bloat, single-column pop-in mush. Use Grid Table.
- **Analytical Table with no aggregation** as a "nicer grid" → adds cost, breaks mobile. Use Grid Table.
- **Grouping an Analytical Table to fake a hierarchy** → grouping is not nodes. Use Tree Table.
- **`ui5-table` as a drop-in for grid/analytical/tree tables** → `ui5-table` supports `overflow-mode="Popin"` (equivalent to `sap.m.Table`) but has no aggregation, freeze, or hierarchy. There is no web-component grid/analytical/tree table.
- **Grid List for text-heavy tabular data** because "cards look nice" → no column alignment or sort. Use Responsive Table.

---

## Responsive Table

- **SAPUI5:** `sap.m.Table` **Web Component:** `ui5-table` (`@ui5/webcomponents`)
- **Use when:** Up to ~200 rows; needs to work on mobile and desktop; content is line-item oriented; pop-in behavior for narrow screens is acceptable.
- **Do NOT use when:** More than ~200 rows with performance concerns → use Grid Table; aggregation/totals needed → use Analytical Table; true hierarchy → use Tree Table; cell-comparison across many columns on desktop → use Grid Table.
- **Rules:**
  - Set `overflow-mode="Popin"` on `ui5-table` for responsive column behavior (equivalent to `sap.m.Table` pop-in).
  - Use `ui5-table-header-row` + `ui5-table-header-cell` + `ui5-table-row` + `ui5-table-cell` — do not put raw `<tr>`/`<td>` inside.
  - Selection features must be imported separately: `TableSelectionMulti`, `TableSelectionSingle` (WC).
  - `rememberSelections` (SAPUI5 property) should be `false` when a Filter Bar triggers search — reset selections on each search.
  - Show no more columns than fit ~80% of use cases; use pop-in / column hide for the rest.
- **Gotchas:** `ui5-table` in `@ui5/webcomponents` is a popin-capable table only — it is NOT a drop-in replacement for `sap.ui.table.Table`, `AnalyticalTable`, or `TreeTable`. `TableVirtualizer` feature (WC) adds virtualization for large datasets but this still does not make it equivalent to the grid table.

---

## Grid Table

- **SAPUI5:** `sap.ui.table.Table` **Web Component:** none — there is no `ui5-grid-table` or equivalent; do not substitute `ui5-table`.
- **Use when:** Large datasets (hundreds to thousands of rows), desktop-first, many columns requiring horizontal scroll and freeze, cell-level comparison.
- **Do NOT use when:** Mobile is a requirement → use Responsive Table with an adaptive fallback; aggregation with OData analytical binding → use Analytical Table; hierarchy → use Tree Table.
- **Rules:**
  - Always pair with a toolbar (`sap.m.OverflowToolbar`) — the grid table does not have a built-in title area.
  - For column personalization with many columns, use `sap.m.p13n.Popup` (P13n Dialog), not `sap.m.ViewSettingsDialog`.
  - Use the multi-selection plug-in (`sap.ui.table.plugins.MultiSelectionPlugin`) over multi-toggle mode for reliable select-all behavior with server-side data.
  - Set `selectionBehavior` explicitly: `RowSelector` when row-click is used for navigation; `Row` otherwise.
  - Horizontal scroll appears automatically when column widths exceed the table width — do not use percentage widths for tables with many columns.
- **Gotchas:** No web component equivalent. Adaptive approach required for phones — provide a separate UI (e.g. Responsive Table or charts) for S screen sizes.

---

## Analytical Table

- **SAPUI5:** `sap.ui.table.AnalyticalTable` **Web Component:** none — there is no WC analytical table; do not substitute `ui5-table`.
- **Use when:** Aggregated data with OData analytical binding — summed/subtotaled cells per group, financial analysis, waterfall views, >1,000 rows with aggregation.
- **Do NOT use when:** No aggregation is needed → use Grid Table; hierarchy (BOM, org) → use Tree Table; mobile is required → Analytical Table is desktop/tablet only.
- **Rules:**
  - Use `sap.ui.table.AnalyticalColumn` with `summed` property for aggregation columns.
  - Multi-selection: strongly prefer the `MultiSelectionPlugin` over multi-toggle — it handles server-side data correctly.
  - When setting a selection limit, enable `enableNotification` to show users when the limit is reached.
  - Column freeze: set `enableColumnFreeze` on the table; freeze is triggered from the column header menu.
  - Do not use grouping to simulate a hierarchy — use Tree Table for real parent-child nodes.
- **Gotchas:** No web component. Not responsive — requires an adaptive approach (separate UI or chart fallback) for smartphones. `condensed` density must always be set together with `compact` — never use `condensed` alone or mix with `cozy`.

---

## Tree Table

- **SAPUI5:** `sap.ui.table.TreeTable` **Web Component:** none — there is no WC tree table; do not substitute `ui5-table`.
- **Use when:** True parent-child hierarchy data — bill of materials, org charts, cost center hierarchies, any structure where nodes have real children.
- **Do NOT use when:** Data is flat with value-based grouping only → use Analytical Table's group feature; hierarchy is shallow (1–2 levels) and count is small → use a grouped Responsive Table or Tree control.
- **Rules:**
  - Bind via `ODataTreeBinding` or `JSONTreeBinding` — do not simulate a tree by manual nesting.
  - Expand/collapse controls are automatic — do not add custom chevrons.
  - For personalization with many columns, use `sap.m.p13n.Popup`.
  - Column freeze, sort, and filter follow the same rules as Grid Table.
- **Gotchas:** No web component. Desktop/tablet only — same adaptive requirement as Analytical and Grid tables. Do not use `sap.ui.table.AnalyticalTable` with grouping as a tree substitute — grouping clusters rows by value, it does not model parent-child nodes.

---

## Grid List

- **SAPUI5:** `sap.f.GridList` **Web Component:** none — there is no `ui5-grid-list`; do not invent this tag.
- **Use when:** Visual card/tile layout with images or rich preview content, non-tabular; tile-grid patterns on dashboards or catalog pages.
- **Do NOT use when:** Data is columnar and requires sorting/filtering per column → use Responsive Table; items are simple text lines → use List.
- **Rules:**
  - Use `sap.f.GridListItem` (or custom items) — do not place raw `<div>` tiles inside `GridList`.
  - Grid List does not provide column headers, column sort, or pop-in — do not add them manually.
  - For selection, use the built-in `mode` property (`SingleSelect`, `MultiSelect`, `Delete`).
- **Gotchas:** No web component equivalent. `sap.f.GridList` uses CSS Grid layout via `sap.ui.layout.cssgrid.GridBoxLayout` — do not try to control tile sizing with external CSS without considering the grid layout API.

---

## List

- **SAPUI5:** `sap.m.List` / `sap.m.StandardListItem` / `sap.m.CustomListItem` **Web Component:** `ui5-list` / `ui5-li` / `ui5-li-custom` / `ui5-li-group` (`@ui5/webcomponents`)
- **Use when:** Simple vertical item list — menus, settings lists, notification items, object lists without columnar data, side navigation items (but see note below).
- **Do NOT use when:** Data is columnar with headers → use Responsive Table; items need persistent left-nav selection and expand/collapse → use `sap.f.SideNavigation` / `ui5-side-navigation`; visual card layout → use Grid List.
- **Rules:**
  - Use typed list items (`ui5-li`, `ui5-li-custom`, `ui5-li-group`) — do not put raw HTML children directly in `ui5-list`.
  - Set `selection-mode` explicitly: `None` (default), `Single`, `Multiple`, `Delete`.
  - Use `growing="Button"` or `growing="Scroll"` for large lists — do not load all items upfront.
  - `sticky-header` keeps the header visible while scrolling — use it for long lists with a header.
- **Gotchas:** `sap.m.List` has no nav semantics and no expand/collapse state — do not use it as an application side navigation. `ui5-list` items (`ui5-li`) support `type="Navigation"` for list-to-detail patterns but do not replace `ui5-side-navigation` for persistent app nav.

---

## Upload Set with Table Plugin

- **SAPUI5:** `sap.m.upload.UploadSet` with table plugin **Web Component:** `ui5-upload-collection` (`@ui5/webcomponents-fiori`) for simple display; full managed upload uses `sap.m.upload.UploadSet` (no WC equivalent).
- **Use when:** Managed file upload with progress, status, retry, and remove — a list of files to be uploaded or already uploaded, with full lifecycle management.
- **Do NOT use when:** Single-file pick with no lifecycle management → use `sap.m.upload.FileUploader` / `ui5-file-uploader`; displaying an existing attachment list without upload actions → a plain List or Table suffices.
- **Rules:**
  - `UploadCollection` (old, `sap.m.UploadCollection`) is deprecated — do not use it for new development. Use `sap.m.upload.UploadSet` instead.
  - `ui5-upload-collection` (`@ui5/webcomponents-fiori`) is a display/selection list for files — it does not provide the full upload lifecycle of `sap.m.upload.UploadSet`; use it only when display and simple interaction (delete/select) is all that is needed.
  - In UploadSet, set `uploadUrl` and handle `beforeUploadStarts` / `uploadCompleted` events — do not handle the HTTP upload manually outside the control.
  - Drag-and-drop overlay on `ui5-upload-collection`: set `hide-drag-overlay` to disable it if drag-drop is not supported.
- **Gotchas:** `sap.m.UploadCollection` is deprecated — replace with `sap.m.upload.UploadSet`. No full-featured WC equivalent for `UploadSet`; `ui5-upload-collection` covers display only. Import: `import "@ui5/webcomponents-fiori/dist/UploadCollection.js"`.
