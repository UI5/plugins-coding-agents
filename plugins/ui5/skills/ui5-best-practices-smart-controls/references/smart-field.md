# sap.ui.comp.smartfield.SmartField

API: https://ui5.sap.com/#/api/sap.ui.comp.smartfield.SmartField

## Key annotations

| Annotation                       | Purpose                                                                         |
| -------------------------------- | ------------------------------------------------------------------------------- |
| `@Common.ValueList`              | Enables value help dialog and type-ahead suggestions.                           |
| `sap:value-list="fixed-values"`  | Renders ComboBox instead of Input with value help.                              |
| `@Common.FieldControl`           | Controls field state: 7=Mandatory, 3=Optional, 1=ReadOnly, 0=Hidden.            |
| `@Common.TextArrangement`        | Controls ID/description display: `TextFirst`, `TextLast`, `TextOnly`, `IDOnly`. |
| `@Common.SemanticObject`         | Renders as SmartLink for cross-app navigation.                                  |
| `sap:display-format="Date"`      | Forces DatePicker for `Edm.DateTime` (instead of DateTimePicker).               |
| `sap:display-format="UpperCase"` | Enforces uppercase input for `Edm.String`.                                      |
| `@UI.MultiLineText`              | Renders TextArea in edit mode.                                                  |

## Control selection by Edm type

**Edit mode:**

| Edm Type       | Annotations            | Inner Control  |
| -------------- | ---------------------- | -------------- |
| Boolean        | —                      | CheckBox       |
| String         | ValueList fixed-values | ComboBox       |
| String         | MultiLineText          | TextArea       |
| String         | —                      | Input          |
| DateTime       | display-format="Date"  | DatePicker     |
| DateTimeOffset | —                      | DateTimePicker |
| Time           | —                      | TimePicker     |
| Numeric types  | —                      | Input          |

**Display mode:** All types render as `sap.m.Text` unless `SemanticObject` is set (renders SmartLink) or `sap:semantics="url"` (renders Link).

## SmartField usage

```xml
<smartField:SmartField id="nameField" value="{Name}"
    entitySet="Products" editable="true"/>
```

Within a SmartForm (recommended):

```xml
<smartForm:GroupElement label="Product Name">
    <smartField:SmartField value="{Name}"/>
</smartForm:GroupElement>
```

## Key properties

| Property               | Purpose                                                                 |
| ---------------------- | ----------------------------------------------------------------------- |
| `value`                | Binding to OData property.                                              |
| `editable`             | Toggle edit/display mode.                                               |
| `entitySet`            | Explicit entity set (when binding context is unavailable).              |
| `textInEditModeSource` | Text arrangement source: `NavigationProperty`, `ValueList`.             |
| `controlType`          | Override inner control: `"dropDownList"`, `"datePicker"`, `"checkBox"`. |
| `mandatory`            | Client-side mandatory flag.                                             |

## Troubleshooting

- SmartField renders wrong control: verify Edm type and annotations in `$metadata`.
- Value help not working: check `ValueList` annotation target format `{Namespace}.{Entity}/{Property}`.
- FieldControl has no effect: annotation can only _restrict_ (make more restrictive than XML); it never _expands_ permissions.
- Custom formatter on `value` is ignored: SmartField manages its own formatting; use annotations instead.
- Text arrangement shows ID only: verify `TextArrangement` annotation and that the text navigation property exists.
