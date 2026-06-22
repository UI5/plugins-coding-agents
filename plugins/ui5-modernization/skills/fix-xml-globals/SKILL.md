---
name: fix-xml-globals
description: |
  Fix XML view/fragment issues that UI5 linter reports but cannot auto-fix. Use this skill when linter outputs these rules:
  - `no-globals` - For ALL global variable access in XML views — sap.*, jQuery.*, AND app-namespace globals (e.g., com.example.app.utils.Handler.onPress, my.app.formatter.method, sap.ui.model.type.Currency)
  - `no-ambiguous-event-handler` - For event handlers without dot prefix or local name
  - `no-deprecated-api` - For legacy template:require syntax (space-separated)
  Trigger on XML view/fragment files with errors about global variables, event handlers, formatters, type references in bindings, factory functions, or template:require.
  Automatically adds core:require declarations, fixes event handler prefixes, and handles .bind($control) for functions that use 'this'.
  IMPORTANT: The linter reports app-namespace globals in XML under `no-globals` — these MUST be fixed by this skill in Phase 3, NOT deferred to fix-linter-blind-spots (Phase 3, Step 3.2).
  For native HTML or SVG in XML views, use the fix-xml-native-html skill instead.
---

# Fix XML Views/Fragments Global Access

This skill fixes XML view and fragment issues that the UI5 linter detects but cannot auto-fix because they require understanding of module paths and handler locations.

## Linter Rules Handled

| Rule ID | Message Pattern | This Skill's Action |
|---------|-----------------|---------------------|
| `no-globals` | Access of global variable '...' (...) | Add `core:require` and use local name |
| `no-ambiguous-event-handler` | Event handler '...' must be prefixed by a dot '.' or refer to a local name | Add `.` prefix for controller methods or add `core:require` for modules |
| `no-deprecated-api` | Usage of space-separated list '...' in template:require | Convert to object notation |

## When to Use

Apply this skill when you see linter output like:
```
Main.view.xml:15:5 error Access of global variable 'formatter' (my.app.model.formatter)  no-globals
Main.view.xml:20:5 warning Event handler 'onPress' must be prefixed by a dot '.' or refer to a local name  no-ambiguous-event-handler
Main.view.xml:25:5 error Usage of space-separated list 'formatter helper' in template:require  no-deprecated-api
```

## Fix Strategy

### 1. `no-globals` - Fix Global Variable Access with core:require

When a formatter, type, or utility function is accessed via global namespace (e.g., `my.app.formatter.formatDate`), add a `core:require` declaration and use the local name.

**Step 1: Add xmlns:core namespace if not present**
```xml
<mvc:View
    xmlns:mvc="sap.ui.core.mvc"
    xmlns:core="sap.ui.core"
    xmlns="sap.m">
```

**Step 2: Add core:require on the nearest control that uses the module**

Place `core:require` on the **control that uses the global reference**. If multiple controls use the same module, place it on their **nearest common ancestor**. See the "core:require Placement Rules" section below for details.

```xml
<!-- Single usage — core:require on the control itself -->
<Text core:require="{formatter: 'my/app/model/formatter'}"
      text="{path: 'date', formatter: 'formatter.formatDate'}" />
```

```xml
<!-- Multiple usages — core:require on nearest common ancestor -->
<VBox core:require="{formatter: 'my/app/model/formatter'}">
    <Text text="{path: 'date', formatter: 'formatter.formatDate'}" />
    <Text text="{path: 'name', formatter: 'formatter.formatName'}" />
</VBox>
```

**Step 3: Update references to use local name**
```xml
<!-- Before -->
<Text text="{path: 'date', formatter: 'my.app.model.formatter.formatDate'}" />

<!-- After -->
<Text text="{path: 'date', formatter: 'formatter.formatDate'}" />
```

**Step 4: Add `.bind($control)` for formatters that use `this`**

If a formatter function accesses `this` internally, add `.bind($control)` to preserve the control context. This applies **only to formatters** — never add `.bind($control)` to event handlers or factory functions.

```xml
<!-- If formatter.formatWithContext uses 'this' to access the control -->
<Text core:require="{formatter: 'my/app/model/formatter'}"
      text="{path: 'name', formatter: 'formatter.formatWithContext.bind($control)'}" />
```

