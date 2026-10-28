# UI Message Components

## Contents
- [Message Strip](#message-strip)
- [Message Box](#message-box)
- [Message Toast](#message-toast)
- [Message Popover](#message-popover)

---

## Message Strip

- **OpenUI5 / SAPUI5:** `sap.m.MessageStrip`
- **Use when:** Displaying a persistent, non-blocking message scoped to a page, section, or single component (e.g., a table) that the user needs to see while working.
- **Do NOT use when:** The message requires a decision or interruption → use `sap.m.MessageBox`; the message is a brief, transient success confirmation → use `sap.m.MessageToast`; there are many validation errors → use `sap.m.MessagePopover`.
- **Rules:**
 - Always set `type` explicitly: `Error`, `Warning`, `Success`, or `Information` (`sap/ui/core/message/MessageType`).
 - Place the strip close to the content it describes — top of a section, not buried in a footer.
 - Set `showCloseButton="true"` for temporary/informational messages; omit it for persistent system-state messages.
 - Set `showIcon="true"` so the semantic icon is shown; use `customIcon` only to replace it.
 - Keep text concise; use the `link` aggregation (`sap.m.Link`) only to point to related details, not as a primary action.
- **Gotchas:** `colorSet="ColorSet1"` / `"ColorSet2"` (`colorSet` property, available since UI5 1.143) does not render a default icon — supply one via `customIcon`. The strip has no `valueState` property; semantic color comes from `type`.

---

## Message Box

- **OpenUI5 / SAPUI5:** `sap.m.MessageBox`
- **Use when:** A semantic error, warning, success, or confirmation dialog is needed that interrupts the user and requires an explicit response before continuing.
- **Do NOT use when:** The message is informational and non-blocking → use `sap.m.MessageStrip`; the message is a brief success toast → use `sap.m.MessageToast`; building a fully custom dialog → compose `sap.m.Dialog` with an embedded `sap.m.MessageStrip` instead of inventing a new message-box control.
- **Rules:**
 - Use the semantic static methods: `MessageBox.error()`, `.warning()`, `.success()`, `.confirm()`, `.information()`, `.show()` — never hand-build a Dialog for these cases.
 - Dialog title and button labels are auto-generated per type and locale — override only when semantics demand it.
 - The `onClose` callback receives the button key pressed (`sap.m.MessageBox.Action.*`) — always handle all outcomes.
 - One emphasized/primary button per dialog maximum.
- **Gotchas:** `MessageBox` is a static utility class, not a control you instantiate — `new sap.m.MessageBox()` is wrong. It is part of `sap.m` and available in both OpenUI5 and SAPUI5.

---

## Message Toast

- **OpenUI5 / SAPUI5:** `sap.m.MessageToast`
- **Use when:** Confirming a successful, low-stakes operation (save, send, delete) with a brief message the user does not need to act on.
- **Do NOT use when:** The message is an error or warning that the user must see → use `sap.m.MessageStrip` or `sap.m.MessageBox`; the user must be able to copy the message text; the user must read it before leaving the page.
- **Rules:**
 - Keep text to one short sentence — the toast auto-dismisses and cannot be recalled.
 - Default `duration` is 3000 ms. Increase only for longer messages.
 - Call `MessageToast.show(sText, mOptions)`; position with the `my` / `at` / `of` options (default: center bottom) only when the default is covered.
- **Gotchas:** `MessageToast.show()` is a static call — it is not a declarative view control. The toast is not announced by screen readers as an alert by default — for critical notifications use a `MessageStrip` instead.

---

## Message Popover

- **OpenUI5 / SAPUI5:** `sap.m.MessagePopover`
- **Use when:** Aggregating multiple validation messages (from multiple fields or sections) into one accessible, grouped entry point — typically in a page footer toolbar.
- **Do NOT use when:** There is only one message → use `sap.m.MessageStrip`; the message requires a modal response → use `sap.m.MessageBox`; the messages must be shown inside a dialog or page area instead of a popover → use `sap.m.MessageView`.
- **Rules:**
 - Populate via `sap.m.MessageItem` — set `type`, `title`, `subtitle`, and `description`. For deep linking, set `activeTitle="true"` and handle the popover's `activeTitlePress` event to focus the related field (`MessageItem` has no `target` property).
 - Place the trigger button in the footer toolbar of the page or dialog, never inline in content.
 - Display the count of messages on the trigger button; use the highest-severity icon.
 - Do not use repeated `MessageStrip` instances to replace a `MessagePopover` — one strip per message creates visual clutter and is not navigable.
- **Gotchas:** `sap.m.MessagePopover` is part of `sap.m` and available in both OpenUI5 and SAPUI5 — do not rebuild it from a `ResponsivePopover` and a custom list. Bind its `items` to the message model (`sap/ui/core/Messaging`) so validation messages appear automatically.
