# Implementation Checklist

Use this in **review mode** (see SKILL.md): when the user asks to review, audit, or check a built Fiori app.
Each item is a yes/no check. Report only failing items, grouped by the section headings below, each with
the file, the control, and the fix. Skip sections that do not apply to the code under review.

## Shell and Navigation

- [ ] App header uses `sap.f.ShellBar` — not `sap.m.Bar` or a custom header
- [ ] Left-hand navigation uses `sap.tnt.SideNavigation` (not a List) inside the `sideContent` of `sap.tnt.ToolPage`
- [ ] No `sap.f.SideNavigation` — the class is `sap.tnt.SideNavigation`
- [ ] Master–detail layout uses `sap.f.FlexibleColumnLayout` — not custom CSS columns or `sap.m.SplitApp`
- [ ] FCL layout is driven by the router (`{layout}` route parameter) and `FlexibleColumnLayoutSemanticHelper` — not by `setLayout` calls in controllers
- [ ] FCL column actions (full screen / exit full screen / close) are in the column title's `navigationActions`
- [ ] App-level navigation goes through the router — not `App.to()` / `NavContainer.to()`
- [ ] Exactly one root container (`sap.m.App`, FCL, `SplitApp`, or `ToolPage`) — no nested `sap.m.App`
- [ ] Cross-app navigation uses semantic object / action intents — not raw URLs
- [ ] Back navigation works with the browser back button and shell back arrow
- [ ] `manifest.json` declares `crossNavigation.inbounds` and `outbounds`

## Layout and Floorplan

- [ ] Object detail pages use `sap.uxap.ObjectPageLayout` — not `sap.m.Page`
- [ ] Pages with a collapsible header use `sap.f.DynamicPage` — not `sap.m.Page` with a hand-built header
- [ ] `DynamicPage` `fitContent="true"` only when the content stretches in height (e.g. grid table with auto row count)
- [ ] `DynamicPage` footer (`showFooter`) holds finalizing actions only (Save, Cancel, Submit)
- [ ] List → detail split uses FCL — not nested routes with manual column CSS
- [ ] Wizards use `sap.m.Wizard` — not a sequence of dialogs
- [ ] Tab-based in-page navigation uses `sap.m.IconTabBar` — not `TabContainer`

## Buttons and Actions

