---
name: modernize-ui5-app
description: |
  End-to-end workflow for modernizing a UI5 application. Use this skill when:
  - User wants to modernize their UI5 app
  - User mentions "UI5 modernization", "modernize UI5 app", "upgrade UI5", "make app modern UI5 compatible"
  - User asks to "fix all linter errors", "run full modernization", "modernize my UI5 project"
  This skill runs the modernization in five phases with a verification gate after each phase. The user picks the verification mode once at the start (full autonomous / half autonomous / manual). The agent applies that mode at every gate without re-asking.
---

# UI5 Modernization Workflow

This skill modernizes a UI5 application in **five phases**, each followed by a **verification gate**. The user picks the gate behavior **once at the start** — full autonomous, half autonomous, or manual — and the orchestrator applies that choice at every phase boundary.

## The five phases

1. **Mechanical baseline** — autofix + test starter restructure. These touch many files but are low-risk and unlock test runs in later gates.
2. **Foundation** — `manifest.json` and `Component.js`. Everything downstream reads the manifest.
3. **Module system & globals** — get the dependency graph right (sap.ui.define arrays, lazy requires, no implicit globals). Cyclic-dep and blind-spot fixes belong here because they're symptoms of the same module-system work, not separate phases.
4. **Deprecated APIs** — pure name-for-name replacement. Independent of module structure, so safe to run in parallel after phase 3 stabilizes the graph.
5. **CSP compliance** — last, because it depends on every prior phase being CSP-clean (no inline scripts, no globals leaking through).

A documentation pass writes `MODERNIZATION-REPORT.md` and `MODERNIZATION-ISSUES.md` after phase 5.

## Rule ID to Skill Mapping

When parsing linter output, use this table to determine which skill handles each rule ID. This is the authoritative routing — every error with a mapped rule MUST be processed by the corresponding skill in its designated phase.

| Rule ID | Skill | Phase |
|---------|-------|-------|
| `no-deprecated-theme` | `fix-bootstrap-params` | 4 |
| `no-outdated-manifest-version` | `fix-manifest-json` | 2 |
| `no-legacy-ui5-version-in-manifest` | `fix-manifest-json` | 2 |
| `no-deprecated-library` | `fix-manifest-json` (manifest.json) or `fix-bootstrap-params` (HTML) | 2 / 4 |
| `no-deprecated-component` | `fix-manifest-json` | 2 |
| `no-removed-manifest-property` | `fix-manifest-json` or `fix-component-async` | 2 |
| `async-component-flags` | `fix-component-async` | 2 |
| `no-globals` | `fix-xml-globals` (ALL XML — sap.*, jQuery.*, AND app-namespace globals) or `fix-js-globals` (JS — sap.*/jQuery.* only) | 3 |
| `no-ambiguous-event-handler` | `fix-xml-globals` | 3 |
| `no-deprecated-control-renderer-declaration` | `fix-control-renderer` | 4 |
| `ui5-class-declaration` | `fix-control-renderer` | 4 |
| `no-pseudo-modules` | `fix-pseudo-modules` | 3 |
| `no-implicit-globals` | `fix-pseudo-modules` | 3 |
| `unsupported-api-usage` | `fix-partially-deprecated-apis` | 4 |
| `prefer-test-starter` | `modernize-test-starter` | 1 |
| `csp-unsafe-inline-script` | `fix-csp-compliance` | 5 |
| (structural — post all fix phases) | `fix-cyclic-deps` | 3 |
| (runtime — post all fix phases) | `fix-linter-blind-spots` | 3 |

### Disambiguating `no-deprecated-api`

The `no-deprecated-api` rule covers many cases. Determine which skill to use based on file type and message content:

