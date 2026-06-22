# Pattern U — In-Window Launcher → Bare-Component Iframe Migration

This reference covers Phase 5b of the modernize-test-starter skill. It applies **only** when Phase 0.2 reports `needsIframeMigration: true` — i.e. **both** of the following are true:

1. The project's OPA journeys call `Given.iStartMyUIComponent({ componentConfig: ... })` and run in the QUnit window with `mockserver.init()` in the parent frame (`launcher: "in-window"`).
2. At least one legacy test HTML loads the FLP sandbox — either `sap/ushell/bootstrap/sandbox.js` (or older `flpSandbox.js`) or declares `window["sap-ushell-config"]` (`flpSandbox: true`).

Plain in-window apps with no FLP coupling (`launcher: "in-window"`, `flpSandbox: false`) are **not** migrated by this phase — their `iStartMyUIComponent` calls stay as-is. The bare-Component iframe only buys something when the app actually calls `sap.ushell.Container.*` APIs and therefore needs sandbox.js stubs to be present at runtime.

For projects already in an iframe (`iStartMyAppInAFrame`), do NOT run this migration — Phase 5 alone is the correct end state. For projects that mix both launcher shapes, Phase 0.2 halts the skill; the developer must reconcile manually before re-running.

This skill currently supports the iframe migration **only in combination with Pattern A** (single `AllJourneys.js` aggregator). Pattern U + Pattern B is unsupported; halt and ask the developer.

## Goal

Every `iStartMyApp()` call lands in a same-origin iframe loading the Component directly via `ComponentContainer.placeAt`, with `sap.ushell` sandbox.js available as an API-only stub. No FLP shell renderer, no shell DOM, no ShellNavigation hash interceptor, no `#app-tile&/` prefix.

## 5b.1 Pre-requisites & inputs

From `manifest.json`:
- `<NAMESPACE-WITH-DOTS>` — e.g. `com.example.myapp`
- `<NAMESPACE>` — slashes — e.g. `com/example/myapp`
- `<NAMESPACE-FLAT-ID>` — `<NAMESPACE-WITH-DOTS>` with dots removed (e.g. `comexamplemyapp`); used for the root component DOM id; arbitrary but stable.

Read the existing `webapp/localService/mockserver.js` and confirm whether `init()` returns a Promise or runs synchronously. The iframe HTML below assumes sync; if the project's `init()` returns a Promise, chain `placeAt` onto `.then(...)` instead.

## 5b.2 Create `webapp/test/integration/opaIframe.qunit.html` and `opaIframeBoot.js`

This is the bare-Component iframe entry. **Do not** define `window["sap-ushell-config"]` (that triggers the FLP renderer). Sandbox.js is still loaded, but with no config it never builds the shell — `sap.ushell.Container` API stays available so `setDirtyFlag`, `getService("CrossApplicationNavigation")`, etc. don't crash.

The HTML must be CSP-clean — **no inline `<script>` body**. UI5's `data-sap-ui-oninit="module:..."` attribute on the bootstrap tag loads a named module after core init, which gives us a hook for `mockserver.init()` + `ComponentContainer.placeAt(...)` without inline JS. This matches the precedent set by `Test.qunit.html` / `testsuite.qunit.html` (external `runTest.js` / `createSuite.js`) and honors the skill's own "no inline scripts" CSP promise.

`webapp/test/integration/opaIframe.qunit.html`:

```html
<!DOCTYPE html>
<html>
<head>
    <title>OPA App Frame for <NAMESPACE-WITH-DOTS></title>
    <meta charset="utf-8">

    <script id="sap-ushell-bootstrap" src="../../test-resources/sap/ushell/bootstrap/sandbox.js"></script>

    <script
        id="sap-ui-bootstrap"
        src="../../resources/sap-ui-core.js"
        data-sap-ui-theme="sap_horizon"
        data-sap-ui-resourceroots='{
            "<NAMESPACE-WITH-DOTS>": "../../",
            "<NAMESPACE-WITH-DOTS>.test": "../"
        }'
        data-sap-ui-compat-version="edge"
        data-sap-ui-async="true"
        data-sap-ui-frame-options="allow"
        data-sap-ui-oninit="module:<NAMESPACE>/test/integration/opaIframeBoot">
    </script>
</head>
<body class="sapUiBody">
    <div id="content" style="height:100%;width:100%"></div>
</body>
</html>
```

