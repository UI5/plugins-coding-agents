# sap.ui.comp.smarttable.SmartTable

API: https://ui5.sap.com/1.136.0/api/sap.ui.comp.smarttable.SmartTable

## Key annotations

| Annotation | Purpose |
|---|---|
| `@UI.LineItem` | Define columns and column order. |
| `@UI.Hidden` | Exclude a field from the table. |
| `@UI.Importance` | Responsive priority: `High`, `Medium`, `Low`, `None`. |
| `@Common.Label` | Column header text. |
| `@Measures.ISOCurrency` | Currency formatting. |

## Annotation pattern

```xml
<Annotations Target="MyService.Product">
    <Annotation Term="UI.LineItem">
        <Collection>
            <Record Type="UI.DataField">
                <PropertyValue Property="Value" Path="ProductID"/>
                <Annotation Term="UI.Importance" EnumMember="UI.ImportanceType/High"/>
            </Record>
            <Record Type="UI.DataField">
                <PropertyValue Property="Value" Path="Name"/>
                <Annotation Term="UI.Importance" EnumMember="UI.ImportanceType/High"/>
            </Record>
            <Record Type="UI.DataField">
                <PropertyValue Property="Value" Path="Price"/>
                <Annotation Term="UI.Importance" EnumMember="UI.ImportanceType/Medium"/>
            </Record>
        </Collection>
    </Annotation>
</Annotations>
```

## SmartTable configuration

```xml
<smartTable:SmartTable id="smartTable" entitySet="Products"
    tableType="ResponsiveTable"
    useTablePersonalisation="true"
    useVariantManagement="true"
    useExportToExcel="true"
    header="Products"
    showRowCount="true"
    enableAutoBinding="true"
    ignoredFields="InternalID"
    requestAtLeastFields="Currency"/>
```

## Troubleshooting

- Column does not appear: add a `DataField` record to `UI.LineItem`.
- Wrong column header: add or correct `Common.Label`.
- Column hidden: adjust `UI.Importance` to `Medium` or `High`.
- Missing currency formatting: add `Measures.ISOCurrency`.