| File Type | Message Contains | Skill | Phase |
|-----------|------------------|-------|-------|
| `.html` | "bootstrap parameter" | `fix-bootstrap-params` | 4 |
| `.html` | "deprecated theme" | `fix-bootstrap-params` | 4 |
| `manifest.json` | "view type", "model type", "resources/js" | `fix-manifest-json` | 2 |
| `.js` | "Deprecated call to ... {apiVersion: 2}" (Lib.init/Library.init) | `fix-library-init` | 4 |
| `.js` | "deprecated renderer", "apiVersion" (renderer context) | `fix-control-renderer` | 4 |
| `.js` | "IconPool" | `fix-control-renderer` | 4 |
| `.js` | "rerender" | `fix-control-renderer` | 4 |
| `.js` | "deprecated class", "deprecated property", "deprecated interface" | `fix-deprecated-controls` | 4 |
| `.js` | "registerControllerExtensions" | `fix-fiori-elements-extensions` | 4 |
| `.js` | "sap.ui.controller" where controller name appears in manifest `sap.ui.controllerExtensions` | `fix-fiori-elements-extensions` | 4 |
| `.js` | "sap.ui.controller" where controller name is NOT in manifest `sap.ui.controllerExtensions` | `fix-js-globals` (case 9: controller factory) | 3 |
| `.js` | "jQuery.sap.declare", "jQuery.sap.require" | `fix-js-globals` (case 10: legacy module wrapping) | 3 |
| `.js` | "getLibraryResourceBundle" | `fix-js-globals` (Core API replacement) | 3 |
| `.js` | "MessagePage" | `fix-deprecated-controls` (MessagePage → IllustratedMessage) | 4 |
| `.js` | "Parameters.get", "loadData", "Mobile.init", "createEntry", "View.create", "Fragment.load", "Router" | `fix-partially-deprecated-apis` | 4 |
| `.xml` | "native HTML", "SVG" | `fix-xml-native-html` | 4 |
| `.xml` | "visibleRowCountMode", "visibleRowCount", "rowHeight", "fixedRowCount", "fixedBottomRowCount", "minAutoRowCount" | `fix-table-row-mode` | 4 |
| `.xml` | "MessagePage" | `fix-deprecated-controls` (MessagePage → IllustratedMessage) | 4 |
| any | *(no pattern matches above)* | Log to `MODERNIZATION-ISSUES.md` for manual review | — |

## Phase 0: Prerequisites and Mode Selection

### Prerequisite check

```bash
npx @ui5/linter --version || echo "ERROR: @ui5/linter not available"
```

If the linter is not installed, tell the user to run `npm install --save-dev @ui5/linter` and stop.

### Non-interactive mode (tests / pre-push hook)

If the invoking prompt contains "Do not ask for confirmation" or similar instructions to skip interactive prompts, operate in **non-interactive mode**:

- Do NOT ask for verification mode — there is no human in the loop.
- Do NOT run verification gates (build/tests) between phases.
- Do NOT create git commits (the test harness handles version control).
- Do NOT generate the documentation phase (no MODERNIZATION-REPORT.md or MODERNIZATION-ISSUES.md).
- Execute phases 1–5 sequentially without pausing.

In this mode, skip the rest of Phase 0 and proceed directly to Phase 1.

### Ask the user once: which verification mode?

Before phase 1, the agent asks the user to pick a verification mode. This choice applies to **every** phase boundary — do not re-ask between phases.

Present these three options (use AskUserQuestion):

| Mode | What happens at each gate |
|---|---|
| **Full autonomous** | Run tests (see Build & test commands) → if anything fails, attempt to debug and apply a fix. Stop and escalate when EITHER (a) the same failure has been retried 3 times OR (b) tests are still red after one debug attempt. On stop, emit a structured report and ask the user how to proceed. |
| **Half autonomous** | Run tests (see Build & test commands) → emit a structured report (passed/failed/skipped + failure summaries). Wait for user to type "continue" or give corrective input. |
| **Manual** | Skip tests entirely. Print a one-line phase summary (files touched, errors fixed, errors deferred). Wait for the user to verify and type "continue". |

Save the chosen mode in working memory. The mode determines **only** what happens at gates — phases themselves run identically regardless.

### Build & test commands

Detect the project type at the start and use the matching commands throughout all gates. Read `references/build-and-test-commands.md` for the full details (prerequisites, exact commands, troubleshooting).

**Prerequisites:** Chrome DevTools MCP must be connected for browser-based test verification. If not available, install it via `/install-mcps` before proceeding.

**Summary:**

- **`pom.xml` exists** → Maven project. Ensure prerequisites (headless-chrome.json, pom.xml dev profile patch, .gitignore) are in place before the first test run. For verification gates, use §1.3 only: `mvn clean verify -P execute.qunit ...` (self-contained: compiles + tests). §1.2 is for interactive dev only — do not use it in gates. See the reference for exact flags and troubleshooting.
- **No `pom.xml`** → npm project. Read `package.json` `"scripts"` for build/test commands (typically `npm run build` / `npm test`). If no test script exists, fall back to `npx @ui5/linter --details`.

## Operating Principles

These apply throughout. They exist because past runs failed by skipping fixable work, deferring volume-heavy errors, or stopping early.

1. **Fix every error that has a mapped skill.** Volume is not a reason to defer. 480 formatter references across 140 XML files is the work, not a reason to skip — sub-agents handle repetition.

2. **Phases are mandatory in order.** Phase 3 in particular catches runtime patterns invisible to the linter (cyclic deps, app-namespace globals, QUnit assertions). A zero-error linter report does NOT mean phase 3 is complete — its sub-skills have their own detection scripts.

