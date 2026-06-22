# sap.ui.table.Table (GridTable)

API: https://ui5.sap.com/1.136.0/api/sap.ui.table.Table

## Minimal complete example

```xml
<mvc:View xmlns:mvc="sap.ui.core.mvc" xmlns="sap.m" xmlns:table="sap.ui.table"
        controllerName="my.app.controller.Main">
    <Page title="Products">
        <table:Table id="gridTable" rows="{/products}" selectionMode="MultiToggle"
                ariaLabelledBy="gridTableTitle" threshold="100">
            <table:extension>
                <OverflowToolbar>
                    <Title id="gridTableTitle" text="Products" level="H2"/>
                    <ToolbarSpacer/>
                    <Button icon="sap-icon:action-settings" press=".onPersonalize"/>
                </OverflowToolbar>
            </table:extension>
            <table:rowMode>
                <table:rowmodes:Fixed rowCount="10"/>
            </table:rowMode>
            <table:columns>
                <table:Column>
                    <Label text="Name"/>
                    <table:template><Text text="{name}" wrapping="false"/></table:template>
                </table:Column>
                <table:Column hAlign="End">
                    <Label text="Price"/>
                    <table:template><ObjectNumber number="{price}" unit="{currency}"/></table:template>
                </table:Column>
            </table:columns>
        </table:Table>
    </Page>
</mvc:View>
```

## Key properties

| Property | Type | Default | Since | Notes |
|---|---|---|---|---|
| `selectionBehavior` | SelectionBehavior | RowSelector | 1.0 | `Row`, `RowSelector`, `RowOnly`. |
| `columnHeaderVisible` | boolean | true | 1.0 | Show/hide column headers. |
| `showNoData` | boolean | true | 1.0 | Show "No data" text. |
| `noData` | string / Control | — | 1.0 | Custom no-data content. |
| `showOverlay` | boolean | false | 1.21 | Block interaction with overlay. |
| `threshold` | int | 100 | 1.0 | Prefetch buffer for virtualization. |

## rowMode aggregation (UI5 1.119+)

Use the `rowMode` aggregation instead of the deprecated `visibleRowCountMode` property.

```xml
<table:rowMode>
    <table:rowmodes:Fixed rowCount="10"/>
</table:rowMode>
```

Available row modes: `Fixed`, `Auto`, `Interactive`.

## Selection behavior

- `Row`: selection changed anywhere in the row, including the selector column.
- `RowSelector`: selection changed only via the selector column; row clicks do not select.
- `RowOnly`: selection changed only via row clicks; the selector column is hidden.

Do not call the table's selection API when a `SelectionPlugin` is attached. Use the plugin API instead.

## No-data customization

```xml
<table:Table>
    <table:noData>
        <IllustratedMessage illustrationType="NoData" title="No Products">
            <Button text="Add Product" press=".onAddProduct"/>
        </IllustratedMessage>
    </table:noData>
</table:Table>
```