`webapp/test/integration/opaIframeBoot.js`:

```js
sap.ui.define([
    "sap/ui/core/ComponentContainer",
    "<NAMESPACE>/localService/mockserver"
], function (ComponentContainer, mockserver) {
    "use strict";

    mockserver.init();
    new ComponentContainer({
        name: "<NAMESPACE-WITH-DOTS>",
        async: true,
        manifest: true,
        height: "100%",
        settings: { id: "<NAMESPACE-FLAT-ID>" }
    }).placeAt("content");
});
```

Notes:
- `data-sap-ui-oninit="module:..."` runs the named module after core init — replaces the deprecated `sap.ui.getCore().attachInit(...)` pattern.
- The module is plain `.js` (no `.qunit.js` suffix) — it is loaded by URL attribute, not by a testsuite entry.
- Hyphenated attribute names (`compat-version`, `frame-options`) match the modern UI5 form; the older camelCase variants still work but the linter prefers hyphens.

If `mockserver.init()` returns a Promise, replace the body of `opaIframeBoot.js` with:

```js
sap.ui.define([
    "sap/ui/core/ComponentContainer",
    "<NAMESPACE>/localService/mockserver"
], function (ComponentContainer, mockserver) {
    "use strict";

    mockserver.init().then(function () {
        new ComponentContainer({
            name: "<NAMESPACE-WITH-DOTS>",
            async: true,
            manifest: true,
            height: "100%",
            settings: { id: "<NAMESPACE-FLAT-ID>" }
        }).placeAt("content");
    });
});
```

## 5b.3 Rewrite `webapp/test/integration/arrangements/Common.js`

Remove the parent-frame mockserver dependency and the in-window component start. Source iframe URL is the new `opaIframe.qunit.html`. Hash is the Component router pattern directly — **no `#app-tile&/` prefix**.

```js
sap.ui.define([
    "sap/ui/test/Opa5"
], function (Opa5) {
    "use strict";

    function getFrameUrl(sHash) {
        var sBaseUrl = sap.ui.require.toUrl("test-resources/<NAMESPACE>/integration/opaIframe") + ".qunit.html";
        var sExtraHash = sHash ? "#" + (sHash.indexOf("/") === 0 ? sHash : "/" + sHash) : "";
        return sBaseUrl + sExtraHash;
    }

    return Opa5.extend("<NAMESPACE-WITH-DOTS>.test.integration.arrangements.Common", {

        iStartMyApp: function (oOptionsParameter) {
            var oOptions = oOptionsParameter || {};

            this.iStartMyAppInAFrame({
                source: getFrameUrl(oOptions.hash),
                timeout: 200,
                autoWait: oOptions.autoWait !== false
            });
        }

    });

});
```

Notes:
- Drop the `localService/mockserver` import and any `mockserver.init(...)` / `iWaitForPromise` calls — mockserver now boots inside the iframe.
- Drop the previous `componentConfig` object and `iStartMyUIComponent` call.
- **Drop any `_clearSharedData` helper that resets `ODataModel.mSharedData` in the parent frame.** That cache is a static map on the parent's `ODataModel` class; under the iframe setup the app's `ODataModel` lives in the iframe's UI5 Core, a different class object with its own `mSharedData`. The iframe is destroyed and recreated per journey, so its cache dies with it. The parent's `ODataModel.mSharedData` is unused — resetting it has no effect on the app. Remove the helper and the `sap/ui/model/odata/v2/ODataModel` dependency from `Common.js`.

## 5b.4 Rewrite every journey file's launcher call

Every file under `webapp/test/integration/` that starts the app:

```diff
- Given.iStartMyUIComponent({
-     componentConfig: {
-         name: "<NAMESPACE-WITH-DOTS>",
-         async: true
-     }
- });
+ Given.iStartMyApp();
```

