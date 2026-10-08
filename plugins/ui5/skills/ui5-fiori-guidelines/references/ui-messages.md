# UI Message Components

## Contents
- [Message Strip](#message-strip)
- [Message Box](#message-box)
- [Message Toast](#message-toast)
- [Message Popover](#message-popover)

---

## Message Strip

- **SAPUI5:** `sap.m.MessageStrip`  **Web Component:** `ui5-message-strip` (`@ui5/webcomponents`)
- **Use when:** Displaying a persistent, non-blocking message scoped to a page, section, or single component (e.g., a table) that the user needs to see while working.
- **Do NOT use when:** The message requires a decision or interruption → use `sap.m.MessageBox`; the message is a brief, transient success confirmation → use `sap.m.MessageToast` / `ui5-toast`; there are many validation errors → use `sap.m.MessagePopover`.
- **Rules:**
  - Always set `design` explicitly: `Negative`, `Critical`, `Positive`, or `Information`.
  - Place the strip close to the content it describes — top of a section, not buried in a footer.
  - Add a close button (`hide-close-button="false"`) for temporary/informational messages; omit it for persistent system-state messages.
  - Show an icon (default: on) — only hide it when a custom icon via the `icon` slot is used instead.
  - Keep text concise; use inline links (`ui5-link`) only to point to related details, not as primary actions.
- **Gotchas:** `design="ColorSet1"` / `"ColorSet2"` do not render a default icon — you must supply one via the `icon` slot. The strip has no WC `valueState` prop; semantic color is set via `design`, not `value-state`.

---

## Message Box

- **SAPUI5:** `sap.m.MessageBox`  **Web Component:** none — use `ui5-dialog` + `ui5-message-strip` manually
- **Use when:** A semantic error, warning, success, or confirmation dialog is needed that interrupts the user and requires an explicit response before continuing.
- **Do NOT use when:** The message is informational and non-blocking → use `sap.m.MessageStrip`; the message is a brief success toast → use `sap.m.MessageToast`; building in a web-component-only stack → compose `ui5-dialog` with an embedded `ui5-message-strip`.
- **Rules:**
  - Use the semantic static methods: `MessageBox.error()`, `.warning()`, `.success()`, `.confirm()`, `.information()`, `.show()` — never hand-build a Dialog for these cases in SAPUI5.
  - Dialog title and button labels are auto-generated per type and locale — override only when semantics demand it.
  - The `onClose` callback receives the button key pressed (`sap.m.MessageBox.Action.*`) — always handle all outcomes.
  - One emphasized/primary button per dialog maximum.
- **Gotchas:** `MessageBox` is a static utility class, not a control you instantiate — `new sap.m.MessageBox()` is wrong. In web-component apps there is no `ui5-message-box`; build with `ui5-dialog` and set `state` on a nested `ui5-message-strip` for coloring.

---

## Message Toast

- **SAPUI5:** `sap.m.MessageToast`  **Web Component:** `ui5-toast` (`@ui5/webcomponents`)
- **Use when:** Confirming a successful, low-stakes operation (save, send, delete) with a brief message the user does not need to act on.
- **Do NOT use when:** The message is an error or warning that the user must see → use `sap.m.MessageStrip` or `sap.m.MessageBox`; the user must be able to copy the message text; the user must read it before leaving the page.
- **Rules:**
  - Keep text to one short sentence — the toast auto-dismisses and cannot be recalled.
  - Default `duration` is 3000ms; the minimum is 500ms. Increase only for longer messages.
  - Use `placement` to position (`BottomCenter` default; `TopCenter` in dialogs/panels where bottom is clipped).
  - Show `open` to display; do not rely on mount/unmount cycling.
- **Gotchas:** In SAPUI5, `MessageToast.show()` is a static call — it is not a view control. In web components, `<ui5-toast>` is a declarative element: set `open` to `true` to show it. The toast is not announced by screen readers as an alert by default — for critical notifications use a `MessageStrip` instead.

---

## Message Popover

- **SAPUI5:** `sap.m.MessagePopover`  **Web Component:** none
- **Use when:** Aggregating multiple validation messages (from multiple fields or sections) into one accessible, grouped entry point — typically in a page footer toolbar.
- **Do NOT use when:** There is only one message → use `sap.m.MessageStrip`; the message requires a modal response → use `sap.m.MessageBox`; building in a pure web-component stack (no WC equivalent exists — build a custom solution).
- **Rules:**
  - Populate via `sap.m.MessageItem` — set `type`, `title`, `subtitle`, `description`, and `target` (control ID) for deep linking.
  - Place the trigger button in the footer toolbar of the page or dialog, never inline in content.
  - Display the count of messages on the trigger button; use the highest-severity icon.
  - Do not use repeated `MessageStrip` instances to replace a `MessagePopover` — one strip per message creates visual clutter and is not navigable.
- **Gotchas:** There is no `ui5-message-popover` tag. Do not invent one. In web-component apps, aggregate messages into a `ui5-responsive-popover` with a custom list — or switch to the SAPUI5 `sap.m.MessagePopover` control if the app shell allows it.