### 2. `no-ambiguous-event-handler` - Fix Event Handlers

Event handlers must either:
- Start with a dot (`.`) to indicate controller method
- Use a locally required module name

**Controller method (add dot prefix):**
```xml
<!-- Before -->
<Button press="onPress" />

<!-- After -->
<Button press=".onPress" />
```

**Module method (use core:require):**
```xml
<!-- Before -->
<Button press="my.app.util.Handler.onPress" />

<!-- After - with core:require -->
<mvc:View
    core:require="{
        Handler: 'my/app/util/Handler'
    }">
    <Button press="Handler.onPress" />
</mvc:View>
```

### 3. `no-deprecated-api` - Fix Legacy template:require Syntax

Convert space-separated module list to object notation.

```xml
<!-- Before -->
<template:require name="formatter helper" />

<!-- After -->
<template:require name="{
    formatter: 'my/app/model/formatter',
    helper: 'my/app/util/helper'
}" />
```

### 4. Handle Multiple Global References

When multiple globals are used, combine them in a single core:require on their nearest common ancestor.

```xml
<mvc:View
    xmlns:mvc="sap.ui.core.mvc"
    xmlns:core="sap.ui.core"
    xmlns="sap.m"
    core:require="{
        formatter: 'my/app/model/formatter',
        types: 'my/app/model/types',
        utils: 'my/app/util/utils'
    }">
```

### 5. `no-globals` - Fix Type Property in Bindings

When a global is used in the `type` property of a binding object, it also needs `core:require`.

```xml
<!-- Before -->
<Input value="{
    path: '/amount',
    type: 'sap.ui.model.type.Currency'
}" />

<!-- After -->
<Input core:require="{Currency: 'sap/ui/model/type/Currency'}"
       value="{
           path: '/amount',
           type: 'Currency'
       }" />
```

This applies to all UI5 types (`Currency`, `Date`, `Float`, `Integer`, `String`, etc.) and custom type classes.

### 6. `no-globals` - Fix Factory Functions

Factory functions (e.g., `factory` attribute on `List`) follow the same `core:require` pattern but **never** use `.bind($control)`.

```xml
<!-- Before -->
<List items="{/items}" factory="my.app.util.ListFactory.createItem" />

<!-- After — no .bind($control) for factories -->
<List core:require="{ListFactory: 'my/app/util/ListFactory'}"
      items="{/items}" factory="ListFactory.createItem" />
```

## core:require Placement Rules

A module declared via `core:require` is only accessible to that element and its descendants — not siblings.

- **Single control uses the module**: place `core:require` directly on that control
- **Multiple controls use the same module**: place `core:require` on their **nearest common ancestor**
- **All controls are direct children of View**: placing on the View root is acceptable

Prefer granular placement over always using the root — it reduces unnecessary scope and makes the dependency clear at the point of use.

For detailed examples (granular placement across nested elements, scope errors with sibling elements), see `references/placement-and-binding.md`.

## When to Use `.bind($control)`

When a function is called via `core:require`, it does **not** automatically receive a `this` context. Whether to add `.bind($control)` depends on the **usage type** — formatter, factory, or event handler:

| Usage Type | `.bind($control)` | Why |
|---|---|---|
| **Formatter** (inside `{path:..., formatter:'...'}` or `{parts:[...], formatter:'...'}`) | Yes, if function uses `this` | `this` = the control instance owning the binding. `$control` resolves to the ManagedObject at runtime. |
| **Factory** (`factory=` attribute on aggregation binding) | **No** — never add `.bind()` | Factory functions receive `(sId, oContext)` as parameters. They don't use `this` for control context. Adding `.bind()` is unnecessary and incorrect. |
| **Event handler** (`press=`, `change=`, `confirm=`, `select=`, `valueHelpRequest=`, etc.) | **No** — never add `.bind()` | Event handler resolution in XML with `core:require` calls the function directly with the event as parameter. Adding `.bind()` interferes with this resolution. |