If the original call passed a `hash` or `autoWait`, forward it as `Given.iStartMyApp({ hash: "...", autoWait: false })`.

## 5b.5 Strip parent-frame mockserver init from `OpaSetup.js`

If `OpaSetup.js` (or whatever aggregator the Phase 5 step produced) requires `localService/mockserver` and calls `mockserver.init()`, remove both the dependency and the call. Mockserver runs in the iframe.

```diff
 sap.ui.define([
     "sap/ui/test/Opa5",
-    "./arrangements/Common",
-    "<NAMESPACE>/localService/mockserver"
- ], function (Opa5, Common, mockserver) {
+    "./arrangements/Common"
+ ], function (Opa5, Common) {
     "use strict";

     Opa5.extendConfig({
         arrangements: new Common(),
         viewNamespace: "<NAMESPACE-WITH-DOTS>.view.",
         autoWait: true
     });
- 
-    mockserver.init();
 });
```

## 5b.6 Cross-window control instantiation in page objects

Test code runs in the QUnit (parent) window. The app — including its UI5 Core — runs in the iframe. Constructing UI5 controls with the parent's UI5 (`new Token({...})` after `sap.ui.define([..., "sap/m/Token"], ..., Token)`) registers the control on the wrong Core; later lookups inside the iframe miss it.

**Rule**: anywhere a page object instantiates a UI5 control to feed into an `EnterText`, `MultiInput.addToken`, or similar action, resolve the constructor through the iframe's loader:

```diff
- sap.ui.define([
-     ...,
-     "sap/m/Token"
- ], function (..., Token) {
+ sap.ui.define([
+     ...
+ ], function (...) {
      ...
      success: function (oControl) {
-         var oToken = new Token({ key: "0001", text: "0001" });
+         var FrameToken = Opa5.getWindow().sap.ui.require("sap/m/Token");
+         var oToken = new FrameToken({ key: "0001", text: "0001" });
          ...
      }
```

Apply this transform mechanically: drop UI5 control / class dependencies that are only used inside `success` (or `check`, `matchers`) callbacks of `waitFor` from `sap.ui.define`, and replace the constructor / `instanceof` lookup at use-site with `Opa5.getWindow().sap.ui.require(...)`.

The exact set of UI5 classes that must be cross-resolved is **project-specific** — do not enumerate it. Detection is done by the bundled script (see §5b.6.2), which scans every page-object file for the two usage shapes inside `waitFor` callbacks:

- `new <Identifier>(...)` where `<Identifier>` resolves to a `sap.ui.define` dep param NOT on the OPA-safe allowlist
- `<x> instanceof <Identifier>` — same rule

For each finding, the fix is uniform:

1. Drop the dependency from `sap.ui.define`.
2. Re-resolve at the call site via `Opa5.getWindow().sap.ui.require("<module/path>")`.
3. Use the re-resolved reference for `new …(...)` or `… instanceof …`.

Plain JS classes / utility modules that do not extend `sap.ui.base.ManagedObject` are fine to keep on the parent loader; the rule only applies to UI5 classes whose identity is tied to a specific Core.

Do not rewrite controls used only as **type checks** in OPA matchers (`controlType: "sap.m.Token"`) — string-keyed control types do not need cross-window resolution.

### 5b.6.1 Cross-window jQuery / DOM lookups

The same parent-vs-iframe split applies to **jQuery** and raw `document` references inside `check` / `success` / `matchers` callbacks. The page object's `sap.ui.define` block runs in the parent (QUnit) window — `$`, `jQuery`, and `document` resolve to that window's globals. The app DOM (toasts, popovers, busy indicators, anything UI5 renders) lives in the **iframe**. A naked `$(".sapMMessageToast")` query against the parent always returns an empty set even while the toast is visible in the iframe — the assertion times out.

Rule: any DOM / jQuery query inside a `waitFor` callback that targets app-rendered elements must go through `Opa5.getJQuery()` (preferred) or `Opa5.getWindow().document` / `Opa5.getWindow().jQuery`.

