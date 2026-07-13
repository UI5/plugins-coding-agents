# sap.ui.mdc.FilterField

API: https://ui5.sap.com/#/api/sap.ui.mdc.FilterField

## Overview

FilterField is a specialized field control designed to work inside an MDC FilterBar. It manages filter conditions and renders an appropriate inner control based on data type and `maxConditions`.

## Key properties

| Property          | Purpose                                                                     |
| ----------------- | --------------------------------------------------------------------------- |
| `propertyKey`     | Property key this field represents (maps to PropertyInfo `key`).            |
| `conditions`      | Binding to the FilterBar's condition model (required).                      |
| `dataType`        | Data type name (determines inner control).                                  |
| `maxConditions`   | `-1` = multiple values (MultiInput), `1` = single value (Input/DatePicker). |
| `operators`       | Array of allowed operator names (e.g., `["EQ", "BT", "Contains"]`).         |
| `defaultOperator` | Default operator for new conditions.                                        |
| `label`           | Display label for the filter field.                                         |
| `valueHelp`       | Association to a ValueHelp control for value selection.                     |

## Inner control selection

| maxConditions | Data Type      | Inner Control              |
| ------------- | -------------- | -------------------------- |
| `1`           | String/Numeric | Input                      |
| `1`           | Date           | DatePicker                 |
| `1`           | DateTimeOffset | DateTimePicker             |
| `-1`          | String/Numeric | MultiInput (tokens)        |
| `-1`          | Date           | MultiInput with DatePicker |

## FilterField usage within FilterBar

```xml
<mdc:FilterBar id="filterBar"
    delegate="{name: 'my/app/delegate/FilterBarDelegate', payload: {entitySet: 'Products'}}">
    <mdc:filterItems>
        <mdc:FilterField propertyKey="name" label="Product Name"
            conditions="{$filters>/conditions/name}"
            dataType="sap.ui.model.odata.v4.type.String"
            maxConditions="-1"/>
        <mdc:FilterField propertyKey="price" label="Price"
            conditions="{$filters>/conditions/price}"
            dataType="sap.ui.model.odata.v4.type.Decimal"
            maxConditions="1"
            operators="EQ,BT,GE,LE"/>
        <mdc:FilterField propertyKey="createdAt" label="Created"
            conditions="{$filters>/conditions/createdAt}"
            dataType="sap.ui.model.odata.v4.type.Date"
            maxConditions="1"/>
    </mdc:filterItems>
</mdc:FilterBar>
```

## Conditions binding

FilterField conditions use the FilterBar's internal condition model. The binding path follows the pattern:
`{$filters>/conditions/<propertyKey>}`

## Key events

| Event    | Purpose                                                                     |
| -------- | --------------------------------------------------------------------------- |
| `change` | Fired when condition changes. Parameters: `conditions`, `valid`, `promise`. |

## Operator customization

Restrict available operators to limit user choices:

```xml
<mdc:FilterField propertyKey="status" operators="EQ"
    maxConditions="1" label="Status"/>
```

Common operators: `EQ` (equals), `BT` (between), `GE` (>=), `LE` (<=), `Contains`, `StartsWith`, `EndsWith`, `Empty`, `NotEmpty`.

## Troubleshooting

- FilterField not showing conditions: verify `conditions` binding path matches the `propertyKey`.
- Wrong control rendered: check `maxConditions` and `dataType` combination.
- Operators not restricted: set `operators` property explicitly as comma-separated or array.
- Conditions not propagating to table: FilterBar delegate must implement `updateBindingInfo`.
- Validation error on input: `dataType` constraints don't match actual data format.