**How to detect usage type in XML:**
- **Formatter**: appears inside a binding expression — `{path:..., formatter:'Module.fn'}` or `{parts:[...], formatter:'Module.fn'}`
- **Factory**: appears as `factory='Module.fn'` attribute on an aggregation binding
- **Event handler**: appears as an event attribute like `press=`, `change=`, `confirm=`, `cancel=`, `select=`, `selectionChange=`, `valueHelpRequest=`, `tokenUpdate=`, `close=`, `delete=`, `titlePress=`

**The formatter-specific rule:**
- Check the function's implementation — if it uses `this`, add `.bind($control)`
- Always use `$control` (NOT `$controller`) — this binds to the control instance
- If the function does not use `this`, omit `.bind($control)`

```xml
<!-- Formatter that uses 'this' → must bind -->
<Text core:require="{formatter: 'my/app/model/formatter'}"
      text="{path: 'name', formatter: 'formatter.formatWithContext.bind($control)'}" />

<!-- Formatter that does NOT use 'this' → no bind needed -->
<Text core:require="{formatter: 'my/app/model/formatter'}"
      text="{path: 'date', formatter: 'formatter.formatDate'}" />

<!-- Factory → NEVER bind -->
<List core:require="{ListFactory: 'my/app/util/ListFactory'}"
      items="{/items}" factory="ListFactory.createItem" />

<!-- Event handler → NEVER bind -->
<Button core:require="{Handler: 'my/app/util/Handler'}"
        press="Handler.onExport" />
```

**Detection: run `scripts/verify-this-bind.js audit-fn`.** The script handles every `this` form in one pass — member access, dynamic property, bare arg (`jQuery.proxy(fn, this)`, `.call(this)`, `.apply(this)`, `.bind(this)`), aliased (`var self = this; self.foo`), and arrow-inherited. Comments and string literals are stripped; nested non-arrow function bodies are excluded (they own their own `this`); arrow bodies are kept (they inherit). Standard UI5 types (`sap.ui.model.type.*`) never need binding and the script confirms this. Manual `grep` is not allowed for batch decisions — the script is canonical.

```bash
node scripts/verify-this-bind.js audit-fn --file <module.js> --fn <name> [--fn <name> ...]
```

Functions reported `USES_THIS` MUST have `.bind($control)` appended in XML. Functions reported `NO_THIS` MUST NOT have it. Do NOT classify by name shape — `formatX` / `decideX` / `isX` are not proof of pure-value formatters; only the source body is.

Why a script and not `grep`: searching for `this\.` (the dot form) silently misses bare-`this` idioms. `jQuery.proxy(fn, this)` passes `this` as a positional argument with no dot anywhere — an eyeball or a naive `grep` walks past it, the formatter looks pure, and `.bind($control)` is omitted. At runtime the proxied callback ends up with the wrong context and `this.getModel(...)` throws. The script's `\bthis\b` scan combined with alias tracking catches every variant in one go. Fall back to `grep -nE '\bthis\b' <module.js>` only if the script is unavailable.

For full before/after examples (formatter, handler, factory) see `references/placement-and-binding.md`.

## FragmentDefinition Handling

Fragments use `<core:FragmentDefinition>` instead of `<mvc:View>`. The same placement principle applies, with one key difference:

**Place `core:require` on the child control, NOT on FragmentDefinition.** `FragmentDefinition` is a structural wrapper, not a real control. Place `core:require` on the actual root control inside it (e.g., `Dialog`, `VBox`) or on the nearest common ancestor of the controls using the module.

```xml
<!-- PREFERRED: core:require on Dialog (the actual root control) -->
<core:FragmentDefinition xmlns="sap.m" xmlns:core="sap.ui.core">
    <Dialog title="Settings"
            core:require="{formatter: 'my/app/model/formatter', Actions: 'my/app/util/Actions'}">
        <content>
            <Input value="{path: 'name', formatter: 'formatter.toUpperCase'}" />
            <Button text="Save" press="Actions.onSave" />
        </content>
    </Dialog>
</core:FragmentDefinition>
```

**Exception:** When a fragment has multiple direct children that all need the same module, `FragmentDefinition` becomes the nearest common ancestor — placing `core:require` there is acceptable.

For examples of multi-child fragments and scoped modules within fragments, see `references/placement-and-binding.md`.

