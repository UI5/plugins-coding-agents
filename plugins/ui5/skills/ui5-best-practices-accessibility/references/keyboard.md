# Focus Handling and Keyboard Navigation

## Initial focus — `initialFocus`

When a Dialog or Popover opens, set which element receives focus. Without this, focus lands
on the first focusable element, which may not be the right starting point for the task.

```xml
<Popover title="{i18n>productDetailsTitle}" initialFocus="firstActionBtn">
  <content>
    <VBox>
      <Text text="{i18n>notebookProductName}"/>
      <Button id="firstActionBtn" text="{i18n>addToCartButton}"/>
    </VBox>
  </content>
</Popover>
```

Same attribute on `<Dialog initialFocus="elementId">`.

All user-facing strings above are bound via `{i18n>...}` — bind every UI text to the
resource model, never hard-code English literals in the view.

## F6 fast navigation

F6 / Shift+F6 lets users jump between logical groups. Some standard containers create
F6 groups automatically — for example, `sap.m.Panel` (the whole panel is one group)
and `sap.uxap.ObjectPageSection` (each section is a separate group).

**Adding or removing a custom area from the F6 chain**

Standard containers create their own F6 groups automatically. Groups can also be nested —
pressing F6 inside a nested group moves focus to the next group at that level; if none
exists, focus moves up to the parent group.

To add a custom area as an F6 group, use the `sap-ui-fastnavgroup` key via `CustomData`:

```xml
<!-- XML view -->
<VBox>
  <customData>
    <core:CustomData key="sap-ui-fastnavgroup" value="true" writeToDom="true"/>
  </customData>
</VBox>
```

```js
// Controller / JS
oControl.data("sap-ui-fastnavgroup", "true", true /* writeToDom */);
```

To remove a group that a control defines by default, set the value to `"false"`:

```js
oControl.data("sap-ui-fastnavgroup", "false", true /* writeToDom */);
```

## Custom interactive elements — `tabindex`

Native HTML elements (button, input, a) are focusable by default. Custom elements
rendered with a non-interactive tag need explicit `tabindex`:

```html
<!-- Focusable custom widget -->
<div role="combobox" tabindex="0" ...> ... </div>

<!-- Remove from tab order but keep programmatically focusable -->
<div tabindex="-1" ...> ... </div>
```

Avoid `tabindex` values greater than 0 — they override the natural reading order.
