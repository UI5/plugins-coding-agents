# TestRecorder Tooling

The `sap.ui.testrecorder` library provides the module `sap.ui.testrecorder.ControlTree` that allows to:
- inspect the live control tree in the browser
- retrieve reliable OPA5 snippets for interacting with any part of the control tree

## Prerequisites to Use `sap.ui.testrecorder.ControlTree`

- **UI5 version ≥ 1.147**
- Tool to load the OPA5 test in the browser and evaluate javascript in the browser window (e.g. MCP Playwright)
- **`sap.ui.testrecorder` library loaded** — temporarily add to the app's library declarations in the places listed below (**ORDERED BY PRIORITY**):
  1. `ui5.yaml` → `framework.libraries`: `- name: sap.ui.testrecorder`
  2. `manifest.json` → `sap.ui5.dependencies.libs`: `"sap.ui.testrecorder": {}`
  3. `index.html` → `data-sap-ui-libs` bootstrap attribute: append `,sap.ui.testrecorder`

  > After adding to `ui5.yaml` ensure the server is serving the added library before proceeding:
  > ```bash
  > curl -s -o /dev/null -w "%{http_code}" \
  >   http://localhost:8080/resources/sap/ui/testrecorder/ControlTree.js
  > ```
  > If 404, **ALWAYS** start a fresh server on the next free port (8081, 8082, …) and use that port
  >   for all subsequent browser navigation

  > Remove `sap.ui.testrecorder` after use — not needed at runtime.
  > Kill after use any started fresh server instance.

## `sap.ui.testrecorder.ControlTree` API

**`ControlTree.search(query)`** — Search the live UI5 control tree.
- Returns `Promise<string>` — a tree snapshot with matching controls and their parents
- `query=""` returns the full tree; `query="anchorBar"` returns filtered results
- Matches against control type short names, non-default property values, and accessibility attributes
- Each node carries a `nodeId="N_M"` (snapshot N, node M) — use these in `ControlTree` methods that require a `nodeId` parameter

**`ControlTree.getControlData(nodeId)`** — Get selector and full control state.
- Returns `Promise<{ selectorSnippet, properties, aggregations, associations, bindings }>`
- `selectorSnippet` — OPA5 `waitFor` code to locate the control (use as the base selector)
- Other fields provide live control state for customizing assertions

**`ControlTree.press(nodeId, settings?)`** — Press a control and get its OPA5 action snippet.
- Returns `Promise<string>` — an OPA5 `waitFor` snippet with `actions: new Press()`
- Also **replays the press** on the running app, advancing the UI state for the next search
- Optional `settings`: `altKey`, `ctrlKey`, `shiftKey`, `xPercentage`, `yPercentage`

**`ControlTree.enterText(nodeId, settings)`** — Type into a control and get its OPA5 action snippet.
- Returns `Promise<string>` — an OPA5 `waitFor` snippet with `actions: new EnterText()`
- Also **replays the text entry** on the running app
- `settings`: `text`, `clearTextFirst` (default `true`), `submitText` (default `true`)

## Example Usage

```javascript
sap.ui.require(["sap/ui/testrecorder/ControlTree"], async (ControlTree) => {
    "use strict";
    // Navigate to the state where the anchor bar is visible, then:
    await ControlTree.search("anchorBar"); // When resolved, inspect the returned markdown snapshot and pick nodeId, e.g. Button nodeId="1_8" text="Methods"

    // Use the picked nodeId to interact with the corresponding control
    await ControlTree.press("1_8"); // When resolved, save the returned OPA5 snippet; UI has now navigated

    await ControlTree.search("selectedSection"); // When resolved, parse returned snapshot and pick nodeId, e.g. ObjectPageLayout nodeId="2_3"

    await ControlTree.getControlData("2_3"); // When resolved, save result.selectorSnippet + result.associations → build assertion
});
```