3. **Never auto-modernize sync→async when the return type changes.** These are the exceptions where `fix-partially-deprecated-apis` does NOT apply — they cannot be done mechanically because they require restructuring all callers:
   - `sap.ui.xmlfragment()` → `Fragment.load()` (returns control vs. Promise)
   - `sap.ui.component()` → `Component.create()`
   - `sap.ui.view()` → `View.create()`
   - `sap.ui.controller()` (instantiation form) → `Controller.create()`

   Document these in `MODERNIZATION-ISSUES.md` with file path, line, the sync API, its async replacement, and which callers need restructuring. Continue fixing other errors in the same file. The disambiguation table routes `View.create`, `Fragment.load` to `fix-partially-deprecated-apis` only when the *caller already uses async/await or `.then()`* — if the caller expects a synchronous return value, defer to this principle.

4. **`MODERNIZATION-ISSUES.md` is a last resort.** Valid entries: no skill exists for the rule, or a skill was applied but the fix genuinely failed (with explanation). If you find yourself writing "~N remaining errors for rule X" while a skill exists for rule X, go back and fix them.

## Git Commit Strategy

**One commit per phase, five commits total** (plus the documentation commit). Stage only the files modified in that phase — never use `git add -A` or `git add .`. Do not push.

**Never stage these files** (they are local-only test infrastructure):
- `headless-chrome.json` — local headless Chrome config
- `pom.xml` — if the dev profile patch was applied for testing
- `.gitignore` — if modified to add `target/` and `headless-chrome.json`

These files must remain locally for future test runs but must never be committed or pushed.

| # | After Phase | Commit Message |
|---|---|---|
| 1 | Phase 1 | `chore: apply UI5 linter autofix and modernize test starter` |
| 2 | Phase 2 | `fix: modernize manifest.json and Component.js` |
| 3 | Phase 3 | `fix: modernize module system (globals, pseudo-modules, cycles, blind spots)` |
| 4 | Phase 4 | `fix: replace deprecated UI5 APIs` |
| 5 | Phase 5 | `fix: enforce CSP compliance` |
| 6 | Documentation | `docs: add modernization report and issues` |

If a phase makes no changes (e.g., the project has no XML views with native HTML in phase 4), skip its commit.

## Phase 1: Mechanical Baseline

**Goal:** Apply low-risk mechanical fixes that prepare the project for verification gates in later phases.

**Order matters within this phase:** autofix runs first (it modifies many files mechanically), then `modernize-test-starter` (which restructures test entry points and depends on a stable JS layout).

### Step 1.1: Initial Analysis

Run the linter to establish baseline:

```bash
# Run linter with details and capture output
npx @ui5/linter --details 2>&1 | tee /tmp/ui5-linter-baseline.txt

# Count total errors (lines containing " error " or " warning ")
grep -c " error \| warning " /tmp/ui5-linter-baseline.txt || echo "0"
```

Parse the output to extract:
- Total error count
- Total warning count
- Errors grouped by rule ID
- Errors grouped by file

Store these metrics for the final comparison.

### Step 1.2: Apply Autofix

Run the linter's autofix mode:

```bash
# Run autofix
npx @ui5/linter --fix

# Run linter again to count remaining errors
npx @ui5/linter --details 2>&1 | tee /tmp/ui5-linter-post-autofix.txt
grep -c " error \| warning " /tmp/ui5-linter-post-autofix.txt || echo "0"
```

Calculate:
- Errors fixed by autofix = baseline count - post-autofix count
- Remaining errors to fix manually

### Step 1.3: Test Starter modernization

Launch a single sub-agent with the `modernize-test-starter` skill. This is a project-wide operation (not per-file), so use a custom prompt rather than the standard template:

```
Modernize test infrastructure to use the UI5 Test Starter concept.

Project root: {project-path}

Errors to fix:
{all prefer-test-starter errors from the linter output}

Instructions:
1. Read {skills-dir}/modernize-test-starter/SKILL.md carefully. This is a complex skill with many phases — do NOT skip the documentation.
2. CRITICAL — Phase 0 (Detection) must run completely BEFORE any file changes. The
   classification of the test infrastructure (launcher type, OPA pattern, test structure)
   determines the entire conversion path. Skipping or rushing detection leads to missed
   conversions and wrong transformation choices.
3. Follow ALL phases in order — every phase must complete
4. Verify against the Completion Checklist (14 items) before reporting done
5. Report: files created, files renamed, files deleted, detection/classification results
```

### Phase 1 commit + gate

- Commit: `chore: apply UI5 linter autofix and modernize test starter`
- Run the verification gate per the chosen mode.

