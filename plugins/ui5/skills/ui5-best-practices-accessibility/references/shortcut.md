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
<Button text="Save"   press="cmd:Save"   tooltip="Save (Ctrl+S)"/>
<Button text="Delete" press="cmd:Delete" tooltip="Delete (Ctrl+D)"/>
```

`press="cmd:Save"` routes through `CommandExecution` to `.onSave`. Both the keyboard
shortcut and the button click call the same handler — no duplicate logic needed.

## Common predefined shortcuts

| Command name | Default shortcut |
|---|---|
| `Save`   | Ctrl+S |
| `Delete` | Ctrl+D |

Custom command names and shortcuts can be freely defined in the `commands` section
of `manifest.json`.
