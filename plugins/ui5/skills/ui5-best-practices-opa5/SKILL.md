---
name: ui5-best-practices-opa5
description: This skill should be used in any OPA5 task - creating, modifying, extending, debugging, fixing or reviewing an integration test. Use when the user asks to "write an OPA5 test", "add an OPA5 journey", "fix the OPA5 test failure" or mentions OPA5 or its components - opaTest, page object, journey, waitFor.
---

# OPA5 Guidelines and Tools

## Handle Special Cases (follow when planning and writing an OPA5 test)
- **Initial Configuration for OPA5 Test** → follow `references/configuration.md`
- **If the test-case spans multiple views** → follow `references/handle-multiple-views.md`
- **Teardown the App** → follow `references/handle-teardown.md`

## Set Up Browser Inspection Tools (follow every time **before running the OPA5 test**)
**Purpose:** Efficient inspection of test failures with minimal steps.
**Prerequisites:** A tool to load the OPA5 test in the browser and evaluate javascript in the browser window (e.g. MCP Playwright)
**Instructions:** → follow `references/setup-inspection-tools.md`