## Phase 2: Foundation

**Goal:** Modernize `manifest.json` and `Component.js`. These files are the foundation everything else assumes.

**Sequential within this phase:** manifest first (because Component.js may need to reflect manifest changes like `IAsyncContentCreation`).

### Step 2.1: manifest.json

Launch a sub-agent with `fix-manifest-json`. Pass all errors targeting `manifest.json` from the rules: `no-outdated-manifest-version`, `no-legacy-ui5-version-in-manifest`, `no-deprecated-library`, `no-deprecated-component`, `no-removed-manifest-property`, and `no-deprecated-api` errors whose message mentions "view type", "model type", or "resources/js".

Sub-agent prompt:
```
Fix manifest.json modernization issues.

Project root: {project-path}

File: webapp/manifest.json
Errors to fix:
{manifest.json errors from the linter output}

Instructions:
1. Read {skills-dir}/fix-manifest-json/SKILL.md — follow ALL fix strategies and implementation steps
2. Pay special attention to the Notes section — these are load-bearing constraints from past failures
3. Complete ALL implementation steps in order
4. Verify against the skill's completion criteria
5. Report: properties changed, properties removed, issues that could not be fixed
```

### Step 2.2: Component.js

Launch a sub-agent with `fix-component-async`. Also pass any `no-deprecated-library`, `no-deprecated-component`, or `no-removed-manifest-property` errors targeting Component.js.

Sub-agent prompt:
```
Modernize Component.js async loading.

Project root: {project-path}

File: webapp/Component.js
Errors to fix:
{Component.js errors from the linter output, if any}

Instructions:
1. Read {skills-dir}/fix-component-async/SKILL.md — follow ALL fix strategies and implementation steps
2. Pay special attention to Critical Rules section — these are load-bearing constraints from past failures
3. This is unconditional — apply even if linter didn't flag `async-component-flags` (the error
   only appears after manifest.json removes `async: true` from rootView)
4. Complete ALL implementation steps in order
5. Report: changes applied, errors fixed
```

### Step 2.3: Verify Component.js (gate script)

After Step 2.2 completes, run the gate script to catch common mistakes:

```bash
node {skills-dir}/fix-component-async/scripts/verify-component.js {project-path}
```

If the script exits with code 1 (findings with severity "error"), fix the Component.js:
- `imported-interface`: Remove `sap/ui/core/IAsyncContentCreation` from the `sap.ui.define` dependency array and its function parameter. Use the string literal `"sap.ui.core.IAsyncContentCreation"` in the interfaces array instead.
- `interface-not-string`: Replace the variable reference in `interfaces: [IAsyncContentCreation]` with the string literal `interfaces: ["sap.ui.core.IAsyncContentCreation"]`.
- `missing-interface`: Add `interfaces: ["sap.ui.core.IAsyncContentCreation"]` inside the `metadata` object.

Re-run the script to confirm `pass: true` before proceeding.

### Phase 2 commit + gate

- Commit: `fix: modernize manifest.json and Component.js`
- Run the verification gate.

## Phase 3: Module System & Globals

**Goal:** Get the module dependency graph right. Fix `sap.ui.define` arrays, eliminate global namespace access, replace pseudo-modules, and resolve any cycles introduced by the changes.

**Strategy:** The three global/module skills are largely independent at the file level (different files have different issues), so they run **in parallel**. `fix-linter-blind-spots` and `fix-cyclic-deps` run **sequentially after** the parallel batch because they need a stable, complete view of the JS layer.

**Critical: always use sub-agents for Step 3.1.** Do NOT rewrite controllers or JS files inline — the `fix-js-globals` SKILL.md contains Key Rules (dead code removal, this.byId() collapsing, merge-not-deepExtend) that the main agent does not have in context. Skipping the sub-agent means skipping those rules and producing incorrect output.

### Step 3.1: Parallel batch — globals and pseudo-modules

Launch sub-agents in parallel (foreground, single message, up to 8 concurrent — batch sequentially if more):

- `fix-js-globals` for JS files with `no-globals` errors (sap.*/jQuery.*) plus the `no-deprecated-api` cases routed to it via the disambiguation table.
- `fix-pseudo-modules` for files with `no-pseudo-modules` or `no-implicit-globals` errors.
- `fix-xml-globals` for ALL XML files with `no-globals` or `no-ambiguous-event-handler` errors. This includes `sap.*`, `jQuery.*`, AND app-namespace globals (e.g., `com.example.app.utils.Handler.onPress`) — XML app-namespace globals ARE detected by the linter and belong here, not in blind-spots.

