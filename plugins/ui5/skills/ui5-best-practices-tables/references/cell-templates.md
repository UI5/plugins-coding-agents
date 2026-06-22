# Cell Templates & Alignment

## Alignment by data type

| Data type | Alignment | Property |
|---|---|---|
| Text | Left | default |
| Numbers | Right | `hAlign="End"` |
| Dates | Right | `hAlign="End"` |
| Boolean | Left | default |
| Links | Left | default |

Set `hAlign` on the `Column` control, not on the cell template.

## Cell template selection

| Content type | Template control |
|---|---|
| Plain text | `sap.m.Text` |
| Formatted number / amount | `sap.m.ObjectNumber` |
| Navigation | `sap.m.Link` |
| Status | `sap.m.ObjectStatus` |
| Icon | `sap.ui.core.Icon` |

## Model type binding

NEVER mix type namespaces. Always match the type namespace to the model:

```xml
<!-- JSON Model -->
<Text text="{path: 'price', type: 'sap.ui.model.type.Float'}"/>

<!-- OData V2 -->
<Text text="{path: 'Price', type: 'sap.ui.model.odata.type.Decimal'}"/>

<!-- OData V4 -->
<Text text="{path: 'Price', type: 'sap.ui.model.odata.v4.type.Decimal'}"/>
```

| Model | Type namespace |
|---|---|
| JSON | `sap.ui.model.type.*` |
| OData V2 | `sap.ui.model.odata.type.*` |
| OData V4 | `sap.ui.model.odata.v4.type.*` |
