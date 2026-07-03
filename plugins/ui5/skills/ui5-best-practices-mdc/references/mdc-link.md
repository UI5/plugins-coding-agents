# sap.ui.mdc.Link

API: https://ui5.sap.com/#/api/sap.ui.mdc.Link

## Overview

MDC Link provides delegate-driven navigation with three display modes: plain text, direct navigation, or a popover with multiple link targets. Used as `fieldInfo` inside an MDC Field.

## LinkType enum

| Type         | Behavior                                  |
| ------------ | ----------------------------------------- |
| `Text`       | Renders as plain text (no interaction).   |
| `DirectLink` | Auto-navigates to single target on click. |
| `Popup`      | Opens panel with navigation options.      |

## Delegate pattern

App developers implement a `LinkDelegate` with three key methods:

```javascript
sap.ui.define(["sap/ui/mdc/LinkDelegate"], function (LinkDelegate) {
    const MyLinkDelegate = Object.assign({}, LinkDelegate)

    // Determine how the link renders
    MyLinkDelegate.fetchLinkType = function (oLink) {
        return Promise.resolve({
            initialType: {
                type: 2, // LinkType.Popup
                directLink: undefined,
            },
        })
    }

    // Provide navigation targets for the popover
    MyLinkDelegate.fetchLinkItems = function (oLink) {
        return Promise.resolve([
            new LinkItem({
                key: "supplierDetail",
                text: "Supplier Details",
                href: "#/Supplier/{SupplierID}",
            }),
            new LinkItem({
                key: "purchaseOrders",
                text: "Purchase Orders",
                href: "#/PurchaseOrders?supplier={SupplierID}",
            }),
        ])
    }

    // Optional: add extra content to the popover (e.g., contact card)
    MyLinkDelegate.fetchAdditionalContent = function (oLink) {
        return Promise.resolve([])
    }

    return MyLinkDelegate
})
```

## Link usage as fieldInfo

```xml
<mdc:Field id="supplierField" value="{SupplierName}"
    dataType="sap.ui.model.odata.v4.type.String" editMode="Display">
    <mdc:fieldInfo>
        <mdc:Link id="supplierLink"
            delegate="{name: 'my/app/delegate/LinkDelegate', payload: {semanticObject: 'Supplier'}}"
            enablePersonalization="true"/>
    </mdc:fieldInfo>
</mdc:Field>
```

## Key properties

| Property                | Purpose                                                |
| ----------------------- | ------------------------------------------------------ |
| `delegate`              | Delegate module path and payload (required).           |
| `enablePersonalization` | Allow users to show/hide link items (default: `true`). |

## Key associations

| Association     | Purpose                                                |
| --------------- | ------------------------------------------------------ |
| `sourceControl` | Reference to the parent control (for binding context). |

## Troubleshooting

- Link always shows as text: `fetchLinkType` returns `Text` type or fails. Verify delegate returns type `2` (Popup) or `1` (DirectLink).
- Popover empty (no links): `fetchLinkItems` returns empty array. Verify delegate returns valid LinkItem objects.
- Direct navigation not working: `fetchLinkType` must return `directLink` property with a valid LinkItem containing `href`.
- Personalization not available: `enablePersonalization` is `false` or only one link item exists.
- Link delegate not loading: verify delegate module path is correct and module is accessible.