**Test resources are included.** Files under `test/`, `webapp/test/`, `test/unit/`, `test/integration/`, etc. get the same treatment as app source files. The linter reports the same rule IDs across both, and the same skills apply.

### Step 3.1b: Regression check

After all Step 3.1 sub-agents complete, re-run the linter to catch regressions introduced by the globals/pseudo-modules fixes (e.g., missing imports, broken references):

```bash
npx @ui5/linter --details 2>&1 | tee /tmp/ui5-linter-post-phase3-batch.txt
```

Compare against the post-autofix baseline. If new errors appear for rules already handled by Step 3.1 skills (`no-globals`, `no-pseudo-modules`, `no-implicit-globals`), launch a second parallel batch targeting only those new errors. If new errors belong to other phases (e.g., `no-deprecated-api`), ignore them — they'll be handled in Phase 4.

### Step 3.2: Sequential — fix-linter-blind-spots

After the parallel batch completes, launch **one sub-agent** with `fix-linter-blind-spots`. This skill catches runtime-breaking patterns the linter does NOT report: app-namespace globals in JS files, QUnit 1.x assertions, sinon mocking via global chains.

Sub-agent prompt:
```
Fix linter blind spots (runtime-breaking patterns the linter does NOT report).

Project root: {project-path}

Instructions:
1. Read {skills-dir}/fix-linter-blind-spots/SKILL.md
2. Read manifest.json for the app namespace
3. Run: node {skills-dir}/fix-linter-blind-spots/scripts/detect-blind-spots.js {project-path}
4. Fix all detected patterns in priority order
5. Re-run the script — confirm summary.total === 0
6. Report: files modified, patterns fixed (count per type), unfixable issues
```

### Step 3.3: Sequential — fix-cyclic-deps

After blind-spots completes, launch **one sub-agent** with `fix-cyclic-deps`. Earlier steps in this phase can introduce cyclic dependencies (e.g., when `fix-js-globals` converts a global read into a `sap.ui.define` dependency). Cycle detection requires a global view of the dependency graph, so it runs as a single agent at the end.

Sub-agent prompt:
```
Fix cyclic module dependencies in this UI5 project.

Project root: {project-path}

Instructions:
1. Read {skills-dir}/fix-cyclic-deps/SKILL.md
2. Build the internal module dependency graph from all sap.ui.define arrays
3. Detect and auto-fix 2-node direct cycles (lazy sap.ui.require on the lesser-used edge)
4. Detect 3+ node chains via Tarjan's SCC and flag them in MODERNIZATION-ISSUES.md
5. Report: files modified, cycles fixed (count), unfixable cycles (file pairs + reason)
```

### Phase 3 commit + gate

- Run `npx @ui5/linter --details` to verify nothing regressed.
- Commit: `fix: modernize module system (globals, pseudo-modules, cycles, blind spots)`
- Run the verification gate.

## Phase 4: Deprecated APIs

**Goal:** Replace deprecated UI5 APIs with their modern equivalents. Pure name-for-name work — no module-system implications.

**Strategy:** Skills target different rules and (mostly) different files, so they run **in parallel** by skill. Group errors by skill using the "Rule ID to Skill Mapping" and "Disambiguating `no-deprecated-api`" tables above, then launch one sub-agent per file (or per cluster of related files).

### Execution

Launch sub-agents in parallel (foreground, single message, up to 8 concurrent — batch sequentially if more). Use the sub-agent prompt template below. Group files by `{skill-name}`; one sub-agent can handle multiple files for the same skill.

### Step 4.2: Regression check

After all Phase 4 sub-agents complete, re-run the linter to catch regressions (e.g., a deprecated control replacement that breaks an import or introduces a new `no-globals` error):

```bash
npx @ui5/linter --details 2>&1 | tee /tmp/ui5-linter-post-phase4.txt
```

If new errors appear for rules handled by Phase 4 skills, launch a second batch targeting only those new errors. If new errors belong to Phase 3 rules (unlikely regression), fix them inline or escalate to MODERNIZATION-ISSUES.md.

### Phase 4 commit + gate

- Run `npx @ui5/linter --details`.
- Commit: `fix: replace deprecated UI5 APIs`
- Run the verification gate.

## Phase 5: CSP Compliance

**Goal:** Make the app run under a strict Content Security Policy. Inline scripts, `eval`, and other CSP-incompatible patterns get extracted or rewritten.

CSP comes last because earlier phases (notably phase 1's autofix and test-starter restructure, and phase 4's bootstrap-params) may have introduced inline blocks. Running CSP first would mean re-doing the work.

