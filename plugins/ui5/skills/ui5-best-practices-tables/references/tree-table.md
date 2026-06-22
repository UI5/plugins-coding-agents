# sap.ui.table.TreeTable

API: https://ui5.sap.com/1.136.0/api/sap.ui.table.TreeTable

## Key properties

| Property | Description |
|---|---|
| `useGroupMode` | Group headers vs. tree icons. |
| `groupHeaderProperty` | Property for group header text. |

## Hierarchical binding

JSON model:
```javascript
rows="{path: '/categories', parameters: {arrayNames: ['children']}}"
```

OData V2:
```xml
<table:TreeTable rows="{
    path: '/Nodes',
    parameters: {
        countMode: 'Inline',
        treeAnnotationProperties: {
            hierarchyLevelFor: 'HierarchyLevel',
            hierarchyNodeFor: 'NodeID',
            hierarchyParentNodeFor: 'ParentNodeID',
            hierarchyDrillStateFor: 'DrillState'
        }
    }
}">
```

Root level configuration:
```javascript
oTable.bindRows({
    path: "/Employees",
    parameters: {
        rootLevel: 1,
        navigation: { Employees: "Manager" }
    }
});
```

## Programmatic control

Use `expandToLevel`, `collapseAll`, `expand`, and `collapse` to manage hierarchy state.

## Restrictions

- No mobile equivalent.
- The first column cannot be moved or have columns moved before it (preserves tree structure).
- Fixed bottom rows are supported via `rowMode` but are typically used for summary rows only.
