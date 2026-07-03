---
name: ui5-best-practices-mdc
description: |
    UI5 MDC (Model-Driven Controls) best practices and authoritative development guidelines for OData V4 delegate-based controls. Use when the user asks to "create an MDC FilterBar", "implement MDC Chart", "add MDC Field", "use MDC FilterField", "implement ValueHelp", "add MDC Link", "MDC MultiValueField", "sap.ui.mdc", "delegate pattern", "fetchProperties", "OData V4 freestyle controls", "MDC personalization", "p13nMode", "PropertyInfo", "MDC delegate", "FilterBarDelegate", "ChartDelegate", "ValueHelpDelegate", "LinkDelegate", "MDC field not rendering", "MDC chart not binding", "MDC conditions", "Condition.createCondition", "MDC Table delegate", or is writing any UI5 freestyle application using OData V4 with model-driven controls from sap.ui.mdc. Covers: delegate pattern, PropertyInfo structure, mandatory rules, common error patterns, and per-control API reference for FilterBar, Chart, Field, FilterField, ValueHelp, Link, and MultiValueField.

    Keywords: sap.ui.mdc, MDC, FilterBar, Chart, Field, FilterField, ValueHelp, Link, MultiValueField, delegate, fetchProperties, updateBindingInfo, PropertyInfo, OData V4, JSON model, JSONModel, custom delegate, TypeMap, DefaultTypeMap, base delegate, non-OData, addItem, getFilters, p13nMode, autoBindOnInit, conditions, TypeMap, FieldBase, FilterBarBase, ChartDelegate, ValueHelpDelegate, LinkDelegate, FilterBarDelegate, MultiValueFieldDelegate, Condition.createCondition
---

# UI5 MDC Controls Best Practices

Apply these guidelines whenever generating, reviewing, or troubleshooting MDC control code in freestyle applications using OData V4 services.

**UI5 version baseline:** SAPUI5 1.136+ LTS. All features mentioned are available from this version unless noted.

## When to load each reference

| Trigger                                               | Load                                                                                                                     |
| ----------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| Working on or planning a `sap.ui.mdc.FilterBar`       | [`references/mdc-filter-bar.md`](references/mdc-filter-bar.md)                                                           |
| Working on or planning a `sap.ui.mdc.Chart`           | [`references/mdc-chart.md`](references/mdc-chart.md)                                                                     |
| Working on or planning a `sap.ui.mdc.Field`           | [`references/mdc-field.md`](references/mdc-field.md)                                                                     |
| Working on or planning a `sap.ui.mdc.FilterField`     | [`references/mdc-filter-field.md`](references/mdc-filter-field.md)                                                       |
| Working on or planning a `sap.ui.mdc.ValueHelp`       | [`references/mdc-value-help.md`](references/mdc-value-help.md)                                                           |
| Working on or planning a `sap.ui.mdc.Link`            | [`references/mdc-link.md`](references/mdc-link.md)                                                                       |
| Working on or planning a `sap.ui.mdc.MultiValueField` | [`references/mdc-multi-value-field.md`](references/mdc-multi-value-field.md)                                             |
| Using MDC controls with JSON model (non-OData)        | [`references/mdc-json-delegates.md`](references/mdc-json-delegates.md)                                                   |
| Working on or planning a `sap.ui.mdc.Table`           | See `ui5-best-practices-tables` skill, [`references/mdc-table.md`](../ui5-best-practices-tables/references/mdc-table.md) |

Load before producing any output. Do not work from memory.

---

## The Delegate Pattern

All MDC controls use a **delegate** to decouple the control from data-source-specific logic. App developers must:

1. Specify the delegate in XML: `delegate="{name: 'my/app/delegate/MyDelegate', payload: {entitySet: 'Products'}}"`
2. Implement the delegate module extending the appropriate base delegate
3. Override key methods (at minimum `fetchProperties`)

**Base delegates for OData V4:**

| Control         | Base Delegate                              |
| --------------- | ------------------------------------------ |
| Table           | `sap/ui/mdc/odata/v4/TableDelegate`        |
| FilterBar       | `sap/ui/mdc/odata/v4/FilterBarDelegate`    |
| Chart           | `sap/ui/mdc/odata/v4/vizChart/Delegate`    |
| ValueHelp       | `sap/ui/mdc/ValueHelpDelegate`             |
| Link            | `sap/ui/mdc/LinkDelegate`                  |
| MultiValueField | `sap/ui/mdc/field/MultiValueFieldDelegate` |

**JSON model usage:** MDC controls also work with JSON models. Extend the base delegates directly (`sap/ui/mdc/TableDelegate`, `sap/ui/mdc/FilterBarDelegate`) — not the OData V4 variants. See [`references/mdc-json-delegates.md`](references/mdc-json-delegates.md) for details.

**PropertyInfo** — the core metadata format returned by `fetchProperties`:

```javascript
{
    key: "propertyName",        // Unique identifier (required)
    label: "Display Label",     // User-visible label (required)
    dataType: "sap.ui.model.odata.v4.type.String"  // Data type (required)
}
```

---

## Core Rules

### Mandatory

