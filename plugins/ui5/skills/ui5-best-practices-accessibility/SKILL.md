---
name: ui5-best-practices-accessibility
description: >
  This skill should be used when the user asks to audit, fix, check, review, or
  improve accessibility, a11y, ARIA, landmarks, labeling, heading levels,
  keyboard shortcuts, screen reader support, invisible messaging, reading order,
  or touch target size in UI5 application files (views, fragments, controllers).
  Also use when the user creates a new UI5 view, fragment, or controller and
  wants it to be accessible, or asks whether a specific control (Dialog, Table,
  Panel, etc.) meets accessibility requirements.
allowed-tools: Read Bash AskUserQuestion
---

# Accessibility Review

Accessibility in UI5 is incorporated in two levels: framework and application.
This review supports what application developers must still provide explicitly
to improve the accessibility of their application.

## Step 1 — Find the files

If `$ARGUMENTS` lists specific files, review only those.

Otherwise, discover all app source files automatically:

```!
find . \( -name "*.view.xml" -o -name "*.fragment.xml" -o -name "*.controller.js" \) \
  -not -path "*/node_modules/*" \
  -not -path "*/dist/*" \
  -not -path "*/test/*" \
  -not -path "*/resources/*" \
  | sort
```

If more than 15 files are found, use `AskUserQuestion` to let the user choose:
- Review everything (may take a moment)
- Focus on a specific folder or area

Read each file in scope.

## Step 2 — Review

Check the code against the eight topics below. For each topic where you find a gap,
**read the corresponding topic file before writing the fix** — it contains the correct
API pattern and wrong/correct examples.

| # | Topic | What to detect | Topic file |
|---|-------|---------------|------------|
| 1 | Landmarks | `DynamicPage`, `Page`, `Panel`, `ObjectPage`, `FlexibleColumnLayout` missing `landmarkInfo` or `accessibleRole`; landmark role set without its corresponding label (e.g. `rootRole` without `rootLabel`) | `${CLAUDE_SKILL_DIR}/references/landmark.md` |
| 2 | Labeling | Inputs without `<Label labelFor>` (except inside `SimpleForm`); Tables without `ariaLabelledBy`; icon-only `Button` without `tooltip`; standalone `Icon` without `alt` and not marked `decorative`; `Image` with `decorative=false` and no `alt`; `Dialog` with `showHeader:false` and no `ariaLabelledBy` | `${CLAUDE_SKILL_DIR}/references/labeling.md` |
| 3 | Heading levels | `<Title>` without explicit `level`; heading level jumps (e.g. H1 → H3) within a view | `${CLAUDE_SKILL_DIR}/references/heading.md` |
| 4 | Focus handling | `Dialog` or `Popover` without `initialFocus` when a specific starting element is required; larger composite areas that act as distinct logical regions and need a `sap-ui-fastnavgroup` `CustomData` entry; `tabindex` values greater than 0 in rendered HTML | `${CLAUDE_SKILL_DIR}/references/keyboard.md` |
| 5 | Keyboard shortcuts | Action buttons (save, delete, etc.) using plain `press=".onX"` that should support keyboard shortcuts but have no `CommandExecution` | `${CLAUDE_SKILL_DIR}/references/shortcut.md` |
| 6 | Invisible messaging | Dynamic state changes (save confirmations, errors, filter results) that are visible-only with no `InvisibleMessage.announce()` call in the handler | `${CLAUDE_SKILL_DIR}/references/invisible-message.md` |
| 7 | Reading order | Controls visually reordered via CSS/layout but out of sequence in XML; `ariaDescribedBy` pointing to IDs that appear later in the DOM | `${CLAUDE_SKILL_DIR}/references/reading-order.md` |
| 8 | Target size | `Link`, `ObjectIdentifier`, `ObjectStatus`, `ObjectNumber`, `ObjectMarker`, `ObjectAttribute` inside an interactive container without `reactiveAreaMode`; or in other dense layout without spacing | `${CLAUDE_SKILL_DIR}/references/target-size.md` |

## Step 3 — Report

For each gap found:

**Issue**: one line — names the control and the missing property/association
**Impact**: `critical` (blocks AT users entirely) | `serious` (significant barrier) | `moderate` (partial barrier) | `minor` (best practice, low direct impact)
**Why**: one sentence on user impact
**Fix**: minimal corrected XML or JS snippet (only the changed part)

Group findings by topic, critical/serious first within each group. End with a summary count by impact level.
If no gaps are found, say so.
