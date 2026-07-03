# sap.ui.comp.smartform.SmartForm

API: https://ui5.sap.com/#/api/sap.ui.comp.smartform.SmartForm

## Key properties

| Property         | Purpose                                                    |
| ---------------- | ---------------------------------------------------------- |
| `editable`       | Propagates edit/display mode to all nested SmartFields.    |
| `editTogglable`  | Shows edit/display toggle button in form toolbar.          |
| `title`          | Form title (rendered in toolbar).                          |
| `expandable`     | Renders as collapsible panel.                              |
| `flexEnabled`    | Enables key-user adaptation (add/remove/rearrange fields). |
| `entityType`     | OData entity type for metadata annotation reading.         |
| `validationMode` | `"Standard"` (sync) or `"Async"` validation.               |

## Required hierarchy

```xml
<smartForm:SmartForm id="myForm" editable="true" title="Product Details"
    editTogglable="true" entityType="Product">
    <smartForm:layout>
        <smartForm:ColumnLayout columnsM="2" columnsL="3" columnsXL="4"/>
    </smartForm:layout>
    <smartForm:Group label="General">
        <smartForm:GroupElement label="Name">
            <smartField:SmartField value="{Name}"/>
        </smartForm:GroupElement>
        <smartForm:GroupElement label="Price">
            <smartField:SmartField value="{Price}"/>
        </smartForm:GroupElement>
    </smartForm:Group>
    <smartForm:Group label="Details">
        <smartForm:GroupElement label="Description">
            <smartField:SmartField value="{Description}"/>
        </smartForm:GroupElement>
    </smartForm:Group>
</smartForm:SmartForm>
```

## Layout options

| Layout                 | Use when                                       |
| ---------------------- | ---------------------------------------------- |
| `ColumnLayout`         | Recommended default. Responsive columns.       |
| `ResponsiveGridLayout` | Need fine-grained grid control (span, offset). |

Always provide a layout. `ColumnLayout` with `columnsM="2" columnsL="3" columnsXL="4"` is the recommended default (consistent with `ui5-best-practices` form rules).

## Validation

Call `check()` before save to validate mandatory fields:

```javascript
// In controller (sap.ui.define pattern)
onSave: function() {
    var oSmartForm = this.byId("myForm");
    var aErrors = oSmartForm.check();
    if (aErrors.length === 0) {
        // proceed with save
    }
}
```

## Key events

| Event         | Purpose                                                 |
| ------------- | ------------------------------------------------------- |
| `editToggled` | Fired when edit/display mode changes via toggle button. |

## Troubleshooting

- Labels missing: `sap:label` annotation not on OData property. Set `label` on GroupElement as fallback.
- Validation skipped: forgot to call `check()` before save.
- Layout broken: placed non-SmartField controls (Panels, VBoxes) inside GroupElement.
- Flexibility not working: `entityType` not set (flexibility needs metadata context).
- Nested SmartForms: not supported; use one SmartForm with multiple Groups.
