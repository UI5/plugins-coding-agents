---
name: opa5
description: This skill should be used in any OPA5 task - creating, modifying, extending, debugging, fixing or reviewing an integration test. Use when the user asks to "write an OPA5 test", "add an OPA5 journey", "fix the OPA5 test failure" or mentions OPA5 or its components - opaTest, page object, journey, waitFor.
---

# OPA5 guidelines and tools

## Set up inspection tools **before executing the OPA5 test**
**Purpose:** Efficient inspection of test failures with minimal steps.
**Prerequisites:** A tool to load the OPA5 test in the browser and evaluate javascript in the browser window (e.g. MCP Playwright)

### 1. Set up TestRecorder tooling (UI5 version ≥ 1.147 only)
**Purpose:**
- Diagnose issues by inspecting the live control tree in the browser, including private/internal controls the test needs to find;
- Collect reliable OPA5 snippets for non-trivial actions and assertions.
**Setup:** Follow `references/enable-testrecorder-tooling.md` for detailed instructions.

### 2. Enable pause-on-failure mode (all UI5 versions)
**Purpose:** When enabled, execution pauses on the first test failure and the app remains live in the browser exactly as it was at the point of failure — no teardown, no reload happens automatically. The paused state persists until you explicitly navigate away, so you can inspect the actual UI directly (without reloading) in the browser to see why it differs from what the test expected.
**Setup:** Add the following line to your test entry point (right before `Opa5.extendConfig`):
```javascript
// Inside the existing sap.ui.define callback in your test entry point
sap.ui.test.qunitPause.pauseRule = "assert,timeout"; // enables pause on assertion failures and timeouts
// Opa5.extendConfig({...});
```

## Verification workflow
1. Enable the inspection tools above and load the test in the browser.
2. When the test pauses on failure, inspect the app first — verify the full causal chain with no gaps before changing any code. Rule out app-side issues before assuming the test is wrong.
3. Iterate on the test until all journeys pass.
4. Once all journeys pass, remove the `sap.ui.testrecorder` library from the app and the pause-on-failure rule `sap.ui.test.qunitPause.pauseRule`.

## Handle special cases
- **Initial configuration for OPA5 test** → follow `references/configuration.md`
- **If the test-case spans multiple views** → follow `references/handle-multiple-views.md`
- **Teardown the app** → follow `references/handle-teardown.md`
