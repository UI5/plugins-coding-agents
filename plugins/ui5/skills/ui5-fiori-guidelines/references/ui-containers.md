# UI Containers

## Contents
- [Card (Basic)](#card-basic)
- [Card (Integration)](#card-integration)
- [Panel](#panel)
- [Wizard](#wizard)
- [Dialog](#dialog)
- [Popover](#popover)
- [ResponsivePopover](#responsivepopover)
- [QuickView](#quickview)
- [ColorPalettePopover](#colorpalettepopover)
- [Filter Bar](#filter-bar)
- [Notification Center](#notification-center)
- [P13n Dialog Popup](#p13n-dialog-popup)
- [VariantManagement](#variantmanagement)
- [ValueHelpDialog](#valuehelpdiag)

Shell Bar and User Menu live in `ui-navigation.md`; Table Toolbar lives in `ui-actions.md`; page and app layouts (Dynamic Page, Flexible Column Layout, App) live in `ui-layouts.md`.

---

## Card (Basic)

- **OpenUI5 / SAPUI5:** `sap.f.Card`
- **Use when:** Showing a self-contained unit of information (header + content) in a layout alongside other cards — dashboard widgets, KPI snapshots, previews.
- **Do NOT use when:** Representing an app on the SAP Fiori launchpad home page → `sap.m.GenericTile`. You need a header toolbar → `sap.m.Panel` or a table. You need cross-host embedding or manifest-driven card types (List, Table, Analytical, Timeline, Calendar) → use Integration Card instead.
- **Rules:**
 - Always set a header (`sap.f.cards.Header`) with a `title` — it gives the card its accessible name.
 - Put the title in the `header` aggregation; do not put it as plain text in `content`.
 - Numeric KPIs belong in `sap.f.cards.NumericHeader`, not in the content area as plain text.
 - Do not nest cards.
- **Gotchas:** `sap.f.Card` is a simple container. Manifest-driven card types (List, Table, Analytical, Timeline, Calendar, Object, Component) use `sap.ui.integration.widgets.Card`. Annotation-based cards are Overview Page (OVP) cards in SAP Fiori elements — a different technology.

---

## Card (Integration)

- **OpenUI5 / SAPUI5:** `sap.ui.integration.widgets.Card`
- **Use when:** Embedding app content across host environments (SAP Fiori launchpad, third-party portals, mobile); need manifest-driven card types (List, Table, Analytical, Timeline, Calendar, Object, Component).
- **Do NOT use when:** You just need a styled container with a header in a single app → use `sap.f.Card` (basic) instead.
- **Rules:**
 - Card manifest JSON drives the content type; do not hand-build card content as free HTML inside an integration card.
 - The card header is clickable by default and navigates to the underlying source — always provide a meaningful navigation target.
 - Numeric header: always supply `unitOfMeasurement` via the dedicated property, not free text in the subtitle.
 - Counter in the header (e.g. "6 of 12") is automatic when the content contains multiple items — do not add a custom counter label.
- **Gotchas:** Integration cards load via a card manifest (descriptor JSON), not via control properties. The host environment controls container sizing; the card adapts — do not set fixed widths on integration cards.

---

## Panel

- **OpenUI5 / SAPUI5:** `sap.m.Panel`
- **Use when:** Grouping related form fields or content in a section, optionally collapsible.
- **Do NOT use when:** You need a compact preview in a card layout and no header toolbar → use `sap.f.Card`; you need a modal overlay → use Dialog; you are designing an Object Page — never use panels in the Object Page content area. Do not nest panels and avoid stacking many panels on one page.
- **Rules:**
 - `expandable="false"` (default) renders the panel always expanded — set `expandable="true"` to get the expand/collapse toggle.
 - `headerToolbar` overrides `headerText` — use one or the other, not both.
 - For non-form content, change `accessibleRole` from the default `Form` to `Region` or `Complementary`.
 - `stickyHeader="true"` keeps the header visible while scrolling (forces a solid background).
 - The `expand` event fires **before** the panel expands or collapses; use its `triggeredByInteraction` parameter to tell user interaction apart from a programmatic `setExpanded()` call.
- **Gotchas:** A fixed `height` is kept even when the panel is collapsed, so a collapsed panel renders as an empty fixed-height box. Keep `height="auto"` (default) so the content area resizes.

---

## Wizard

- **OpenUI5 / SAPUI5:** `sap.m.Wizard` / `sap.m.WizardStep`
- **Use when:** Guiding users through a long or unfamiliar sequential process where each step must be completed before advancing — onboarding, guided configuration, complex object creation. Can also be placed in a modal dialog when the wizard is closely tied to the triggering page.
- **Do NOT use when:** 2 or fewer steps → use a Dialog with Next/Back buttons; more than 8 steps → restructure the task; steps are independent and can be done in any order → use `sap.uxap.ObjectPageLayout` with sections; the task is routine or familiar to the user.
- **Rules:**
 - Use 3 to 8 steps — the control logs an error outside this range.
 - For branching flows, set `enableBranching="true"` and call `WizardStep#setNextStep()`; changing `subsequentSteps` at runtime is **not supported**.
 - Inserting steps at runtime is **not supported** — define all `sap.m.WizardStep` instances in the `steps` aggregation upfront.
 - After the last step, lead users to a review/summary page before final submission; do not override `finishButtonText` without reason.
 - Always offer Cancel in the footer, with a data-loss warning if fields were changed. For long forms, add "Save as Draft".
 - Place it in a `sap.m.Page` with `enableScrolling="false"` — the Wizard handles its own scrolling.
 - Inside `sap.f.DynamicPage`, pick one of two setups, never both: the guideline sets the Wizard to `height="auto"` (the default `100%` can cause a scrollbar issue) so the page scrolls; the `sap.m.Wizard` API keeps `height="100%"`, sets `fitContent="true"` on the DynamicPage so the Wizard handles scrolling, and adds the `sapUiNoContentPadding` CSS class to the DynamicPage.
 - Use `renderMode="Page"` for mobile-optimized rendering that shows one step at a time.
- **Gotchas:** Setting `currentStep` to step C in a path A → B → C → D activates A, B, and C; D stays unvisited. When a Wizard inside a Dialog is closed and reopened, it resets to the first step — call `setCurrentStep()` before reopening to restore the user's position.

---

## Dialog

- **OpenUI5 / SAPUI5:** `sap.m.Dialog`
- **Use when:** The action is modal — user must respond before continuing (confirmation, form requiring input, destructive action).
- **Do NOT use when:** The message is informational only and non-blocking → use `sap.m.MessageStrip`; for a plain semantic error/warning/success/confirm dialog → use `sap.m.MessageBox`; for contextual detail beside an element → use Popover.
- **Rules:**
 - One emphasized button per dialog maximum; all other actions are Default/Transparent.
 - Do not nest dialogs — each dialog must be a separate element in the markup.
 - Use `state="Error"` / `state="Warning"` on a custom `sap.m.Dialog` that reports an error or warning; this sets `role="alertdialog"` automatically.
 - On phone, set `stretch` to `true` for full-screen display.
 - For plain semantic error/warning/confirm dialogs, prefer `sap.m.MessageBox` over a hand-built Dialog.
- **Gotchas:** `sap.m.Dialog` is always modal. `draggable` and `resizable` only work on desktop. Setting `initialFocus` has no effect if the target element has `autofocus`.

---

## Popover

- **OpenUI5 / SAPUI5:** `sap.m.Popover`
- **Use when:** Non-modal contextual content anchored to a trigger — detail without leaving the page, lightweight preview, non-disruptive actions.
- **Do NOT use when:** User input or confirmation is required (modal context) → use Dialog; content is an object preview following a standard structure → use QuickView; the content takes more than one-third of phone screen → use ResponsivePopover.
- **Rules:**
 - Popover is non-modal by default — background stays interactive; set `modal` only when click-outside-to-close must be suppressed.
 - Closing must always be possible: click outside, re-click trigger, or an action inside.
 - `sap.m.Popover` does not switch to full screen on phones — use `sap.m.ResponsivePopover` for phone support.
- **Gotchas:** `resizable` only works on desktop.

---

## ResponsivePopover

- **OpenUI5 / SAPUI5:** `sap.m.ResponsivePopover` — API-based, no guideline page
- **Use when:** You need popover behavior on desktop/tablet but full-screen dialog on phone — i.e. when the content must be fully accessible on all device sizes.
- **Do NOT use when:** Phone behavior is irrelevant (desktop-only app) → plain Popover suffices; content requires confirmed modal interaction → use Dialog.
- **Rules:**
 - Treat this as the default overlay choice for any content that must work across all breakpoints.
 - All Dialog and Popover aggregation and property rules apply (`customHeader`, `beginButton` / `endButton`, `content`).
- **Gotchas:** On phone it acts as a Dialog (modal, full screen); on tablet/desktop it acts as a Popover. The `modal` property only takes effect on tablet/desktop.

---

## QuickView

- **OpenUI5 / SAPUI5:** `sap.m.QuickView`
- **Use when:** Standardized object-preview card anchored to a trigger (contact details, business object summary) following the Fiori QuickView pattern.
- **Do NOT use when:** The structure does not fit the QuickView pattern (groups of label/value pairs with optional navigation) → use a custom Popover; the content is object detail that should live in an Object Page → navigate there instead.
- **Rules:**
 - Use `sap.m.QuickViewGroup` / `sap.m.QuickViewGroupElement` for the content structure — do not put arbitrary layouts inside.
 - QuickView supports back-navigation for multi-page scenarios; do not replicate this with manual Popover navigation flows.
- **Gotchas:** Do not hand-build a custom popover layout when `sap.m.QuickView` fits — it encodes the standard object-preview structure (header, icons, links). `QuickViewPage.fallbackIcon` is deprecated since 1.92 — put an `sap.m.Avatar` in the `avatar` aggregation and set its `fallbackIcon`.

---

## ColorPalettePopover

- **OpenUI5 / SAPUI5:** `sap.m.ColorPalettePopover` (since 1.54)
- **Use when:** Letting the user pick one color from a small curated palette anchored to a trigger (e.g. a toolbar color button).
- **Do NOT use when:** The user must enter an arbitrary color (hex/RGB/HSL) → use `sap.ui.unified.ColorPicker` (optionally via the popover's "Default Color" / "More Colors" entry); a full always-visible swatch grid is wanted inline → use `sap.m.ColorPalette`.
- **Rules:**
 - Open it from its trigger with `openBy(oControl)` — it is not placed in the view like a static control.
 - Handle the `colorSelect` event to read the chosen color (`getParameter("value")`). Preselect a swatch with `selectedColor` (since 1.122); `defaultColor` is the value returned when the user presses the "Default Color" button — it does not preselect anything.
 - Keep the palette to the curated set; `showMoreColorsButton` defaults to `true` — set it to `false` unless free color choice is genuinely needed.
- **Gotchas:** `sap.m.ColorPalettePopover` is the popover wrapper; `sap.m.ColorPalette` is the embeddable grid. The popover has no `content` aggregation — you cannot put arbitrary controls inside it.

---

## Filter Bar

- **OpenUI5 / SAPUI5:** `sap.ui.mdc.FilterBar` (V4/MDC) · **SAPUI5:** `sap.ui.comp.filterbar.FilterBar` (V2/SmartFilterBar)
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

- **OpenUI5 / SAPUI5:** `sap.m.NotificationListItem` / `sap.m.NotificationListGroup` / `sap.m.NotificationList` (within a `sap.m.Popover`) — **all deprecated since 1.153**, replaced by the UI5 Web Components notifications (integrate via `ui5-tooling-modules`). API-based; the guideline page lists no SAPUI5 implementation.
- **Use when:** Surfacing real-time, event-driven alerts in the Shell Bar notification panel (bell icon).
- **Do NOT use when:** Inline page feedback is needed → use MessageStrip; a brief confirmation is needed → use MessageToast; the message is part of the current flow → use MessagePopover.
- **Rules:**
 - Notifications are one-way and cannot be retracted — content must be accurate at creation time.
 - Group similar event types to avoid flooding — individual low-priority notifications should be grouped.
 - Each notification must be clear on purpose, brief, and action-oriented.
 - Sort by date (default) or importance; do not add other sort options.
 - The bell counter shows new notifications since last panel open; clicking the bell resets it to zero.
- **Gotchas:** Notifications in the shell are typically hosted in a `sap.m.Popover` triggered from the ShellBar bell (`notificationsPressed`). The `sap.m` notification classes no longer follow design updates — for new UIs on 1.153+, use the Web Components notifications instead. Inside the SAP Fiori launchpad, the launchpad provides notifications.

---

## P13n Dialog Popup

- **OpenUI5 / SAPUI5:** `sap.m.p13n.Popup`
- **Use when:** Users need to personalize a table or Smart Chart with 20+ columns, or need multiple personalization dimensions simultaneously (Columns + Sort + Filter + Group).
- **Do NOT use when:** Fewer than ~20 columns: sort/filter/group only → `sap.m.ViewSettingsDialog`; show/hide or rearrange columns → `sap.m.p13n.Popup` with only a `sap.m.p13n.SelectionPanel`, registered through `sap.m.p13n.Engine` (ViewSettingsDialog can't rearrange columns; the guideline's Table Personalization Dialog, `sap.m.TablePersoDialog`, is deprecated since 1.115). If a Filter Bar is present, disable the P13n Filter tab (use the Filter Bar instead).
- **Rules:**
 - Tabs can be shown in any combination (Sort, Filter, Columns, Group, Chart) — include only those relevant to the use case.
 - Columns tab: only columns marked visible can be used for grouping.
 - Sort tab: if column-header sort is also enabled, it replaces ALL sort options set in the dialog.
 - New P13n panels from SmartTable (Columns, Sort, Group) are available for freestyle development.
- **Gotchas:** `sap.m.p13n.Popup` is opened from toolbar actions — it is not self-opening. When falling back to `sap.m.ViewSettingsDialog` for simpler cases, read and write selected filters with `getSelectedFilterCompoundKeys` / `setSelectedFilterCompoundKeys` — `getSelectedFilterKeys` / `setSelectedFilterKeys` are **deprecated since 1.42** and cannot represent two filter items with the same key.

---

## VariantManagement

- **OpenUI5 / SAPUI5:** `sap.m.VariantManagement` / `sap.ui.fl.variants.VariantManagement`
- **Use when:** Users need to save, load, and switch between named sets of table/filter-bar settings (column layout, sort, filter, group).
- **Do NOT use when:** No personalization persistence is needed; only a static title is required.
- **Rules:**
 - In tables: VariantManagement replaces the table title — do not show both unless unavoidable.
 - In Filter Bars: VariantManagement stores filter values, visible filters, and filter order — this is the "Views" selector at the top of the Filter Bar.
 - Use `sap.ui.fl.variants.VariantManagement` for SAPUI5 Flexibility-backed persistence (recommended for Fiori Elements and freestyle apps with key user adaptation support).
- **Gotchas:** `sap.ui.fl.variants.VariantManagement` requires flexibility services — in pure OpenUI5 apps without flexibility, variant persistence must be custom-built or omitted. The guideline page still names `sap.ui.comp.variants.VariantManagement` — that class is **deprecated since 1.120** (SAPUI5-only); use `sap.m.VariantManagement`.

---

## ValueHelpDialog {#valuehelpdiag}

- **SAPUI5:** `sap.ui.comp.valuehelpdialog.ValueHelpDialog` (V2) · **OpenUI5 / SAPUI5:** `sap.ui.mdc.ValueHelp` (V4)
- **Use when:** Users need to select single or multiple values from a complex source (search + table + token management in one dialog) — especially for filter fields with large data sets.
- **Do NOT use when:** The list is short and fixed → use Select or ComboBox; for date selection → use DatePicker; for free text → use Input with suggestions. Value Help is a last resort — choose simpler controls first.
- **Rules:**
 - In Fiori Elements (V4), Value Help is driven by `@sap.ui.mdc.ValueHelp` annotations — do not hand-build a ValueHelpDialog in Elements apps.
 - Use `sap.ui.mdc.ValueHelp` for all new V4/MDC freestyle apps; `sap.ui.comp.valuehelpdialog.ValueHelpDialog` is V2/legacy.
 - Always enable the search field inside the dialog when the data source is large.
- **Gotchas:** The Value Help Dialog is also related to the Filter Bar's "Adapt Filters" flow when using SmartFilterBar — do not confuse the two entry points.
