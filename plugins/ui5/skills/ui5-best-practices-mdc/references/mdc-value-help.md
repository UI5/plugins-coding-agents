# sap.ui.mdc.ValueHelp

API: https://ui5.sap.com/#/api/sap.ui.mdc.ValueHelp

## Architecture

ValueHelp has two containers that app developers configure:

1. **Typeahead** (`typeahead` aggregation) — inline dropdown below the field for quick filtering
2. **Dialog** (`dialog` aggregation) — full-screen selection dialog opened on demand

Each container holds **content** controls that display selectable data.

## ValueHelp usage

```xml
<mdc:Field id="categoryField" value="{CategoryID}" additionalValue="{CategoryName}"
    display="DescriptionValue" valueHelp="categoryVH"/>

<mdc:ValueHelp id="categoryVH"
    delegate="{name: 'my/app/delegate/ValueHelpDelegate', payload: {entitySet: 'Categories'}}"
    validateInput="true">
    <mdc:typeahead>
        <mdcVH:Popover title="Categories">
            <mdcVHContent:MTable keyPath="ID" descriptionPath="Name"
                filterFields="*Name*">
                <Table>
                    <columns>
                        <Column><Text text="ID"/></Column>
                        <Column><Text text="Name"/></Column>
                    </columns>
                    <items>
                        <ColumnListItem>
                            <cells>
                                <Text text="{ID}"/>
                                <Text text="{Name}"/>
                            </cells>
                        </ColumnListItem>
                    </items>
                </Table>
            </mdcVHContent:MTable>
        </mdcVH:Popover>
    </mdc:typeahead>
    <mdc:dialog>
        <mdcVH:Dialog title="Select Category">
            <mdcVHContent:MTable keyPath="ID" descriptionPath="Name"
                filterFields="$search">
                <Table>
                    <columns>
                        <Column><Text text="ID"/></Column>
                        <Column><Text text="Name"/></Column>
                    </columns>
                    <items>
                        <ColumnListItem>
                            <cells>
                                <Text text="{ID}"/>
                                <Text text="{Name}"/>
                            </cells>
                        </ColumnListItem>
                    </items>
                </Table>
            </mdcVHContent:MTable>
        </mdcVH:Dialog>
    </mdc:dialog>
</mdc:ValueHelp>
```

## Content types

| Content      | Purpose                                                             |
| ------------ | ------------------------------------------------------------------- |
| `MTable`     | Uses `sap.m.Table` for selection list.                              |
| `MDCTable`   | Uses `sap.ui.mdc.Table` for complex selection with personalization. |
| `Bool`       | Simple true/false selection.                                        |
| `Conditions` | Condition panel for defining ranges/operators.                      |

## Delegate pattern

```javascript
sap.ui.define(["sap/ui/mdc/ValueHelpDelegate"], function (ValueHelpDelegate) {
    const MyVHDelegate = Object.assign({}, ValueHelpDelegate)

    MyVHDelegate.retrieveContent = function (oValueHelp, oContainer) {
        // Dynamically configure content if needed
        return Promise.resolve()
    }

    return MyVHDelegate
})
```

## Key properties

| Property        | Purpose                                         |
| --------------- | ----------------------------------------------- |
| `delegate`      | Delegate module path and payload.               |
| `validateInput` | Validate user input against value help entries. |

## Connecting to Field/FilterField

Set the `valueHelp` association on the Field or FilterField:

```xml
<mdc:Field valueHelp="myValueHelp" .../>
<mdc:FilterField valueHelp="myValueHelp" .../>
```

## Troubleshooting

- ValueHelp not opening: verify `valueHelp` association on Field points to correct ID.
- Typeahead not showing: check that `typeahead` aggregation with Popover and content is defined.
- Dialog empty: verify content binding path and that data is available for the entity set.
- Selected value not reflected in Field: ensure `keyPath` and `descriptionPath` match model property names.
- Validation fails on valid input: check `validateInput` setting and that content data includes the entered value.
