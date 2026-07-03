# sap.ui.comp.navpopover.SmartLink

API: https://ui5.sap.com/#/api/sap.ui.comp.navpopover.SmartLink

## Key annotations

| Annotation                                 | Purpose                                              |
| ------------------------------------------ | ---------------------------------------------------- |
| `@Common.SemanticObject`                   | Identifies the navigation target semantic object.    |
| `@Common.SemanticObjectMapping`            | Maps local properties to semantic object parameters. |
| `@Common.SemanticObjectUnavailableActions` | Hides specific actions from the popover.             |

## Operation modes

| Mode             | Behavior                                                              |
| ---------------- | --------------------------------------------------------------------- |
| Single target    | Direct navigation (no popover) if only 1 target and no extra content. |
| Multiple targets | Opens popover showing all navigation options.                         |
| No targets       | Renders as plain text (not clickable).                                |

## Standalone usage

```xml
<smartLink:SmartLink id="supplierLink" text="{SupplierName}"
    semanticObject="Supplier"
    additionalSemanticObjects="Company,Partner"
    mapFieldToSemanticObject="true"
    fieldName="SupplierID"
    semanticObjectController="semanticObjectController"/>
```

## Usage within SmartTable column

SmartLink renders automatically when a SmartTable column property has the `@Common.SemanticObject` annotation. No additional XML configuration needed — the SmartTable/SmartField uses SmartLink as the inner control.

## Customizing navigation targets

Use `navigationTargetsObtained` event to add custom links or extra content:

```javascript
// In controller (sap.ui.define pattern)
onNavigationTargetsObtained: function(oEvent) {
    var oParams = oEvent.getParameters();
    var oMainNavigation = oParams.mainNavigation;

    // Add extra content (e.g., a form with details)
    oParams.show(oMainNavigation, null, undefined, new SimpleForm({
        content: [
            new Label({text: "Contact"}),
            new Text({text: oParams.semanticAttributes.ContactName})
        ]
    }));
}
```

## Key properties

| Property                    | Purpose                                                     |
| --------------------------- | ----------------------------------------------------------- |
| `semanticObject`            | Navigation target name (overrides annotation).              |
| `additionalSemanticObjects` | Comma-separated additional semantic objects.                |
| `mapFieldToSemanticObject`  | Auto-map field value as semantic object parameter.          |
| `fieldName`                 | OData property name for parameter mapping.                  |
| `contactAnnotationPath`     | Path to `Communication.Contact` for contact card rendering. |

## Key events

| Event                       | Purpose                                    |
| --------------------------- | ------------------------------------------ |
| `navigationTargetsObtained` | Customize popover content before display.  |
| `beforePopoverOpens`        | Final modification before popover renders. |
| `innerNavigate`             | Fired when user clicks a navigation link.  |

## Troubleshooting

- Popover shows "No content available": no navigation targets found for semantic object in FLP. Verify FLP configuration and user authorizations.
- Rendered as plain text (not link): `@Common.SemanticObject` annotation missing on property in OData metadata.
- Wrong parameters passed to target: verify `@Common.SemanticObjectMapping` or use `mapFieldToSemanticObject`.
- Extra content not showing: ensure `oParams.show()` is called with the extra content parameter.
- Popover opens but links are wrong: check `SemanticObjectUnavailableActions` annotation to filter unwanted actions.
