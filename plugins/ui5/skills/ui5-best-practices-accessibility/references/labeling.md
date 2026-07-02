# Labeling and Description

Proper labeling ensures screen readers announce the purpose of every interactive element.

All user-facing text in the snippets below is bound via `{i18n>...}` — bind every UI
text to the resource model, never hard-code English literals in the view.

## 1. Input controls — `<Label labelFor>`

**Wrong:** label and input not connected
```xml
<Label text="{i18n>firstNameLabel}"/>
<Input id="firstName"/>
```

**Correct:**
```xml
<Label text="{i18n>firstNameLabel}" labelFor="firstName"/>
<Input id="firstName"/>
```

**Exception — `SimpleForm`:** the framework connects `Label` and `Input` automatically
based on position. Do NOT set `labelFor` manually inside a `SimpleForm`.
```xml
<form:SimpleForm>
  <Label text="{i18n>firstNameLabel}"/>        <!-- labelFor not needed here -->
  <Input placeholder="{i18n>firstNamePlaceholder}"/>
</form:SimpleForm>
```

## 2. Icon-only buttons — `tooltip`

**Wrong:**
```xml
<Button icon="sap-icon://action"/>
```

**Correct:**
```xml
<Button icon="sap-icon://action" tooltip="{i18n>performActionTooltip}"/>
```

## 3. Tables — `ariaLabelledBy`

```xml
<Title id="productsTitle" text="{i18n>productsTitle}"/>
<Table ariaLabelledBy="productsTitle">
  ...
</Table>
```

## 4. Dialogs — title or `ariaLabelledBy`

Three valid patterns — do not flag any of them:

**Correct A — `title` property:**
```js
new Dialog({
  title: oResourceBundle.getText("confirmDeletionTitle"),
  content: [...]
})
```

**Correct B — `customHeader` with a `Title`** (framework auto-links it):
```js
new Dialog({
  customHeader: new Toolbar({
    content: [new Title({
      id: "dlgTitle",
      text: oResourceBundle.getText("confirmDeletionTitle"),
      level: TitleLevel.H1
    })]
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
    new Title({
      id: "dlgTitle",
      text: oResourceBundle.getText("confirmDeletionTitle"),
      level: TitleLevel.H1
    }),
    new Text({ text: oResourceBundle.getText("cannotBeUndoneText") })
  ]
})
```

**Wrong — no label at all:**
```js
new Dialog({
  showHeader: false,
  content: [new Text({ text: oResourceBundle.getText("cannotBeUndoneText") })]
})
```

`oResourceBundle` is retrieved once per controller, typically in `onInit`:
```js
this.oResourceBundle = this.getOwnerComponent()
  .getModel("i18n")
  .getResourceBundle();
```

## 5. Images

```xml
<!-- Non-decorative: provide alt text -->
<Image src="product.png" alt="{i18n>notebookProductAlt}" decorative="false"/>

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
<core:Icon src="sap-icon://warning" alt="{i18n>warningIconAlt}"/>

<!-- Decorative icon — mark explicitly so screen readers skip it -->
<core:Icon src="sap-icon://favorite" decorative="true"/>
```

Note: for icon-only `sap.m.Button`, use `tooltip` instead — see section 2 above.

## 7. Popovers

```xml
<Popover title="{i18n>productDetailsTitle}" ariaLabelledBy="popTitle">
  <Text id="popTitle" text="{i18n>additionalLabellingContext}"/>
  ...
</Popover>
```

For description (additional context):
```xml
<Popover title="{i18n>productDetailsTitle}" ariaDescribedBy="popDesc">
  <Text id="popDesc" text="{i18n>productDetailsDescription}"/>
</Popover>
```

## 8. Static ARIA references — `core:InvisibleText`

Use when two controls share a visual label or when `<Label labelFor>` is not applicable:

```xml
<core:InvisibleText id="postalLabel" text="{i18n>postalCodeLabel}"/>
<core:InvisibleText id="cityLabel" text="{i18n>cityLabel}"/>
<Input ariaLabelledBy="postalLabel" value="{addr>/postalCode}" fieldWidth="35%"/>
<Input ariaLabelledBy="cityLabel" value="{addr>/city}" fieldWidth="35%"/>
```

Place `InvisibleText` nodes before the controls that reference them.
