# sap.ui.comp.filterbar.FilterBar

API: https://ui5.sap.com/#/api/sap.ui.comp.filterbar.FilterBar

## Overview

FilterBar is the lower-level filter control requiring manual `FilterGroupItem` configuration. Use it when OData annotations are not available (e.g., inside `ValueHelpDialog`) or when you need full programmatic control over filter fields. For annotation-driven filtering with OData V2, use `SmartFilterBar` instead.

## Key properties

| Property                  | Purpose                                                             |
| ------------------------- | ------------------------------------------------------------------- |
| `persistencyKey`          | Key for variant management (enables Save as Tile / Manage Variants) |
| `filterBarExpanded`       | Whether the filter bar is expanded initially (`true` by default)    |
| `advancedMode`            | Hides Go button; used inside ValueHelpDialog (`false` by default)   |
| `showGoOnFB`              | Show/hide Go button explicitly                                      |
| `showFilterConfiguration` | Show/hide "Adapt Filters" button                                    |
| `header`                  | Title text displayed above the filter bar                           |

## Key API methods

| Method               | Purpose                                                      |
| -------------------- | ------------------------------------------------------------ |
| `addFilterGroupItem` | Add a FilterGroupItem with control, name, and group          |
| `getFilters()`       | Returns array of `sap.ui.model.Filter` for all filled fields |
| `search()`           | Triggers the `search` event programmatically                 |
| `getUiState()`       | Returns current filter state as JSON (for persistence)       |
| `setUiState()`       | Restores filter state from JSON                              |
| `setFilterData()`    | Sets filter values programmatically                          |

## FilterBar usage

```xml
<comp:filterbar.FilterBar id="myFilterBar"
    header="Product Filters" showGoOnFB="true"
    showFilterConfiguration="true" filterBarExpanded="true"
    search=".onSearch">
    <comp:filterGroupItems>
        <comp:filterbar.FilterGroupItem name="name" label="Name"
            groupName="basic" visibleInFilterBar="true">
            <comp:control>
                <Input value="{filterModel>/name}"/>
            </comp:control>
        </comp:filterbar.FilterGroupItem>
        <comp:filterbar.FilterGroupItem name="category" label="Category"
            groupName="basic" visibleInFilterBar="true">
            <comp:control>
                <Select selectedKey="{filterModel>/category}"
                    items="{/Categories}">
                    <core:Item key="{ID}" text="{Name}"/>
                </Select>
            </comp:control>
        </comp:filterbar.FilterGroupItem>
        <comp:filterbar.FilterGroupItem name="createdAt" label="Created Date"
            groupName="basic" visibleInFilterBar="true">
            <comp:control>
                <DatePicker value="{filterModel>/createdAt}"/>
            </comp:control>
        </comp:filterbar.FilterGroupItem>
    </comp:filterGroupItems>
</comp:filterbar.FilterBar>
```

## Key events

| Event    | Purpose                                          |
| -------- | ------------------------------------------------ |
| `search` | Fired when Go is pressed or `search()` is called |
| `reset`  | Fired when user resets all filters               |
| `clear`  | Fired when user clears all filter values         |

## Troubleshooting

- Go button not visible: `showGoOnFB` is `false` or `advancedMode` is `true`. Set `showGoOnFB="true"` and `advancedMode="false"`.
- `getFilters()` returns empty array: filter controls are not bound or no values entered. Verify control bindings.
- Variant management not working: `persistencyKey` not set. Add a unique `persistencyKey` string.
- Filters not shown initially: `visibleInFilterBar` is `false` on FilterGroupItems. Set to `true` for default-visible fields.
- FilterGroupItem control is null: `control` aggregation not set. Each FilterGroupItem must contain exactly one control.
