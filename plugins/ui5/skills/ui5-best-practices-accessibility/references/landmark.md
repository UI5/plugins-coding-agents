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

## sap.f.DynamicPage

```xml
<landmarkInfo>
  <DynamicPageAccessibleLandmarkInfo
    rootRole="Region"
    rootLabel="Product Details"
    contentRole="Main"
    contentLabel="Product Description"
    headerRole="Region"
    headerLabel="Product Header"
    footerRole="Region"
    footerLabel="Product Footer"/>
</landmarkInfo>
```

## sap.m.Page

```xml
<landmarkInfo>
  <PageAccessibleLandmarkInfo
    rootRole="Region"
    rootLabel="Product Details"
    contentRole="Main"
    contentLabel="Product Description"
    headerRole="Region"
    headerLabel="Product Header"
    subHeaderRole="Region"
    subHeaderLabel="Category Description"
    footerRole="Region"
    footerLabel="Product Footer"/>
</landmarkInfo>
```

## sap.m.Panel

Use the `accessibleRole` property. The `headerText` serves as the accessible label:

```xml
<Panel accessibleRole="Region" headerText="Order Summary">
  ...
</Panel>
```

## sap.uxap.ObjectPage

```xml
<landmarkInfo>
  <ObjectPageAccessibleLandmarkInfo
    rootRole="Region"
    rootLabel="Order Information"
    contentRole="Main"
    contentLabel="Order Details"
    headerRole="Region"
    headerLabel="Order Header"
    footerRole="Region"
    footerLabel="Order Footer"
    navigationRole="Navigation"
    navigationLabel="Order navigation"/>
</landmarkInfo>
```

## sap.f.FlexibleColumnLayout

```xml
<f:FlexibleColumnLayout>
  <f:landmarkInfo>
    <f:FlexibleColumnLayoutAccessibleLandmarkInfo
      firstColumnLabel="Master list"
      middleColumnLabel="Item details"
      lastColumnLabel="Item sub-details"/>
  </f:landmarkInfo>
</f:FlexibleColumnLayout>
```

## Available roles (`sap.ui.core.AccessibleLandmarkRole`)

`Main` · `Navigation` · `Region` · `Banner` · `Complementary` · `Search` · `Form` · `None`
