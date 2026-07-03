# sap.ui.mdc.Field

API: https://ui5.sap.com/#/api/sap.ui.mdc.Field

## Key properties

| Property                | Purpose                                                                       |
| ----------------------- | ----------------------------------------------------------------------------- |
| `value`                 | Field value (bindable).                                                       |
| `additionalValue`       | Description for key/text pairs (bindable).                                    |
| `display`               | Display mode: `Value`, `Description`, `ValueDescription`, `DescriptionValue`. |
| `dataType`              | Data type name (determines inner control rendering).                          |
| `dataTypeConstraints`   | Type constraints (e.g., `{maxLength: 40}`).                                   |
| `dataTypeFormatOptions` | Format options (e.g., `{groupingEnabled: true}`).                             |
| `editMode`              | `Display`, `Editable`, `ReadOnly`, `Disabled`.                                |
| `multipleLines`         | Renders TextArea for multi-line input.                                        |
| `valueHelp`             | Association to a ValueHelp control.                                           |

## Inner control selection by data type

**Edit mode:**

| Data Type              | Inner Control                                |
| ---------------------- | -------------------------------------------- |
| String                 | Input                                        |
| String (multipleLines) | TextArea                                     |
| Date                   | DatePicker                                   |
| DateTimeOffset         | DateTimePicker                               |
| TimeOfDay              | TimePicker                                   |
| Boolean                | — (not auto-rendered; use CheckBox manually) |
| Numeric types          | Input                                        |

**Display mode:** All types render as `sap.m.Text` unless `FieldInfo` is set (renders as Link).

## Field usage

Standalone:

```xml
<mdc:Field id="nameField" value="{Name}" additionalValue="{Description}"
    display="DescriptionValue"
    dataType="sap.ui.model.odata.v4.type.String"
    editMode="Editable"/>
```

With ValueHelp:

```xml
<mdc:Field id="categoryField" value="{CategoryID}" additionalValue="{CategoryName}"
    display="DescriptionValue"
    dataType="sap.ui.model.odata.v4.type.String"
    valueHelp="categoryValueHelp"/>

<mdc:ValueHelp id="categoryValueHelp" .../>
```

With FieldInfo (renders as Link for navigation):

```xml
<mdc:Field id="supplierField" value="{SupplierName}">
    <mdc:fieldInfo>
        <mdc:Link delegate="{name: 'my/app/delegate/LinkDelegate'}"/>
    </mdc:fieldInfo>
</mdc:Field>
```

## Key events

| Event        | Purpose                                                         |
| ------------ | --------------------------------------------------------------- |
| `change`     | Value changed by user. Parameters: `value`, `valid`, `promise`. |
| `liveChange` | Fired as user types (for Input inner control).                  |

## Troubleshooting

- Wrong inner control rendered: verify `dataType` uses the correct full qualified name.
- Value help not opening: check `valueHelp` association points to a valid ValueHelp control ID.
- Display shows key instead of description: set `additionalValue` binding and `display="DescriptionValue"`.
- Field not editable: check `editMode` property is set to `"Editable"`.
- Binding type error: ensure `dataType` matches the model's property type (use `sap.ui.model.odata.v4.type.*` for OData V4).
