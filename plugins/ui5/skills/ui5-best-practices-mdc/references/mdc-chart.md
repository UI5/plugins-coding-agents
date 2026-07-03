# sap.ui.mdc.Chart

API: https://ui5.sap.com/#/api/sap.ui.mdc.Chart

## Delegate pattern

`sap.ui.mdc.Chart` uses a delegate for chart initialization and data binding. Extend `sap/ui/mdc/odata/v4/vizChart/Delegate` for OData V4.

Minimal delegate:

```javascript
sap.ui.define(
    ["sap/ui/mdc/odata/v4/vizChart/Delegate"],
    function (ChartDelegate) {
        const MyChartDelegate = Object.assign({}, ChartDelegate)

        MyChartDelegate.fetchProperties = function (oChart) {
            return Promise.resolve([
                {
                    key: "category",
                    label: "Category",
                    dataType: "sap.ui.model.odata.v4.type.String",
                    groupable: true,
                    aggregatable: false,
                    role: "category",
                },
                {
                    key: "revenue",
                    label: "Revenue",
                    dataType: "sap.ui.model.odata.v4.type.Decimal",
                    groupable: false,
                    aggregatable: true,
                    role: "axis1",
                },
            ])
        }

        return MyChartDelegate
    }
)
```

## PropertyInfo for Chart

| Field          | Type    | Purpose                                                    |
| -------------- | ------- | ---------------------------------------------------------- |
| `key`          | string  | Unique property identifier (required).                     |
| `label`        | string  | Display label (required).                                  |
| `dataType`     | string  | Full type name (required).                                 |
| `groupable`    | boolean | `true` = can be used as dimension.                         |
| `aggregatable` | boolean | `true` = can be used as measure.                           |
| `role`         | string  | `"category"`, `"series"`, `"axis1"`, `"axis2"`, `"axis3"`. |
| `sortable`     | boolean | Enable sorting.                                            |
| `filterable`   | boolean | Enable filtering.                                          |

## Chart usage

```xml
<mdc:Chart id="myChart" header="Sales Overview"
    delegate="{name: 'my/app/delegate/ChartDelegate', payload: {entitySet: 'Sales'}}"
    p13nMode="Item,Sort,Type" height="400px"
    filter="filterBar" autoBindOnInit="true">
    <mdc:items>
        <mdcChart:Item propertyKey="category" type="groupable" role="category"/>
        <mdcChart:Item propertyKey="revenue" type="aggregatable" role="axis1"/>
    </mdc:items>
</mdc:Chart>
```

## Key properties

| Property         | Purpose                                                  |
| ---------------- | -------------------------------------------------------- |
| `delegate`       | Delegate module path and payload (required).             |
| `header`         | Chart title.                                             |
| `height`         | Explicit height (required — chart collapses without it). |
| `p13nMode`       | Personalization: `Item`, `Sort`, `Filter`, `Type`.       |
| `filter`         | Association to MDC FilterBar for connected filtering.    |
| `autoBindOnInit` | Auto-bind data on initialization.                        |
| `legendVisible`  | Show/hide chart legend.                                  |
| `noDataText`     | Custom text for empty state.                             |

## Key events

| Event              | Purpose                        |
| ------------------ | ------------------------------ |
| `dataLoadComplete` | Inner chart data fully loaded. |

## Troubleshooting

- Chart not visible / height 0: set explicit `height` on Chart (e.g., `"400px"` or `"50vh"`).
- No data displayed: verify `fetchProperties` returns properties with correct `groupable`/`aggregatable` flags.
- Chart type unavailable: current data combination doesn't support it; verify dimensions/measures.
- PersonalizationDialog empty: set `p13nMode` and ensure PropertyInfo has all required flags.
- FilterBar not applying: verify `filter` association points to correct FilterBar ID.
