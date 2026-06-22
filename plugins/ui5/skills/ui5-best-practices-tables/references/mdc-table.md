# sap.ui.mdc.Table

API: https://ui5.sap.com/1.136.0/api/sap.ui.mdc.Table

## Delegate pattern

`sap.ui.mdc.Table` uses a delegate for metadata and data operations. Implement both `fetchProperties` and `updateBindingInfo`.

Minimal delegate:
```javascript
sap.ui.define(["sap/ui/mdc/odata/v4/TableDelegate"], function(TableDelegate) {
    const MyDelegate = Object.assign({}, TableDelegate);

    MyDelegate.fetchProperties = function(oTable) {
        return Promise.resolve([
            {
                key: "name", label: "Name",
                dataType: "sap.ui.model.type.String",
                sortable: true, filterable: true
            },
            {
                key: "price", label: "Price",
                dataType: "sap.ui.model.type.Float",
                sortable: true, filterable: true
            }
        ]);
    };

    return MyDelegate;
});
```

## MDC table usage

```xml
<mdc:Table id="mdcTable" header="Products"
    delegate="{name: 'my/app/delegate/TableDelegate', payload: {entitySet: 'Products'}}"
    p13nMode="Column,Sort,Filter" autoBindOnInit="true">
    <mdc:columns>
        <mdc:Column header="Name" propertyKey="name">
            <Text text="{name}"/>
        </mdc:Column>
        <mdc:Column header="Price" propertyKey="price">
            <ObjectNumber number="{price}"/>
        </mdc:Column>
    </mdc:columns>
</mdc:Table>
```
