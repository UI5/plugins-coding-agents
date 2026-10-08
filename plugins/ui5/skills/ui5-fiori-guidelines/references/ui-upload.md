# UI Upload Components

## Contents
- [File Uploader](#file-uploader)
- [Upload Collection (deprecated)](#upload-collection-deprecated)
- [Upload Set with Table Plugin](#upload-set-with-table-plugin)

---

## File Uploader

- **SAPUI5:** `sap.ui.unified.FileUploader`  **Web Component:** `ui5-file-uploader` (`@ui5/webcomponents`)
- **Use when:** The user needs to select and trigger upload of one (or a small number of) files with no requirement to manage, rename, reorder, or delete them after selection.
- **Do NOT use when:** Users need to manage a list of uploads (rename, delete individual files, preview, track per-file status) → use `sap.m.plugins.UploadSetwithTable`; using the deprecated `sap.m.UploadCollection` → migrate to `UploadSetwithTable`.
- **Rules:**
  - Use the input-field variant by default — it shows selected file names inline; use the button-only variant (`hide-input="true"`) only when the surrounding layout provides visible file-name feedback.
  - Restrict accepted file types via `accept` (comma-separated MIME types or extensions with a leading `.`).
  - Set `max-file-size` (in MB) to enforce client-side size limits before upload.
  - Use `multiple` only when the user genuinely needs to select several files at once.
  - Reflect upload status (busy, success, error) via `value-state` and a `valueStateMessage` slot message.
- **Gotchas:** Clicking the browse button always replaces the current selection — there is no "add more" mode. A batch error (any single file fails) blocks the entire batch — no partial uploads. The `change` event fires in Chrome even when the user cancels the OS dialog; guard against empty `files`.

---

## Upload Collection (deprecated)

- **SAPUI5:** `sap.m.UploadCollection` — **DEPRECATED, do not use in new code**  **Web Component:** `ui5-upload-collection` (`@ui5/webcomponents-fiori`) — **legacy only**
- **Use when:** Never in new development.
- **Do NOT use when:** Always — replace with `sap.m.plugins.UploadSetwithTable` (SAPUI5) or `ui5-file-uploader` for simple cases.
- **Rules:**
  - Migrate existing `sap.m.UploadCollection` usage to `UploadSetwithTable`.
  - The `ui5-upload-collection` WC tag still exists in `@ui5/webcomponents-fiori` for legacy apps but receives no new features.
- **Gotchas:** `UploadCollection` is the classic control that preceded `UploadSet`. It lacks the table-based management model, plugin architecture, and modern rename/preview capabilities. Do not start new implementations with it.

---

## Upload Set with Table Plugin

- **SAPUI5:** `sap.m.plugins.UploadSetwithTable`  **Web Component:** none (SAPUI5-only plugin)
- **Use when:** Users need a managed upload list: upload multiple files, track per-file status, rename files, delete individual items, preview, or integrate upload into a table with custom columns.
- **Do NOT use when:** Simple single-file upload with no management UI → use `sap.ui.unified.FileUploader` / `ui5-file-uploader`.
- **Rules:**
  - `UploadSetwithTable` is a `sap.m.plugins.DataStateIndicator`-compatible plugin attached to a `sap.m.Table` — it is not a standalone control.
  - Configure upload endpoint via the `uploadUrl` property on the plugin; handle `beforeUploadStarts`, `uploadCompleted`, and `uploadTerminated` events.
  - Each row maps to one file via `sap.m.plugins.UploadSetwithTableItem`; bind file-level status (uploading, complete, error) to the item's `uploadState` property.
  - For rename: set `fileNameEditable` to enable inline editing of the file name token.
  - Enforce allowed file types and size limits at both plugin level and server side.
- **Gotchas:** There is no `ui5-upload-set-table` or `ui5-upload-set` WC tag — this feature does not exist in `@ui5/webcomponents` or `@ui5/webcomponents-fiori`. Web-component-only apps must compose their own file-management table using `ui5-table` + `ui5-file-uploader`. `UploadSetwithTable` replaces the older `sap.m.UploadSet` control as well as the deprecated `sap.m.UploadCollection`.
