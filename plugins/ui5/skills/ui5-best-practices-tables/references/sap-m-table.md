# sap.m.Table (ResponsiveTable)

API: https://ui5.sap.com/1.136.0/api/sap.m.Table

## Items binding syntax

The `items` attribute on `<Table>` defines the binding configuration. The `<items>` element defines the template. Both are required.

**✅ Correct — simple binding:**
```xml
<Table items="{/products}">
    <items>
        <ColumnListItem>
            <cells>
                <Text text="{name}"/>
            </cells>
        </ColumnListItem>
    </items>
</Table>
```

**✅ Correct — complex binding with sorter/filter:**
```xml
<Table items="{
    path: '/products',
    sorter: { path: 'name' }
}">
    <items>
        <ColumnListItem>
            <cells><Text text="{name}"/></cells>
        </ColumnListItem>
    </items>
</Table>
```

**❌ Wrong — path on `<items>` element (will not work):**
```xml
<Table>
    <items path="/products">
        <ColumnListItem>...</ColumnListItem>
    </items>
</Table>
```

## Minimal complete example

```xml
<mvc:View xmlns:mvc="sap.ui.core.mvc" xmlns="sap.m" controllerName="my.app.controller.Main">
    <Page title="Products">
        <Table id="responsiveTable" items="{/products}" growing="true"
               growingThreshold="20" ariaLabelledBy="tableTitle"
               sticky="ColumnHeaders,HeaderToolbar">
            <headerToolbar>
                <OverflowToolbar>
                    <Title id="tableTitle" text="Products" level="H2"/>
                    <ToolbarSpacer/>
                    <Button icon="sap-icon:action-settings" press=".onPersonalize"/>
                    <Button icon="sap-icon:excel-attachment" press=".onExport"/>
                </OverflowToolbar>
            </headerToolbar>
            <columns>
                <Column>
                    <header><Text text="Name"/></header>
                </Column>
                <Column demandPopin="true" minScreenWidth="Tablet">
                    <header><Text text="Category"/></header>
                </Column>
                <Column hAlign="End">
                    <header><Text text="Price"/></header>
                </Column>
            </columns>
            <items>
                <ColumnListItem>
                    <cells>
                        <Text text="{name}"/>
                        <Text text="{category}"/>
                        <ObjectNumber number="{price}" unit="{currency}"/>
                    </cells>
                </ColumnListItem>
            </items>
        </Table>
    </Page>
</mvc:View>
```

## Column header

Always use the `header` aggregation.

**❌ Wrong:**
```xml
<Column><Text text="Name"/></Column>
```

**✅ Correct:**
```xml
<Column>
    <header><Text text="Name"/></header>
</Column>
```

## Sticky headers (UI5 1.58+)

```xml
<Table sticky="ColumnHeaders,HeaderToolbar" items="{/products}">
```

Valid `sticky` values: `ColumnHeaders`, `HeaderToolbar`, `InfoToolbar`. Combine with commas.

## Key properties

| Property | Type | Default | Since | Notes |
|---|---|---|---|---|
| `growing` | boolean | false | 1.16.0 | Enable load-more. |
| `growingThreshold` | int | 20 | 1.16.0 | Items per load. |
| `growingScrollToLoad` | boolean | false | 1.16.0 | Load on scroll vs. button. |
| `sticky` | Sticky[] | — | 1.58 | Sticky column/header/info toolbar. |
| `multiSelectMode` | MultiSelectMode | Default | 1.93 | `Default` or `ClearAll`. |
| `rememberSelections` | boolean | true | 1.16.6 | Set to `false` with `$$sharedRequests`. |
| `autoPopinMode` | boolean | false | 1.0 | Auto-hide columns by importance. |
| `contextualWidth` | ScreenSize | undefined | 1.60 | Container-based responsive behavior. |
| `hiddenInPopin` | string[] | [] | 1.77 | Hide columns completely by ID. |
| `popinLayout` | PopinLayout | Block | 1.52 | Block / GridLarge / GridSmall. |
| `fixedLayout` | FixedLayout | true | 1.0 | Use `Strict` for precise widths. |
| `keyboardMode` | KeyboardMode | Navigation | 1.38 | `Navigation` or `Edit`. |

## OData V4 selection

Set `rememberSelections="false"` when using `$$sharedRequests` or `$$clearSelectionOnFilter`.

## Responsive behavior patterns

Container-based width:
```xml
<Table contextualWidth="Desktop" items="{/products}">
```

Hide columns completely (reference by column ID):
```xml
<Table hiddenInPopin="categoryCol,statusCol" items="{/products}">
    <columns>
        <Column id="categoryCol" demandPopin="true" minScreenWidth="Tablet"/>
    </columns>
</Table>
```

Auto pop-in by importance:
```xml
<Table autoPopinMode="true" items="{/products}">
    <columns>
        <Column importance="High"><header><Text text="Name"/></header></Column>
        <Column importance="Medium"><header><Text text="Category"/></header></Column>
        <Column importance="Low"><header><Text text="Status"/></header></Column>
    </columns>
</Table>
```

## ColumnListItem highlight

Do not use a formatter for `highlight`. Use direct binding or `ObjectStatus`.

Valid `highlight` values: `None`, `Success`, `Warning`, `Error`, `Information`.

## Events

| Event | Since | Parameters | Use |
|---|---|---|---|
| `paste` | 1.60 | `data: string[][]` | Paste tabular data. |
| `popinChanged` | 1.77 | `hasPopin`, `visibleInPopin[]`, `hiddenInPopin[]` | Track responsive changes. |
| `updateStarted` / `updateFinished` | 1.16.3 | `reason`, `actual`, `total` | Busy indicators. |
| `beforeOpenContextMenu` | 1.54 | `listItem`, `column` | Context menu. |

## Grouping with sap.ui.model.Sorter

**✅ Correct:**
```javascript
_createCategorySorter: function() {
    return new Sorter("category", false, function(oContext) {
        var sCategory = oContext.getProperty("category");
        return { key: sCategory, text: sCategory };
    });
},
this.byId("productsTable").getBinding("items").sort(this._createCategorySorter());
```

**❌ Wrong — do not pass the group header factory as the grouper function:**
```javascript
new Sorter("category", false, this.getGroupHeader.bind(this))
```

**Group header factory (separate):**
```javascript
getGroupHeader: function(oGroup) {
    return new GroupHeaderListItem({
        title: oGroup.text,
        count: "(" + oGroup.count + ")"
    });
}
```