```diff
  iShouldSeeToast: function () {
      return this.waitFor({
          check: function () {
-             return $(".sapMMessageToast").length > 0;
+             return Opa5.getJQuery()(".sapMMessageToast").length > 0;
          },
          autoWait: false,
          success: function () {
              Opa5.assert.ok(true, "toast successfully");
          }
      });
  }
```

Detection is folded into the §5b.6.2 hard gate (`detect-cross-window-imports.js`) — same script flags bare `$(`, `jQuery(`, `document.`, `window.` lines that don't already route through `Opa5.getWindow()` / `Opa5.getJQuery()`. For each finding, replace:

| Parent-window form | Iframe-aware form |
|---|---|
| `$(...)` / `jQuery(...)` | `Opa5.getJQuery()(...)` |
| `document.querySelector(...)` | `Opa5.getWindow().document.querySelector(...)` |
| `window.foo` (app global) | `Opa5.getWindow().foo` |

Plain DOM queries that target the **OPA / QUnit harness itself** (e.g. asserting on the QUnit DOM) should stay on the parent window — the rule only applies to code reading or writing the application's DOM.

### 5b.6.2 Mandatory page-object enumeration (cross-window misuse gate)

The 5b.6 / 5b.6.1 rules are easy to apply per file the agent happens to be editing — and easy to *miss* on every other page object that didn't otherwise need touching. Under Pattern U this is silent: a parent-loaded control instantiates against the wrong UI5 Core, the iframe lookup misses it, and the failure surfaces only at runtime as a timeout in a single journey.

To prevent that, do not rely on case-by-case judgement. Iterate **every** file under `webapp/test/integration/pages/` (or whichever directory holds the page objects) and apply the transform unconditionally to every UI5 control / class instantiation and every bare DOM access.

#### Why the gate checks usage shape, not module paths

UI5 ships many control libraries: `sap/m`, `sap/ui/core`, `sap/uxap`, `sap/suite`, `sap/viz`, `sap/ndc`, `sap/f`, `sap/ui/layout`, `sap/gantt`, plus per-project libs. Any whitelist by module-path prefix is incomplete the moment a project pulls in one more library. The gate instead detects the **misuse shape** at the call site:

1. `new <Identifier>(...)` where `<Identifier>` is a `sap.ui.define` dependency parameter, and the dep path is NOT on the OPA-safe allowlist.
2. `<x> instanceof <Identifier>` — same identifier rule.
3. Bare `$(`, `jQuery(`, `document.`, `window.` not routed through `Opa5.getJQuery()` / `Opa5.getWindow()`.

This means the gate adapts automatically as new control libraries appear in the deps array — the question is "is this identifier a parent-loaded module that we are using as a Core-affinity object?", not "does this path start with one of N hard-coded prefixes?".

#### OPA-safe modules (keep on parent loader)

Two dep paths are explicitly safe in the parent `sap.ui.define`:

- `sap/ui/test/*` — `Opa5`, `Press`, `EnterText`, matchers, the `Common` arrangement class. Designed to drive both windows; `new Press()` etc. is correct on the parent loader.
- `sap/ui/core/routing/History` — used for read-only inspection of parent-window history (`History.getInstance().getDirection()`). If a page object instantiates anything from `sap/ui/core/routing/*` other than reading `History`, treat it as forbidden and re-resolve through the iframe.

Plain JS utility / formatter / constants modules under the app namespace are also fine; they don't extend `ManagedObject` and have no Core affinity. The gate only flags identifiers used as **constructors** or **instanceof RHS** — utility modules consumed only as namespaces (`MyUtils.format(...)`) are not flagged.

#### Per-file procedure

For every page-object file:

1. **Drop the dep** from the `sap.ui.define` deps array AND the function signature once you've moved its constructor / `instanceof` use to the iframe loader.
2. **At each use site** inside a `waitFor` callback (`success`, `check`, `matchers`), re-resolve through the iframe:
   ```js
   var FrameToken = Opa5.getWindow().sap.ui.require("sap/m/Token");
   var oToken = new FrameToken({ key: "0001", text: "0001" });
   ```
   Same for `instanceof` checks: `oFoo instanceof Opa5.getWindow().sap.ui.require("sap/m/ColumnListItem")`.
