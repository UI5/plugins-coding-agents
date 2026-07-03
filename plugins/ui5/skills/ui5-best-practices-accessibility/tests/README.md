# Skill Test Fixtures

These fixtures are **not** auto-run — there is no test harness, CI job, or assertion
framework. They are reference cases for manually validating the skill's behavior.
Invoke `/ui5-best-practices-accessibility` against each file and verify the output
matches the expectations below.

## Positive fixtures — skill MUST report these gaps

### `gap-landmarks.view.xml`
| Expected finding | Topic |
|---|---|
| `Page` missing `landmarkInfo` | Landmarks |
| `Panel` missing `accessibleRole` | Landmarks |

### `gap-labeling.view.xml`
| Expected finding | Topic |
|---|---|
| `Input#productName` — `Label` missing `labelFor` | Labeling |
| `Button` icon-only — missing `tooltip` | Labeling |
| `Table` missing `ariaLabelledBy` | Labeling |

### `gap-heading-levels.view.xml`
| Expected finding | Topic |
|---|---|
| `Title "Order Details"` missing `level` property | Heading levels |
| Heading jump: H1 → H3 with no H2 | Heading levels |

### `gap-keyboard.view.xml`
| Expected finding | Topic |
|---|---|
| `VBox#filterRegion` — distinct logical region without `sap-ui-fastnavgroup` CustomData | Focus & keyboard |
| `Input` with `tabindex="3"` CustomData — value greater than 0 overrides natural reading order | Focus & keyboard |
| `Dialog#confirmDialog` — multiple focusable elements and no `initialFocus` | Focus & keyboard |

### `gap-dialog.controller.js`
| Expected finding | Topic |
|---|---|
| `Dialog` with `showHeader:false` and no `ariaLabelledBy` | Labeling |

### `gap-shortcut.view.xml`
| Expected finding | Topic |
|---|---|
| `Button "Save"` and `Button "Delete"` — no `CommandExecution`, no `cmd:` prefix | Keyboard shortcuts |

### `gap-invisible-message.controller.js`
| Expected finding | Topic |
|---|---|
| `onSaveSuccess` — MessageStrip added dynamically with no `InvisibleMessage.announce()` | Invisible messaging |
| `onSubmitError` — error shown visually only, no assertive announcement | Invisible messaging |

### `gap-reading-order.view.xml`
| Expected finding | Topic |
|---|---|
| `FlexBox direction="RowReverse"` — DOM order differs from visual order | Reading order |
| `Input ariaDescribedBy="lateNote"` — referenced ID appears after the control in DOM | Reading order |

### `gap-target-size.view.xml`
| Expected finding | Topic |
|---|---|
| `ObjectIdentifier` inside `ColumnListItem` without `reactiveAreaMode` | Target size |
| `ObjectStatus` inside `ColumnListItem` without `reactiveAreaMode` | Target size |

---

## Negative fixtures — skill MUST NOT report false positives

### `ok-all-correct.view.xml`
- Complete, correctly implemented view — **skill must return "No accessibility gaps found"**
- Covers: landmarks, SimpleForm labels, heading levels, table title, icon button tooltip, CommandExecution

### `ok-simpleform.view.xml`
- `Label` + `Input` inside `SimpleForm` without `labelFor` → **correct, do not flag**

### `ok-dialog.controller.js`
- `Dialog` with `customHeader` + `Title` and no explicit `ariaLabelledBy` → **correct, framework auto-links it**

### `ok-invisible-message.controller.js`
- Delete and error handlers each call `InvisibleMessage.announce()` → **correct, do not flag**

### `ok-target-size.view.xml`
- `ObjectIdentifier` (`titleActive`) and `ObjectStatus` (`active`) both have `reactiveAreaMode="Overlay"` → **correct, do not flag**