**Note on test HTML files:** Phase 1's `modernize-test-starter` deletes legacy test entry points (e.g., `unitTests.qunit.html`). However, some test HTMLs may survive (e.g., an `opaTests.qunit.html` that wasn't covered by test-starter). If these have `csp-unsafe-inline-script` errors, they still need CSP fixes here.

**Critical: never delete inline scripts — always externalize them.** The CSP fix is to move inline code to an external `.js` file and replace the `<script>...</script>` with `<script src="file.js"></script>`. Even trivial config objects or debug flags must be extracted, not removed — removing them is a functional regression.

Launch sub-agents in parallel for files with `csp-unsafe-inline-script` errors. Use the sub-agent prompt template, `{skill-name}=fix-csp-compliance`. Do NOT fix CSP issues inline from the main agent — the skill contains extraction patterns the main agent doesn't have in context.

### Phase 5 commit + gate

- Run `npx @ui5/linter --details` for the final error count.
- Commit: `fix: enforce CSP compliance`
- Run the verification gate.

## Verification Gate (post-phase, every phase)

After every phase commit, run the gate matching the mode chosen in Phase 0.

### Full autonomous

**Never skip tests.** The user chose full autonomous because they want verified correctness at every phase boundary. You must run the build and tests before proceeding to the next phase, every single time — no exceptions, no deferring to "after the next phase". If no build/test command is available, fall back to `npx @ui5/linter --details` as the minimum verification — but never proceed without running something.

**Use a 600000ms (10 minute) timeout** for all build and test commands. These commands (especially Maven builds and headless QUnit runs) routinely exceed the default 2-minute timeout.

**Delegate to a sub-agent.** Launch a sub-agent to run the build, run the tests, and debug failures. This keeps the orchestrator's context clean and lets the sub-agent focus on test output analysis.

**Before launching the sub-agent**, print: `⏳ Phase {N} gate: launching test sub-agent...`

The sub-agent prompt:

```
Run the verification gate for Phase {N} of a UI5 modernization workflow.

Project root: {project-path}

Build & test reference: {skills-dir}/modernize-ui5-app/references/build-and-test-commands.md

CRITICAL REQUIREMENTS:
- You MUST execute the actual test command (Maven headless QUnit or npm test). A successful
  build alone is NOT verification. Running only the linter is NOT verification.
- The gate requires BOTH a passing build AND passing tests. Do not report success unless
  you have actually run the test command and confirmed all tests passed.
- IMPORTANT for Maven: exit code 0 does NOT guarantee all tests passed. Maven returns 0
  as long as the BUILD succeeds. You MUST check the end of the command output for failing
  test summaries AND check `target/surefire-reports/` (if it exists) for detailed results.
- If you skip tests or only verify via build/linter, you have FAILED your task.
- EXCEPTION: If the build & test reference determines there is NO test command available
  (npm project with no test script in package.json), linter-only verification IS acceptable.
  In that case, run `npx @ui5/linter --details` and report:
  "⚠️ NO TEST COMMAND AVAILABLE — verified via linter only (N errors)."

SCOPE CONSTRAINT — DO NOT EXCEED:
- Your ONLY job is to run the tests, and if tests fail, fix the FAILING TESTS.
- NEVER fix linter errors, modernize code, or apply changes that belong to other phases.
- When debugging a test failure, ONLY make the minimal change needed to make the test pass
  (e.g., fix an import path, adjust a test assertion, correct a module reference).
- Fixes for test breakage caused by the CURRENT phase's changes ARE in scope. For example:
  if Phase 2 renamed a manifest property and a test reads that property, updating the test
  to use the new name is a valid fix.
- Fixes that require applying a DIFFERENT phase's modernization pattern are NOT in scope.
  Report those as "❌ FAILED" — do NOT apply the modernization fix yourself.
- You are a test runner, not a modernizer. Stay in your lane.

Log progress at every step so the user has feedback during execution.

Instructions:
1. Read the build & test reference above. Follow its "Project Type Detection" flow to determine
   whether this is a Maven or npm project.
2. For Maven projects: §1.3 is self-contained (compiles + tests in one command). Skip §1.2
   (that's an interactive dev server). For npm projects: use the build and test scripts from
   package.json (§2).
3. Print: "⏳ Phase {N} gate: running tests..."
4. Run the test command with a 600000ms timeout.
   - Maven: §1.3 (`mvn clean verify -P execute.qunit ...`)
   - npm: the test script from package.json (e.g., `npm test`)
5. Determine test result — IMPORTANT for Maven: exit code 0 does NOT guarantee all tests
   passed. Maven returns 0 as long as the BUILD succeeds, even if individual QUnit tests
   failed. You MUST check the end of the command output for failing test summaries AND
   check `target/surefire-reports/` (if it exists) for detailed test results. Only report
   tests as passed if both the output shows no failures AND no surefire report indicates
   red tests.
6. Print test result: "✅ Tests passed (N tests)." or "❌ Tests failed: N of M red."
7. If tests pass → report: "✅ TESTS OK"
8. If tests fail:
   a. Print: "🔍 Analyzing failure..."
   b. Capture the failing test error output.
   c. Print: "🔧 Attempting fix: {brief description of what you're fixing}"
   d. Only fix the immediate test failure (broken import, wrong path, missing dependency).
      Do NOT fix linter warnings, modernize APIs, or apply changes from other phases.
   e. Print: "🔄 Re-running tests..."
   f. Re-run the test command with a 600000ms timeout.
   g. If it now passes → report: "✅ Fix applied, gate passes." Include what was fixed.
   h. If it still fails → report: "❌ FAILED" with:
      - Test failure summary (≤20 lines)
      - What was attempted
      - Suggested next action
9. If you have retried 3 times for the same failure, stop and report.

For Maven projects: if tests fail with ClassNotFoundException or test-resources/ 404s,
consult the build & test reference §1.4 and references/SAPUI5_Local_Build.md §1.2.
```

