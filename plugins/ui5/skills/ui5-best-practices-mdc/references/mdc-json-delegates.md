# MDC Controls with JSON Models

## Overview

MDC controls are model-agnostic — they work with any model type (JSON, OData V4, OData V2) via the delegate pattern. When using JSON models, extend the **base** delegates directly (not the OData V4 variants) and provide PropertyInfo manually.

## Base delegates for JSON models

| Control   | Base Delegate (JSON)           | OData V4 Delegate (do NOT use with JSON) |
| --------- | ------------------------------ | ---------------------------------------- |
| Table     | `sap/ui/mdc/TableDelegate`     | `sap/ui/mdc/odata/v4/TableDelegate`      |
| FilterBar | `sap/ui/mdc/FilterBarDelegate` | `sap/ui/mdc/odata/v4/FilterBarDelegate`  |
| ValueHelp | `sap/ui/mdc/ValueHelpDelegate` | (same base for all models)               |

## Key differences from OData V4

| Aspect              | OData V4                            | JSON Model                                               |
| ------------------- | ----------------------------------- | -------------------------------------------------------- |
| `fetchProperties`   | Can introspect OData metadata       | Must return PropertyInfo array manually                  |
| `dataType`          | `sap.ui.model.odata.v4.type.*`      | `sap.ui.model.type.*` (String, Integer, Date, etc.)      |
| `updateBindingInfo` | Path often derived from metadata    | Must set `bindingInfo.path` from delegate payload        |
| `addItem`           | Can auto-generate column templates  | Must create Column + inner control template manually     |
| Search/filter       | OData `$filter` built automatically | Implement `getFilters()` returning `sap.ui.model.Filter` |
| TypeMap             | OData types registered by default   | Register standard types via `DefaultTypeMap`             |

## TypeMap registration

Register type mappings so MDC recognizes your data types for condition handling:

```javascript
sap.ui.define(
    ["sap/ui/mdc/DefaultTypeMap", "sap/ui/mdc/enums/BaseType"],
    function (DefaultTypeMap, BaseType) {
        DefaultTypeMap.set("sap.ui.model.type.String", BaseType.String)
        DefaultTypeMap.set("sap.ui.model.type.Integer", BaseType.Numeric)
        DefaultTypeMap.set("sap.ui.model.type.Date", BaseType.Date)
        DefaultTypeMap.freeze()
    }
)
```

## Minimal TableDelegate for JSON

```javascript
sap.ui.define(
    [
        "sap/ui/mdc/TableDelegate",
        "sap/m/Text",
        "sap/ui/model/Filter",
        "sap/ui/model/FilterOperator",
    ],
    function (TableDelegate, Text, Filter, FilterOperator) {
        var MyDelegate = Object.assign({}, TableDelegate)

        MyDelegate.fetchProperties = function (oTable) {
            var aProperties = [
                {
                    key: "name",
                    label: "Name",
                    dataType: "sap.ui.model.type.String",
                },
                {
                    key: "price",
                    label: "Price",
                    dataType: "sap.ui.model.type.Integer",
                },
            ]
            return Promise.resolve(aProperties)
        }

        MyDelegate.addItem = function (oTable, sPropertyKey, mPropertyBag) {
            return TableDelegate.addItem
                .call(this, oTable, sPropertyKey, mPropertyBag)
                .then(function (oColumn) {
                    oColumn.setTemplate(
                        new Text({ text: "{" + sPropertyKey + "}" })
                    )
                    return oColumn
                })
        }

        MyDelegate.updateBindingInfo = function (oTable, oBindingInfo) {
            TableDelegate.updateBindingInfo.call(this, oTable, oBindingInfo)
            oBindingInfo.path = oTable.getPayload().bindingPath
        }

        MyDelegate.getFilters = function (oTable) {
            var sSearch =
                oTable._oSearchField && oTable._oSearchField.getValue()
            if (sSearch) {
                return [new Filter("name", FilterOperator.Contains, sSearch)]
            }
            return []
        }

        return MyDelegate
    }
)
```

## ValueHelp with JSON

Load content dynamically via fragments in `retrieveContent`:

```javascript
MyVHDelegate.retrieveContent = function (oValueHelp, oContainer) {
    return Fragment.load({
        name: "my.app.fragment.ValueHelpContent",
    }).then(function (oContent) {
        oContainer.addContent(oContent)
    })
}
```

Use `filterFields="$search"` on MTable content for automatic client-side filtering.

## When to use JSON delegates

- **Prototyping:** rapid UI development without backend service
- **Local/static data:** configuration lists, enum values, cached data
- **CAP development:** mock data during early development before OData service is stable
- **Hybrid scenarios:** part of the UI driven by JSON while other parts use OData V4
