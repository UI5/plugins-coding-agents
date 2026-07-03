# sap.ui.comp.smartchart.SmartChart

API: https://ui5.sap.com/#/api/sap.ui.comp.smartchart.SmartChart

## Key annotations

| Annotation                      | Purpose                                                             |
| ------------------------------- | ------------------------------------------------------------------- |
| `@UI.Chart`                     | Defines chart type, dimensions, measures, and roles.                |
| `@UI.Chart.ChartType`           | Default chart type (`Column`, `Bar`, `Line`, `Pie`, `Donut`, etc.). |
| `@UI.Chart.MeasureAttributes`   | Maps measures to roles (`Axis1`, `Axis2`, `Axis3`).                 |
| `@UI.Chart.DimensionAttributes` | Maps dimensions to roles (`Category`, `Series`).                    |
| `@Analytics.Dimension`          | Marks property as dimension.                                        |
| `@Analytics.Measure`            | Marks property as measure.                                          |

## Annotation pattern

```xml
<Annotations Target="MyService.SalesData">
    <Annotation Term="UI.Chart">
        <Record Type="UI.ChartDefinitionType">
            <PropertyValue Property="ChartType" EnumMember="UI.ChartType/Column"/>
            <PropertyValue Property="Dimensions">
                <Collection><PropertyPath>Category</PropertyPath></Collection>
            </PropertyValue>
            <PropertyValue Property="Measures">
                <Collection><PropertyPath>Revenue</PropertyPath></Collection>
            </PropertyValue>
            <PropertyValue Property="DimensionAttributes">
                <Collection>
                    <Record Type="UI.ChartDimensionAttributeType">
                        <PropertyValue Property="Dimension" PropertyPath="Category"/>
                        <PropertyValue Property="Role" EnumMember="UI.ChartDimensionRoleType/Category"/>
                    </Record>
                </Collection>
            </PropertyValue>
            <PropertyValue Property="MeasureAttributes">
                <Collection>
                    <Record Type="UI.ChartMeasureAttributeType">
                        <PropertyValue Property="Measure" PropertyPath="Revenue"/>
                        <PropertyValue Property="Role" EnumMember="UI.ChartMeasureRoleType/Axis1"/>
                    </Record>
                </Collection>
            </PropertyValue>
        </Record>
    </Annotation>
</Annotations>
```

## SmartChart configuration

```xml
<smartChart:SmartChart id="smartChart" entitySet="SalesData"
    chartType="Column" header="Sales Overview"
    showDrillBreadcrumbs="true" showChartTooltip="true"
    useVariantManagement="true" useChartPersonalisation="true"
    smartFilterId="smartFilterBar" height="400px"/>
```

## Key properties

| Property               | Purpose                                                  |
| ---------------------- | -------------------------------------------------------- |
| `entitySet`            | OData entity set (required).                             |
| `chartType`            | Default chart type.                                      |
| `smartFilterId`        | ID of connected SmartFilterBar.                          |
| `showDrillBreadcrumbs` | Shows drill-down navigation trail.                       |
| `ignoredChartTypes`    | Comma-separated list of chart types to hide.             |
| `height`               | Explicit height (required — chart collapses without it). |

## Key events

| Event               | Purpose                                            |
| ------------------- | -------------------------------------------------- |
| `initialise`        | Chart fully ready. Safe to call `getChartAsync()`. |
| `beforeRebindChart` | Modify binding parameters before data fetch.       |

## beforeRebindChart usage

```javascript
onBeforeRebindChart: function(oEvent) {
    var oBindingParams = oEvent.getParameter("bindingParams");
    oBindingParams.filters.push(new Filter("Status", "EQ", "Active"));
}
```

## Troubleshooting

- Chart not visible / height 0: set explicit `height` on SmartChart or container.
- Missing dimensions/measures: verify `UI.Chart` annotation with correct property paths.
- Chart type unavailable: data combination doesn't support it; check `getAvailableChartTypes()`.
- No data after filter: verify `smartFilterId` connection and `beforeRebindChart` filter logic.
- Cannot modify inner chart: use SmartChart public API; direct inner chart access is unsupported.