**After the sub-agent returns:**
- If "✅" → print "✅ Phase {N} gate: tests OK — continuing to Phase {N+1}." → proceed.
- If "❌" → print the failure summary and ask: "Continue with next phase / retry / abort?"

### Half autonomous

**Delegate to a sub-agent.** Launch a sub-agent to run the build and tests, then report results back to the orchestrator for user review.

**Before launching the sub-agent**, print: `⏳ Phase {N} gate: launching test sub-agent...`

The sub-agent prompt:

```
Run the verification gate for Phase {N} of a UI5 modernization workflow.

Project root: {project-path}

Build & test reference: {skills-dir}/modernize-ui5-app/references/build-and-test-commands.md

CRITICAL REQUIREMENTS:
- You MUST execute the actual test command (Maven headless QUnit or npm test). A successful
  build alone is NOT verification. Running only the linter is NOT verification.
- The gate requires BOTH a passing build AND passing tests. Do not report success unless
  you have actually run the test command and confirmed all tests passed.
- IMPORTANT for Maven: exit code 0 does NOT guarantee all tests passed. Maven returns 0
  as long as the BUILD succeeds. You MUST check the end of the command output for failing
  test summaries AND check `target/surefire-reports/` (if it exists) for detailed results.
- If you skip tests or only verify via build/linter, you have FAILED your task.
- EXCEPTION: If the build & test reference determines there is NO test command available
  (npm project with no test script in package.json), linter-only verification IS acceptable.
  In that case, run `npx @ui5/linter --details` and report:
  "⚠️ NO TEST COMMAND AVAILABLE — verified via linter only (N errors)."

Log progress at every step so the user has feedback during execution.

Instructions:
1. Read the build & test reference above. Follow its "Project Type Detection" flow to determine
   whether this is a Maven or npm project.
2. For Maven projects: §1.3 is self-contained (compiles + tests in one command). Skip §1.2
   (that's an interactive dev server). For npm projects: use the build and test scripts from
   package.json (§2).
3. Print: "⏳ Phase {N} gate: running tests..."
4. Run the test command with a 600000ms timeout.
   - Maven: §1.3 (`mvn clean verify -P execute.qunit ...`)
   - npm: the test script from package.json (e.g., `npm test`)
5. Determine test result — for Maven: do NOT rely on exit code alone. Check the end of the
   output for test failure summaries and check `target/surefire-reports/` if it exists.
6. Report results in this exact format:
   ✅/❌ Tests: N passed, N failed, N skipped
   Failed test names (≤10, then "...and X more")
6. Do NOT attempt to debug or fix failures — just report.
```

**After the sub-agent returns:**
1. Print the sub-agent's structured report to the user.
2. Wait for the user. Acceptable user inputs: "continue", "skip phase", "run tests", "abort".
3. Do not attempt to debug or fix unless the user gives explicit instructions.

### Manual

```
1. Print a one-line phase summary: "Phase {N} done. Files modified: {count}. Errors fixed: {count}. Deferred: {count}."
2. Wait for the user to type "continue", verify externally, or give corrective input.
```

**Important: the agent does NOT re-ask which mode to use.** The mode was set in Phase 0 and applies to every gate.

## Sub-Agent Prompt Template (Phases 1–5)

This template is used by every phase that delegates to skill sub-agents. Phase 3.2 (blind-spots) and 3.3 (cycles) have inline prompts above because they're single-shot global operations.

