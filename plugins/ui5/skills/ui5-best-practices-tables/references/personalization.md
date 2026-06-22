# Personalization

Use `sap.m.p13n.Engine` for all personalization. Do not build custom personalization dialogs.

```javascript
Engine.getInstance().show(oTable, ["Columns", "Sort", "Filter"], {
    contentWidth: "30rem",
    contentHeight: "35rem",
    source: oButton
});
```

Register the table with the Engine before calling `show`.
