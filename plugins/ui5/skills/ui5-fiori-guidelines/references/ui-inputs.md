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
- [MaskInput](#maskinput)
- [SearchField](#searchfield)
- [Slider](#slider)
- [RangeSlider](#rangeslider)
- [Filter Bar](#filter-bar)
- [FacetFilter](#facetfilter)
- [ValueHelpDialog](#valuhelpdialog)

---

## Input / Text Field

- **OpenUI5 / SAPUI5:** `sap.m.Input`
- **Use when:** Single-line free text, numeric, email, URL, phone, or password entry; or selecting from a large dataset (>200 items) with suggestions + value help.
- **Do NOT use when:** Entering a date → `sap.m.DatePicker`. Entering long text → `sap.m.TextArea`. Picking from a short fixed list → `sap.m.Select`. Picking one item from 13–200 options → `sap.m.ComboBox`. Multiple values → `sap.m.MultiInput`.
- **Rules:**
 - Always pair with a visible `Label` — do not rely on placeholder as the only label.
 - Set `showSuggestion="true"` and populate the `suggestionItems` aggregation to enable type-ahead; suggestions are not automatic.
 - Show the value help icon with `showValueHelp="true"`; handle the `valueHelpRequest` event to open the dialog.
 - Do not use `sap.m.Input` as a search field — use `sap.m.SearchField` (search button, search event, clear affordance).
- **Gotchas:** Tabular suggestions use `suggestionColumns` / `suggestionRows`. `sap.m.Input` does not auto-validate — apps must handle `valueState` themselves.

---

## TextArea / Multi-line Input

- **OpenUI5 / SAPUI5:** `sap.m.TextArea`
- **Use when:** Multi-line text input — descriptions, comments, notes.
- **Do NOT use when:** Single-line entry → `sap.m.Input`. Structured data (date, number with step) → use the dedicated picker.
- **Rules:**
 - Set `growing` to let the field auto-expand with content; pair with `growingMaxLines` to cap height.
 - Set `maxLength` + `showExceededText` to display a character counter and allow controlled overflow.
 - Always use a `Label` above or beside the control — do not use placeholder alone.
- **Gotchas:** `rows` defines initial height but CSS `height` overrides it. `growing` and a fixed CSS `height` conflict — pick one.

---

## Select / Dropdown

- **OpenUI5 / SAPUI5:** `sap.m.Select`
- **Use when:** User picks exactly one item from a short, fixed list (~2–12 options) that stays hidden until opened.
- **Do NOT use when:** Only two binary options → `sap.m.Switch`. More than ~12 options or the list can be typed → `sap.m.ComboBox`. All options should be visible at once → RadioButton group. Multi-attribute search → Input + value help.
- **Rules:**
 - Always define a default selection; use "(Not Selected)" text — never a blank value — for the empty option.
 - Use `sap.ui.core.Item` children inside `sap.m.Select`; use `sap.ui.core.ListItem` when an item needs an icon or additional text.
 - Sort options logically — most common first; alphabetical for >8 options.
 - Avoid icon-only options in the list; use icons only when they add recognition.
- **Gotchas:** On smartphones `sap.m.Select` opens full-screen. The dropdown max width is 600px; use `wrapItemsText` to prevent truncation for long entries.

---

## ComboBox / Type-ahead Select

- **OpenUI5 / SAPUI5:** `sap.m.ComboBox`
- **Use when:** Picking one item from a long list (13–200 items) where type-ahead filtering speeds selection, or when free-text entry alongside suggestions is needed.
- **Do NOT use when:** Short fixed list (~2–12) → `sap.m.Select`. Very large dataset (>200) or multi-attribute search → Input + value help. Multiple selections → `sap.m.MultiComboBox`.
- **Rules:**
 - Use `sap.ui.core.Item` children with a `key` on each item; read the selection via `selectedKey`.
 - Default filtering matches the start of each word — use `setFilterFunction` for substring or custom matching.
 - `showClearIcon` lets users reset the field without reopening the list.
- **Gotchas:** `value` is the displayed / typed text; `selectedKey` is the key of the selected item. Typed text that matches no item leaves `selectedKey` empty — validate on `change`.

---

## MultiComboBox / Multi-select with Filtering

- **OpenUI5 / SAPUI5:** `sap.m.MultiComboBox`
- **Use when:** Selecting multiple items from a list (< ~200) where type-ahead filtering and tokenized selection are needed.
- **Do NOT use when:** Single selection → `sap.m.ComboBox`. Tokens from a very large or complex dataset → `sap.m.MultiInput` + value help. No filtering needed and list is short → CheckBox group.
- **Rules:**
 - Use `sap.ui.core.Item` children with a `key` on each item; use `selectedKeys` to select items programmatically.
 - `showSelectAll` adds a "Select All" checkbox at the top — use only when batch selection is a primary workflow.
 - MultiComboBox only accepts values from its items — for free-text tokens use `sap.m.MultiInput`.
- **Gotchas:** Bind either `selectedKeys` or `selectedItems`, not both — the two mechanisms conflict.

---

## MultiInput / Token Entry Field

- **OpenUI5 / SAPUI5:** `sap.m.MultiInput`
- **Use when:** Entering multiple free-text or suggestion-based values that appear as dismissible tokens; typically combined with a value help for large datasets (>200 items).
- **Do NOT use when:** Picking multiple items from a managed list < ~200 → `sap.m.MultiComboBox`. Single value only → `sap.m.Input` or `sap.m.ComboBox`.
- **Rules:**
 - Tokens live in the `tokens` aggregation (`sap.m.Token` with `key` and `text`); listen to `tokenUpdate` to sync removed and added tokens with the model.
 - Populate `suggestionItems` for type-ahead (`showSuggestion` is `true` by default on MultiInput); set `showValueHelp="true"` to show the value help icon.
 - Handle `valueHelpRequest` to open the value help (`sap.ui.mdc.ValueHelp`, `sap.ui.comp.valuehelpdialog.ValueHelpDialog`, or `sap.m.SelectDialog`).
- **Gotchas:** `sap.m.MultiInput` extends `sap.m.Input` — all Input properties apply. Typed text does not become a token on Enter unless a validator is registered with `addValidator()` (or the app creates the token in `submit`).

---

## RadioButton / Single Selection Visible

- **OpenUI5 / SAPUI5:** `sap.m.RadioButton` / `sap.m.RadioButtonGroup`
- **Use when:** User picks exactly one from a small set of options (≤ ~8) that should all be visible simultaneously without interaction.
- **Do NOT use when:** More than ~8 options or options should stay hidden → `sap.m.Select` or `sap.m.ComboBox`. Multiple selections allowed → CheckBox group. Immediate on/off toggle → `sap.m.Switch`.
- **Rules:**
 - Prefer `sap.m.RadioButtonGroup` and read the choice via `selectedIndex`; for loose buttons, give them the same `groupName` — only one per group can be selected.
 - Never use a standalone radio button; once selected, the user cannot deselect it.
- **Gotchas:** A `sap.m.RadioButton` outside a group cannot be deselected once selected. `RadioButtonGroup` selects the first button by default — set `selectedIndex="-1"` only when "no selection" is a valid state.

---

## CheckBox / Confirmed Flag

- **OpenUI5 / SAPUI5:** `sap.m.CheckBox`
- **Use when:** A confirmed-on-save binary flag; selecting any combination from a group of independent options; a partially-selected (tri-state) parent is needed.
- **Do NOT use when:** The change should take immediate effect → `sap.m.Switch`. Exactly one of several options must be chosen → RadioButton group.
- **Rules:**
 - A CheckBox change takes effect only after the user explicitly saves — this is the semantic contract that distinguishes it from Switch.
 - Tri-state: set `partiallySelected="true"` together with `selected="true"` (there is no `indeterminate` property). It is visual only and set programmatically — users cannot reach it by clicking.
 - Use the `text` property for the checkbox label; use an external `Label` for the group label.
- **Gotchas:** `displayOnly="true"` makes the checkbox non-interactive and removes it from the tab chain — use for review-mode forms. Do not use `enabled="false"` when you mean read-only; use `editable="false"` or `displayOnly`.

---

## Switch / Immediate Toggle

- **OpenUI5 / SAPUI5:** `sap.m.Switch`
- **Use when:** A setting that takes effect immediately on toggle — no save required. Examples: enable notifications, activate dark mode.
- **Do NOT use when:** The change requires confirmation or save → `sap.m.CheckBox`. Multiple simultaneous selections → CheckBox group. Ambiguous meaning of on/off → `sap.m.CheckBox` (clearer semantics).
- **Rules:**
 - Bind the boolean `state` property to the model (on/off); listen to `change` for the toggled value.
 - Always add an external `Label` (`labelFor`) or set `ariaLabelledBy` — the switch alone conveys no context.
 - `type="AcceptReject"` replaces text with icons (green check / red X) — use for semantic accept/reject states.
 - Avoid text inside the switch (`customTextOn` / `customTextOff`) — it causes localization issues. If the label doesn't explain what on/off means, put a short `sap.m.Text` or `sap.m.ObjectStatus` next to the switch instead.
- **Gotchas:** Hover states are not supported on touch devices. Provide a `tooltip` when no label is visible.

---

## DatePicker / Single Date

- **OpenUI5 / SAPUI5:** `sap.m.DatePicker`
- **Use when:** Selecting a single date via calendar popup or typed entry.
- **Do NOT use when:** Date + time needed → DateTimePicker. Date range → DateRangeSelection. Always-visible calendar → `sap.ui.unified.Calendar`. Month or year only → set `displayFormat` (e.g. `MM/yyyy` or `yyyy`) so the picker opens in month or year mode.
- **Rules:**
 - Set `minDate` and `maxDate` (JavaScript `Date` objects) to restrict the selectable range at the source.
 - Use `displayFormat` to set the display format and `valueFormat` to set the format of the bound `value`.
 - On phones the picker opens full-screen automatically — do not override.
- **Gotchas:** Special dates, custom initial focus, and footer OK/Cancel depend on the UI5 version — check the control API for your UI5 version. Always bind dates through the control API (`value` / binding) so parsing and validation stay locale-aware.

---

## DateRangeSelection / Date Range

- **OpenUI5 / SAPUI5:** `sap.m.DateRangeSelection`
- **Use when:** Selecting a start and end date in a single field.
- **Do NOT use when:** Only a single date → `sap.m.DatePicker`. Start/end pickers must be independent (different pages/forms) → two separate DatePickers.
- **Rules:**
 - In SAPUI5, `sap.m.DateRangeSelection` extends `sap.m.DatePicker` — all DatePicker rules apply.
 - Use `delimiter` property to configure the separator character displayed between dates.
 - Access `dateValue` for start date and `secondDateValue` for end date.
- **Gotchas:** Prefer `sap.m.DateRangeSelection` when a single control is needed; for independent start/end on separate forms, use two `sap.m.DatePicker` fields with cross-validation.

---

## DateTimePicker / Date and Time

- **OpenUI5 / SAPUI5:** `sap.m.DateTimePicker`
- **Use when:** Selecting both date and time in a single input field.
- **Do NOT use when:** Date only → `sap.m.DatePicker`. Time only → `sap.m.TimePicker`.
- **Rules:**
 - In SAPUI5, popover always includes OK/Cancel buttons — the user must confirm.
 - `minDate`/`maxDate` restrict both date and time range.
 - Timezone display: configure via local or global timezone settings.
- **Gotchas:** `sap.m.DateTimePicker` is **OpenUI5 / SAPUI5**. Timezone display, special dates, and minutes/seconds step configuration depend on the UI5 version — check the API reference.

---

## TimePicker / Time Only

- **OpenUI5 / SAPUI5:** `sap.m.TimePicker`
- **Use when:** Selecting a time (hours, minutes, seconds) without a date.
- **Do NOT use when:** Date + time → DateTimePicker. Date only → `sap.m.DatePicker`.
- **Rules:**
 - Configure `displayFormat` (e.g. `HH:mm:ss`) to control display; set `valueFormat` for the bound value format.
 - Use `minutesStep` / `secondsStep` to restrict selectable intervals.
- **Gotchas:** The SAPUI5 `sap.m.TimePicker` opens a clock-based picker — not a scroll wheel — on desktop. On mobile it uses a touch-friendly clock.

---

## StepInput / Numeric with Increment/Decrement

- **OpenUI5 / SAPUI5:** `sap.m.StepInput`
- **Use when:** Adjusting a numeric quantity by a defined increment — quantities, counts, numeric settings.
- **Do NOT use when:** Free numeric text entry without steps → plain `sap.m.Input` with `type="Number"`. Date/time input → use the dedicated pickers. Static identifier (ZIP code, phone) → `sap.m.Input`.
- **Rules:**
 - Set `min` and `max` to bound the range; the increment/decrement buttons auto-disable at bounds.
 - Set `step` (default 1) and `displayValuePrecision` (decimal places) to match business requirements.
 - Set `validationMode` (`sap.m.StepInputValidationMode`: `FocusOut` default, or `LiveChange`) to choose when the value is validated and the `change` event fires.
 - Always label via an external `Label` — `StepInput` has no built-in label.
- **Gotchas:** `displayValuePrecision` controls decimal display — if `step` is a float, ensure `displayValuePrecision` matches or the displayed value will be rounded unexpectedly.

---

## MaskInput / Fixed-format Entry

- **OpenUI5 / SAPUI5:** `sap.m.MaskInput`
- **Use when:** Entry must follow a fixed character pattern — license plate, serial number, IBAN block, product code — where each position accepts only certain characters.
- **Do NOT use when:** Free text → `sap.m.Input`. Date/time → the dedicated pickers (they already mask and parse locale-aware). Numeric quantity with steps → `sap.m.StepInput`.
- **Rules:**
 - Define the pattern in `mask`: each mask character that matches a rule's symbol is an editable slot; characters with no matching rule are fixed literals. Built-in rules: `a` = letter `[A-Za-z]`, `9` = digit `[0-9]` (e.g. `"aa-9999"`); prepend the caret `^` to treat a rule symbol as a literal.
 - Add other character classes with `sap.m.MaskInputRule` in the `rules` aggregation (each sets a `maskFormatSymbol` and a `regex`). A new rule without properties defaults to symbol `*` with `[a-zA-Z0-9]`.
 - Set `placeholderSymbol` (single character, default `_`) to show the unfilled positions; do not add a rule for the placeholder symbol itself.
 - Always pair with a `Label`; a mask is not a substitute for a label.
- **Gotchas:** `sap.m.MaskInput` extends `sap.m.InputBase`, not `sap.m.Input` — it has no suggestions or value help. The `value` includes only the typed characters, not the placeholder symbols.

---

- **OpenUI5 / SAPUI5:** `sap.m.SearchField`
- **Use when:** Filtering or searching a local list, table, or dataset on the current page. Cross-app / shell-level search belongs in the ShellBar.
- **Do NOT use when:** Filtering a table with many attributes → Filter Bar. Product-wide search → `sap.f.ShellBar` with a `sap.f.SearchManager` in its `searchManager` aggregation.
- **Rules:**
 - Implement live search (`liveChange`) whenever possible. Use manual search (`search` event: Enter / search icon) only when the data volume would cause performance issues.
 - Set `enableSuggestions="true"` and handle `suggest` only when suggestions add value.
- **Gotchas:** Do not use a plain `sap.m.Input` with `type="Search"` as a drop-in for `sap.m.SearchField` — it lacks the search icon, clear affordance, and `search` event.

---

## Slider / Single Value Range

- **OpenUI5 / SAPUI5:** `sap.m.Slider`
- **Use when:** Selecting a single value along a continuous numeric range (volume, brightness, percentage).
- **Do NOT use when:** Selecting a range (min + max) → `sap.m.RangeSlider`. Selecting from a fixed list of categories → RadioButton or Select. Space is very limited on mobile → prefer Input with stepper.
- **Rules:**
 - Set `min`, `max`, and `step` to define the range and snap intervals.
 - Enable `showAdvancedTooltip` (with `inputsAsTooltips` for precise entry) to display the current value on the handle.
 - Enable `enableTickmarks` and use a `sap.m.ResponsiveScale` in the `scale` aggregation to show step markers and labels.
 - For non-numeric tick labels, provide a custom `scale` (`sap.m.IScale`).
- **Gotchas:** Always label what the slider controls — the component has no built-in label area.

---

## RangeSlider / Min–Max Range

- **OpenUI5 / SAPUI5:** `sap.m.RangeSlider`
- **Use when:** Selecting a value range (start and end) — price filter, date window, size range.
- **Do NOT use when:** Single value → `sap.m.Slider`. Exact numeric input preferred → two StepInput fields.
- **Rules:**
 - The `range` property (or `value` / `value2`) holds the two handle positions.
 - Dragging the active track between handles moves the entire range at once.
 - `showAdvancedTooltip` with `inputsAsTooltips` turns the value indicators into inline input fields for precise entry.
 - Custom tick labels use the same `scale` aggregation as `sap.m.Slider`.
- **Gotchas:** The two handles can swap positions when the user drags one past the other — this is intentional. Always account for `range[0] > range[1]` in your code or normalize after the `change` event.

---

## Filter Bar / Smart Filtering

- **SAPUI5:** `sap.ui.comp.smartfilterbar.SmartFilterBar` (V2) · **OpenUI5 / SAPUI5:** `sap.ui.mdc.FilterBar` (V4)
- **Use when:** The List Report, Analytical List Page, or Overview Page floorplan needs a collapsible filter area above a table or chart. The Filter Bar binds directly to OData metadata and manages filter state, "Go" / "Adapt Filters" buttons.
- **Do NOT use when:** A table in an object page section → the filter in `sap.m.ViewSettingsDialog`. A wizard. A simple list → `sap.m.SearchField`. The data source is not OData or there are only 1–3 filters — use individual Input/Select/DatePicker controls.
- **Rules:**
 - In Fiori Elements, SmartFilterBar / FilterBar is annotation-driven (`@UI.SelectionFields`) — do not hand-code filter fields.
 - Filter Bar manages its own state (Basic vs. All filters visibility) — do not re-implement the expand/collapse logic.
 - Use live update mode (results refresh on every filter change, no Go button) whenever possible. Use manual mode (Go button) only when the unfiltered data volume would be excessive or users must enter several filter values before results are useful.
 - In freestyle apps, use `sap.ui.mdc.FilterBar` for V4; do not combine SmartFilterBar with V4 services.
- **Gotchas:** `sap.ui.comp.smartfilterbar.SmartFilterBar` is **SAPUI5**; `sap.ui.mdc.FilterBar` is **OpenUI5 / SAPUI5** (MDC). Both are wrappers — never hand-build their internal structure.

---

## FacetFilter / Faceted List Filtering

- **OpenUI5 / SAPUI5:** `sap.m.FacetFilter` / `sap.m.FacetFilterList` — API-based, no guideline page
- **Use when:** Filtering a result list by a few independent facets (category, status, region) where each facet offers a small-to-medium set of values — a lightweight alternative to a full Filter Bar.
- **Do NOT use when:** A List Report / ALP / OVP floorplan with OData-bound filters → `sap.ui.mdc.FilterBar` / SmartFilterBar. Many attributes or complex value help → Filter Bar. A single search over the list → `sap.m.SearchField`.
- **Rules:**
 - Put one `sap.m.FacetFilterList` per facet in the `lists` aggregation; each list's `key`/`title` identify the facet and its items carry the filterable values.
 - Set `type` (`sap.m.FacetFilterType`): `Simple` (default, facets shown as a bar; desktop and tablet only) or `Light` (compact summary bar that opens a dialog) — phones switch to `Light` automatically; set it on larger screens only when there are many facets.
 - Set each list's selection behavior with `setMode(sap.m.ListMode.MultiSelect | SingleSelectMaster)`; handle `listClose` to apply the selected keys as model filters.
- **Gotchas:** `sap.m.FacetFilterList.multiSelect` is **deprecated since 1.20** — call `setMode()` instead (it accepts only `MultiSelect` and `SingleSelectMaster`; other modes are ignored).

---

## ValueHelpDialog / Complex Value Selection

- **SAPUI5:** `sap.ui.comp.valuehelpdialog.ValueHelpDialog` (V2) · **OpenUI5 / SAPUI5:** `sap.ui.mdc.ValueHelp` (V4)
- **Use when:** More than 1,000 items, or the user must narrow the list down with conditions, ranges, or exclusions (any list size).
- **Do NOT use when:** Up to 200 items → `sap.m.Select` / `sap.m.ComboBox`. 200–1,000 items → Input with suggestions + `sap.m.SelectDialog` (more than 4 attributes per item → `sap.m.TableSelectDialog`).
- **Rules:**
 - Trigger from an `Input` or `MultiInput` via the value-help icon; open on the `valueHelpRequest` event.
 - `sap.ui.comp.valuehelpdialog.ValueHelpDialog` provides search, filter bar, and table — configure via its API; do not hand-build the dialog content.
 - In V4 Fiori Elements apps, use `sap.ui.mdc.ValueHelp` tied to `FieldHelp` annotations instead.
- **Gotchas:** The comp Value Help Dialog is not in OpenUI5 — use `sap.m.SelectDialog` / `sap.m.TableSelectDialog` for simple cases, or `sap.ui.mdc.ValueHelp` (**OpenUI5 / SAPUI5**) when MDC is available.
