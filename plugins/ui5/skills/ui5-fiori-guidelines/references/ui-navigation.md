# UI Navigation

## Contents
- [Shell Bar](#shell-bar)
- [User Menu](#user-menu)
- [Product Switch](#product-switch)
- [Icon Tab Bar](#icon-tab-bar)
- [Tab Container](#tab-container)
- [Segmented Button (cross-ref)](#segmented-button-cross-ref)
- [Side Navigation](#side-navigation)
- [Shell Search](#shell-search)
- [Breadcrumbs](#breadcrumbs)

---

## Shell Bar

- **OpenUI5 / SAPUI5:** `sap.f.ShellBar`
- **Use when:** Universal app header at the top of every screen — logo, product title, search, notifications, Joule (AI assistant), user profile, product switch.
- **Do NOT use when:** You need a page-level or section-level toolbar → use `sap.m.Toolbar` / `sap.m.OverflowToolbar`; do not use `sap.m.Bar` as an app header. Inside the SAP Fiori launchpad the launchpad already renders the shell header — do not add a second one.
- **Rules:**
  - Branding element (SAP logo + product name) is mandatory.
  - The profile (`profile` aggregation with a `sap.m.Avatar`) is mandatory; provide Help access.
  - Only add actions to the Shell Bar if users need them **frequently** — do not replicate Shell Bar actions in the User Menu or side navigation.
  - Avoid using the Shell Bar Back button (`showNavButton`); prefer the browser back button. Only show it when back navigation is technically impossible via the browser.
  - In an app with side navigation, place the Shell Bar in the `header` of `sap.tnt.ToolPage`.
- **Gotchas:** Use the ShellBar's built-in assistant entry point (`showCopilot` / `copilotPressed`) for Joule — do not add Joule as an unrelated item in `additionalContent`. The API notes that `sap.f.ShellBar` is not UXC-compliant and will no longer follow UXC design updates; for UXC-compliant apps, use the `ui5-shellbar` Web Component (integrate via `ui5-tooling-modules`).

---

## User Menu

- **OpenUI5 / SAPUI5:** opened from the `sap.f.ShellBar` profile avatar (`avatarPressed` event) — API-based; the guideline page lists no SAPUI5 implementation (Web Component only)
- **Use when:** User-specific settings, account switching, and sign-out — always accessed via the Shell Bar avatar/profile icon.
- **Do NOT use when:** App-level navigation items belong here — they go in the side navigation or the app menu, not the User Menu.
- **Rules:**
  - Show *Manage Account* button only if a central profile management URL exists outside the product.
  - Show *Other Accounts* panel only if the product supports multiple accounts.
  - Standard items: Settings, Legal Information, About. Add product-specific user-related items only.
  - On S (phone), the User Menu opens full screen.
- **Gotchas:** The profile menu is opened from the ShellBar avatar — it is not a standalone page-level dropdown.

---

## Product Switch

- **OpenUI5 / SAPUI5:** `sap.f.ProductSwitch` / `sap.f.ProductSwitchItem` — API-based, no guideline page (only mentioned in the Shell Bar anatomy)
- **Use when:** Users move between related products or applications of a suite from the Shell Bar (the grid icon next to the profile).
- **Do NOT use when:** Navigating inside the current app → use `sap.tnt.SideNavigation` or in-page navigation; launching many unrelated apps → that is the launchpad's job; offering a handful of in-app actions → use a `sap.m.Menu` / `MenuButton`.
- **Rules:**
  - Open it from the Shell Bar: set `showProductSwitcher="true"` and open a `sap.m.ResponsivePopover` containing the `ProductSwitch` in the `productSwitcherPressed` handler.
  - Each `ProductSwitchItem` needs a `title` and an icon (`src`) or image (`imageSrc`); `subTitle` is optional — keep both to one short line.
  - Set `targetSrc` (and `target` when it opens in a new tab) on each item, and redirect in the `ProductSwitch` `change` event — redirection is app logic, not automatic. Mark the current product with the `selectedItem` association.
  - Keep the list to products the user can actually access; do not show disabled or unauthorized products.
- **Gotchas:** The grid switches automatically from 3 columns (up to 6 items) to 4 columns (7+ items) — do not force a layout. On phones the `ResponsivePopover` opens full screen, which is expected.

---

## Icon Tab Bar / In-page Section Navigation

- **OpenUI5 / SAPUI5:** `sap.m.IconTabBar`
- **Use when:** Navigating between sections or facets of a single page; filtering a list by category; visualizing process steps.
- **Do NOT use when:** Editable browser-tab-style multi-document workspace → use TabContainer (`sap.m.TabContainer`). Switching between 2–3 views in a toolbar → use Segmented Button. Left-hand app navigation → use Side Navigation.
- **Rules:**
 - Text-only tabs: set `headerMode="Inline"` so counters appear in parentheses, not above the label. Keep `upperCase="false"` (default); use title case.
 - Icon-only tabs: use only when icons are universally recognizable; max 4–5 tabs.
 - For process steps with fixed order, set `tabsOverflowMode="StartAndEnd"` so tabs don't reorder.
 - Keep `expandable` at its default (`true`) when there is content below the tab bar; set `expandable="false"` only when nothing is below it.
 - Do not use cross-navigation (clicking tab A to open tab B) — it breaks back navigation.
 - Use `sap.m.IconTabFilter` and `sap.m.IconTabSeparator` as items of `sap.m.IconTabBar`.
- **Gotchas:** `sap.m.IconTabBar` (in-page navigation) and `sap.m.TabContainer` (browser-tab-style editing) are separate controls with different APIs — pick by purpose, not by look. Do not hide tabs with no content unless users cannot create content in them; show empty tabs that allow creation.

---

## Tab Container / Editable Multi-document Tabs

- **OpenUI5 / SAPUI5:** `sap.m.TabContainer`
- **Use when:** The Multi-Instance Layout — users select several objects on another page (usually a list report, "Open in Tabs") and open and edit them simultaneously, one closeable tab per object.
- **Do NOT use when:** Users need the objects side by side on the same page → comparison pattern. In-page section/facet navigation → use IconTabBar (`sap.m.IconTabBar`). Simple 2–3 view switch → Segmented Button.
- **Rules:**
 - Put one `sap.m.TabContainerItem` per open object in the `items` aggregation; track the active one via the `selectedItem` association.
 - Each tab's content is an embedded Object Page; the tab title (`name`) is the same as the object page title.
 - Set `modified="true"` on a tab with unsaved changes (shows an asterisk). Handle `itemClose` and warn before closing a tab with unsaved changes (`preventDefault()` to keep it open).
 - Closing the last tab closes the page and returns to the page the objects were selected from.
 - Show the Create button (`showAddNewButton`, `addNewButtonPress` → new tab with an empty object page) only if the app allows creating objects.
- **Gotchas:** `sap.m.TabContainer` and `sap.m.IconTabBar` are separate classes with different APIs; the distinction is semantic and behavioral. Choosing the wrong one is a frequent mistake — see the wrong→right table in SKILL.md.

---

## Segmented Button (cross-ref)

See [ui-actions.md — Segmented Button](ui-actions.md#segmented-button) for the full entry.

- **Use for navigation when:** Switching between 2–3 closely related views in a toolbar (not in-page section tabs).
- **Do NOT use for:** In-page sections (5+ options, or needs counters) → IconTabBar. Left nav → Side Navigation.

---

## Side Navigation / Left Menu

- **OpenUI5 / SAPUI5:** `sap.tnt.SideNavigation`
- **Use when:** Primary navigation across multiple application areas or modules — persistent left-hand menu with expandable groups.
- **Do NOT use when:** Only a single navigation target exists. Structuring layout or implementing app-specific logic. On-page section switching → IconTabBar.
- **Rules:**
 - Place `sap.tnt.SideNavigation` in the `sideContent` of `sap.tnt.ToolPage` (with the Shell Bar in the ToolPage `header`) — standalone use breaks responsive behavior and misaligns ShellBar padding.
 - First navigation item must be "Home" linking to the entry page.
 - Keep navigation item labels short — wrapping is not supported in collapsed mode.
 - Limit the fixed bottom area (`fixedItem`) to max 4 elements (1 action button + 3 nav items); phone-first: 1 element only. The `footer` aggregation is deprecated since 1.120 — use `fixedItem`.
 - Do not mix embedded and overlay modes in the same app; choose one.
 - Use `sap.tnt.NavigationListGroup` (since 1.121) for groups and `sap.tnt.NavigationListItem` for items and sub-items.
- **Gotchas:** The namespace is `sap.tnt` — there is no `sap.f.SideNavigation`. The `sap.tnt` library ships with both OpenUI5 and SAPUI5. On size S the side nav switches to full-screen slide-in overlay — expected behavior. Using `sap.m.List` as side navigation is the most common wrong-component error: List has no nav semantics, expand/collapse, or selection state.

---

## Shell Search / Cross-app Search

- **OpenUI5 / SAPUI5:** `sap.f.SearchManager` in the `searchManager` aggregation of `sap.f.ShellBar` — API-based; the guideline page lists no SAPUI5 implementation (experimental Web Component only)
- **Use when:** Product-wide or cross-product search is required, surfacing results from across the entire application or suite, placed in the ShellBar.
- **Do NOT use when:** Filtering a local list or table on the current page → use `sap.m.SearchField` in the page content. Filtering with multiple attributes → Filter Bar.
- **Rules:**
 - Add a `sap.f.SearchManager` to the ShellBar `searchManager` aggregation and handle its `search` (and `suggest`) events — do not place a `sap.m.SearchField` in `additionalContent`.
 - Suggestions go in `suggestionItems`, which accepts only `sap.m.SuggestionItem` (`text`, `description`, `icon`, `key`) — `GroupHeaderListItem` and other list items are not allowed there.
 - Placeholder format: start with "Search"; add scope(s) if space allows — "Search in Sales", "Search for Devices".
 - Do not overlay or dim the page when the search is active — the suggestion dropdown already provides visual separation.
- **Gotchas:** `sap.m.SearchField` serves local in-page search; shell-wide search goes through the ShellBar's `SearchManager`. Inside the SAP Fiori launchpad, the launchpad provides the shell search — do not add a second one. Autocomplete completes the first suggestion matching the input prefix — this may not be the topmost visual result depending on list ordering.

---

## Breadcrumbs / Navigation Trail

- **OpenUI5 / SAPUI5:** `sap.m.Breadcrumbs`
- **Use when:** Secondary navigation on an object page; drilldown through related object pages (parent → child → grandchild), tables, or charts.
- **Do NOT use when:** The hierarchy has only one level. Linking to other floorplans (overview pages, list reports), to unrelated object pages in other apps, or to standalone object pages such as fact sheets — the global navigation concept covers those.
- **Rules:**
 - Put `sap.m.Link` controls in the `links` aggregation of `sap.m.Breadcrumbs`, one per ancestor page.
 - Standard type: set `currentLocationText` for the current page — it renders as plain text, not a link. On an object page, use the type without the current page: omit `currentLocationText`, so all items are links. Place it in the `breadcrumbs` aggregation of `sap.f.DynamicPageTitle` / the object page header title.
 - For in-app (router) navigation, handle each Link's `press` and call the router instead of hard-coding `href` URLs.
- **Gotchas:** When space runs out, earlier links collapse into a dropdown. Do not put more than ~6–8 items in the trail — deep hierarchies become unusable. The anchor bar of `sap.uxap.ObjectPageLayout` navigates sections within one object; breadcrumbs navigate up the object hierarchy — use both where both apply.
