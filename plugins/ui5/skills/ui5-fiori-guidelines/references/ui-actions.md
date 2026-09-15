# UI Actions

## Contents
- [Button](#button)
- [Link](#link)
- [Toggle Button](#toggle-button)
- [Segmented Button](#segmented-button)
- [Menu Button](#menu-button)
- [Split Button](#split-button)

---

## Button

- **SAPUI5:** `sap.m.Button`  **Web Component:** `ui5-button` (`@ui5/webcomponents`)
- **Use when:** The user needs to trigger an action — submit, save, create, delete, open a dialog.
- **Do NOT use when:** You need to navigate to a page or URL → use `ui5-link` instead.
- **Rules:**
  - One `design="Emphasized"` button per page or dialog — the primary action only.
  - Secondary actions in header/footer toolbars: `design="Transparent"` (not Default). Content toolbar secondary: also `design="Transparent"`.
  - `design="Ghost"` does not exist in web components — use `design="Transparent"`.
  - Semantic actions (accept/reject): use `design="Positive"` / `design="Negative"` — text buttons only, never icon-only.
  - Icon-only buttons must have a `tooltip` property set.
- **Gotchas:** In S/4HANA XML views, use `type="Ghost"` for secondary toolbar actions; in web components the equivalent is `design="Transparent"` — the property name is `design`, not `type`. Fiori Elements supports only text buttons except in table inline actions (icon or text, not both).

---

## Link / Hyperlink

- **SAPUI5:** `sap.m.Link`  **Web Component:** `ui5-link` (`@ui5/webcomponents`)
- **Use when:** Navigating to another page, anchor, or external URL.
- **Do NOT use when:** Triggering an action (submit, delete, open dialog) → use `ui5-button` instead.
- **Rules:**
  - Link text must describe the destination — never "Click here" or "Link".
  - Use `design="Subtle"` only inside tables for secondary links in dense data.
  - Use `design="Emphasized"` only when a link needs stronger visual prominence than default.
  - Do not use a link with no `href` and no click handler — that is decorative and invalid.
- **Gotchas:** `ui5-link` does not resize with cozy/compact density — size is fixed. Icon-only links are not supported; always pair with text.

---

## Toggle Button

- **SAPUI5:** `sap.m.ToggleButton`  **Web Component:** `ui5-toggle-button` (`@ui5/webcomponents`)
- **Use when:** Activating or deactivating a toolbar element (e.g. show/hide panel, toggle filter) — a two-state secondary action.
- **Do NOT use when:** Triggering a one-shot action (Create, Save, Edit) → use `ui5-button`. Showing many options → use a menu.
- **Rules:**
  - Use `design="Default"` (standard) for secondary actions; `design="Transparent"` for tertiary.
  - Icon-only toggle buttons must have a `tooltip`.
  - Do not change the button text or icon between toggled and untoggled — the pressed state is communicated via ARIA, not text change.
- **Gotchas:** `pressed` is the property to read/set the toggle state programmatically. Do not swap text to indicate state — screen readers will misread it.

---

## Segmented Button / View Switch

- **SAPUI5:** `sap.m.SegmentedButton`  **Web Component:** `ui5-segmented-button` (`@ui5/webcomponents`)
- **Use when:** Choosing one option from a small, related set visible all at once (Year/Month/Day, Small/Medium/Large — 2–5 options).
- **Do NOT use when:** More than ~5 options → use a Select or RadioButton group. Navigation between page sections → use IconTabBar.
- **Rules:**
  - Use child `ui5-segmented-button-item` elements, not generic buttons.
  - Icon-only segments must have a `tooltip` on each item.
  - `selection-mode="Multiple"` is WC-only; SAPUI5 SegmentedButton is single-select only.
- **Gotchas:** Do not use as an in-page navigation control — that is IconTabBar (`ui5-tabcontainer`). The WC supports multi-select via `selection-mode="Multiple"` which has no SAPUI5 equivalent.

---

## Menu Button / Button + Menu

- **SAPUI5:** `sap.m.MenuButton`  **Web Component:** none — compose `ui5-button` + `ui5-menu` (`@ui5/webcomponents`)
- **Use when:** A button that opens a dropdown menu of actions (no default action — clicking always opens the menu).
- **Do NOT use when:** You only have one action → use a plain button. You need a default action + overflow → use Split Button.
- **Rules:**
  - No `ui5-menu-button` tag exists in web components. Wire a `ui5-button` click handler to open a `ui5-menu` with `opener` set to the button's ID.
  - Use `design="Transparent"` for menu buttons in content toolbars.
  - On phones, `ui5-menu` renders as a full-screen dialog automatically.
- **Gotchas:** `ui5-menu-button` is a common wrong guess — the tag does not exist. Always compose `ui5-button` + `ui5-menu`.

---

## Split Button / Default Action + Menu

- **SAPUI5:** `sap.m.MenuButton` (with `buttonMode="Split"`)  **Web Component:** `ui5-split-button` (`@ui5/webcomponents`)
- **Use when:** One default action (left area) plus a menu of additional actions (arrow area), and the default is used most often.
- **Do NOT use when:** All actions are equally weighted → use a Menu Button. Only one action exists → use a plain Button.
- **Rules:**
  - `click` event fires on the default action (left area); `arrow-click` fires on the arrow area.
  - Both areas share the same `design` value — they cannot be styled independently.
  - Use `design="Transparent"` in content toolbars.
- **Gotchas:** In SAPUI5, the split button is `sap.m.MenuButton` with `buttonMode` property set to `sap.m.MenuButtonMode.Split` — it is not a separate class. In web components, `ui5-split-button` is a distinct component.
