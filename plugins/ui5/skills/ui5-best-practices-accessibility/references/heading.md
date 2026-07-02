# Heading Levels

Heading hierarchy lets screen reader users scan the page structure and jump between
sections. Missing or skipped heading levels break this navigation.

**Rule: every `<Title>` used as a heading must have an explicit `level` property set.**

**Wrong:**
```xml
<Title text="{i18n>orderDetailsTitle}"/>
```

**Correct:**
```xml
<Title level="H1" text="{i18n>orderDetailsTitle}"/>    <!-- page title -->
<Title level="H2" text="{i18n>lineItemsTitle}"/>       <!-- section header -->
<Title level="H3" text="{i18n>itemNotesTitle}"/>       <!-- subsection -->
```

## Heading hierarchy rules

- Each page should have exactly one `H1` — the page title.
- Section headers = `H2`, subsection headers = `H3`, and so on.
- **Never skip levels** — H1 → H3 with no H2 breaks the document outline and
  confuses AT users navigating by heading.

## `sap.m.Dialog` heading level

When using the `title` property, the framework renders it as `<h1>` automatically — no extra configuration needed. When using `customHeader` or `showHeader: false`, set `level: TitleLevel.H1` explicitly on the `Title` control.

**Wrong:**
```xml
<Dialog>
  <customHeader>
    <Toolbar>
      <Title id="dlgTitle" text="{i18n>confirmDeletionTitle}"/>
    </Toolbar>
  </customHeader>
</Dialog>
```

**Correct:**
```xml
<Dialog ariaLabelledBy="dlgTitle">
  <customHeader>
    <Toolbar>
      <Title id="dlgTitle" text="{i18n>confirmDeletionTitle}" level="H1"/>
    </Toolbar>
  </customHeader>
</Dialog>
```

## `sap.m.Panel` heading level

A `Panel` with `headerText` renders that text as a heading. If the heading level needs
to be explicitly controlled, replace `headerText` with a `headerToolbar` aggregation
containing a `Title` with an explicit `level`:

```xml
<Panel accessibleRole="Region">
  <headerToolbar>
    <Toolbar>
      <Title level="H3" text="{i18n>shippingDetailsTitle}"/>
    </Toolbar>
  </headerToolbar>
  ...
</Panel>
```

## Available values

`H1` · `H2` · `H3` · `H4` · `H5` · `H6` · `Auto` (avoid — use explicit levels)

## i18n bindings

All snippets above use `{i18n>...}` for user-facing strings — bind every UI text to
the resource model, never hard-code English literals in the view.
