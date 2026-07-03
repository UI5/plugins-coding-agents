# sap.ui.mdc.FilterBar

API: https://ui5.sap.com/#/api/sap.ui.mdc.FilterBar

## Delegate pattern

`sap.ui.mdc.FilterBar` uses a delegate for metadata and filter configuration. Extend `sap/ui/mdc/odata/v4/FilterBarDelegate` for OData V4.

Minimal delegate:

```javascript
sap.ui.define(
    ["sap/ui/mdc/odata/v4/FilterBarDelegate"],
    function (FilterBarDelegate) {
        const MyFilterBarDelegate = Object.assign({}, FilterBarDelegate)

        MyFilterBarDelegate.fetchProperties = function (oFilterBar) {
            return Promise.resolve([
                {
                    key: "name",
                    label: "Name",
                    dataType: "sap.ui.model.odata.v4.type.String",
                    maxConditions: -1,
                },
                {
                    key: "category",
                    label: "Category",
                    dataType: "sap.ui.model.odata.v4.type.String",
                    maxConditions: -1,
                },
                {
                    key: "price",
                    label: "Price",
                    dataType: "sap.ui.model.odata.v4.type.Decimal",
                    maxConditions: 1,
                },
            ])
        }

        return MyFilterBarDelegate
    }
)
```

## PropertyInfo for FilterBar

| Field           | Type    | Purpose                                |
| --------------- | ------- | -------------------------------------- |
| `key`           | string  | Unique property identifier (required). |
| `label`         | string  | Display label (required).              |
| `dataType`      | string  | Full type name (required).             |
| `maxConditions` | number  | `-1` = unlimited, `1` = single value.  |
| `hiddenFilter`  | boolean | `true` = not shown in FilterBar UI.    |
| `required`      | boolean | `true` = mandatory filter.             |

## FilterBar usage

```xml
<mdc:FilterBar id="filterBar"
    delegate="{name: 'my/app/delegate/FilterBarDelegate', payload: {entitySet: 'Products'}}"
    p13nMode="Item,Value"
    showClearButton="true">
    <mdc:filterItems>
        <mdc:FilterField propertyKey="name" conditions="{$filters>/conditions/name}"
            label="Name" maxConditions="-1"/>
        <mdc:FilterField propertyKey="category" conditions="{$filters>/conditions/category}"
            label="Category" maxConditions="-1"/>
    </mdc:filterItems>
</mdc:FilterBar>
```

## Connecting to MDC Table or Chart

Use the `filter` association on the Table/Chart pointing to the FilterBar ID:

```xml
<mdc:FilterBar id="filterBar" .../>
<mdc:Table id="myTable" filter="filterBar" .../>
```

## Key events

| Event            | Purpose                              |
| ---------------- | ------------------------------------ |
| `search`         | Fired when "Go" button pressed.      |
| `filtersChanged` | Fired when filter conditions change. |

## Troubleshooting

- No filter fields appearing: verify `fetchProperties` returns properties and `p13nMode` includes `Item`.
- Filters not applied to table: ensure `filter` association is set on Table/Chart and delegate implements `updateBindingInfo`.
- "Go" button missing: FilterBar does not use `liveMode` by default; the Go button is standard behavior.
- Conditions format error: always use `Condition.createCondition("EQ", ["value"])` to create conditions programmatically.
