# Landmark API

Landmarks let assistive technology users orient themselves in a page and jump directly
to named sections via screen reader shortcuts. Without them, users must navigate linearly
through the entire page.

**When to apply:** Add landmarks only where you can give the area a meaningful, unique
label. If naming the area helps navigation, add it. If the label would be generic or
repeated, skip it.

Examples:
- A `Page` that is the primary container of a view needs landmarks; a `Page` nested
  inside another `Page` probably does not.
- Two panels dividing a page into "Order Details" and "Shipping Info" are good candidates
  for a region landmark.

**Key rule:** A landmark role without a label is also a violation — the AT
announces "region" but cannot distinguish it from other regions on the same page.

All `*Label` properties in the snippets below are bound via `{i18n>...}` — bind every
UI text to the resource model, never hard-code English literals in the view.

## sap.f.DynamicPage

```xml
<landmarkInfo>
  <DynamicPageAccessibleLandmarkInfo
    rootRole="Region"
    rootLabel="{i18n>productDetailsLandmark}"
    contentRole="Main"
    contentLabel="{i18n>productDescriptionLandmark}"
    headerRole="Region"
    headerLabel="{i18n>productHeaderLandmark}"
    footerRole="Region"
    footerLabel="{i18n>productFooterLandmark}"/>
</landmarkInfo>
```

## sap.m.Page

```xml
<landmarkInfo>
  <PageAccessibleLandmarkInfo
    rootRole="Region"
    rootLabel="{i18n>productDetailsLandmark}"
    contentRole="Main"
    contentLabel="{i18n>productDescriptionLandmark}"
    headerRole="Region"
    headerLabel="{i18n>productHeaderLandmark}"
    subHeaderRole="Region"
    subHeaderLabel="{i18n>categoryDescriptionLandmark}"
    footerRole="Region"
    footerLabel="{i18n>productFooterLandmark}"/>
</landmarkInfo>
```

## sap.m.Panel

Use the `accessibleRole` property. The `headerText` serves as the accessible label:

```xml
<Panel accessibleRole="Region" headerText="{i18n>orderSummaryHeader}">
  ...
</Panel>
```

## sap.uxap.ObjectPage

```xml
<landmarkInfo>
  <ObjectPageAccessibleLandmarkInfo
    rootRole="Region"
    rootLabel="{i18n>orderInformationLandmark}"
    contentRole="Main"
    contentLabel="{i18n>orderDetailsLandmark}"
    headerRole="Region"
    headerLabel="{i18n>orderHeaderLandmark}"
    footerRole="Region"
    footerLabel="{i18n>orderFooterLandmark}"
    navigationRole="Navigation"
    navigationLabel="{i18n>orderNavigationLandmark}"/>
</landmarkInfo>
```

## sap.f.FlexibleColumnLayout

```xml
<f:FlexibleColumnLayout>
  <f:landmarkInfo>
    <f:FlexibleColumnLayoutAccessibleLandmarkInfo
      firstColumnLabel="{i18n>masterListLandmark}"
      middleColumnLabel="{i18n>itemDetailsLandmark}"
      lastColumnLabel="{i18n>itemSubDetailsLandmark}"/>
  </f:landmarkInfo>
</f:FlexibleColumnLayout>
```

## Available roles (`sap.ui.core.AccessibleLandmarkRole`)

`Main` · `Navigation` · `Region` · `Banner` · `Complementary` · `Search` · `Form` · `None`
