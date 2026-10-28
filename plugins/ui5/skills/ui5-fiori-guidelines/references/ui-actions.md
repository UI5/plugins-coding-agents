# UI Actions

## Contents
- [Button](#button)
- [Link](#link)
- [Toggle Button](#toggle-button)
- [Segmented Button](#segmented-button)
- [Menu Button](#menu-button)
- [Menu](#menu)
- [Split Button](#split-button)
- [Table Toolbar](#table-toolbar)

---

## Button

- **OpenUI5 / SAPUI5:** `sap.m.Button`
- **Use when:** The user needs to trigger an action — submit, save, create, delete, open a dialog.
- **Do NOT use when:**
  - Navigating to a page, object, or URL → `sap.m.Link`.
  - General navigation → Home or `sap.m.Breadcrumbs`.
  - Stepping through a multi-step process → `sap.m.Wizard`.
  - Uploading files → `sap.m.plugins.UploadSetwithTable` (single file: `sap.ui.unified.FileUploader`). Not the deprecated `sap.m.upload.UploadSet`.
  - Selecting from related options → `sap.m.RadioButtonGroup` / `sap.m.CheckBox`.
- **Rules:**
  - One `type="Emphasized"` button per page or dialog — the primary action only.
  - Header/footer toolbars: secondary → `type="Ghost"` (renders the guideline's "default" style there); negative path (Cancel) → `type="Transparent"`; positive/negative semantic actions → `type="Accept"` / `type="Reject"`, text only.
  - Content toolbars (table, form, chart): `Emphasized` only if the page's single primary action lives there, otherwise the most important button is `type="Ghost"` (the guideline's "default" style, as in header/footer toolbars); other secondary, negative path, menu and split buttons → `type="Transparent"`. No semantic types (`Accept`/`Reject`).
  - Primary, secondary, semantic, and negative path actions are text buttons. Icon-only only for universally recognizable metaphors.
  - Icon-only buttons need a `tooltip`; check the icon's default accessibility text and override it if wrong. Use the `icon` property — never an `sap.ui.core.Icon` as a button.
  - Text: short imperative verb (Save, Edit, Cancel). Affected count in parentheses: "Edit (3)". Allow for 300% text growth in translation.
  - Unavailable action → `enabled="false"`.
  - Keyboard shortcut hint → `sap.ui.core.CommandExecution`, not the tooltip.
- **Gotchas:**
  - SAP S/4HANA: icon *or* text, not both. Fiori Elements supports only text buttons, except table inline actions (icon or text, not both).
  - Changing text, icon, or tooltip after a press → announce it via `sap.ui.core.InvisibleMessage`.
  - Badges: `sap.m.BadgeCustomData` + `badgeStyle` — `Default` (counter) or `Attention` (dot), never both on one button.
  - Fixed `width` truncates the text; otherwise the button grows with it.

---

## Link / Hyperlink

- **OpenUI5 / SAPUI5:** `sap.m.Link`
- **Use when:** Navigating to another page, anchor, or external URL.
- **Do NOT use when:** Triggering an action (submit, delete, open dialog) → use `sap.m.Button` instead.
- **Rules:**
  - Link text must describe the destination — never "Click here" or "Link".
  - Use subtle emphasis only inside tables for secondary links in dense data.
  - Do not use a link with no `href` and no press handler — that is decorative and invalid.
- **Gotchas:** Icon-only links are not supported; always pair with text.

---

## Toggle Button

- **OpenUI5 / SAPUI5:** `sap.m.ToggleButton`
- **Use when:** Activating or deactivating a toolbar element (e.g. show/hide panel, toggle filter) — a two-state secondary action.
- **Do NOT use when:** Triggering a one-shot action (Create, Save, Edit) → use `sap.m.Button`. Showing many options → use a menu.
- **Rules:**
  - Use `type="Default"` (standard) for secondary actions; `type="Transparent"` for tertiary.
  - Icon-only toggle buttons must have a `tooltip`.
  - Do not change the button text or icon between toggled and untoggled — the pressed state is communicated via ARIA, not text change.
- **Gotchas:** `pressed` is the property to read/set the toggle state programmatically. Do not swap text to indicate state — screen readers will misread it.

---

## Segmented Button / View Switch

- **OpenUI5 / SAPUI5:** `sap.m.SegmentedButton`
- **Use when:** Choosing one option from a small, related set visible all at once (Year/Month/Day, Small/Medium/Large — 2–5 options).
- **Do NOT use when:** More than ~5 options → use a Select or RadioButton group. Navigation between page sections → use IconTabBar.
- **Rules:**
  - Use child `sap.m.SegmentedButtonItem` elements in the `items` aggregation, not generic buttons.
  - Icon-only segments must have a `tooltip` on each item.
- **Gotchas:** Do not use as in-page navigation — that is `sap.m.IconTabBar`. `sap.m.SegmentedButton` is single-select only. The `buttons` aggregation is **deprecated since 1.28** — use `items` (`sap.m.SegmentedButtonItem`) instead.

---

## Menu Button

- **OpenUI5 / SAPUI5:** `sap.m.MenuButton`
- **Use when:** A button that opens a dropdown menu of actions (no default action — clicking always opens the menu).
- **Do NOT use when:** You only have one action → use a plain button. You need a default action + overflow → use Split Button.
- **Rules:**
  - Use `type="Transparent"` for menu buttons in content toolbars.
  - `buttonMode` picks the behavior: `Regular` (default) — the whole button opens the menu, no default action; `Split` — a default-action area plus an arrow that opens the menu (see Split Button below).
  - On phones, menus render as a full-screen dialog automatically.
- **Gotchas:** Do not build ad-hoc menu buttons from a plain `Button` + `Menu` unless you have a specific reason — `MenuButton` is the standard control. The two modes live on one class (`sap.m.MenuButtonMode.Regular` / `.Split`); there is no separate split-button class.

---

## Menu

- **OpenUI5 / SAPUI5:** `sap.m.Menu` / `sap.m.MenuItem`
- **Use when:** A context menu or a dropdown of actions opened from a control or a right-click — the standalone menu behind a `MenuButton`, a toolbar overflow, or a table row context menu.
- **Do NOT use when:** A button should open the menu → wrap it in `sap.m.MenuButton` rather than wiring a plain `Button` to `openBy`. In-page section navigation → `sap.m.IconTabBar`. Picking one value from a list → `sap.m.Select`.
- **Rules:**
  - Put `sap.m.MenuItem` entries (nestable for submenus) in the `items` aggregation; handle `itemSelected` for the chosen action.
  - Open it with `openBy(oControl)`; it is not placed in the view like a static control.
  - Keep labels to short imperative verbs, same as button text.
- **Gotchas:** On phones the menu renders full-screen automatically. `sap.m.Menu` (`sap.m` application menu) is not `sap.ui.unified.Menu` — prefer the `sap.m` one in responsive apps.

---

## Split Button / Default Action + Menu

- **OpenUI5 / SAPUI5:** `sap.m.MenuButton` (with `buttonMode="Split"`)
- **Use when:** One default action (left area) plus a menu of additional actions (arrow area), and the default is used most often.
- **Do NOT use when:** All actions are equally weighted → use a Menu Button. Only one action exists → use a plain Button.
- **Rules:**
  - Default action uses the main button area; additional actions live in the menu.
  - Both areas share the same button type — they cannot be styled independently.
  - Use `type="Transparent"` in content toolbars.
  - `useDefaultActionOnly="true"` → the button always fires the app-defined default (first item if none). `false` (default) → it fires the user's last chosen action and the text changes to match.
  - If the default action is icon-only, every menu item needs an icon.
- **Gotchas:** The split button is `sap.m.MenuButton` with `buttonMode` set to `sap.m.MenuButtonMode.Split` — it is not a separate class. Max width 12rem; longer text truncates.

---

## Table Toolbar

- **OpenUI5 / SAPUI5:** `sap.m.OverflowToolbar` (in the table's `headerToolbar` / `extension`)
- **Use when:** The table needs a title, actions, view controls, search, or variant management placed above it.
- **Do NOT use when:** The table is used for selection only; all meaningful actions are row-level only.
- **Rules:**
  - Follow the predefined action group order: Finalizing → Business → Modification → Personalization → Share → Export → View → End slot.
  - *Create*, *Delete*, *Add*, *Remove* must never move into the overflow menu.
  - Do not show a Search field in the toolbar when a Filter Bar is present on the same page.
  - Emphasize the finalizing action only if the page has no other primary action. Otherwise give the most important button `type="Ghost"`; use `type="Transparent"` for the rest.
  - Variant Management replaces the title in most cases — do not show both unless necessary (insert a separator between them if you do).
- **Gotchas:** `sap.m.OverflowToolbar` handles responsive overflow automatically. If you use a plain `sap.m.Toolbar`, items do not overflow — critical actions may become invisible on small screens.
