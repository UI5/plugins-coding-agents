# sap.ui.comp.smartmultiinput.SmartMultiInput

API: https://ui5.sap.com/#/api/sap.ui.comp.smartmultiinput.SmartMultiInput

## Overview

SmartMultiInput extends SmartField for multi-value scenarios. It renders MultiInput or MultiComboBox based on annotations, supporting token-based entry with value help and range conditions.

## Key properties

| Property               | Purpose                                                                      |
| ---------------------- | ---------------------------------------------------------------------------- |
| `supportMultiSelect`   | Enables multiple selection in value help dialog (default: `true`).           |
| `supportRanges`        | Enables range conditions in value help (only works without binding context). |
| `singleTokenMode`      | Allows only one token (only in no-binding-context scenario).                 |
| `enableODataSelect`    | Enables `$select` optimization for value help requests.                      |
| `requestAtLeastFields` | Comma-separated fields to always include in `$select`.                       |

## Required annotations

A `@Common.ValueList` annotation on the bound property is mandatory for type-ahead and value help to work. Same annotation format as SmartField.

## Usage with navigation property binding

```xml
<smartMultiInput:SmartMultiInput id="categories"
    value="{Categories/CategoryId}"
    supportMultiSelect="true"/>
```

## Usage without binding context

```xml
<smartMultiInput:SmartMultiInput id="categories"
    entitySet="Categories" value="{CategoryId}"
    supportMultiSelect="true" supportRanges="true"/>
```

## Key events

| Event             | Purpose                                                                                     |
| ----------------- | ------------------------------------------------------------------------------------------- |
| `tokenUpdate`     | Fired when tokens are added or removed. Parameters: `type`, `addedTokens`, `removedTokens`. |
| `selectionChange` | Fired for selection changes on fixed-value controls (MultiComboBox).                        |

## Public API methods

| Method                 | Purpose                             |
| ---------------------- | ----------------------------------- |
| `getTokens()`          | Retrieve currently selected tokens. |
| `setFilterData(oData)` | Set values programmatically.        |

## Troubleshooting

- Type-ahead not working: missing `ValueList` annotation. Verify target: `{Namespace}.{Entity}/{Property}`.
- `supportRanges` has no effect: only works without binding context (use `entitySet` property instead of context binding).
- Tokens not persisting: verify navigation property binding is correct and model supports create/delete operations.
- `singleTokenMode` ignored: only works in no-binding-context scenario (when `entitySet` is specified directly).
- Cannot set tokens programmatically: use `setFilterData()` API, not direct `setValue()` or `setTokens()`.
