---
name: opa5
description: ALWAYS load before any OPA5 task — implementing, updating, or verifying a test. Provides best practices for structuring the test and tools for efficient diagnosis of test failures.
---

# OPA5 guidelines and tools

## Setup the test environment **before executing the OPA5 test**
**Purpose:** Efficient inspection of test failures with minimal steps.
**Prerequisites:** A tool to load the OPA5 test in the browser and evaluate javascript in the browser window (e.g. MCP Playwright)

### 1. Setup TestRecorder tooling (UI5 version ≥ 1.147 only)
**Purpose:**
- Diagnose issues by inspecting the live control tree in the browser, including private/internal controls the test needs to find;
- Collect reliable OPA5 snippets for non-trivial actions and assertions.
**Setup:** Follow `references/enable-testrecorder-tooling.md` for detailed instructions.

### 2. **ALWAYS** enable pause-on-failure mode (all UI5 versions)
**Purpose:** When enabled, execution pauses on the first test failure and the app remains live in the browser exactly as it was at the point of failure — no teardown, no reload happens automatically. The paused state persists until you explicitly navigate away, so you can inspect the actual UI directly (without reloading) in the browser to compare it against what the test expected.
**Setup:** Add the following line to your test setup (e.g. before the first `opaTest` of your Journey under test):
```javascript
sap.ui.test.qunitPause.pauseRule = "assert,timeout"; // enables pause on assertion failures and timeouts
```
### 3. Isolate the journey under test (all UI5 versions)
**Purpose:** Avoid waiting for unrelated journeys on each iteration
**Isolation strategy:** If the setup does not allow to run individual journeys, comment out unrelated journey imports in the test entry point.

## Verification workflow
1. Enable the test environment setup above and load the test in the browser.
2. When the test pauses on failure, inspect the app first — verify the full causal chain with no gaps before changing any code. **ALWAYS** rule out app-side issues before assuming the test is wrong.
3. Once each new/updated journey succeeds in isolation, restore all journey imports for final validation.  
4. Once all journeys pass with imports restored, remove the `sap.ui.testrecorder` library from the app and disable pause-on-failure.

## Handling special cases
- **Initial setup for OPA5 test** → follow `references/initial-setup.md`
- **If the test-case spans multiple views** → follow `references/handle-multiple-views.md`
- **Teardown the app** → follow `references/handle-teardown.md`