3. **Hoist the lookup** if a class is used more than once. Resolve once into a local `var` at the top of the function (or as a member of the `Opa5.extend` config) and reuse.
4. **Type-check matchers stay as-is** — `controlType: "sap.m.Token"` is a string-keyed lookup that OPA itself routes to the right window. Do not touch those.
5. **Replace bare DOM access** — `$(...)` / `jQuery(...)` → `Opa5.getJQuery()(...)`; `document.querySelector(...)` → `Opa5.getWindow().document.querySelector(...)`; `window.foo` → `Opa5.getWindow().foo` (when targeting the app window).

#### Hard gate (run before Phase 7)

A Node script ships next to this reference. Run it as the last step of Phase 5b — before the verification phase — and treat a non-zero exit as a halt condition:

```bash
node <skill-dir>/scripts/detect-cross-window-imports.js <project-root>
```

The script parses every `.js` file under `webapp/test/integration/pages/`, builds a map of `sap.ui.define` dep params, and emits one finding per:

- `new <Identifier>(...)` whose `<Identifier>` is a non-allowlisted dep param.
- `<x> instanceof <Identifier>` — same.
- Bare `$(`, `jQuery(`, `document.`, `window.` on lines that don't already route through `Opa5.getWindow()` / `Opa5.getJQuery()`.

Output is JSON to stdout (machine-readable) and a human listing to stderr with `file:line: kind` and a per-finding fix suggestion. Exit `0` = clean; exit `1` = at least one finding.

Do not skip the gate "because the journeys passed" — Pattern U has tests that pass in CI and still leak the wrong-Core control: the symptom is a flaky timeout on a different journey weeks later when someone adds an `instanceof` check.

## 5b.7 Routing helpers — keep plain hash, no FLP nav

In-window apps usually have a `Function.js` (or similar) page object with `iGoToPageByPath` / `iPageGoBack` helpers. They must use the plain Component-router hash. Do **not** add `#app-tile&/` prefixes, and do **not** call `sap.ushell.Container.setDirtyFlag(false)` — without the FLP renderer there is no ShellNavigation interceptor, no beforeunload confirm tied to the dirty flag.

```js
iGoToPageByPath: function (sPath) {
    return this.waitFor({
        success: function () {
            var oWin = Opa5.getWindow();
            var sInner = sPath.indexOf("/") === 0 ? sPath : "/" + sPath;
            oWin.location.hash = sInner;
        },
        errorMessage: "Wrong spath: " + sPath
    });
},
iPageGoBack: function () {
    return this.waitFor({
        success: function () {
            Opa5.getWindow().history.go(-1);
        },
        errorMessage: "Go back to previous page failed"
    });
}
```

## 5b.8 Mockserver POST handlers consumed by an app-side message collector need a `sap-message` header

Narrow scope: this only affects function-import / action POST handlers whose **success callback** feeds the response into an app-written message-array collector — typically a helper that reads `response.headers["sap-message"]`, parses the JSON, and pushes it onto an `aErrorMsg` (or similar) array. The downstream code then **dereferences `aErrorMsg[0]`** (e.g. `aErrorMsg[0].severity === "Information"`) before deciding to show a toast. The collector lives under the app's `libs/` (or equivalent) — there is no UI5-library equivalent; each project ships its own.

If such a handler answers with `200 + empty body + no headers`, the collector produces an empty `aErrorMsg`, the `aErrorMsg[0].severity` access throws `TypeError: Cannot read properties of undefined`, and the success-toast helper never runs.

Controllers that call `MessageToast.show(...)` directly inside the function-import `success` callback are **not affected** — their toast does not depend on `sap-message`. Do not blanket-add the header to every POST handler; only the ones whose success path goes through a `sap-message`-driven collector.

Fix: for each affected handler, return a `sap-message` envelope so `aErrorMsg[0]` exists:

```js
oMockServerRequests.push({
    method: "POST",
    path: new RegExp("<FunctionImportName>(.*)"),  // adjust per endpoint
    response: function (oXhr) {
        var oResult = { "d": {} };
        oXhr.respondJSON(200, {
            "sap-message": JSON.stringify({
                code: "<APP-MSG-CLASS>/000",
                message: "<short success text>",
                longtext_url: "",
                target: "",
                severity: "info",
                transition: false,
                details: []
            })
        }, JSON.stringify(oResult));
    }
});
```

