# sap.ui.mdc.MultiValueField

API: https://ui5.sap.com/#/api/sap.ui.mdc.MultiValueField

## Overview

MultiValueField manages a collection of values via an `items` aggregation (unlike Field which holds a single `value`). It requires a delegate to synchronize user interactions back to the items model.

## Difference from Field

| Aspect        | Field                    | MultiValueField                             |
| ------------- | ------------------------ | ------------------------------------------- |
| Value storage | Single `value` property  | `items` aggregation (MultiValueFieldItem[]) |
| Delegate      | Optional (for ValueHelp) | Required (`updateItems` method)             |
| Display       | Text/Input               | Tokenizer/MultiInput                        |
| Use case      | Single value entry       | Multiple tokens/values                      |

## Delegate pattern

```javascript
sap.ui.define(
    ["sap/ui/mdc/field/MultiValueFieldDelegate"],
    function (MultiValueFieldDelegate) {
        const MyDelegate = Object.assign({}, MultiValueFieldDelegate)

        // Called after user interaction to sync conditions back to items
        MyDelegate.updateItems = function (oMultiValueField, aConditions) {
            var oListBinding = oMultiValueField.getBinding("items")
            if (oListBinding) {
                // Remove existing items
                var aContexts = oListBinding.getContexts()
                for (var i = aContexts.length - 1; i >= 0; i--) {
                    oListBinding.getModel().remove(aContexts[i].getPath())
                }
                // Add new items from conditions
                aConditions.forEach(function (oCondition) {
                    oListBinding.create({ value: oCondition.values[0] })
                })
            }
        }

        return MyDelegate
    }
)
```

## MultiValueField usage

```xml
<mdc:MultiValueField id="tagsField"
    delegate="{name: 'my/app/delegate/MultiValueFieldDelegate'}"
    dataType="sap.ui.model.odata.v4.type.String"
    editMode="Editable">
    <mdc:items>
        <mdc:MultiValueFieldItem key="{TagID}" description="{TagName}"/>
    </mdc:items>
</mdc:MultiValueField>
```

With ValueHelp:

```xml
<mdc:MultiValueField id="categoriesField"
    delegate="{name: 'my/app/delegate/MultiValueFieldDelegate'}"
    dataType="sap.ui.model.odata.v4.type.String"
    valueHelp="categoriesVH">
    <mdc:items>
        <mdc:MultiValueFieldItem key="{CategoryID}" description="{CategoryName}"/>
    </mdc:items>
</mdc:MultiValueField>
```

## Key properties

| Property    | Purpose                                 |
| ----------- | --------------------------------------- |
| `delegate`  | Delegate module path (required).        |
| `dataType`  | Data type for value formatting.         |
| `editMode`  | `Display`, `Editable`, `ReadOnly`.      |
| `valueHelp` | Association to ValueHelp for selection. |

## Key aggregation

| Aggregation | Purpose                                                                             |
| ----------- | ----------------------------------------------------------------------------------- |
| `items`     | `MultiValueFieldItem[]` — bindable to model. Each item has `key` and `description`. |

## Key events

| Event    | Purpose                                                           |
| -------- | ----------------------------------------------------------------- |
| `change` | Fired when items change. Parameters: `items`, `valid`, `promise`. |

## Troubleshooting

- Tokens not updating after user interaction: delegate `updateItems` not implemented or not syncing back to model.
- Items binding not working: verify list binding path resolves to a collection in the OData model.
- Cannot add new values: `editMode` must be `"Editable"` and delegate must handle `create` on the list binding.
- ValueHelp selection not reflected: delegate `updateItems` must process the new conditions and update the items aggregation.
