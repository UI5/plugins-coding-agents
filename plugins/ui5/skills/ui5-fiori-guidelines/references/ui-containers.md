# UI Containers

## Contents
- [Card (Basic)](#card-basic)
- [Card (Integration)](#card-integration)
- [Dialog](#dialog)
- [Popover](#popover)
- [ResponsivePopover](#responsivepopover)
- [QuickView](#quickview)
- [Filter Bar](#filter-bar)
- [Notification Center](#notification-center)
- [P13n Dialog Popup](#p13n-dialog-popup)
- [Shell Bar](#shell-bar)
- [Table Toolbar](#table-toolbar)
- [User Menu](#user-menu)
- [VariantManagement](#variantmanagement)
- [ValueHelpDialog](#valuehelpdiag)

---

## Card (Basic)

- **SAPUI5:** `sap.m.Card` **Web Component:** `ui5-card` (`@ui5/webcomponents`)
- **Use when:** Showing a self-contained unit of information (header + content) in a layout alongside other cards — launchpad tiles, dashboard widgets, KPI snapshots.
- **Do NOT use when:** You need cross-host embedding or annotation-driven card types (List, Table, Analytical, Timeline, Calendar) → use Integration Card instead.
- **Rules:**
  - Always set `accessible-name` or `accessible-name-ref` — required for ARIA region label.
  - Use `ui5-card-header` in the `header` slot; do not put a title as plain text content.
  - Numeric KPIs belong in a NumericHeader variant, not in the content area as plain text.
  - Do not nest cards.
- **Gotchas:** `ui5-card` (`@ui5/webcomponents`) is a simple container. The full card types (List, Analytical, Timeline, Calendar, Object, Component) are only available via `sap.ui.integration.widgets.Card` — there is no web-component equivalent for those types.

---

## Card (Integration)

- **SAPUI5:** `sap.ui.integration.widgets.Card` **Web Component:** none — use the SAPUI5 class directly or the `ui5-card` web component for simple cases only.
- **Use when:** Embedding app content across host environments (SAP Fiori launchpad, third-party portals, mobile); need annotation-driven card types (List, Table, Analytical, Timeline, Calendar, Object, Component).
- **Do NOT use when:** You just need a styled container with a header in a single app → use `ui5-card` (basic) instead.
- **Rules:**
  - Card manifest JSON drives the content type; do not hand-build card content as free HTML inside an integration card.
  - The card header is clickable by default and navigates to the underlying source — always provide a meaningful navigation target.
  - Numeric header: always supply `unitOfMeasurement` via the dedicated property, not free text in the subtitle.
  - Counter in the header (e.g. "6 of 12") is automatic when the content contains multiple items — do not add a custom counter label.
- **Gotchas:** Integration cards load via a card manifest (descriptor JSON), not via control properties. The host environment controls container sizing; the card adapts — do not set fixed widths on integration cards.

---

## Dialog

- **SAPUI5:** `sap.m.Dialog` **Web Component:** `ui5-dialog` (`@ui5/webcomponents`)
- **Use when:** The action is modal — user must respond before continuing (confirmation, form requiring input, destructive action).
- **Do NOT use when:** The message is informational only and non-blocking → use `sap.m.MessageStrip` / `ui5-message-strip`; for a plain semantic error/warning/success/confirm dialog → use `sap.m.MessageBox` (SAPUI5) or `ui5-dialog` with `state` property set; for contextual detail beside an element → use Popover.
- **Rules:**
  - One emphasized button per dialog maximum; all other actions are Default/Transparent.
  - Do not nest dialogs — each dialog must be a separate element in the markup.
  - Use `state="Negative"` / `state="Critical"` on `ui5-dialog` for error/warning dialogs; this sets `role="alertdialog"` automatically.
  - On phone, set `stretch` to `true` for full-screen display.
  - For semantic error/warning/confirm in SAPUI5 freestyle, prefer `sap.m.MessageBox` over a hand-built Dialog.
- **Gotchas:** `ui5-dialog` is always modal. `draggable` and `resizable` only work on desktop. Setting `initialFocus` has no effect if the target element has `autofocus`.

---

## Popover

- **SAPUI5:** `sap.m.Popover` **Web Component:** `ui5-popover` (`@ui5/webcomponents`)
- **Use when:** Non-modal contextual content anchored to a trigger — detail without leaving the page, lightweight preview, non-disruptive actions.
- **Do NOT use when:** User input or confirmation is required (modal context) → use Dialog; content is an object preview following a standard structure → use QuickView; the content takes more than one-third of phone screen → use ResponsivePopover.
- **Rules:**
  - Popover is non-modal by default — background stays interactive; set `modal` only when click-outside-to-close must be suppressed.
  - Closing must always be possible: click outside, re-click trigger, or an action inside.
  - On phone, `sap.m.Popover` opens as a full-screen dialog automatically; `ui5-popover` does not — use `ui5-responsive-popover` for phone support.
- **Gotchas:** `resize` is SAPUI5 only — not available on `ui5-popover`.

---

## ResponsivePopover

- **SAPUI5:** `sap.m.ResponsivePopover` **Web Component:** `ui5-responsive-popover` (`@ui5/webcomponents`)
- **Use when:** You need popover behavior on desktop/tablet but full-screen dialog on phone — i.e. when the content must be fully accessible on all device sizes.
- **Do NOT use when:** Phone behavior is irrelevant (desktop-only app) → plain Popover suffices; content requires confirmed modal interaction → use Dialog.
- **Rules:**
  - Treat this as the default overlay choice for any content that must work across all breakpoints.
  - All Dialog and Popover slot / property rules apply (header, footer, content).
- **Gotchas:** On phone it acts as a Dialog (modal, full screen); on tablet/desktop it acts as a Popover. The `modal` property behaves accordingly per device.

---

## QuickView

- **SAPUI5:** `sap.m.QuickView` **Web Component:** none — no `ui5-quick-view` exists; do not invent this tag.
- **Use when:** Standardized object-preview card anchored to a trigger (contact details, business object summary) following the Fiori QuickView pattern.
- **Do NOT use when:** The structure does not fit the QuickView pattern (groups of label/value pairs with optional navigation) → use a custom Popover; the content is object detail that should live in an Object Page → navigate there instead.
- **Rules:**
  - Use `sap.m.QuickViewGroup` / `sap.m.QuickViewGroupElement` for the content structure — do not put arbitrary layouts inside.
  - QuickView supports back-navigation for multi-page scenarios; do not replicate this with manual Popover navigation flows.
- **Gotchas:** No web component equivalent. In WC-based apps, build a `ui5-popover` with a structured content if you need a quick view — but that will not match the SAPUI5 QuickView design spec exactly.

---

## Filter Bar

- **SAPUI5:** `sap.ui.mdc.FilterBar` (V4/MDC) / `sap.ui.comp.filterbar.FilterBar` (V2/SmartFilterBar) **Web Component:** none — no `ui5-filter-bar` exists.
- **Use when:** Part of a List Report, Analytical List Page, or Overview Page floorplan to let users narrow data loaded into the main table.
- **Do NOT use when:** Table is inside an Object Page section → use ViewSettings dialog; in a Wizard; in a simple list → use Search only.
- **Rules:**
  - Prefer **live update mode** unless data volume is very high or multiple filters must be set before any results are meaningful.
  - Always define a *Basic* group of mandatory and frequently used filters to ship with the app.
  - Mandatory filters (asterisk) must have values before search returns results — preset them to prevent errors on page load.
  - Use the simplest selection control that fits: Select for short fixed lists, ComboBox for longer/type-ahead, DatePicker for dates, Value Help only as a last resort.
  - Do not show a Search field in the Table Toolbar when a Filter Bar is present — the Filter Bar's basic search field covers this.
- **Gotchas:** In Fiori Elements (V4), the Filter Bar is annotation-driven via `sap.ui.mdc.FilterBar` — do not hand-build it. The SmartFilterBar (`sap.ui.comp.filterbar.FilterBar`) is maintained but no longer enhanced; prefer MDC for new V4 apps.

---

## Notification Center

- **SAPUI5:** `sap.m.NotificationListItem` / `sap.m.NotificationListGroup` (within a `sap.m.Popover`) **Web Component:** `ui5-notification-list` (`@ui5/webcomponents-fiori`), items: `ui5-li-notification` / `ui5-li-notification-group`
- **Use when:** Surfacing real-time, event-driven alerts in the Shell Bar notification panel (bell icon).
- **Do NOT use when:** Inline page feedback is needed → use MessageStrip; a brief confirmation is needed → use MessageToast; the message is part of the current flow → use MessagePopover.
- **Rules:**
  - Notifications are one-way and cannot be retracted — content must be accurate at creation time.
  - Group similar event types to avoid flooding — individual low-priority notifications should be grouped.
  - Each notification must be clear on purpose, brief, and action-oriented.
  - Sort by date (default) or importance; do not add other sort options.
  - The bell counter shows new notifications since last panel open; clicking the bell resets it to zero.
- **Gotchas:** `ui5-notification-list` is in `@ui5/webcomponents-fiori`, not `@ui5/webcomponents`. Import: `import "@ui5/webcomponents-fiori/dist/NotificationList.js"`. The notification panel itself is a Popover in both SAPUI5 and WC implementations.

---

## P13n Dialog Popup

- **SAPUI5:** `sap.m.p13n.Popup` **Web Component:** none — no WC equivalent exists.
- **Use when:** Users need to personalize a table or Smart Chart with 20+ columns, or need multiple personalization dimensions simultaneously (Columns + Sort + Filter + Group).
- **Do NOT use when:** Fewer than ~20 columns or only column show/hide needed → use `sap.m.ViewSettingsDialog` (simple) or `sap.m.TablePersoDialog` (basic); if a Filter Bar is present, disable the P13n Filter tab (use the Filter Bar instead).
- **Rules:**
  - Tabs can be shown in any combination (Sort, Filter, Columns, Group, Chart) — include only those relevant to the use case.
  - Columns tab: only columns marked visible can be used for grouping.
  - Sort tab: if column-header sort is also enabled, it replaces ALL sort options set in the dialog.
  - New P13n panels from SmartTable (Columns, Sort, Group) are available for freestyle development.
- **Gotchas:** No web component for `sap.m.p13n.Popup`. Opening is done via toolbar buttons — the P13n dialog is not self-opening.

---

## Shell Bar

- **SAPUI5:** `sap.f.ShellBar` **Web Component:** `ui5-shellbar` (`@ui5/webcomponents-fiori`)
- **Use when:** Universal app header at the top of every screen — logo, product title, search, notifications, Joule (AI assistant), user profile, product switch.
- **Do NOT use when:** You need a page-level or section-level toolbar → use `sap.m.Toolbar` / `sap.m.OverflowToolbar`; do not use `sap.m.Bar` as an app header.
- **Rules:**
  - Branding element (SAP logo + product name) is mandatory.
  - Help and Profile slots are mandatory.
  - Only add actions to the Shell Bar if users need them **frequently** — do not replicate Shell Bar actions in the User Menu or side navigation.
  - Avoid using the Shell Bar Back button; prefer the browser back button. Only show it when back navigation is technically impossible via the browser.
  - Use `assistant` slot for Joule/AI assistant button.
- **Gotchas:** `ui5-shellbar` is in `@ui5/webcomponents-fiori` (not `@ui5/webcomponents`). Import: `import "@ui5/webcomponents-fiori/dist/ShellBar.js"`. The `assistant` slot is the designated entry point for Joule — do not add Joule as a custom shell item.

---

## Table Toolbar

- **SAPUI5:** `sap.m.OverflowToolbar` (wrapping the table) **Web Component:** `ui5-toolbar` (use `sap.m.OverflowToolbar` in SAPUI5 for full overflow support)
- **Use when:** The table needs a title, actions, view controls, search, or variant management placed above it.
- **Do NOT use when:** The table is used for selection only; all meaningful actions are row-level only.
- **Rules:**
  - Follow the predefined action group order: Finalizing → Business → Modification → Personalization → Share → Export → View → End slot.
  - *Create*, *Delete*, *Add*, *Remove* must never move into the overflow menu.
  - Do not show a Search field in the toolbar when a Filter Bar is present on the same page.
  - One emphasized button maximum per toolbar; use ghost/transparent for the rest in header/footer toolbars.
  - Variant Management replaces the title in most cases — do not show both unless necessary (insert a separator between them if you do).
- **Gotchas:** `sap.m.OverflowToolbar` handles responsive overflow automatically. If you use a plain `sap.m.Toolbar`, items do not overflow — critical actions may become invisible on small screens.

---

## User Menu

- **SAPUI5:** accessed via `sap.f.ShellBar` (profile slot) **Web Component:** `ui5-user-menu` (`@ui5/webcomponents-fiori`)
- **Use when:** User-specific settings, account switching, and sign-out — always accessed via the Shell Bar avatar/profile icon.
- **Do NOT use when:** App-level navigation items belong here — they go in the side navigation or the app menu, not the User Menu.
- **Rules:**
  - Show *Manage Account* button only if a central profile management URL exists outside the product.
  - Show *Other Accounts* panel only if the product supports multiple accounts.
  - Standard items: Settings, Legal Information, About. Add product-specific user-related items only.
  - On S (phone), the User Menu opens full screen.
- **Gotchas:** `ui5-user-menu` is in `@ui5/webcomponents-fiori`. Import: `import "@ui5/webcomponents-fiori/dist/UserMenu.js"`. It is used inside `ui5-shellbar` via the `profile` slot and opened by setting `open` + `opener` — it is not a standalone dropdown.

---

## VariantManagement

- **SAPUI5:** `sap.m.VariantManagement` / `sap.ui.fl.variants.VariantManagement` **Web Component:** none — no WC equivalent exists.
- **Use when:** Users need to save, load, and switch between named sets of table/filter-bar settings (column layout, sort, filter, group).
- **Do NOT use when:** No personalization persistence is needed; only a static title is required.
- **Rules:**
  - In tables: VariantManagement replaces the table title — do not show both unless unavoidable.
  - In Filter Bars: VariantManagement stores filter values, visible filters, and filter order — this is the "Views" selector at the top of the Filter Bar.
  - Use `sap.ui.fl.variants.VariantManagement` for SAPUI5 Flexibility-backed persistence (recommended for Fiori Elements and freestyle apps with key user adaptation support).
- **Gotchas:** No web component. In WC-based apps, variant management must be custom-built or left out.

---

## ValueHelpDialog {#valuehelpdiag}

- **SAPUI5:** `sap.m.ValueHelpDialog` / `sap.ui.mdc.ValueHelp` (V4) **Web Component:** none — no WC equivalent exists.
- **Use when:** Users need to select single or multiple values from a complex source (search + table + token management in one dialog) — especially for filter fields with large data sets.
- **Do NOT use when:** The list is short and fixed → use Select or ComboBox; for date selection → use DatePicker; for free text → use Input with suggestions. Value Help is a last resort — choose simpler controls first.
- **Rules:**
  - In Fiori Elements (V4), Value Help is driven by `@sap.ui.mdc.ValueHelp` annotations — do not hand-build a ValueHelpDialog in Elements apps.
  - Use `sap.ui.mdc.ValueHelp` for all new V4/MDC freestyle apps; `sap.m.ValueHelpDialog` is V2/legacy.
  - Always enable the search field inside the dialog when the data source is large.
- **Gotchas:** No web component. The ValueHelpDialog is also the basis for the Filter Bar's "Adapt Filters" search when using SmartFilterBar — do not confuse the two.
