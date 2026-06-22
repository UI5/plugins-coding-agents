# Drag & Drop

Configure drag-and-drop on the **table**, not on individual items or cells.

**❌ Wrong — DnD on the item:**
```xml
<Table items="{/products}">
    <items>
        <ColumnListItem>
            <dragDropConfig>
                <dnd:DragInfo sourceAggregation="items"/>
            </dragDropConfig>
        </ColumnListItem>
    </items>
</Table>
```

**✅ Correct — reordering within the same table using `DragInfo` + `DropInfo` with matching `groupName`:**
```xml
<Table items="{/products}">
    <items>
        <ColumnListItem><cells>...</cells></ColumnListItem>
    </items>
    <dragDropConfig>
        <dnd:DragInfo sourceAggregation="items" groupName="reorder"/>
        <dnd:DropInfo targetAggregation="items"
            groupName="reorder"
            dropPosition="Between"
            drop=".onDrop"/>
    </dragDropConfig>
</Table>
```

**✅ Alternative — using `DragDropInfo` (no `groupName` needed for same-table reorder):**
```xml
<Table items="{/products}">
    <dragDropConfig>
        <dnd:DragDropInfo sourceAggregation="items"
            targetAggregation="items"
            dropPosition="Between"
            drop=".onDrop"/>
    </dragDropConfig>
</Table>
```

## Key rules

- For reordering within the same table: use `DragDropInfo`, or set a matching `groupName` on both `DragInfo` and `DropInfo`.
- For drag between different tables: use matching `groupName` values on both tables.
- Update the bound model in the `drop` handler to reflect the new order.
