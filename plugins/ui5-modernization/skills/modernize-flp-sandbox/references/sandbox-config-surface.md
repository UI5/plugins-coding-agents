# New Sandbox — Configuration Surface (Ground Truth)

This document is the canonical reference for what the New Sandbox environment
allows, blocks, and silently overrides. All §6 rules in `SKILL.md` cite the
relevant section here rather than restating constraints in their own words.

**Source of truth:**
- `unified.shell/ushell-lib/src/main/js/sap/ushell/sandbox/sandboxConfig.js`
  — the full default configuration tree.
- `unified.shell/ushell-lib/src/main/js/sap/ushell/sandbox/ConfigurationProvider.js`
  — what the sandbox does with `fioriSandboxAppConfig.json` at runtime, and which
  keys it acts on.
- `unified.shell/ushell-lib/src/main/js/sap/ushell/sandbox/StartSandbox.js`
  — startup sequence (`beforeFlpStart` hook → `applyUshellConfig`).
- `unified.shell/ushell-lib/src/main/js/sap/ushell/sandbox/DeprecatedService.js`
  — what happens at runtime if app code asks for a deprecated service.

When `sandboxConfig.js` changes, this file should be re-derived. The skill
loads this document at analysis time; the derived tables are not duplicated
into `SKILL.md`.

---

## 1. Hard runtime blocks

These are not deprecation warnings. The sandbox refuses to start if either
condition is violated.

| # | Condition | Source |
|---|-----------|--------|
| H1 | `globalThis["sap-ushell-config"]` is set when `ConfigurationProvider.applyUshellConfig()` runs | `ConfigurationProvider.js:363` |
| H2 | Any module under `sap/ushell/*` was already required before the sandbox started | `ConfigurationProvider.js:368` |

**Implication for migration:** every legacy entry point that wrote
`window["sap-ushell-config"] = ...` (inline `<script>`, externalized
`<script src=...>`, or a hook module body) must be removed. The same applies
to legacy hook modules that called `Container.createRendererInternal` or any
other `sap/ushell/*` API at module-load time — they need to be reduced to a
no-op or restructured to consume those APIs lazily.

---

## 2. Configuration surface — what the sandbox reads

Everything in `fioriSandboxAppConfig.json` flows through
`ConfigurationProvider#sandboxConfig` with a `sapUshellSandbox` prefix
(`tiles` → `sapUshellSandboxTiles`, etc.). Of those values, **only the keys
listed below are consumed**. All other keys land in the internal map but are
never read.

| JSON key | Internal name | Consumer | Effect |
|----------|---------------|----------|--------|
| `tiles` | `sapUshellSandboxTiles` | `#applySiteData` | One CDM application + visualization per tile; tile metadata derived from each tile's own `manifest.json` |
| `rootIntent` | `sapUshellSandboxRootIntent` | `#createUshellConfig` | Sets `renderers.fiori2.componentData.config.rootIntent` (default `"Shell-home"`) |
| `appStateMode` | `sapUshellSandboxAppStateMode` | `#createUshellConfig` | Sets `services.AppState.config.transient` |
| `plugins` | `sapUshellSandboxPlugins` | `#createUshellConfig` | Merged with default `bootstrapPlugins` |
| `rta` | `sapUshellSandboxRta` | `get("sapUiFlexibilityServices")` | Adds an `ObjectPathConnector` for fake-LREP |
| `beforeFlpStart` | `sapUshellSandboxBeforeFlpStart` | `StartSandbox.run` | Module path (`module:...`) executed before `applyUshellConfig` |

**The 6-key rule.** Anything outside this table that consumers used to put
into `window["sap-ushell-config"]` is **no longer configurable** at the JSON
layer. The next two sections enumerate the most common cases.

---

## 3. Values whose runtime source moved

For each row, the legacy ushell-config path (left) is gone. The replacement
source (right) is what New Sandbox actually uses at runtime.

