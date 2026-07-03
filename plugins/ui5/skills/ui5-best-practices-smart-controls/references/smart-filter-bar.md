# sap.ui.comp.smartfilterbar.SmartFilterBar

API: https://ui5.sap.com/#/api/sap.ui.comp.smartfilterbar.SmartFilterBar

## Key properties

| Property                          | Purpose                                                          |
| --------------------------------- | ---------------------------------------------------------------- |
| `entitySet`                       | OData entity set for automatic filter field generation.          |
| `enableBasicSearch`               | Adds free-text search field.                                     |
| `liveMode`                        | Auto-triggers search on filter change (no "Go" button).          |
| `useDateRangeType`                | Renders date fields as DynamicDateRange with semantic operators. |
| `useProvidedNavigationProperties` | Only expose filter fields from specified navigation properties.  |
| `navigationProperties`            | Comma-separated navigation property names to include.            |

## ControlConfiguration pattern

```xml
<smartFilterBar:SmartFilterBar id="smartFilterBar" entitySet="Products"
    enableBasicSearch="true" useTablePersonalisation="true">
    <smartFilterBar:controlConfiguration>
        <smartFilterBar:ControlConfiguration key="Category"
            controlType="dropDownList" filterType="multiple"
            index="0" visibleInAdvancedArea="true"
            hasValueHelpDialog="true" hasTypeAhead="true"/>
        <smartFilterBar:ControlConfiguration key="CreatedAt"
            controlType="date" filterType="interval" index="1">
            <smartFilterBar:defaultFilterValues>
                <smartFilterBar:SelectOption low="2024-01-01" high="2024-12-31" operator="BT"/>
            </smartFilterBar:defaultFilterValues>
        </smartFilterBar:ControlConfiguration>
    </smartFilterBar:controlConfiguration>
</smartFilterBar:SmartFilterBar>
```

Only `visible`, `label`, and `visibleInAdvancedArea` can be changed dynamically after `initialise`. All other ControlConfiguration properties are static.

## Connecting to SmartTable/SmartChart

```xml
<smartFilterBar:SmartFilterBar id="smartFilterBar" entitySet="Products"/>
<smartTable:SmartTable smartFilterId="smartFilterBar" entitySet="Products"
    tableType="ResponsiveTable" enableAutoBinding="true"/>
```

## Public API methods

| Method                 | Returns                 | Purpose                                       |
| ---------------------- | ----------------------- | --------------------------------------------- |
| `getFilters()`         | `sap.ui.model.Filter[]` | Filter objects for data binding.              |
| `getFilterData()`      | `Object`                | Raw filter field values (not Filter objects). |
| `setFilterData(oData)` | void                    | Set filter values programmatically.           |
| `search()`             | void                    | Trigger search programmatically.              |
| `clear()`              | void                    | Clear all filter values.                      |

## Setting filter data dynamically

```javascript
// In initialise event handler
onFilterBarInitialise: function() {
    var oFilterBar = this.byId("smartFilterBar");
    oFilterBar.setFilterData({
        Category: { items: [{key: "Electronics", text: "Electronics"}] },
        CreatedAt: { low: new Date("2024-01-01"), high: new Date("2024-12-31") },
        Status: "Active"
    });
}
```

## Key events

| Event          | Purpose                                                   |
| -------------- | --------------------------------------------------------- |
| `initialise`   | Fired once after metadata loaded. Safe to access filters. |
| `search`       | Fired when "Go" pressed or liveMode triggers.             |
| `filterChange` | Fired when any filter value changes.                      |

## Troubleshooting

- No filter fields generated: `entitySet` not set or metadata not loaded.
- Type-ahead not working: missing `ValueList` annotation; target format: `{Namespace}.{Entity}/{Field}`.
- Default values ignored at runtime: only `visible`/`label`/`visibleInAdvancedArea` are dynamic; use `setFilterData()` for values.
- Wrong control type: verify Edm type and `sap:display-format` annotation match the desired control.
- Custom field values lost on variant load: implement `beforeVariantFetch`/`afterVariantLoad` with `_CUSTOM` data.
