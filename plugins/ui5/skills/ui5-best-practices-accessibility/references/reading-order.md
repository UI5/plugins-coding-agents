# Reading Order

Screen readers follow DOM order, not visual order. When the two differ — due to CSS,
FlexBox reordering, or absolute positioning — AT users experience a broken sequence
that does not match what sighted users see.

All user-facing strings in the snippets below use `{i18n>...}` bindings — bind every
UI text to the resource model, never hard-code English literals in the view.

## DOM order = reading order

Structure XML so controls appear in logical reading sequence. A label or title must
appear before the control it describes.

**Wrong:** description placed after the button it belongs to
```xml
<Button text="{i18n>submitOrderButton}"/>
<Text id="submitHint" text="{i18n>submitOrderHint}"/>
<!-- ariaDescribedBy="submitHint" would point forward in the DOM -->
```

**Correct:**
```xml
<core:InvisibleText id="submitHint" text="{i18n>submitOrderHint}"/>
<Button text="{i18n>submitOrderButton}" ariaDescribedBy="submitHint"/>
```

## `ariaDescribedBy` / `ariaLabelledBy` forward references

IDs referenced by `ariaDescribedBy` or `ariaLabelledBy` must already exist in the DOM
when the referencing control renders. If the visible element would appear after the
control that needs it, use `core:InvisibleText` placed before the control instead.

## Avoid `tabindex > 0`

Setting `tabindex="2"` or higher moves that element to the front of the tab order
regardless of its DOM position, creating a mismatch between reading order and tab order.
Use `tabindex="0"` (participates in natural order) or `tabindex="-1"` (skipped by Tab,
focusable programmatically) only.

## FlexBox / Grid reordering

CSS properties like `order`, `flex-direction: row-reverse`, or `grid-auto-flow` change
visual position without touching the DOM. Use them only for decorative reordering —
never to reorder content that conveys meaning or sequence to the user.
