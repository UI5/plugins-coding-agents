# Invisible Messaging

Use `sap.ui.core.InvisibleMessage` to announce dynamic state changes to screen reader
users who would otherwise miss purely visual updates (badge counts, success banners,
loading indicators, filter results).

All announcement text and static labels below are pulled from the i18n resource
bundle — bind every UI text to the resource model, never hard-code English literals.

## When not to use

- Do not provide information exclusively for AT users — screen reader users should not receive content that sighted users cannot access
- Do not use it to hide long texts — if the information matters, show it

## Dynamic announcements — `InvisibleMessage`

```js
sap.ui.define([
  "sap/ui/core/mvc/Controller",
  "sap/ui/core/InvisibleMessage",
  "sap/ui/core/library"
], function(Controller, InvisibleMessage, library) {
  "use strict";

  var InvisibleMessageMode = library.InvisibleMessageMode;

  return Controller.extend("my.app.Controller", {
    onInit: function () {
      this.oIM = InvisibleMessage.getInstance();
      this.oResourceBundle = this.getOwnerComponent()
        .getModel("i18n")
        .getResourceBundle();
    },

    onDeleteItems: function (iCount) {
      // ... perform deletion ...
      this.oIM.announce(
        this.oResourceBundle.getText("itemsDeletedAnnouncement", [iCount]),
        InvisibleMessageMode.Polite
      );
    },

    onSubmitError: function () {
      // ... handle error ...
      this.oIM.announce(
        this.oResourceBundle.getText("submissionFailedAnnouncement"),
        InvisibleMessageMode.Assertive
      );
    }
  });
});
```

| Mode | Behavior | When to use |
|---|---|---|
| `Polite` | Waits for a pause in current speech | Status updates, counts, non-urgent feedback |
| `Assertive` | Interrupts current speech immediately | Errors, warnings, critical state changes |

## Static ARIA references — `core:InvisibleText`

Use when you need a hidden text node that other controls reference via `ariaLabelledBy`
or `ariaDescribedBy`, and a visible `<Label>` is not suitable:

```xml
<core:InvisibleText id="postalLabel" text="{i18n>postalCodeLabel}"/>
<core:InvisibleText id="cityLabel"   text="{i18n>cityLabel}"/>
<Input ariaLabelledBy="postalLabel" value="{addr>/postalCode}" fieldWidth="35%"/>
<Input ariaLabelledBy="cityLabel"   value="{addr>/city}"       fieldWidth="35%"/>
```

Place `InvisibleText` nodes **before** the controls that reference them.
