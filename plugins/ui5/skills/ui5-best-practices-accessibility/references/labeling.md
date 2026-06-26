# Labeling and Description

Proper labeling ensures screen readers announce the purpose of every interactive element.

## 1. Input controls — `<Label labelFor>`

**Wrong:** label and input not connected
```xml
<Label text="First Name"/>
<Input id="firstName"/>
```

**Correct:**
```xml
<Label text="First Name" labelFor="firstName"/>
<Input id="firstName"/>
```

**Exception — `SimpleForm`:** the framework connects `Label` and `Input` automatically
based on position. Do NOT set `labelFor` manually inside a `SimpleForm`.
```xml
<form:SimpleForm>
  <Label text="First Name"/>        <!-- labelFor not needed here -->
  <Input placeholder="Enter name..."/>
</form:SimpleForm>
```

## 2. Icon-only buttons — `tooltip`

**Wrong:**
```xml
<Button icon="sap-icon://action"/>
```

**Correct:**
```xml
<Button icon="sap-icon://action" tooltip="Perform Action"/>
```

## 3. Tables — `ariaLabelledBy`

```xml
<Title id="productsTitle" text="Products"/>
<Table ariaLabelledBy="productsTitle">
  ...
</Table>
```

## 4. Dialogs — title or `ariaLabelledBy`

Three valid patterns — do not flag any of them:

**Correct A — `title` property:**
```js
new Dialog({ title: "Confirm Deletion", content: [...] })
```

**Correct B — `customHeader` with a `Title`** (framework auto-links it):
```js
new Dialog({
  customHeader: new Toolbar({
    content: [new Title({ id: "dlgTitle", text: "Confirm Deletion", level: TitleLevel.H1 })]
  }),
  content: [...]
})
```

**Correct C — `showHeader: false` + explicit `ariaLabelledBy`:**
```js
new Dialog({
  showHeader: false,
  ariaLabelledBy: "dlgTitle",
  content: [
    new Title({ id: "dlgTitle", text: "Confirm Deletion", level: TitleLevel.H1 }),
    new Text({ text: "This cannot be undone." })
  ]
})
```

**Wrong — no label at all:**
```js
new Dialog({
  showHeader: false,
  content: [new Text({ text: "This cannot be undone." })]
})
```

## 5. Images

```xml
<!-- Non-decorative: provide alt text -->
<Image src="product.png" alt="Notebook Basic 15 — front view" decorative="false"/>

<!-- Decorative: no alt needed -->
<Image src="divider.png" decorative="true"/>
```

## 6. Standalone icons — `sap.ui.core.Icon`

A standalone `Icon` that is not decorative must have an `alt` property.

**Wrong:**
```xml
<core:Icon src="sap-icon://warning"/>
```

**Correct:**
```xml
<!-- Semantic icon — provide alt text -->
<core:Icon src="sap-icon://warning" alt="Warning"/>

<!-- Decorative icon — mark explicitly so screen readers skip it -->
<core:Icon src="sap-icon://favorite" decorative="true"/>
```

Note: for icon-only `sap.m.Button`, use `tooltip` instead — see section 2 above.

## 7. Popovers

```xml
<Popover title="Product Details" ariaLabelledBy="popTitle">
  <Text id="popTitle" text="Additional labelling context"/>
  ...
</Popover>
```

For description (additional context):
```xml
<Popover title="Product Details" ariaDescribedBy="popDesc">
  <Text id="popDesc" text="Additional details about this product."/>
</Popover>
```

## 8. Static ARIA references — `core:InvisibleText`

Use when two controls share a visual label or when `<Label labelFor>` is not applicable:

```xml
<core:InvisibleText id="postalLabel" text="Postal code"/>
<core:InvisibleText id="cityLabel" text="City"/>
<Input ariaLabelledBy="postalLabel" value="12345" fieldWidth="35%"/>
<Input ariaLabelledBy="cityLabel" value="Sofia" fieldWidth="35%"/>
```

Place `InvisibleText` nodes before the controls that reference them.