## Additional Edge Cases

### Name Conflicts

When multiple modules share the same class name, use descriptive aliases:

```xml
<mvc:View xmlns:mvc="sap.ui.core.mvc" xmlns="sap.m" xmlns:core="sap.ui.core"
          core:require="{
              ReportFormatter: 'my/app/report/Formatter',
              KPIFormatter: 'my/app/kpi/Formatter'
          }">
    <Input value="{path: 'report', formatter: 'ReportFormatter.format'}" />
    <Text text="{path: 'kpi', formatter: 'KPIFormatter.format'}" />
</mvc:View>
```

### Formatters with Multiple Parameters

When a binding expression uses a formatter with multiple parts, the `core:require` is the same — only the global namespace in the formatter reference changes.

```xml
<!-- Before -->
<Text text="{
    parts: [
        {path: 'firstName'},
        {path: 'lastName'}
    ],
    formatter: 'my.app.model.formatter.formatFullName'
}" />

<!-- After (with core:require for formatter on the view root) -->
<Text text="{
    parts: [
        {path: 'firstName'},
        {path: 'lastName'}
    ],
    formatter: 'formatter.formatFullName'
}" />
```

### Globals Accessed Inside Expression Bindings

Expression bindings that reference globals via the `${...}` syntax also need `core:require`.

```xml
<!-- Before -->
<Text visible="{= ${/count} > 0}" text="{= my.app.model.formatter.formatCount(${/count})}" />

<!-- After -->
<Text visible="{= ${/count} > 0}" text="{= formatter.formatCount(${/count})}" />
```

## App-Namespace Globals in XML

The UI5 linter reports app-namespace globals in XML under the `no-globals` rule — the same rule used for `sap.*` and `jQuery.*` globals. **This skill handles ALL `no-globals` in XML files**, including:

1. **sap namespace** — `sap.m.ButtonType.Accept`, `sap.ui.model.type.Currency` → `core:require` the module
2. **jQuery namespace** — `jQuery.sap.getModulePath` → `core:require`
3. **App namespace event handlers** — `com.example.app.utils.Handler.onPress` → `core:require` the utility module
4. **App namespace formatters** — `com.example.app.model.formatter.formatDate` → `core:require` the formatter module

The fix pattern is identical for all: add `core:require` attribute with the module path (dots → slashes), replace the dotted global with the local alias.

**Before:**
```xml
<core:FragmentDefinition xmlns="sap.m" xmlns:core="sap.ui.core">
    <Button press="com.example.app.utils.Handler.onPress" />
</core:FragmentDefinition>
```

**After:**
```xml
<core:FragmentDefinition xmlns="sap.m" xmlns:core="sap.ui.core">
    <Button core:require="{Handler: 'com/example/app/utils/Handler'}"
            press="Handler.onPress" />
</core:FragmentDefinition>
```

Apply `.bind($control)` rules from the "When to Use `.bind($control)`" section — formatters: yes (if function uses `this`); factories: never; event handlers: never.

**Important:** Do NOT defer app-namespace XML globals to `fix-linter-blind-spots` (Phase 3, Step 3.2). That skill handles only JS app-namespace globals which the linter cannot detect. XML app-namespace globals ARE reported by the linter and MUST be fixed here in Phase 3.

## Implementation Steps

1. Read the XML view/fragment file
2. Parse to identify linter errors by rule ID:
   - `no-globals`: Global namespace references in bindings (formatters, types, event handlers, factories)
   - `no-ambiguous-event-handler`: Event handlers without proper prefix
   - `no-deprecated-api`: Legacy template:require syntax
3. For `no-globals` errors:
   - Add `xmlns:core="sap.ui.core"` to the root element if not present
   - Determine module path: convert dot notation to slash notation (e.g., `my.app.formatter` → `my/app/formatter`)
   - Determine placement: find the **nearest control** using the module, or the **nearest common ancestor** if multiple controls use it
   - For fragments: prefer placing `core:require` on the actual root control (e.g., `Dialog`), not on `FragmentDefinition`
   - **Mandatory per-formatter source audit.** For every formatter renamed in this batch, run `node scripts/verify-this-bind.js audit-fn --file <module.js> --fn <name> [--fn <name> ...]` (batch as many `--fn` flags as the file has formatters). Functions reported `USES_THIS` MUST have `.bind($control)` appended in the XML formatter ref. Functions reported `NO_THIS` MUST NOT. Factories and event handlers never bind regardless of their `this` usage.
   - Build `core:require` object with all needed modules (use aliases for name conflicts)
   - Update all references to use the local names
