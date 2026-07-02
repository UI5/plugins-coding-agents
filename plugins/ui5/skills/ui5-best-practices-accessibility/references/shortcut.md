# Keyboard Shortcuts — CommandExecution Pattern

UI5 keyboard shortcuts use `core:CommandExecution` to decouple keyboard bindings from
button press handlers. Three steps are required.

## Step 1 — Register commands in `manifest.json`

```json
"sap.ui5": {
  "commands": {
    "Save":   { "shortcut": "Ctrl+S" },
    "Delete": { "shortcut": "Ctrl+D" }
  }
}
```

## Step 2 — Declare `CommandExecution` in the view

Add to the `dependents` aggregation of the view root or `Page`:

```xml
<Page>
  <dependents>
    <core:CommandExecution command="Save"   enabled="true" execute=".onSave"/>
    <core:CommandExecution command="Delete" enabled="true" execute=".onDelete"/>
  </dependents>
  ...
</Page>
```

## Step 3 — Wire buttons with the `cmd:` prefix

```xml
<Button text="{i18n>saveButton}"   press="cmd:Save"   tooltip="{i18n>saveButtonTooltip}"/>
<Button text="{i18n>deleteButton}" press="cmd:Delete" tooltip="{i18n>deleteButtonTooltip}"/>
```

`press="cmd:Save"` routes through `CommandExecution` to `.onSave`. Both the keyboard
shortcut and the button click call the same handler — no duplicate logic needed.

Bind `text` and `tooltip` to `{i18n>...}` keys as shown — the tooltip strings should
include the shortcut hint (e.g. `saveButtonTooltip = "Save (Ctrl+S)"`) so keyboard
users discover the shortcut. Never hard-code the English literals in the view.

## Common predefined shortcuts

| Command name | Default shortcut |
|---|---|
| `Save`   | Ctrl+S |
| `Delete` | Ctrl+D |

Custom command names and shortcuts can be freely defined in the `commands` section
of `manifest.json`.
