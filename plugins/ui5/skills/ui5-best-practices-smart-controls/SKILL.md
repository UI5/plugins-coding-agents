---
name: ui5-best-practices-smart-controls
description: |
    UI5 smart controls best practices and authoritative development guidelines for OData V2 annotation-driven controls. Use when the user asks to "create a SmartField", "add a SmartForm", "implement SmartFilterBar", "create SmartChart", "add SmartLink navigation", "use SmartMultiInput", "smart control annotations", "OData V2 metadata-driven controls", "sap.ui.comp", "field control annotation", "value help annotations", "ValueList annotation", "smart form layout", "smart filter bar configuration", "chart annotations", "semantic object navigation", "smart link popover", "SmartField edit mode", "SmartField display mode", "SmartFilterBar liveMode", "SmartChart drill-down", "SmartMultiInput tokens", "SmartTable configuration", or is writing any UI5 freestyle application using OData V2 annotation-driven controls from sap.ui.comp. Covers: control selection, mandatory rules, common error patterns, annotation guidance, and per-control API reference for SmartField, SmartForm, SmartFilterBar, SmartChart, SmartLink, and SmartMultiInput.

    Keywords: sap.ui.comp, SmartField, SmartForm, SmartFilterBar, SmartChart, SmartLink, SmartMultiInput, SmartTable, FilterBar, sap.ui.comp.filterbar, ValueHelpDialog, sap.ui.comp.valuehelpdialog, FilterGroupItem, token selection, ranges, conditions tab, OData V2, annotations, UI.LineItem, UI.Chart, ValueList, FieldControl, SemanticObject, entitySet, ControlConfiguration, GroupConfiguration, textArrangement, value help, FilterProvider, initialise event, beforeRebindChart, navigationTargetsObtained
---

# UI5 Smart Controls Best Practices

Apply these guidelines whenever generating, reviewing, or troubleshooting UI5 smart control code in freestyle applications using OData V2 services.

**UI5 version baseline:** SAPUI5 1.136+ LTS. All features mentioned are available from this version unless noted.

## When to load each reference

| Trigger                                                                | Load                                                                                                                         |
| ---------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| Working on or planning a `sap.ui.comp.smartfield.SmartField`           | [`references/smart-field.md`](references/smart-field.md)                                                                     |
| Working on or planning a `sap.ui.comp.smartform.SmartForm`             | [`references/smart-form.md`](references/smart-form.md)                                                                       |
| Working on or planning a `sap.ui.comp.smartfilterbar.SmartFilterBar`   | [`references/smart-filter-bar.md`](references/smart-filter-bar.md)                                                           |
| Working on or planning a `sap.ui.comp.smartchart.SmartChart`           | [`references/smart-chart.md`](references/smart-chart.md)                                                                     |
| Working on or planning a `sap.ui.comp.navpopover.SmartLink`            | [`references/smart-link.md`](references/smart-link.md)                                                                       |
| Working on or planning a `sap.ui.comp.smartmultiinput.SmartMultiInput` | [`references/smart-multi-input.md`](references/smart-multi-input.md)                                                         |
| Working on or planning a `sap.ui.comp.filterbar.FilterBar`             | [`references/filter-bar.md`](references/filter-bar.md)                                                                       |
| Working on or planning a `sap.ui.comp.valuehelpdialog.ValueHelpDialog` | [`references/value-help-dialog.md`](references/value-help-dialog.md)                                                         |
| Working on or planning a `sap.ui.comp.smarttable.SmartTable`           | See `ui5-best-practices-tables` skill, [`references/smart-table.md`](../ui5-best-practices-tables/references/smart-table.md) |

Load before producing any output. Do not work from memory.

---

## Core Rules

### Mandatory

- Always specify `entitySet` on Smart controls or ensure the control inherits a binding context that resolves the entity type.
- Use `ControlConfiguration` in XML for SmartFilterBar field overrides (control type, filter type, index). Only `visible`, `label`, and `visibleInAdvancedArea` can be changed at runtime.
- Use the correct hierarchy: `SmartForm > Group > GroupElement > SmartField`. Never place SmartFields directly in a SmartForm.
- Wait for the `initialise` event before programmatically accessing inner controls (e.g., `getInnerControl()`, `getChart()`).
- Use `sap.ui.model.odata.type.*` types in bindings alongside OData V2 models. Never use `sap.ui.model.type.*` with OData V2.
- Set `ariaLabelledBy` on SmartFilterBar and SmartChart referencing a visible title for accessibility.
- Use `check()` on SmartForm for client-side mandatory field validation before submitting data.
- Use `get_api_reference` MCP tool to verify control APIs. Use `run_ui5_linter` to validate code.

### Prohibitions

