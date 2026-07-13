# Minimum Target Size (WCAG 2.5.8)

Touch targets smaller than 24×24 CSS pixels fail WCAG 2.5.8 (AA). The following
controls can display as links and may need attention depending on the context they
are used in: `sap.m.Link`, `sap.m.ObjectStatus`, `sap.m.ObjectNumber`,
`sap.m.ObjectIdentifier`, `sap.m.ObjectMarker`, `sap.m.ObjectAttribute`.

All user-facing strings in the snippets below use `{i18n>...}` bindings — bind every
UI text to the resource model, never hard-code English literals in the view.

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
      <Text text="{i18n>notebookProductName}"/>
      <ObjectIdentifier
        reactiveAreaMode="Overlay"
        title="{product>/code}"
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
    title="{product>/code}"
    titlePress=".onIdentifierPress"/>
  <Link
    class="sapUiTinyMarginBeginEnd"
    text="{product>/name}"
    press=".onLinkPress"/>
  <ObjectStatus
    class="sapUiTinyMarginBeginEnd"
    active="true"
    state="Success"
    text="{i18n>productShippedStatus}"
    press=".onStatusPress"/>
  <ObjectNumber
    class="sapUiTinyMarginBeginEnd"
    active="true"
    number="{product>/price}"
    unit="{product>/currency}"
    press=".onNumberPress"/>
</OverflowToolbar>
```