- [ ] Exactly one emphasized / primary button per page or dialog
- [ ] Destructive actions (Delete, Discard) are Default or Transparent — never emphasized
- [ ] Header/footer toolbars: secondary `type="Ghost"`, negative path (Cancel) `type="Transparent"`. Content toolbars: most important button `Ghost` (or `Emphasized` if it is the page's only primary action), other secondary `Transparent`, no `Accept`/`Reject`
- [ ] Icon-only buttons have a tooltip and an accessible name
- [ ] Button text is an imperative verb (Save, Edit, Approve) — not "OK", "Yes", "Submit"
- [ ] Page-level actions are in the toolbar or floating footer — not inline in content
- [ ] Overflow actions use an overflow menu — button labels are not truncated

## Forms and Inputs

- [ ] Every input field has a visible label (not placeholder-only)
- [ ] Required fields marked with `*`; convention explained once on the form
- [ ] Date inputs use `sap.m.DatePicker` — not a plain `Input`
- [ ] Short fixed lists (2–12 items) use `Select`; long/dynamic lists use `ComboBox` + value help
- [ ] Immediate-effect toggles use `Switch`; save-confirmed selections use `CheckBox`
- [ ] Form validation uses `valueState` on the control — not manual border color CSS
- [ ] Error messages are associated with their field (`aria-describedby` or control API)

## Tables and Lists

- [ ] Responsive table (`sap.m.Table`) used only for ≤~200 loaded items; no group subtotals needed (footer totals are fine, but not in growing mode)
- [ ] Large datasets use `sap.ui.table.Table` — not responsive table
- [ ] Subtotals and totals use `sap.ui.table.AnalyticalTable` — not responsive table
- [ ] Hierarchical data uses `sap.ui.table.TreeTable` — not grouped AnalyticalTable
- [ ] Table type choice matches the data shape (see `references/ui-lists-tables.md`)
- [ ] Empty table state uses `IllustratedMessage` — not a plain "No data" text

## Messaging

- [ ] Persistent page-level messages use `MessageStrip` — not a Dialog
- [ ] One-time success confirmations use `MessageToast` — not a persistent strip
- [ ] Multiple validation errors use `MessagePopover` — not stacked strips
- [ ] Modal confirmations and errors use `MessageBox` — not a hand-built Dialog
- [ ] MessageToast text fits within 3 seconds of reading (~80 chars)
- [ ] Draft autosave feedback uses `sap.m.DraftIndicator` in the footer — not a MessageToast per save

## Colors and Theming

- [ ] No hard-coded hex colors — all colors use `--sap*` CSS tokens
- [ ] Semantic colors used by meaning: error → `--sapNegativeColor`, warning → `--sapCriticalColor`, etc.
- [ ] Embedded AI uses SAP blue (`--sapBrandColor`) — purple / `--sapAssistant_*` only for Joule
- [ ] Form field validation uses `valueState` — not manual color overrides

## Content Density

- [ ] Density set once at the app root (Cozy / Compact / Condensed)
- [ ] Cozy and Compact not mixed arbitrarily in the same app context
- [ ] Condensed used only in table contexts within a Compact container

## Accessibility

- [ ] Every interactive element has an accessible name (label, `aria-label`, or tooltip)
- [ ] Meaningful `sap.m.Image` controls set `decorative="false"` and `alt` — `alt` alone is ignored because `decorative` defaults to `true`
- [ ] Form fields have an associated `<label>` — placeholder text not used as the only label
- [ ] Heading hierarchy is sequential (H1 → H2 → H3) with no skipped levels
- [ ] Focus indicator is visible on all interactive elements — `outline: none` not used without a replacement
- [ ] Focus is trapped in modal dialogs; on close, focus returns to the trigger element
- [ ] Dynamic content updates use `aria-live` regions
- [ ] App tested with keyboard-only navigation

## AI Features

- [ ] AI Notice shown for every AI-generated output (required under EU AI Act Art. 50)
- [ ] AI icon (`sap-icon://ai`) used on AI entry points — not on non-AI controls
- [ ] No purple or Joule gradient (`--sapAssistant_*`) on embedded AI buttons, icons, or notices
- [ ] At least Level 1 explanation indicator on all AI-generated results
- [ ] Level 2 explanation available when Level 1 indicator is clickable
- [ ] Level 3 explanation is role-gated (not accessible to general users by default)
- [ ] Agentic AI workflows have cancel/pause controls and a human confirmation step before irreversible actions

## Loading and Empty States

- [ ] `BusyIndicator` shown for operations ≥ 1 second; minimum display time 500 ms
- [ ] Placeholder loading (skeleton) used for initial page load of large datasets
- [ ] Empty states use `sap.m.IllustratedMessage` / `sap.m.IllustratedMessage`
- [ ] Empty state includes an actionable button when the user can create or reset

## Fiori Elements (when applicable)

- [ ] Column visibility, criticality, and actions configured via annotations — not controller code
- [ ] Table columns defined in `UI.LineItem` annotation — not added programmatically
- [ ] Field visibility controlled by `UI.Hidden` annotation — not `visible="{=...}"` in XML
- [ ] Object page header facets in `UI.HeaderFacets` — not custom fragments in the header
- [ ] Custom actions registered via `manifest.json` extensions — not added directly to controller

## Data Formatting

- [ ] Dates formatted via SAPUI5 `DateFormat` — not manual string formatting
- [ ] Numbers formatted via SAPUI5 `NumberFormat` with locale-aware separators
- [ ] Currency displayed with ISO code or symbol
- [ ] Units of measurement abbreviated per SI standard with a space before the unit
- [ ] Input values trimmed of leading/trailing whitespace before persistence
