# UI Upload Components

## Contents
- [File Uploader](#file-uploader)
- [Upload Collection (deprecated)](#upload-collection-deprecated)
- [Upload Set with Table Plugin](#upload-set-with-table-plugin)

---

## File Uploader

- **OpenUI5 / SAPUI5:** `sap.ui.unified.FileUploader`
- **Use when:** The user needs to select and trigger upload of one (or a small number of) files with no requirement to manage, rename, reorder, or delete them after selection.
- **Do NOT use when:** Users need to manage a list of uploads (rename, delete individual files, preview, track per-file status) → use `sap.m.plugins.UploadSetwithTable`; using the deprecated `sap.m.UploadCollection` → migrate to `UploadSetwithTable`.
- **Rules:**
 - Use the input-field variant by default — it shows selected file names inline; use the button-only variant (`buttonOnly="true"`) only when the surrounding layout provides visible file-name feedback.
 - Restrict accepted file types via `fileType` (extensions) and/or `mimeType`; handle `typeMissmatch` to tell the user why a file was rejected.
 - Set `maximumFileSize` (in MB) to enforce client-side size limits before upload; handle `fileSizeExceed`.
 - Use `multiple` only when the user genuinely needs to select several files at once.
 - Choose the upload trigger: `uploadOnChange="true"` uploads immediately on file selection; the default (`false`) requires an explicit `upload()` call (e.g. from a Save button).
 - Prefer `sendXHR="true"` to send an XHR request instead of a form submit — this is what enables progress tracking and header control; set `httpRequestMethod` for the verb. With `useMultipart="false"` the body is the file only (single file, `sendXHR` required).
 - Reflect upload errors via `valueState` on the FileUploader and a message (e.g. `sap.m.MessageStrip` or `MessageBox`) with details.
- **Gotchas:** Clicking the browse button always replaces the current selection — there is no "add more" mode. A batch error (any single file fails) blocks the entire batch — no partial uploads. The `change` event fires in Chrome even when the user cancels the OS dialog; guard against empty `files`.

---

## Upload Collection (deprecated)

- **OpenUI5 / SAPUI5:** `sap.m.UploadCollection` — **DEPRECATED, do not use in new code**
- **Use when:** Never in new development.
- **Do NOT use when:** Always — replace with `sap.m.plugins.UploadSetwithTable` or `sap.ui.unified.FileUploader` for simple cases.
- **Rules:**
 - Migrate existing `sap.m.UploadCollection` usage to `UploadSetwithTable`.
 - `sap.m.UploadCollection` still exists for legacy apps but receives no new features.
- **Gotchas:** `UploadCollection` is the classic control that preceded `UploadSet`. It lacks the table-based management model, plugin architecture, and modern rename/preview capabilities. Do not start new implementations with it.

---

## Upload Set with Table Plugin

- **OpenUI5 / SAPUI5:** `sap.m.plugins.UploadSetwithTable`
- **Use when:** Users need a managed upload list: upload multiple files, track per-file status, rename files, delete individual items, preview, or integrate upload into a table with custom columns.
- **Do NOT use when:** Simple single-file upload with no management UI → use `sap.ui.unified.FileUploader`.
- **Rules:**
 - `UploadSetwithTable` is a plugin added to the `dependents` of a `sap.m.Table` — it is not a standalone control.
 - Configure the upload endpoint via the `uploadUrl` property on the plugin; handle `beforeUploadStarts` and `uploadCompleted`.
 - Each row maps to one file via `sap.m.upload.UploadItem`; bind file-level status (uploading, complete, error) to the item's `uploadState` property.
 - For rename flows, handle `itemRenamed` / `itemRenameCanceled`.
 - Enforce allowed file types and size limits on the plugin (`fileTypes`, `mediaTypes`, `maxFileSize`; handle `fileTypeMismatch` / `fileSizeExceeded`) and on the server.
- **Gotchas:** `sap.m.plugins.UploadSetwithTable` ships with both OpenUI5 and SAPUI5 (`sap.m` library). `UploadSetwithTable` replaces `sap.m.upload.UploadSet` (deprecated since 1.129) as well as `sap.m.UploadCollection` (deprecated since 1.88).
