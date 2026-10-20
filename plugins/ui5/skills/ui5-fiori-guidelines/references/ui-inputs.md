# UI Inputs

## Contents
- [Input](#input)
- [TextArea](#textarea)
- [Select](#select)
- [ComboBox](#combobox)
- [MultiComboBox](#multicombobox)
- [MultiInput](#multiinput)
- [RadioButton](#radiobutton)
- [CheckBox](#checkbox)
- [Switch](#switch)
- [DatePicker](#datepicker)
- [DateRangeSelection](#daterangeselection)
- [DateTimePicker](#datetimepicker)
- [TimePicker](#timepicker)
- [StepInput](#stepinput)
- [SearchField](#searchfield)
- [Slider](#slider)
- [RangeSlider](#rangeslider)
- [Filter Bar](#filter-bar)
- [ValueHelpDialog](#valuhelpdialog)

---

## Input / Text Field

- **SAPUI5:** `sap.m.Input`  **Web Component:** `ui5-input` (`@ui5/webcomponents`)
- **Use when:** Single-line free text, numeric, email, URL, phone, or password entry; or selecting from a large dataset (>200 items) with suggestions + value help.
- **Do NOT use when:** Entering a date → `ui5-date-picker`. Entering long text → `ui5-textarea`. Picking from a short fixed list → `ui5-select`. Picking one item from 20–200 options → `ui5-combobox`. Multiple values → `ui5-multi-input`.
- **Rules:**
  - Always pair with a visible `Label` — do not rely on placeholder as the only label.
  - Set `showSuggestions` + populate suggestion slot to enable type-ahead; suggestions are not automatic.
  - Value help icon is triggered via `showValueHelp` property (WC: `show-value-help-icon` on `ui5-multi-input`); handle the `value-help-trigger` event to open the dialog.
  - `type="Search"` on `ui5-input` enables WC-only search mode — no SAPUI5 equivalent; use `sap.m.SearchField` in SAPUI5 instead.
- **Gotchas:** Tabular suggestions are SAPUI5-only. The WC `ui5-input` does not auto-validate — apps must handle `valueState` themselves.

---

## TextArea / Multi-line Input

- **SAPUI5:** `sap.m.TextArea`  **Web Component:** `ui5-textarea` (`@ui5/webcomponents`)
- **Use when:** Multi-line text input — descriptions, comments, notes.
- **Do NOT use when:** Single-line entry → `ui5-input`. Structured data (date, number with step) → use the dedicated picker.
- **Rules:**
  - Set `growing` to let the field auto-expand with content; pair with `growing-max-rows` to cap height.
  - Set `maxlength` + `show-exceeded-text` to display a character counter and allow controlled overflow.
  - Always use a `Label` above or beside the control — do not use placeholder alone.
- **Gotchas:** `rows` defines initial height but CSS `height` overrides it. `growing` and a fixed CSS `height` conflict — pick one.

---

## Select / Dropdown

- **SAPUI5:** `sap.m.Select`  **Web Component:** `ui5-select` (`@ui5/webcomponents`)
- **Use when:** User picks exactly one item from a short, fixed list (~2–12 options) that stays hidden until opened.
- **Do NOT use when:** Only two binary options → `ui5-switch`. More than ~12 options or the list can be typed → `ui5-combobox`. All options should be visible at once → RadioButton group. Multi-attribute search → Input + value help.
- **Rules:**
  - Always define a default selection; use "(Not Selected)" text — never a blank value — for the empty option.
  - Use `ui5-option` children inside `ui5-select`; use `ui5-option-custom` for custom content.
  - Sort options logically — most common first; alphabetical for >8 options.
  - Avoid icon-only options in the list; use icons only when they add recognition.
- **Gotchas:** On smartphones `ui5-select` opens full-screen. The dropdown max width is 600px; use `wrapItemsText` / `wrap-items-text` to prevent truncation for long entries.

---

## ComboBox / Type-ahead Select

- **SAPUI5:** `sap.m.ComboBox`  **Web Component:** `ui5-combobox` (`@ui5/webcomponents`)
- **Use when:** Picking one item from a long list (20–200 items) where type-ahead filtering speeds selection, or when free-text entry alongside suggestions is needed.
- **Do NOT use when:** Short fixed list (~2–12) → `ui5-select`. Very large dataset (>200) or multi-attribute search → Input + value help. Multiple selections → `ui5-multi-combobox`.
- **Rules:**
  - Use `ui5-cb-item` children; set `value` on each item when you need an identifier separate from display text, then read `selectedValue` on the combo.
  - Default `filter="StartsWithPerTerm"` — change to `"Contains"` for substring matching.
  - `show-clear-icon` lets users reset the field without reopening the list.
- **Gotchas:** The WC distinguishes `value` (display text / typed text) from `selected-value` (the item's key). Mixing `selectedValue` with the deprecated `selected` property on items causes unpredictable behavior.

---

## MultiComboBox / Multi-select with Filtering

- **SAPUI5:** `sap.m.MultiComboBox`  **Web Component:** `ui5-multi-combobox` (`@ui5/webcomponents`)
- **Use when:** Selecting multiple items from a list (< ~200) where type-ahead filtering and tokenized selection are needed.
- **Do NOT use when:** Single selection → `ui5-combobox`. Tokens from a very large or complex dataset → `ui5-multi-input` + value help. No filtering needed and list is short → CheckBox group.
- **Rules:**
  - Use `ui5-mcb-item` children; set `value` on each item; use `selected-values` array to programmatically select items.
  - `show-select-all` adds a "Select All" checkbox at the top — use only when batch selection is a primary workflow.
  - `no-validation` allows free-text tokens not matching any item.
- **Gotchas:** The deprecated `selected` property on individual items conflicts with `selected-values` — use only one mechanism.

---

## MultiInput / Token Entry Field

- **SAPUI5:** `sap.m.MultiInput`  **Web Component:** `ui5-multi-input` (`@ui5/webcomponents`)
- **Use when:** Entering multiple free-text or suggestion-based values that appear as dismissible tokens; typically combined with a value help for large datasets (>200 items).
- **Do NOT use when:** Picking multiple items from a managed list < ~200 → `ui5-multi-combobox`. Single value only → `ui5-input` or `ui5-combobox`.
- **Rules:**
  - Tokens are added via the `tokens` slot; listen to `token-delete` to remove them.
  - Enable `show-suggestions` + populate suggestion slot for type-ahead; enable `show-value-help-icon` to expose the value-help trigger.
  - Listen to `value-help-trigger` to open `sap.m.ValueHelpDialog` or `sap.ui.mdc.ValueHelp`.
- **Gotchas:** `ui5-multi-input` extends `ui5-input` — all Input properties apply. Tokens are not automatically created on Enter; the app must handle `change` or `selection-change` and add token elements to the slot.

---

## RadioButton / Single Selection Visible

- **SAPUI5:** `sap.m.RadioButton` / `sap.m.RadioButtonGroup`  **Web Component:** `ui5-radio-button` (`@ui5/webcomponents`)
- **Use when:** User picks exactly one from a small set of options (≤ ~8) that should all be visible simultaneously without interaction.
- **Do NOT use when:** More than ~8 options or options should stay hidden → `ui5-select` or `ui5-combobox`. Multiple selections allowed → CheckBox group. Immediate on/off toggle → `ui5-switch`.
- **Rules:**
  - Group radio buttons by setting the same `name` attribute — only one per group can be checked.
  - Never use a standalone radio button that cannot be deselected; it will be permanently selected once clicked.
  - Use `value` on each button to identify the selection on form submit.
- **Gotchas:** A `ui5-radio-button` not in a group (`name` unset) cannot be unchecked once checked. In SAPUI5, prefer `sap.m.RadioButtonGroup` to manage selection state automatically.

---

## CheckBox / Confirmed Flag

- **SAPUI5:** `sap.m.CheckBox`  **Web Component:** `ui5-checkbox` (`@ui5/webcomponents`)
- **Use when:** A confirmed-on-save binary flag; selecting any combination from a group of independent options; intermediate/indeterminate state is needed.
- **Do NOT use when:** The change should take immediate effect → `ui5-switch`. Exactly one of several options must be chosen → RadioButton group.
- **Rules:**
  - A CheckBox change takes effect only after the user explicitly saves — this is the semantic contract that distinguishes it from Switch.
  - `indeterminate` state is set programmatically only — it cannot result from direct user interaction.
  - Use the `text` property for the checkbox label; use an external `Label` for the group label.
- **Gotchas:** `display-only` makes the checkbox non-interactive and not in the tab chain — use for review-mode forms. Do not use `disabled` when you mean `readonly`; disabled removes it from accessibility tree.

---

## Switch / Immediate Toggle

- **SAPUI5:** `sap.m.Switch`  **Web Component:** `ui5-switch` (`@ui5/webcomponents`)
- **Use when:** A setting that takes effect immediately on toggle — no save required. Examples: enable notifications, activate dark mode.
- **Do NOT use when:** The change requires confirmation or save → `ui5-checkbox`. Multiple simultaneous selections → CheckBox group. Ambiguous meaning of on/off → `ui5-checkbox` (clearer semantics).
- **Rules:**
  - Always add an external `Label` or set `accessible-name` / `accessible-name-ref` — the switch alone conveys no context.
  - `design="Graphical"` replaces text with icons (green check / red X) — use for semantic on/off states.
  - Keep optional `text-on` / `text-off` to 3 characters maximum; longer strings are cut off.
  - Do not put text inside the switch component — localization causes overflow.
- **Gotchas:** Hover states are not supported on touch devices. Provide a `tooltip` when no label is visible.

---

## DatePicker / Single Date

- **SAPUI5:** `sap.m.DatePicker`  **Web Component:** `ui5-date-picker` (`@ui5/webcomponents`)
- **Use when:** Selecting a single date via calendar popup or typed entry.
- **Do NOT use when:** Date + time needed → DateTimePicker. Date range → DateRangeSelection. Always-visible calendar → `sap.m.Calendar`. Month or year only → use `format-pattern` / `value-format` to configure date picker mode.
- **Rules:**
  - Set `min-date` and `max-date` (ISO `yyyy-MM-dd` format when `format-pattern` is not set) to restrict the selectable range at the source.
  - Use `format-pattern` to set the display format; `value-format` to set the internal storage format.
  - On phones the picker opens full-screen automatically — do not override.
- **Gotchas:** Special dates, custom initial focus, "Today" shortcut button, and footer OK/Cancel are SAPUI5-only. The WC supports `hide-week-numbers` which SAPUI5 does not. The WC `date-value` property returns a JS `Date` object; use `date-value-async` when the component may not yet be fully initialized.

---

## DateRangeSelection / Date Range

- **SAPUI5:** `sap.m.DateRangeSelection`  **Web Component:** none — no `ui5-date-range-picker` exists; use `sap.m.DateRangeSelection` (SAPUI5 only) or compose two `ui5-date-picker` controls in web component apps.
- **Use when:** Selecting a start and end date in a single field.
- **Do NOT use when:** Only a single date → `ui5-date-picker`. Start/end pickers must be independent (different pages/forms) → two separate DatePickers.
- **Rules:**
  - In SAPUI5, `sap.m.DateRangeSelection` extends `sap.m.DatePicker` — all DatePicker rules apply.
  - Use `delimiter` property to configure the separator character displayed between dates.
  - Access `dateValue` for start date and `secondDateValue` for end date.
- **Gotchas:** No `ui5-date-range-picker` web component exists. In WC apps, use two `ui5-date-picker` elements with cross-validation logic.

---

## DateTimePicker / Date and Time

- **SAPUI5:** `sap.m.DateTimePicker`  **Web Component:** none — no `ui5-date-time-picker` exists; use `sap.m.DateTimePicker` (SAPUI5 only) or compose `ui5-date-picker` + `ui5-time-picker` in WC apps.
- **Use when:** Selecting both date and time in a single input field.
- **Do NOT use when:** Date only → `ui5-date-picker`. Time only → `ui5-time-picker`.
- **Rules:**
  - In SAPUI5, popover always includes OK/Cancel buttons — the user must confirm.
  - `minDate`/`maxDate` restrict both date and time range.
  - Timezone display is SAPUI5-only — configure via local or global timezone settings.
- **Gotchas:** No `ui5-date-time-picker` web component exists. Timezone, special dates, and minutes/seconds step configuration are SAPUI5-only features.

---

## TimePicker / Time Only

- **SAPUI5:** `sap.m.TimePicker`  **Web Component:** `ui5-time-picker` (`@ui5/webcomponents`)
- **Use when:** Selecting a time (hours, minutes, seconds) without a date.
- **Do NOT use when:** Date + time → DateTimePicker. Date only → `ui5-date-picker`.
- **Rules:**
  - Configure `format-pattern` (e.g. `HH:mm:ss`) to control display; set `value-format` for the stored value format.
  - Use `min-date` / `max-date` properties (as JS Date) to restrict the time range.
  - `isValid()` method checks the entered value against the current format pattern.
- **Gotchas:** The WC `ui5-time-picker` opens a clock-based picker — not a scroll wheel — on desktop. On mobile it uses a touch-friendly clock.

---

## StepInput / Numeric with Increment/Decrement

- **SAPUI5:** `sap.m.StepInput`  **Web Component:** `ui5-step-input` (`@ui5/webcomponents`)
- **Use when:** Adjusting a numeric quantity by a defined increment — quantities, counts, numeric settings.
- **Do NOT use when:** Free numeric text entry without steps → plain `ui5-input` with `type="Number"`. Date/time input → use the dedicated pickers. Static identifier (ZIP code, phone) → `ui5-input`.
- **Rules:**
  - Set `min` and `max` to bound the range; the increment/decrement buttons auto-disable at bounds.
  - Set `step` (default 1) and `value-precision` (decimal places) to match business requirements.
  - Always label via an external `Label` — `StepInput` has no built-in label.
- **Gotchas:** `value-precision` controls decimal display — if `step` is a float, ensure `value-precision` matches or the displayed value will be rounded unexpectedly.

---

## SearchField / Local Search

- **SAPUI5:** `sap.m.SearchField`  **Web Component:** `ui5-search` (`@ui5/webcomponents-fiori`)
- **Use when:** Filtering or searching a local list, table, or dataset on the current page. Cross-app / shell-level search belongs in the ShellBar search slot.
- **Do NOT use when:** Filtering a table with many attributes → Filter Bar. Product-wide search → ShellBar `searchField` slot + `ui5-search` component.
- **Rules:**
  - `ui5-search` lives in `@ui5/webcomponents-fiori` — import from `@ui5/webcomponents-fiori/dist/Search.js`.
  - Use the `search` event (Enter / Search button) to trigger filtering; use `input` for live filtering.
  - Optionally add scope selection via `scopes` slot and a filter button via `filterButton` slot.
- **Gotchas:** `ui5-search` is the WC equivalent for both `sap.m.SearchField` and the shell search field — the package differs from most input components (`@ui5/webcomponents-fiori` not `@ui5/webcomponents`). Do not use a plain `ui5-input` with `type="Search"` as a drop-in for `sap.m.SearchField` — it lacks the search button and events.

---

## Slider / Single Value Range

- **SAPUI5:** `sap.m.Slider`  **Web Component:** `ui5-slider` (`@ui5/webcomponents`)
- **Use when:** Selecting a single value along a continuous numeric range (volume, brightness, percentage).
- **Do NOT use when:** Selecting a range (min + max) → `ui5-range-slider`. Selecting from a fixed list of categories → RadioButton or Select. Space is very limited on mobile → prefer Input with stepper.
- **Rules:**
  - Set `min`, `max`, and `step` to define the range and snap intervals.
  - Enable `show-tooltip` (`editable-tooltip` recommended for accessibility) to display the current value on the handle.
  - Enable `show-tickmarks` + `label-interval` to show visual step markers and labels.
  - Custom scale labels (non-numeric) are SAPUI5-only.
- **Gotchas:** The WC `ui5-slider` does not support custom scales or descriptive label strings on tick marks (SAPUI5 `sap.m.Slider` only). Always label what the slider controls — the component has no built-in label area.

---

## RangeSlider / Min–Max Range

- **SAPUI5:** `sap.m.RangeSlider`  **Web Component:** `ui5-range-slider` (`@ui5/webcomponents`)
- **Use when:** Selecting a value range (start and end) — price filter, date window, size range.
- **Do NOT use when:** Single value → `ui5-slider`. Exact numeric input preferred → two StepInput fields.
- **Rules:**
  - `start-value` and `end-value` properties hold the two handle positions.
  - Dragging the active track between handles moves the entire range at once.
  - `editable-tooltip` converts the value indicators to inline input fields for precise entry.
  - Custom scales are SAPUI5-only.
- **Gotchas:** The two handles can swap positions when the user drags one past the other — this is intentional. Always account for `startValue > endValue` in your code or normalize after the `change` event.

---

## Filter Bar / Smart Filtering

- **SAPUI5:** `sap.ui.comp.smartfilterbar.SmartFilterBar` (V2) / `sap.ui.mdc.FilterBar` (V4)  **Web Component:** none
- **Use when:** The List Report, Analytical List Page, or Overview Page floorplan needs a collapsible filter area above a table or chart. The Filter Bar binds directly to OData metadata and manages filter state, "Go" / "Adapt Filters" buttons.
- **Do NOT use when:** Object pages, wizards, simple lists, or forms — use a Search Field there. The data source is not OData or there are only 1–3 filters — use individual Input/Select/DatePicker controls.
- **Rules:**
  - In Fiori Elements, SmartFilterBar / FilterBar is annotation-driven (`@UI.SelectionFields`) — do not hand-code filter fields.
  - Filter Bar manages its own state (Basic vs. All filters visibility) — do not re-implement the expand/collapse logic.
  - Always pair with a "Go" button to trigger explicit search; avoid auto-search on every filter change.
  - In freestyle apps, use `sap.ui.mdc.FilterBar` for V4; do not combine SmartFilterBar with V4 services.
- **Gotchas:** No web component equivalent. `sap.ui.comp.smartfilterbar.SmartFilterBar` is SAP-internal (`@sap/ui5-core`); `sap.ui.mdc.FilterBar` is part of the `sap.ui.mdc` library and requires explicit enablement. Both are wrappers — never hand-build their internal structure.

---

## ValueHelpDialog / Complex Value Selection

- **SAPUI5:** `sap.m.ValueHelpDialog` / `sap.ui.mdc.ValueHelp`  **Web Component:** none
- **Use when:** The user needs to search, filter, and select from a large or complex dataset — too large for a ComboBox (>200 items) or requiring multi-attribute search or tabular display.
- **Do NOT use when:** ≤ ~200 items with simple text matching → `ui5-combobox`. Short fixed list → `ui5-select`. Simple single-screen selection → SelectDialog.
- **Rules:**
  - Trigger from an `Input` or `MultiInput` via the value-help icon; open on `value-help-trigger` event.
  - `sap.m.ValueHelpDialog` provides search, filter bar, and table — configure via its API; do not hand-build the dialog content.
  - In V4 Fiori Elements apps, use `sap.ui.mdc.ValueHelp` tied to `FieldHelp` annotations instead.
- **Gotchas:** No `ui5-*` web component equivalent exists. In WC-based apps, compose a `ui5-dialog` with a `ui5-table` + search manually, or use the `sap.ui.mdc.ValueHelp` shell when possible.