4. For `no-ambiguous-event-handler` errors:
   - Use the linter-reported `line:col` to locate the exact attribute. Read only that line.
   - Edit ONLY the value at that coordinate. Prepend `.` for a bare handler name; or apply `core:require` + alias replacement for a namespace path.
   - DO NOT search the file for other occurrences of the same handler-name string. The linter has already enumerated every offending site — if a string appears elsewhere and was NOT reported, it is a different attribute (`id`, `selectedKey`, `key`, `name`, plain text, …) and MUST NOT be modified. One linter finding → one edit.
5. For `no-deprecated-api` (template:require):
   - Convert space-separated list to object notation
6. Write the updated file
7. **Post-edit verification (mandatory).** After all XML edits in this phase and before declaring done:

   ```bash
   node scripts/verify-this-bind.js verify-xml \
       --xml-root webapp \
       --js-roots webapp/utils,webapp/model
   ```

   Exit 0 → done. Exit 1 → fix the listed `MISSING_BIND` violations and re-run. The script is the gate; agent-side eyeballing is not.

## Example Fix

**Example 1: Basic — formatter + event handler**

Given linter output:
```
Main.view.xml:15:5 error Access of global variable 'formatter' (my.app.model.formatter)  no-globals
Main.view.xml:20:5 warning Event handler 'onPress' must be prefixed by a dot '.' or refer to a local name  no-ambiguous-event-handler
```

**Main.view.xml transformation:**

```xml
<!-- Before -->
<mvc:View
    controllerName="my.app.controller.Main"
    xmlns:mvc="sap.ui.core.mvc"
    xmlns="sap.m">
    <Page title="Main">
        <content>
            <Text text="{path: 'date', formatter: 'my.app.model.formatter.formatDate'}" />
            <Button text="Submit" press="onPress" />
        </content>
    </Page>
</mvc:View>

<!-- After -->
<mvc:View
    controllerName="my.app.controller.Main"
    xmlns:mvc="sap.ui.core.mvc"
    xmlns:core="sap.ui.core"
    xmlns="sap.m"
    core:require="{
        formatter: 'my/app/model/formatter'
    }">
    <Page title="Main">
        <content>
            <Text text="{path: 'date', formatter: 'formatter.formatDate'}" />
            <Button text="Submit" press=".onPress" />
        </content>
    </Page>
</mvc:View>
```

**Example 2: Advanced — granular placement, type binding, .bind($control)**

Given linter output:
```
OrderDetail.view.xml:8:9 error Access of global variable 'formatter' (my.app.model.formatter)  no-globals
OrderDetail.view.xml:10:13 error Access of global variable 'Currency' (sap.ui.model.type.Currency)  no-globals
OrderDetail.view.xml:14:13 error Access of global variable 'Handler' (my.app.util.Handler)  no-globals
OrderDetail.view.xml:18:9 warning Event handler 'onBack' must be prefixed by a dot '.'  no-ambiguous-event-handler
```

