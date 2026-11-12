# UI Layouts (Page and App Shell)

## Contents
- [Dynamic Page](#dynamic-page)
- [Flexible Column Layout](#flexible-column-layout)
- [Side Panel](#side-panel)
- [App / NavContainer](#app--navcontainer)

---

## Dynamic Page

- **OpenUI5 / SAPUI5:** `sap.f.DynamicPage` (with `sap.f.DynamicPageTitle`, `sap.f.DynamicPageHeader`)
- **Use when:** A page needs an always-visible title, a header that expands/collapses (snaps) on scroll, a content area, and an optional floating footer — the base layout for List Report, Worklist, Analytical List Page, and most freestyle full-screen pages.
- **Do NOT use when:** You do not need the expand/snap header → use the lighter `sap.m.Page`; the page shows one business object split into sections → use `sap.uxap.ObjectPageLayout`; the page's actions follow the standard semantic set (Edit, Delete, Share, ...) → use `sap.f.semantic.SemanticPage`, which is built on Dynamic Page and positions actions for you.
- **Rules:**
  - Put the page title in `DynamicPageTitle` `heading` (or `expandedHeading` / `snappedHeading` when they differ); global page actions go in the title `actions` aggregation, not in the header content.
  - FCL column actions (full screen, exit full screen, close) go in `DynamicPageTitle` `navigationActions` — never mixed into `actions`.
  - Header content (`DynamicPageHeader`) holds key facts, KPIs, or the filter bar — keep it compact; long forms belong in the content area.
  - Footer: set `showFooter="true"` only when finalizing actions exist (Save, Cancel, Submit, Approve); use an `sap.m.OverflowToolbar` with a `ToolbarSpacer` so actions sit on the right. Do not put non-finalizing actions in the footer.
  - Set `fitContent="true"` only when the content stretches to fill height by itself (e.g. `sap.ui.table.Table` / `AnalyticalTable` with auto row count). Leave it `false` for content that does not stretch.
  - Align `Form`, `Panel`, `sap.m.Table`, and `sap.m.List` in the content with the header by adding the `sapFDynamicPageAlignContent` class and `width="auto"`.
  - Do not nest a Dynamic Page inside another Dynamic Page.
- **Gotchas:** `preserveHeaderStateOnScroll` is ignored when title and header together exceed an internal height threshold — do not rely on it for tall headers. `headerPinned` only applies when the header is pinnable, expanded, and `preserveHeaderStateOnScroll` is effectively off. Snapping by scroll does not happen when the content is too short to scroll past the header. `sap.ui.table.Table` is not adaptive — on phones provide a responsive alternative.

---

## Flexible Column Layout

- **OpenUI5 / SAPUI5:** `sap.f.FlexibleColumnLayout` (with `sap.f.FlexibleColumnLayoutSemanticHelper`, `sap.f.routing.Router`)
- **Use when:** Showing up to three hierarchical levels side by side — list → detail → detail-of-detail (e.g. sales orders → order → line item) — with the option to focus one column or go full screen.
- **Do NOT use when:** The columns show unrelated content (two independent apps side by side) — columns must be parent → child; a single object needs sectioned detail only → use `sap.uxap.ObjectPageLayout` in one column; new list-detail apps → do not use the older `sap.m.SplitApp` / `sap.m.SplitContainer`.
- **Rules:**
  - Drive the `layout` from the router, not from ad-hoc `setLayout` calls: include a `{layout}` parameter in route patterns so browser back, forward, and bookmarks restore the same columns.
  - Use `routerClass: "sap.f.routing.Router"` in `manifest.json`; route targets use `controlAggregation` `beginColumnPages` / `midColumnPages` / `endColumnPages` with the FCL as `controlId`.
  - Use `FlexibleColumnLayoutSemanticHelper`: `getNextUIState(level)` to pick the layout when navigating to a level, and `getCurrentUIState().actionButtonsInfo` to decide which column actions (full screen, exit full screen, close) to show.
  - Set `maxColumnsCount` on the helper to match the app: `2` for list-detail only, `3` (default) for list-detail-detail. Levels beyond the max open full screen.
  - Place column actions (full screen / exit full screen / close) in the `navigationActions` of the column's `DynamicPageTitle` or `ObjectPageDynamicHeaderTitle`, at the far right, separate from business actions.
  - Pages in the columns are page-like controls: `sap.f.DynamicPage`, `sap.f.semantic.SemanticPage`, or `sap.uxap.ObjectPageLayout`. Do not put the FCL inside a Dynamic Page or another FCL.
  - Keep the item open in the next column visibly selected in the list (`mode="SingleSelectMaster"` or `ListItem` `navigated="true"`) so users see what the detail belongs to.
  - Choose the default emphasis deliberately: `TwoColumnsBeginExpanded` when users mostly scan the list, `TwoColumnsMidExpanded` when they mostly work on the detail (`defaultTwoColumnLayoutType` on the helper).
  - In Fiori elements, enable FCL through the `manifest.json` routing / `flexibleColumnLayout` settings — do not hand-build it.
- **Gotchas:** The control reduces columns by screen size on its own — desktop up to 3, tablet at most 2, phone 1 — so never compute layouts from device size. On phone, two-column layouts show only the Mid column and three-column layouts only the End column. Users can drag the column separators; their widths are saved per layout in browser local storage, so do not force fixed column widths. Each column is internally an `sap.m.NavContainer`; use the router, not `to()`, to navigate between pages in a column.

---

## Side Panel

- **OpenUI5 / SAPUI5:** `sap.f.SidePanel` (since 1.107)
- **Use when:** Attaching supplementary, context-related content beside the main content that the user toggles on demand — help, comments, filters, settings, a details inspector — with an action bar of icons on the edge, each opening its own panel.
- **Do NOT use when:** Primary cross-app navigation → `sap.tnt.SideNavigation` in `sap.tnt.ToolPage`; hierarchical list → detail columns → `sap.f.FlexibleColumnLayout`; a modal overlay or confirmation → `sap.m.Dialog`; a transient contextual popup anchored to a control → `sap.m.Popover`.
- **Rules:**
  - Put the page content in the `mainContent` aggregation and one `sap.f.SidePanelItem` per action-bar entry (icon + text + its content) in the `items` aggregation.
  - Toggle via the action-bar icons; react to the `toggle` event rather than showing/hiding the panel yourself.
  - For a user-resizable panel set `sidePanelResizable="true"` and bound it with `sidePanelMinWidth` / `sidePanelMaxWidth`; use `sidePanelPosition` (`sap.f.SidePanelPosition`) for left vs. right placement.
- **Gotchas:** It is `sap.f.SidePanel`, a content-area side panel — not `sap.tnt.SideNavigation` (app navigation) and not a page header. Below a width breakpoint the panel switches to an overlay over the main content; do not hard-code its open/closed width.

---

## App / NavContainer

- **OpenUI5 / SAPUI5:** `sap.m.App` (root) / `sap.m.NavContainer` (nested page navigation) — API-based, no guideline page
- **Use when:** `sap.m.App` — the single root container of a freestyle `sap.m` app that navigates between full pages (sets viewport, home icon, page transitions). `sap.m.NavContainer` — page-to-page navigation inside a bounded area, for example drill-down pages inside a `Popover` / `ResponsivePopover` or a `Dialog`.
- **Do NOT use when:** Hierarchical list-detail columns → use `sap.f.FlexibleColumnLayout`; app with left navigation → use `sap.tnt.ToolPage` with `sap.tnt.SideNavigation`; switching sections of one page → use `sap.m.IconTabBar`; a guided multi-step process → use `sap.m.Wizard`; an object preview with back navigation → `sap.m.QuickView` already handles its own pages.
- **Rules:**
  - Exactly one root container per app — `sap.m.App`, `sap.f.FlexibleColumnLayout`, `sap.m.SplitApp`, or `sap.tnt.ToolPage`. Do not nest `sap.m.App` inside another `sap.m.App` or inside a column.
  - Navigate through the router (`sap.m.routing.Router`, targets with `controlAggregation: "pages"` and the App as `controlId`) — do not call `app.to()` / `back()` directly for app-level navigation, or the URL hash, browser back, and bookmarks break.
  - Direct `NavContainer.to()` / `back()` calls are fine for local, non-bookmarkable drill-down inside a popover or dialog.
  - Child pages must be page-like controls (`sap.m.Page`, `sap.f.DynamicPage`, `sap.uxap.ObjectPageLayout`) that fill the container.
  - Keep the default `slide` transition; do not introduce custom transitions.
- **Gotchas:** Inside the SAP Fiori launchpad, the launchpad provides the shell — do not wrap the component in `sap.m.Shell`; control full-width vs. letterboxed display with `"sap.ui": { "fullWidth": true }` in `manifest.json`. `sap.m.Shell` is only for standalone apps. A `NavContainer` without a sized parent collapses to zero height — give it a height or place it in a container that has one.