- Every MDC control requires a `delegate` property pointing to a valid module path.
- Implement `fetchProperties` in the delegate returning `PropertyInfo[]` with at minimum: `key`, `label`, `dataType`.
- Extend the appropriate OData V4 base delegate (see table above) for OData V4 services. For JSON/other models, extend the generic base delegate directly.
- Use `p13nMode` to enable personalization (Column, Sort, Filter, Group for Table; Item, Sort, Filter, Type for Chart; Item for FilterBar).
- Use `sap.ui.mdc.condition.Condition.createCondition()` to construct conditions programmatically.
- Use `sap.ui.model.odata.v4.type.*` types in PropertyInfo `dataType` field for OData V4 models. Use `sap.ui.model.type.*` with JSON models. Register types in the TypeMap.
- Set `ariaLabelledBy` on FilterBar and Chart for accessibility.
- Prefer Fiori elements building blocks over freestyle MDC. Use MDC only when Fiori elements is out of scope.
- Use `get_api_reference` MCP tool to verify control APIs. Use `run_ui5_linter` to validate code.

### Prohibitions

- Do not use MDC controls with OData V2 models. Use Smart controls (`sap.ui.comp`) instead. MDC works with OData V4 and JSON models.
- Do not access inner controls directly (e.g., inner `sap.chart.Chart` or `sap.m.Table`). Use the delegate or MDC control's public API.
- Do not omit `key` from PropertyInfo objects (formerly `name`, now deprecated).
- Do not construct condition objects manually as plain JSON. Always use `Condition.createCondition(operator, values)`.
- Do not skip delegate implementation for production code (built-in defaults are for demos only).
- Do not use inline styles or scripts (CSP compliance).
- Do not use global access (`sap.ui.mdc.FilterBar`). Use `sap.ui.define` or ES6 imports.

---

## Selection Matrix

| Control               | Use when                                                           | Do not use when                                                     |
| --------------------- | ------------------------------------------------------------------ | ------------------------------------------------------------------- |
| `MDC FilterBar`       | OData V4 or JSON model, delegate-driven filter UI, MDC Table/Chart | OData V2 (use SmartFilterBar), simple search bar                    |
| `MDC Chart`           | OData V4, delegate-driven chart visualization, drill-down          | OData V2 (use SmartChart), simple static charts, no analytical data |
| `MDC Field`           | OData V4 or JSON, single field with auto-rendering by data type    | OData V2 (use SmartField), purely custom rendering needed           |
| `MDC FilterField`     | Inside MDC FilterBar for individual filter conditions              | Standalone filtering outside FilterBar context                      |
| `MDC ValueHelp`       | OData V4 or JSON, type-ahead + dialog value selection              | OData V2 (use ValueHelpDialog), simple dropdowns without search     |
| `MDC Link`            | OData V4, semantic object navigation, delegate-driven link targets | OData V2 (use SmartLink), simple static links                       |
| `MDC MultiValueField` | OData V4 or JSON, multi-value token entry via items aggregation    | OData V2 (use SmartMultiInput), simple single-value fields          |

---

## Common Errors

| Symptom                               | Cause                                                                             | Fix                                                                                            |
| ------------------------------------- | --------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| "Delegate module could not be loaded" | Wrong path in `delegate` property                                                 | Verify module path matches actual file location in project.                                    |
| Chart shows no data                   | `fetchProperties` returns wrong PropertyInfo (missing `groupable`/`aggregatable`) | Ensure dimensions have `groupable: true`, measures have `aggregatable: true`.                  |
| FilterBar fields not appearing        | PropertyInfo missing or `hiddenFilter: true`                                      | Check delegate `fetchProperties` returns properties with correct visibility.                   |
| Field shows wrong inner control       | `dataType` in PropertyInfo doesn't match expected format                          | Verify `dataType` uses full qualified type name (e.g., `sap.ui.model.odata.v4.type.String`).   |
| Personalization dialog empty          | `p13nMode` not set or PropertyInfo incomplete                                     | Add `p13nMode="Column,Sort,Filter"` and ensure PropertyInfo has `sortable`/`filterable` flags. |
| ValueHelp not opening                 | ValueHelp not connected to Field or containers missing                            | Verify `valueHelp` association on Field and that Popover/Dialog containers are defined.        |
| Conditions not applied to binding     | `updateBindingInfo` not implemented in delegate                                   | Implement `updateBindingInfo` to apply filter conditions to the OData binding.                 |
| Link always rendered as text          | `fetchLinkType` returns `LinkType.Text` or fails                                  | Implement `fetchLinkType` returning `Popup` or `DirectLink` type.                              |

---

## Performance & Accessibility

### Anti-patterns to avoid

- Loading all PropertyInfo eagerly when only a subset is needed (return minimal set from `fetchProperties`).
- Not implementing `updateBindingInfo` (conditions are never applied to the data binding).
- Skipping `p13nMode` configuration (personalization features are disabled by default).
- Creating large delegate modules (split complex logic into helper modules loaded on demand).
- Using synchronous operations in delegate methods (all delegate methods should return Promises).

### Accessibility checklist

- Set `ariaLabelledBy` on FilterBar referencing a visible title.
- Set `ariaLabelledBy` on Chart referencing a visible title.
- Verify keyboard navigation works for personalization dialogs.
- Test ValueHelp type-ahead and dialog with screen reader.
- Ensure all FilterFields have meaningful labels via PropertyInfo `label`.