Field meanings: `severity: "info"` keeps it out of the error path; `transition: false` marks it as a state message rather than a one-shot dialog trigger; `details: []` satisfies array-typed consumers. `code` and `message` are app-visible — pick values that match your app's i18n class so the rendered toast looks right.

Detection: locate the project's message collector (it is app code, not UI5 — name varies: `BatchMessageHandler`, `MessageProcessor`, `collectMsg`, …) by grepping for the `sap-message` read pattern, then find call sites that deref the first array entry without a length guard:

```bash
# find the collector(s) — read sap-message header and push to an array
grep -rnE 'response\.headers\[\s*["\x27]sap-message["\x27]\s*\]' webapp

# call sites that consume the array's first entry
grep -rnE '\bsubmitChanges\b' webapp/controller webapp/libs
grep -rnE '\baErrorMsg\[0\]|\bmessages?\[0\]\.severity' webapp/controller webapp/libs
```

For each match, identify the function-import name the call belongs to, then add the `sap-message` header to that mockserver handler.

Surface this in `MODERNIZATION_ISSUES.md` if the right endpoint signature cannot be derived from `manifest.json` / metadata alone — the project owner needs to map the message envelope to the app's i18n class.

## 5b.9 ErrorHandler hardening for non-XML responses

The mockserver in the iframe does not always return the same body shape as a real OData backend. Specifically, error responses (or success responses surfaced through the error path because of an unrelated issue, e.g. an unhandled batch endpoint) may be plain text or JSON rather than the OData XML envelope. App code that parses the response as XML and then dereferences the first `<message>` node will throw a `TypeError` (`Cannot read properties of undefined (reading 'firstChild')` / `... of null`) — masking the real failure with a secondary throw inside the error handler's `catch` block. This is much more visible under the iframe setup because the iframe receives the raw mock response without any FLP-level message preprocessing.

Detection grep:
```bash
grep -rnE 'getElementsByTagName\("message"\)\[0\]\.firstChild' webapp
grep -rnE 'parseFromString\([^,]+,\s*"text/xml"\)' webapp
```

Typical offending pattern (in `webapp/controller/ErrorHandler.js` or similar):
```js
var xmlDoc = parser.parseFromString(sResponseText, "text/xml");
sShortErrorMessage = xmlDoc.getElementsByTagName("message")[0].firstChild.data;
```

Add a null-guard on both the node and its `firstChild`, and fall back to the raw response text:

```diff
- sShortErrorMessage = xmlDoc.getElementsByTagName("message")[0].firstChild.data;
+ var oMessageNode = xmlDoc.getElementsByTagName("message")[0];
+ if (oMessageNode && oMessageNode.firstChild) {
+     sShortErrorMessage = oMessageNode.firstChild.data;
+ } else {
+     sShortErrorMessage = sResponseText;
+ }
```

This is app code (not test code), but the bug only surfaces once OPA tests start running against the iframe-hosted mockserver. Ship the fix together with the iframe migration, or flag it in `MODERNIZATION_ISSUES.md` so the project owner picks it up in a separate PR.

## 5b.10 testsuite.qunit.js — no extra path alias

Do **not** register `<NAMESPACE>/test/integration/opaIframe` in `loader.paths`. The iframe URL is resolved through `sap.ui.require.toUrl("test-resources/<NAMESPACE>/integration/opaIframe")`, which works because `Test.qunit.html` declares the `test-resources.<NAMESPACE-WITH-DOTS>` resource root pointing at `./` (the `webapp/test/` directory). Resolving via `<NAMESPACE>/test/...` instead is wrong: under a packaged WAR, `webapp/test/` is served at `test-resources/`, not at `test/`, so the iframe URL 404s and `iStartMyAppInAFrame` hangs to its 90s timeout. Earlier intermediate commits added a `loader.paths` alias for `flpSandbox`; that line is dead code under the bare-Component setup and should not be reintroduced.