- Do not use Smart controls with OData V4 services. Use MDC controls (`sap.ui.mdc`) instead.
- Do not set custom formatters on SmartField `value` property. SmartField manages its own rendering based on metadata. Use annotations to influence behavior.
- Do not use composite binding syntax (`parts: [...]`) on SmartField. It manages its own composite bindings for unit/currency fields.
- Do not call `getChart()` synchronously during initialization. Use the `initialise` event or `getChartAsync()`.
- Do not directly modify inner controls of SmartChart or SmartTable (e.g., the inner `sap.chart.Chart`). Use the smart control's public API.
- Do not hardcode field labels. Use `sap:label` or `@Common.Label` annotations in OData metadata.
- Do not use inline styles or scripts in HTML (CSP compliance).
- Do not use global access (`sap.ui.comp.smartfield.SmartField`). Use `sap.ui.define` or ES6 imports.

---

## Selection Matrix

| Control           | Use when                                                                           | Do not use when                                                                   |
| ----------------- | ---------------------------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| `SmartField`      | OData V2, single property display/edit, auto-rendering by Edm type and annotations | OData V4, JSON models, custom rendering required, composite/multi-property fields |
| `SmartForm`       | OData V2, entity editing with multiple SmartFields, auto-labels from annotations   | OData V4, complex custom layouts, non-OData data                                  |
| `SmartFilterBar`  | OData V2, annotation-driven filter UI, integration with SmartTable/SmartChart      | OData V4 (use MDC FilterBar), JSON-only, purely custom filter logic               |
| `SmartChart`      | OData V2, annotation-driven chart visualization, drill-down, variant management    | OData V4 (use MDC Chart), non-analytical data, custom chart JS                    |
| `SmartLink`       | OData V2, semantic object navigation, cross-app navigation via FLP                 | OData V4 (use MDC Link), simple static links, no FLP available                    |
| `SmartMultiInput` | OData V2, multi-value entry with tokens, value help with ranges                    | OData V4, simple single-value input, JSON-only                                    |
| `FilterBar`       | Manual filter UI without OData annotations, inside ValueHelpDialog, custom filters | OData V2 with annotations (use SmartFilterBar), OData V4 (use MDC FilterBar)      |
| `ValueHelpDialog` | Complex value selection with table + conditions tabs, token-based multi-select     | Simple dropdowns, single-value selection, OData V4 (use MDC ValueHelp)            |

---

## Common Errors

| Symptom                                        | Cause                                                       | Fix                                                                 |
| ---------------------------------------------- | ----------------------------------------------------------- | ------------------------------------------------------------------- |
| SmartField renders as plain text in edit mode  | Missing binding context or wrong `entitySet`                | Verify `value="{PropertyName}"` and entity context resolution.      |
| SmartField shows Input instead of DatePicker   | Missing `sap:display-format="Date"` on property             | Add annotation or use `controlType` in ControlConfiguration.        |
| SmartForm labels missing                       | `sap:label` annotation not set in OData metadata            | Add `sap:label` to property or set `label` on GroupElement.         |
| SmartFilterBar type-ahead not working          | Missing `ValueList` annotation with correct target path     | Verify target: `{Namespace}.{EntityName}/{FieldName}`.              |
| SmartFilterBar default values ignored          | Setting ControlConfiguration dynamically after `initialise` | Set values statically in XML or use `setFilterData()` API.          |
| SmartChart height is 0 / not visible           | Container does not provide explicit height                  | Set height on parent container (e.g., `height="50vh"`).             |
| SmartChart missing dimensions/measures         | Wrong or missing `UI.Chart` annotation                      | Verify `MeasureAttributes` and `DimensionAttributes` in annotation. |
| SmartLink popover shows "No content available" | No navigation targets for semantic object in FLP            | Verify FLP configuration and user authorizations.                   |
| SmartLink rendered as text (not clickable)     | No `SemanticObject` annotation on property                  | Add `@Common.SemanticObject` annotation to OData property.          |
| SmartMultiInput tokens not persisting          | Missing ValueList or incorrect binding                      | Verify ValueList annotation and navigation property binding.        |

---

## Performance & Accessibility

### Anti-patterns to avoid

- Requesting all value lists eagerly (use lazy loading; value lists load on-demand by default).
- Using `liveMode="true"` on SmartFilterBar with expensive backend queries (causes rapid re-fetching).
- Deep nesting of SmartForm groups (keep hierarchy flat: Form > Group > GroupElement).
- Bypassing SmartChart API to modify inner chart directly (breaks personalization and variant management).
- Not setting `ignoredChartTypes` when certain chart types are irrelevant (unnecessary UI options).

### Accessibility checklist

- Set `ariaLabelledBy` on SmartFilterBar referencing a visible title.
- Set `ariaLabelledBy` on SmartChart referencing a visible title.
- SmartForm automatically propagates labels to SmartFields via annotations.
- Verify keyboard navigation works for SmartFilterBar "Adapt Filters" dialog.
- Test SmartLink popover with screen reader (navigation targets must be announced).