| Legacy ushell-config path | New source | Where in the sandbox |
|---------------------------|-----------|----------------------|
| `applications[<key>].title` (tile header) | `manifest.json` of the target app: `sap.app.title`. Fallback: last segment of `sap.app.id`. Fallback: the `<semanticObject>-<action>` key itself. | `ConfigurationProvider.js:152` |
| `applications[<key>].subTitle` | `manifest.json sap.app.description` | `ConfigurationProvider.js:182` |
| `applications[<key>].icon` | `manifest.json sap.ui.icons.icon`. Fallback: `sap-icon://Fiori2/F0018`. | `ConfigurationProvider.js:206, 230` |
| `applications[<key>].url` | `tile.rootPath` (raw path) + concatenated parameters from `tile.parameters` | `ConfigurationProvider.js:215` |
| `applications[<key>].applicationType` | hard-coded `"URL"` for FLP-target, `"UI5"` for component | `ConfigurationProvider.js:201, 235` |
| `applications[<key>].deviceTypes` | merged with `manifest.json sap.ui.deviceTypes`; defaults `desktop:true, phone:true, tablet:true` | `ConfigurationProvider.js:172` |

**Detection hint for the skill:** code that string-compared one of these
runtime values to a hard-coded literal taken from the legacy ushell-config
will silently match the wrong thing (or nothing) after migration. The most
common offender is OPA tests that match tiles by title.

---

## 4. Values that became fixed

Configuration keys that were free-form in legacy ushell-config but are now
hard-coded to a sandbox default. Apps and tests that depended on configuring
or reading these must be updated to expect the fixed value.

### 4.1 User profile

`services.Container.adapter.config.userProfile.defaults` is hard-coded:

| Field | Fixed value |
|-------|-------------|
| `email` | `john.doe@sap.com` |
| `firstName` | `John` |
| `lastName` | `Doe` |
| `fullName` | `John Doe` |
| `id` | `DOEJ` |
| `language` | `EN` |
| `languageBcp47` | `en` |
| `sapDateFormat` | `1` |
| `numberFormat` | `""` |
| `rtl` | `false` |
| `sapTimeFormat` | `0` |
| `timeZone` | `CET` |

`services.Container.adapter.config.userProfilePersonalization` is also fixed:
theme `sap_horizon`, `contentDensity` `cozy`, etc.

### 4.2 Runtime-mutable user properties

`metadata.editableProperties` (misspelled `editablePropterties` in the
source) is hard-coded to list `accessibility`, `contentDensity`, `theme`.
This is a fixed fact about the sandbox's own runtime behaviour — it is not
a configuration point that apps or `fioriSandboxAppConfig.json` can change.

**Migration implication:** no action required. Code or tests that read these
properties at runtime will continue to see the sandbox's fixed defaults.
The values are not configurable in the legacy ushell-config either, so
there is no "old value vs. new value" divergence to fix.

### 4.3 Renderer configuration

`renderers.fiori2.componentData.config` is fixed to a configuration with
`enablePersonalization: true`, `enableSearch: false`, `rootIntent:
"Shell-home"`, etc. None of these can be customized via
`fioriSandboxAppConfig.json` (except `rootIntent` per §2 above).

### 4.4 Themes

`metadata.ranges.theme` lists 8 themes (`sap_fiori_3*`, `sap_horizon*`).
Apps that previously injected custom themes via ushell-config can no longer
do so.

### 4.5 Spaces / pages mode

`ushell.spaces.enabled = true` is fixed. Apps that toggled this for legacy
homepage rendering are forced into spaces mode now.

---

## 5. Deprecated services

Every service whose `module` is `"sap.ushell.sandbox.DeprecatedService"`
throws a hard error at `Container.getService()` / `getServiceAsync()` time.
The error message includes the successor (or, when there is none, a
discontinuation reason). See `DeprecatedService.js`.

The set is enumerated below — this is the complete list of names whose
appearance in app or test code blocks the migration to New Sandbox.