If a stale `flpSandbox` alias is present from a previous attempt, delete it.

## 5b.11 Files to delete

- `webapp/test/integration/flpSandbox.qunit.html` — only delete if it exists from a prior intermediate attempt. Greenfield Pattern U projects will not have it.
- Any `webapp/test/integration/AllJourneys.js` / `AllJourneys.json` — already covered by Phase 5 / Phase 6.

## 5b.12 Verification (manual)

Automated assertion is not feasible without running the full suite headless; provide the developer a checklist:

1. Serve the app (`mvn ui5:serve`, `npm start`, etc.).
2. Open `…/test/Test.qunit.html?testsuite=test-resources/<NAMESPACE>/testsuite.qunit&test=integration/<FirstJourney>`.
3. Confirm the iframe shows the Component directly — no FLP header, no shell bar, no `#app-tile` in the URL.
4. All journeys pass.
5. Hash deep-link smoke test: open `opaIframe.qunit.html#/<router-pattern>` directly in a browser — Component should hit the deep route on first load.

## 5b.13 Commit message template

```
test: switch OPA iframe to bare Component (drop FLP shell)

The FLP sandbox iframe wires sap.ushell ShellNavigation as the hash
handler; combined with Container.setDirtyFlag(true) calls in app code,
this blocks programmatic hash changes during OPA tests.

Replace any flpSandbox.qunit.html with opaIframe.qunit.html that loads
sandbox.js (for ushell API stubs) but boots the Component directly via
ComponentContainer.placeAt — no createRenderer, no shell DOM, no
ShellNavigation interceptor. Hash now routes through the Component
router.

- Common.js: iStartMyAppInAFrame source -> opaIframe.qunit.html;
  hash no longer wrapped in #app-tile&/
- Journey files: Given.iStartMyApp() instead of iStartMyUIComponent
- OpaSetup.js: drop parent-frame mockserver init
- Page objects: cross-window control resolve via Opa5.getWindow()
```

---

## Risks / gotchas to surface to developer

- **Real cross-app navigation** — apps that hard-depend on `getService("CrossApplicationNavigation").toExternal({...})` round-tripping through FLP intents will behave differently; sandbox.js stubs return placeholders. Usually fine for OPA, but flag it.
- **Component startup hash** — Component router reads `location.hash` at init. Iframe URL with `#/<route>` should hit the deep route on first load; verify with a representative deep-link route.
- **Mockserver async** — if `mockserver.init` is async without returning a Promise, the iframe's `placeAt` may run before mocks are wired and the first OData calls 404. Either make `init` return a Promise, or wrap with a `setTimeout`/`Promise.resolve().then(placeAt)`.
- **Iframe + autoWait + slow mocks** — `iStartMyAppInAFrame({ timeout: 200 })` is fine on local serves; raise it if CI is slower.
- **`sap_belize` vs `sap_horizon`** — older flpSandbox HTMLs use `sap_belize`; the new iframe page should match the Test Starter's `ui5.theme` (typically `sap_horizon`) so the screenshot matches dev mode.

## What NOT to do (intermediate-only patterns)

These showed up during the source migration and were superseded. Do not re-introduce them:

- Full FLP sandbox HTML with `window["sap-ushell-config"] = { defaultRenderer: "fiori2", applications: { "app-tile": ... } }`.
- `<script id="locate-reuse-libs" data-sap-ui-use-mockserver="true">` for mockserver init — replaced by direct `mockserver.init()` in iframe.
- `data-sap-ui-oninit="module:sap/ui/core/ComponentSupport"` on the bootstrap script — `ComponentContainer.placeAt` handles startup explicitly.
- Hash prefix `#app-tile&/<inner>` in routing helpers — Component router uses plain `#/<inner>`.
- `sap.ushell.Container.setDirtyFlag(false)` clears in `iGoToPageByPath` / `iPageGoBack` — not needed without FLP ShellNavigation interceptor.
- Loader-paths alias `<NAMESPACE>/test/integration/flpSandbox` (or `opaIframe`) in `testsuite.qunit.js` — `toUrl` resolves through the namespace root.
