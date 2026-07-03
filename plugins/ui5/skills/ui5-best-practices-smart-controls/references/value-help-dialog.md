# sap.ui.comp.valuehelpdialog.ValueHelpDialog

API: https://ui5.sap.com/#/api/sap.ui.comp.valuehelpdialog.ValueHelpDialog

## Overview

ValueHelpDialog is a multi-modal selection dialog with two tabs: **Items** (table-based selection) and **Conditions** (range/operator-based entry). It manages selection via tokens and integrates with `FilterBar` for search within the dialog. Used when SmartField's built-in value help is insufficient or when standalone value selection is needed.

## Key properties

| Property             | Purpose                                           |
| -------------------- | ------------------------------------------------- |
| `key`                | Property name for the key field in the data       |
| `descriptionKey`     | Property name for the description field           |
| `supportMultiselect` | Enable multiple row selection (`true` by default) |
| `supportRanges`      | Show Conditions tab for range/operator entry      |
| `supportRangesOnly`  | Show only the Conditions tab (no Items tab)       |
| `stretch`            | Stretch dialog to full viewport on phones         |
| `title`              | Dialog title text                                 |
| `filterMode`         | Set to `true` when used with FilterBar for search |

## Key API methods

| Method                | Purpose                                                 |
| --------------------- | ------------------------------------------------------- |
| `setTable()`          | Set the items table (sap.m.Table or sap.ui.table.Table) |
| `setFilterBar()`      | Set the FilterBar for in-dialog filtering               |
| `setTokens()`         | Set pre-selected tokens                                 |
| `getTokens()`         | Get currently selected tokens                           |
| `update()`            | Refresh the dialog after data changes                   |
| `setRangeKeyFields()` | Define fields available in the Conditions tab           |

## ValueHelpDialog usage

```javascript
sap.ui.define(
    [
        "sap/ui/comp/valuehelpdialog/ValueHelpDialog",
        "sap/ui/comp/filterbar/FilterBar",
        "sap/m/Table",
        "sap/m/Column",
        "sap/m/ColumnListItem",
        "sap/m/Text",
        "sap/m/Input",
    ],
    function (
        ValueHelpDialog,
        FilterBar,
        Table,
        Column,
        ColumnListItem,
        Text,
        Input
    ) {
        var oVHD = new ValueHelpDialog({
            title: "Select Product",
            key: "ProductID",
            descriptionKey: "ProductName",
            supportMultiselect: true,
            supportRanges: true,
            ok: function (oEvent) {
                var aTokens = oEvent.getParameter("tokens")
                // Process selected tokens
                oVHD.close()
            },
            cancel: function () {
                oVHD.close()
            },
        })

        // Create and set the items table
        var oTable = new Table({
            columns: [
                new Column({ header: new Text({ text: "ID" }) }),
                new Column({ header: new Text({ text: "Name" }) }),
            ],
            items: {
                path: "/Products",
                template: new ColumnListItem({
                    cells: [
                        new Text({ text: "{ProductID}" }),
                        new Text({ text: "{ProductName}" }),
                    ],
                }),
            },
        })
        oVHD.setTable(oTable)

        // Create and set the FilterBar (advancedMode for in-dialog use)
        var oFilterBar = new FilterBar({
            advancedMode: true,
            filterGroupItems: [/* FilterGroupItems */],
        })
        oVHD.setFilterBar(oFilterBar)

        oVHD.open()
    }
)
```

## Conditions tab setup

To define available fields in the Conditions tab:

```javascript
oVHD.setRangeKeyFields([
    {
        key: "ProductID",
        label: "Product ID",
        type: "string",
    },
    {
        key: "Price",
        label: "Price",
        type: "numeric",
    },
])
```

## Key events

| Event        | Purpose                                               |
| ------------ | ----------------------------------------------------- |
| `ok`         | Fired when user confirms selection (tokens available) |
| `cancel`     | Fired when user cancels the dialog                    |
| `afterClose` | Fired after dialog is closed                          |

## Troubleshooting

- Items tab empty: table not set via `setTable()` or binding path incorrect. Verify data binding on the table.
- Conditions tab missing: `supportRanges` is `false`. Set `supportRanges="true"`.
- Tokens not pre-selected: call `setTokens()` before `open()`. Tokens must match `key` property.
- Filter not applied to table items: FilterBar `search` event must trigger table rebinding with filter parameters.
- Dialog shows no columns: table has no `columns` aggregation defined. Add Column definitions to the table.
- Cannot select multiple items: `supportMultiselect` is `false`. Set to `true` for multi-selection.
