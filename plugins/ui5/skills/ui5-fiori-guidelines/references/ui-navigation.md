# UI Navigation

## Contents
- [Icon Tab Bar](#icon-tab-bar)
- [Tab Container](#tab-container)
- [Segmented Button (cross-ref)](#segmented-button-cross-ref)
- [Side Navigation](#side-navigation)
- [Shell Search](#shell-search)
- [Breadcrumbs](#breadcrumbs)

---

## Icon Tab Bar / In-page Section Navigation

- **SAPUI5:** `sap.m.IconTabBar`  **Web Component:** `ui5-tabcontainer` (`@ui5/webcomponents`)
- **Use when:** Navigating between sections or facets of a single page; filtering a list by category; visualizing process steps.
- **Do NOT use when:** Editable browser-tab-style multi-document workspace → use TabContainer (`sap.m.TabContainer`). Switching between 2–3 views in a toolbar → use Segmented Button. Left-hand app navigation → use Side Navigation.
- **Rules:**
  - Text-only tabs: set `HeaderMode="Inline"` so counters appear in parentheses, not above the label. Disable `UpperCase` property; use title case.
  - Icon-only tabs: use only when icons are universally recognizable; max 4–5 tabs.
  - For process steps with fixed order, set `TabsOverflowMode="StartAndEnd"` so tabs don't reorder.
  - Do not use cross-navigation (clicking tab A to open tab B) — it breaks back navigation.
  - WC uses `ui5-tab` and `ui5-tab-separator` as children of `ui5-tabcontainer`.
- **Gotchas:** The WC tag is `ui5-tabcontainer` — same tag name as TabContainer — but it maps to `sap.m.IconTabBar` semantics for in-page navigation. `sap.m.TabContainer` (browser-tabs editing paradigm) is a different control. Do not hide tabs with no content unless users cannot create content in them; show empty tabs that allow creation.

---

## Tab Container / Editable Multi-document Tabs

- **SAPUI5:** `sap.m.TabContainer`  **Web Component:** `ui5-tabcontainer` (`@ui5/webcomponents`) — same WC tag, different semantic use
- **Use when:** Browser-tab-style editing of multiple documents or entities side by side, each closeable and renameable (e.g. open multiple sales orders simultaneously).
- **Do NOT use when:** In-page section/facet navigation → use IconTabBar (`sap.m.IconTabBar`). Simple 2–3 view switch → Segmented Button.
- **Rules:**
  - Tabs can be closed and reordered by users — implement `tab-close` event handler to remove the closed tab's data.
  - Each tab represents an independent document or work item, not a section of one document.
  - Do not use for read-only content sections — that is IconTabBar territory.
- **Gotchas:** Both `sap.m.IconTabBar` and `sap.m.TabContainer` share the WC tag `ui5-tabcontainer`. The distinction is semantic and behavioral. In SAPUI5, they are entirely separate classes with different APIs. Choosing the wrong one is a frequent mistake — see the wrong→right table in SKILL.md.

---

## Segmented Button (cross-ref)

See [ui-actions.md — Segmented Button](ui-actions.md#segmented-button) for the full entry.

- **Use for navigation when:** Switching between 2–3 closely related views in a toolbar (not in-page section tabs).
- **Do NOT use for:** In-page sections (5+ options, or needs counters) → IconTabBar. Left nav → Side Navigation.

---

## Side Navigation / Left Menu

- **SAPUI5:** `sap.tnt.SideNavigation`  **Web Component:** `ui5-side-navigation` (`@ui5/webcomponents-fiori`)
- **Use when:** Primary navigation across multiple application areas or modules — persistent left-hand menu with expandable groups.
- **Do NOT use when:** Only a single navigation target exists. Structuring layout or implementing app-specific logic. On-page section switching → IconTabBar.
- **Rules:**
  - Always wrap `ui5-side-navigation` inside `ui5-navigation-layout` — standalone use breaks responsive behavior and misaligns ShellBar padding.
  - First navigation item must be "Home" linking to the entry page.
  - Keep navigation item labels short — wrapping is not supported in collapsed mode.
  - Limit the fixed footer to max 4 elements (1 action button + 3 nav items); phone-first: 1 element only.
  - Do not mix embedded and overlay modes in the same app; choose one.
  - WC children: `ui5-side-navigation-group`, `ui5-side-navigation-item`, `ui5-side-navigation-sub-item`.
- **Gotchas:** `ui5-side-navigation` is in `@ui5/webcomponents-fiori` — import from `@ui5/webcomponents-fiori/dist/SideNavigation.js`. On screens ≤ 599px (`size S`) the WC automatically switches to full-screen slide-in overlay regardless of embedded/overlay setting — this is expected behavior. Using `sap.m.List` as side navigation is the most common wrong-component error: List has no nav semantics, expand/collapse, or selection state.

---

## Shell Search / Cross-app Search

- **SAPUI5:** Experimental — integrate via UI5 Web Components integration into SAPUI5  **Web Component:** `ui5-search` (`@ui5/webcomponents-fiori`)
- **Use when:** Product-wide or cross-product search is required, surfacing results from across the entire application or suite, placed in the ShellBar.
- **Do NOT use when:** Filtering a local list or table on the current page → use `sap.m.SearchField` / `ui5-search` without ShellBar context. Filtering with multiple attributes → Filter Bar.
- **Rules:**
  - Place `ui5-search` in the `searchField` slot of `ui5-shellbar`; set `show-search-field` on the ShellBar to make it visible.
  - Keep the search field expanded by default (`disableSearchCollapse`) for better discoverability.
  - Group results with `ui5-search-item-group` header items — do not present as a flat ungrouped list.
  - Placeholder format: start with "Search"; add scope(s) if space allows — "Search in Sales", "Search for Devices".
  - Do not overlay or dim the page when the search is active — the suggestion dropdown already provides visual separation.
- **Gotchas:** `ui5-search` is in `@ui5/webcomponents-fiori` (`@ui5/webcomponents-fiori/dist/Search.js`) — same component used for both shell search and local search contexts, but shell usage requires ShellBar integration. The shell search is still marked experimental in SAPUI5. Autocomplete completes the first suggestion matching the input prefix — this may not be the topmost visual result depending on list ordering.

---

## Breadcrumbs / Navigation Trail

- **SAPUI5:** `sap.m.Breadcrumbs`  **Web Component:** `ui5-breadcrumbs` (`@ui5/webcomponents`)
- **Use when:** Showing the user's navigation path through a hierarchical app structure so they can jump back to any ancestor page.
- **Do NOT use when:** There is no hierarchy (flat navigation) — breadcrumbs are meaningless without depth. The navigation history is browser-managed — use the browser's back button instead.
- **Rules:**
  - Use `ui5-breadcrumbs-item` children inside `ui5-breadcrumbs`; each item can carry an `href` for direct navigation.
  - `design="Standard"` renders the last item as "current page" (bold, no separator, not a link) — do not make the current page a clickable link.
  - `design="NoCurrentPage"` shows all items as links — use when the current page needs to be linkable.
  - Call `event.preventDefault()` on `item-click` to handle navigation in-app (SPA routing) instead of browser URL change.
- **Gotchas:** The last three breadcrumb items are visible directly; earlier items collapse into a dropdown. Do not put more than ~6–8 items in the trail — deep hierarchies become unusable. Do not use breadcrumbs as a substitute for a Back button in object pages — the ObjectPageLayout's anchor bar handles that.
