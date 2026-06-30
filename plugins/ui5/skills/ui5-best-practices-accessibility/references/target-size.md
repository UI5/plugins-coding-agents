# Minimum Target Size (WCAG 2.5.8)

Touch targets smaller than 24×24 CSS pixels fail WCAG 2.5.8 (AA). The following
controls can display as links and may need attention depending on the context they
are used in: `sap.m.Link`, `sap.m.ObjectStatus`, `sap.m.ObjectNumber`,
`sap.m.ObjectIdentifier`, `sap.m.ObjectMarker`, `sap.m.ObjectAttribute`.

## Inline display — no action needed

When a link is part of a sentence or constrained by the surrounding line-height
(e.g. inside `FormattedText`), no additional changes are required.

## Display as overlay — `reactiveAreaMode`

Use `reactiveAreaMode="Overlay"` to extend the clickable area of an `ObjectIdentifier`
link without changing its visual appearance:

```xml
<List mode="SingleSelect" includeItemInSelection="true">
  <CustomListItem>
    <l:VerticalLayout class="sapUiSmallMargin">
      <Text text="Notebook Basic 15"/>
      <ObjectIdentifier
        reactiveAreaMode="Overlay"
        title="HH-1000"
        titleActive="true"
        titlePress=".onIdentifierPress"/>
    </l:VerticalLayout>
  </CustomListItem>
</List>
```

## Display with spacing — margin class

When link-like controls appear in a toolbar or other dense layout, add
`class="sapUiTinyMarginBeginEnd"` to provide sufficient spacing around each element:

```xml
<OverflowToolbar>
  <ObjectIdentifier
    class="sapUiTinyMarginBeginEnd"
    titleActive="true"
    title="HT-2001"
    titlePress=".onIdentifierPress"/>
  <Link
    class="sapUiTinyMarginBeginEnd"
    text="10 Portable DVD player"
    press=".onLinkPress"/>
  <ObjectStatus
    class="sapUiTinyMarginBeginEnd"
    active="true"
    state="Success"
    text="Product Shipped"
    press=".onStatusPress"/>
  <ObjectNumber
    class="sapUiTinyMarginBeginEnd"
    active="true"
    number="150"
    unit="EUR"
    press=".onNumberPress"/>
</OverflowToolbar>
```