```xml
<!-- Before -->
<mvc:View controllerName="my.app.controller.OrderDetail"
    xmlns:mvc="sap.ui.core.mvc" xmlns="sap.m">
    <Page title="Order">
        <content>
            <Text text="{path: 'status', formatter: 'my.app.model.formatter.formatStatus'}" />
            <VBox>
                <Input value="{path: '/amount', type: 'sap.ui.model.type.Currency'}" />
                <Text text="{path: 'note', formatter: 'my.app.model.formatter.formatNote'}" />
            </VBox>
        </content>
        <footer>
            <Bar>
                <contentRight>
                    <Button text="Export" press="my.app.util.Handler.onExport" />
                </contentRight>
            </Bar>
        </footer>
        <headerContent>
            <Button press="onBack" icon="sap-icon://nav-back" />
        </headerContent>
    </Page>
</mvc:View>

<!-- After -->
<mvc:View controllerName="my.app.controller.OrderDetail"
    xmlns:mvc="sap.ui.core.mvc" xmlns="sap.m" xmlns:core="sap.ui.core">
    <Page title="Order"
          core:require="{formatter: 'my/app/model/formatter'}">
        <content>
            <Text text="{path: 'status', formatter: 'formatter.formatStatus'}" />
            <VBox>
                <Input core:require="{Currency: 'sap/ui/model/type/Currency'}"
                       value="{path: '/amount', type: 'Currency'}" />
                <Text text="{path: 'note', formatter: 'formatter.formatNote'}" />
            </VBox>
        </content>
        <footer>
            <Bar>
                <contentRight>
                    <Button core:require="{Handler: 'my/app/util/Handler'}"
                            text="Export" press="Handler.onExport" />
                </contentRight>
            </Bar>
        </footer>
        <headerContent>
            <Button press=".onBack" icon="sap-icon://nav-back" />
        </headerContent>
    </Page>
</mvc:View>
```

**Placement decisions:**
- `formatter` used in two `<Text>` controls across `content` — `core:require` on `Page` (nearest common ancestor)
- `Currency` only used by one `<Input>` — `core:require` directly on `Input`
- `Handler` only used by one `<Button>` in footer — `core:require` directly on `Button`
- `Handler.onExport` is an event handler — no `.bind($control)` (event handlers never need it)
- `onBack` is a simple controller method — dot prefix added

## Notes

- Place `core:require` on the **nearest control** that uses the module, or the **nearest common ancestor** when multiple controls share it — prefer granular placement over always using the root
- Module paths in `core:require` use forward slashes (`/`), not dots
- Multiple modules are separated by commas in the JSON object notation
- Use descriptive aliases to avoid name conflicts between modules with the same class name
- Always check the usage type first: formatters may need `.bind($control)` if the function uses `this`; factories and event handlers never need it
- For fragments, place `core:require` on the actual child control (e.g., `Dialog`), not on `FragmentDefinition` unless it's the only common ancestor
- Ensure the formatter/utility module exists at the specified path
- For complex cases with dynamic module loading, consider using `sap.ui.require` in the controller instead
- **Name-pattern shortcuts are forbidden for `this` detection.** Formatter names like `formatX`, `decideX`, `isX`, `getX` are not proof of pure-value behaviour. Common patterns that look pure but read `this`:
  - Reads context-bound state via `this.getModel(...)`, `this.getBindingContext()`, `this.getId()` — often inside helper branches
  - Passes bare `this` to a callback wrapper such as `jQuery.proxy(fn, this)`, `fn.call(this)`, `fn.apply(this)`, or `fn.bind(this)` — the call has no `.` after `this`, so a casual read sees no member access
  - Aliases `this` first (`var self = this; ... self.getX()`) — the body of the formatter never mentions `this` after the alias line

  Each of these breaks at runtime when the formatter is called without `.bind($control)`, because `this` is not bound to the control by default. The `verify-this-bind.js` script catches all of these forms in one pass; eyeballing or `grep 'this\\.'` misses them. Always run the script — never skip based on name.
- **Linter coordinates are authoritative for `no-ambiguous-event-handler` and `no-globals` identifier-rename.** Never use `grep` / file-wide regex to "find all uses" of a flagged identifier. The linter has already done that lookup — every offending site is in its output. Editing lines NOT in the linter output is out of scope and almost certainly incorrect: a name that appears as an event handler can also appear as a control `id`, a `selectedKey`, a binding path, or a string literal — those uses are not handlers and rewriting them silently changes runtime semantics (e.g., breaking `Fragment.byId` lookups). Exception: `core:require` insertion is file-level reasoning (place once on nearest common ancestor); applies once per file, not per finding.

## Related Skills

- **fix-xml-native-html**: For native HTML/SVG replacement in XML views (`no-deprecated-api` with "native HTML" or "SVG" messages), use fix-xml-native-html
- **fix-js-globals**: For `no-globals` in JavaScript files (controller/utility global access), use fix-js-globals — it handles the JS-side equivalent of this skill's XML fixes