| Service name | `successor` (if any) | `reason` (if no successor) |
|--------------|----------------------|----------------------------|
| `Bookmark` | `sap.ushell.services.BookmarkV2` | — |
| `CrossApplicationNavigation` | `sap.ushell.services.Navigation` | — |
| `EndUserFeedback` | — | This service has been discontinued. Remove all dependencies. |
| `LaunchPage` | — | Deprecated together with the classic homepage. There is no public successor. |
| `Message` | — | Use `sap.m.MessageToast`, `sap.m.MessageBox`, or `sap.m.Dialog` directly. |
| `NavTargetResolution` | `sap.ushell.services.Navigation` | — |
| `Notifications` | `sap.ushell.services.NotificationsV2` | — |
| `Personalization` | `sap.ushell.services.PersonalizationV2` | — |
| `ShellNavigation` | `sap.ushell.services.Navigation` | — |
| `SmartNavigation` | `sap.ushell.services.Navigation` | — |
| `URLShortening` | — | This service was never public API. Use `sap.ushell.utils.UrlShortening` (private) directly if needed. |
| `UsageAnalytics` | — | The corresponding cloud service "SAP Web Analytics" has been retired. Remove all dependencies. |

**Detection regex (informational; the skill recomputes from this table):**

```
getService(?:Async)?\s*\(\s*["'](Bookmark|CrossApplicationNavigation|EndUserFeedback|LaunchPage|Message|NavTargetResolution|Notifications|Personalization|ShellNavigation|SmartNavigation|URLShortening|UsageAnalytics)["']\s*\)
```

**Migration note:** the rewrites for these services are non-trivial
(sync→async transitions, payload-shape changes for some, full removal
for others). The migration skill detects and reports all findings as
"Manual action required" — no automatic rewrite is applied.

---

## 6. Reading legacy ushell-config from app code

Independent of writing, **reading** `window["sap-ushell-config"]` at runtime
has been deprecated since UI5 1.136 (per
`unified.shell/CLAUDE.md`). New Sandbox still populates the global for
backward compatibility, but app code that reads from it should migrate to
`sap/ushell/Config` (`Config.getRawBootstrapConfig()` for raw access,
`Config.on/last/emit` for reactive use).

This is a softer constraint than the write-block in §1: tests and apps will
keep working, but the read pattern should be flagged so it doesn't regress
in maintenance.

---

## 7. Boot-time canvas + body

`StartSandbox.js:79–83` injects `<div id="canvas">` into `<body>` if it is
not already present. The skill creates the div explicitly during HTML
transformation (§6a) so that the migration result does not depend on
runtime DOM-injection — but the runtime path is the safety net.

`<body id="canvas">` and `<body id="content">` are runtime hazards: the
sandbox queries `body > div#canvas` and renders into the `<body>` element
itself if the id ends up there.

---

## 8. The `beforeFlpStart` hook contract

`StartSandbox.js:43–59`:

1. Read `sapUshellSandboxBeforeFlpStart` from `BaseConfig`. Must match
   `^module:((?:[_$.\-a-zA-Z0-9]+\/)*[_$.\-a-zA-Z0-9]+)$`.
2. `sap.ui.require([resolved-module], (mod) => mod?.execute?.())`.
3. Wait for the resolved Promise.
4. Then run `applyUshellConfig` (§1's H1/H2 checks fire here).

**Implications:**
- The hook may NOT touch `globalThis["sap-ushell-config"]`.
- The hook's **static dependency graph** (modules declared as AMD dependencies
  of the hook entry module and of all modules it eagerly requires) must not
  include any `sap/ushell/*` module. Such dependencies are part of the load
  tree that executes before the hook body runs, so they trigger Hard Block H2
  before `applyUshellConfig` even starts.
- Lazy `sap/ushell/*` requires (inside callbacks, promise chains, or
  `sap.ui.require` calls made after the hook's returned Promise resolves)
  are technically permitted. However, if the hook returns a Promise and that
  Promise awaits a lazy `sap/ushell/*` require, the module will be loading
  concurrently with `applyUshellConfig` — a race that can reproduce H2
  intermittently. **Recommendation: write hooks that have no dependency on
  `sap/ushell/*` at all**, eager or lazy.
- The hook is a general-purpose pre-FLP-boot extension point. Starting a mock
  server is the most common scenario, but the hook can be used for anything
  that must complete before FLP boots: registering async test fixtures,
  branching on URL parameters, setting up fake backends, etc. The only firm
  constraint is the ushell-dependency rule above.
- The hook is unsuitable for imperative ushell config writes — use
  `fioriSandboxAppConfig.json` keys instead (see §2).