**Placeholders:**
- `{project-path}` — absolute path to the UI5 project root
- `{skills-dir}` — absolute path to the parent of this skill's directory (resolved once by the orchestrator)
- `{skill-name}` — the skill folder name (e.g. `fix-js-globals`)
- `{file-path}` — target file(s)
- `{errors}` — linter errors for those files (rule, line, message)

```
Fix UI5 linter errors in the following file(s) using the {skill-name} skill.

Project root: {project-path}

File: {file-path}
Errors to fix:
{errors}

Instructions:
1. Read the skill at: {skills-dir}/{skill-name}/SKILL.md
2. Pay special attention to any "Key Rules" section at the top — these are load-bearing constraints from past failures.
3. Read any reference files mentioned in the skill.
4. Read the affected file(s).
5. Apply the fix patterns from the skill EXACTLY as documented — do not apply general web development best practices that conflict with the skill.
6. After fixing, verify each error is resolved.
7. Report back CONCISELY:
   - Files modified (paths only)
   - Count of errors fixed
   - Errors that could NOT be fixed (one line each):
     `{file}:{line} | {rule} | {reason} | {suggested fix}`
```

### Sub-agent execution rules

- **Foreground mode only.** Do NOT use `run_in_background: true`. Launch all sub-agents for a phase step in a SINGLE message with multiple Agent tool calls — this blocks the main agent until all return, preventing mid-edit interference.
- **Cap at ~8 concurrent sub-agents per message.** If more files, batch sequentially — do NOT stop after one batch.
- **Group related files into one sub-agent.** A controller and its XML view both needing `core:require` changes should share a sub-agent.
- **No validation between sub-agent batches within a phase step.** Files may be in transient state. All linter/LSP checks happen AFTER the phase step is complete.
- **Every file with a mapped error MUST be processed.** Skipping due to volume is a failure mode.

### Per-phase skill dispatch checklist

Quick reference for which skills get dispatched in each phase. The "Rule ID to Skill Mapping" table above is authoritative — this is a convenience summary.

| Phase | Skills dispatched |
|-------|-------------------|
| 1 | `modernize-test-starter` |
| 2 | `fix-manifest-json`, `fix-component-async` |
| 3 (parallel) | `fix-js-globals`, `fix-pseudo-modules`, `fix-xml-globals` |
| 3 (sequential) | `fix-linter-blind-spots`, `fix-cyclic-deps` |
| 4 | `fix-bootstrap-params`, `fix-library-init`, `fix-control-renderer`, `fix-deprecated-controls`, `fix-fiori-elements-extensions`, `fix-partially-deprecated-apis`, `fix-table-row-mode`, `fix-xml-native-html` |
| 5 | `fix-csp-compliance` |

## Documentation Phase (after Phase 5)

Create `MODERNIZATION-ISSUES.md` (unfixable errors) and `MODERNIZATION-REPORT.md` (final summary) using the templates in `references/documentation-templates.md`.

Commit: `docs: add modernization report and issues`

## Context Management

This workflow touches 17+ skill files totaling ~8,000 lines. The main agent's context cannot hold them all. Strategy: **the main agent never reads child skill files — only sub-agents do.**

1. **Never read child skills.** The routing table tells you which skill to assign. The sub-agent prompt tells each sub-agent to read its own skill. Trust the routing.
2. **Parse and discard linter output.** Parse into `[{file, line, rule, message}]`, optionally persist to `/tmp/ui5-modernization-state.json`, then drop the raw text. Give each sub-agent only its filtered errors.
3. **Compress sub-agent results.** Keep: count of errors fixed, unfixable errors (for MODERNIZATION-ISSUES.md), files modified (for the commit). Discard narrative.
4. **Prioritize completion over documentation.** If context runs low after Phase 4, always finish Phase 5 (CSP). Skip or minimize the documentation phase — the commit history already records what changed.

## Error Handling

If a fix attempt **genuinely fails** (not "there are too many"):
1. Log the error.
2. Add to MODERNIZATION-ISSUES.md.
3. Continue with the next error — do not stop the workflow.

## Completion Checklist

Before the documentation phase:

- [ ] User picked verification mode in Phase 0; agent did not re-ask
- [ ] Each of phases 1–5 has a commit (or was skipped because no changes applied)
- [ ] Verification gate ran after every phase per the chosen mode
- [ ] Phase 3 ran ALL three steps (parallel batch + blind-spots + cycles), even if linter showed 0 errors after the batch
- [ ] Sub-agents launched in foreground, single-message batches; no validation mid-phase
- [ ] Files staged per-phase (no `git add -A`)
- [ ] MODERNIZATION-ISSUES.md contains only genuinely unfixable errors
