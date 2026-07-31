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

1. **Mechanical baseline** — autofix + test starter restructure. Low-risk, unlocks test runs.
2. **Foundation** — `manifest.json` and `Component.js`. Everything downstream reads the manifest.
3. **Module system & globals** — dependency graph (sap.ui.define arrays, lazy requires, no implicit globals). Cyclic-dep and blind-spot fixes belong here.
4. **Deprecated APIs** — pure name-for-name replacement. Safe after phase 3 stabilizes the graph.
5. **CSP compliance** — last, because it depends on every prior phase being CSP-clean.

A documentation pass writes `MODERNIZATION-REPORT.md` and `MODERNIZATION-ISSUES.md` after phase 5.

## Rule ID to Skill Mapping

| Rule ID | Skill | Phase |
|---------|-------|-------|
| `no-deprecated-theme` | `fix-bootstrap-params` | 4 |
| `no-outdated-manifest-version` | `fix-manifest-json` | 2 |
| `no-legacy-ui5-version-in-manifest` | `fix-manifest-json` | 2 |
| `no-deprecated-library` | `fix-manifest-json` (manifest) or `fix-bootstrap-params` (HTML) | 2 / 4 |
| `no-deprecated-component` | `fix-manifest-json` | 2 |
| `no-removed-manifest-property` | `fix-manifest-json` or `fix-component-async` | 2 |
| `async-component-flags` | `fix-component-async` | 2 |
| `no-globals` | `fix-xml-globals` (ALL XML) or `fix-js-globals` (JS — sap.*/jQuery.*) | 3 |
| `no-ambiguous-event-handler` | `fix-xml-globals` | 3 |
| `no-deprecated-control-renderer-declaration` | `fix-control-renderer` | 4 |
| `ui5-class-declaration` | `fix-control-renderer` | 4 |
| `no-pseudo-modules` | `fix-pseudo-modules` | 3 |
| `no-implicit-globals` | `fix-pseudo-modules` | 3 |
| `unsupported-api-usage` | `fix-partially-deprecated-apis` | 4 |
| `prefer-test-starter` | `modernize-test-starter` | 1 |
| `csp-unsafe-inline-script` | `fix-csp-compliance` | 5 |
| (structural) | `fix-cyclic-deps` | 3 |
| (runtime) | `fix-linter-blind-spots` | 3 |

### Disambiguating `no-deprecated-api`

| File Type | Message Contains | Skill | Phase |
|-----------|------------------|-------|-------|
| `.html` | "bootstrap parameter", "deprecated theme" | `fix-bootstrap-params` | 4 |
| `manifest.json` | "view type", "model type", "resources/js" | `fix-manifest-json` | 2 |
| `.js` | "Lib.init/Library.init" | `fix-library-init` | 4 |
| `.js` | "deprecated renderer", "apiVersion", "IconPool", "rerender" | `fix-control-renderer` | 4 |
| `.js` | "deprecated class/property/interface" | `fix-deprecated-controls` | 4 |
| `.js` | "registerControllerExtensions" or `sap.ui.controller` in manifest `sap.ui.controllerExtensions` | `fix-fiori-elements-extensions` | 4 |
| `.js` | "sap.ui.controller" NOT in manifest extensions | `fix-js-globals` (case 9) | 3 |
| `.js` | "jQuery.sap.declare", "jQuery.sap.require" | `fix-js-globals` (case 10) | 3 |
| `.js` | "getLibraryResourceBundle" | `fix-js-globals` | 3 |
| `.js` | "MessagePage" | `fix-deprecated-controls` | 4 |
| `.js` | "Parameters.get", "loadData", "Mobile.init", "createEntry", "View.create", "Fragment.load", "Router" | `fix-partially-deprecated-apis` | 4 |
| `.xml` | "native HTML", "SVG" | `fix-xml-native-html` | 4 |
| `.xml` | "visibleRowCountMode", row-mode attrs | `fix-table-row-mode` | 4 |
| `.xml` | "MessagePage" | `fix-deprecated-controls` | 4 |
| any | *(no match)* | Log to `MODERNIZATION-ISSUES.md` | — |

## Phase 0: Prerequisites and Mode Selection

### Prerequisite check

```bash
npx @ui5/linter --version || echo "ERROR: @ui5/linter not available"
```

If not installed, tell user to run `npm install --save-dev @ui5/linter` and stop.

### Non-interactive mode

If the prompt contains "Do not ask for confirmation" or similar: skip mode selection, skip gates, skip commits, skip documentation. Execute phases 1–5 sequentially without pausing.

### Ask the user once: which verification mode?

| Mode | What happens at each gate |
|---|---|
| **Full autonomous** | Run tests → on failure, debug+fix (stop after 3 retries or 1 failed debug). On stop, emit report and ask user. |
| **Half autonomous** | Run tests → emit structured report. Wait for user "continue". |
| **Manual** | Skip tests. Print one-line summary. Wait for user "continue". |

Save mode. Do not re-ask between phases.

### Build & test commands

Read `references/build-and-test-commands.md`. Chrome DevTools MCP must be connected (install via `/install-mcps` if needed).

- **`pom.xml` exists** → Maven. Use §1.3 (`mvn clean verify -P execute.qunit ...`) for gates.
- **No `pom.xml`** → npm. Use `package.json` scripts. Fallback: `npx @ui5/linter --details`.

## Operating Principles

1. **Fix every error that has a mapped skill.** Volume is not a reason to defer.
2. **Phases are mandatory in order.** Phase 3 catches runtime patterns invisible to the linter — a zero-error report does NOT mean phase 3 is complete.
3. **Never auto-modernize sync→async when return type changes.** `sap.ui.xmlfragment()`, `sap.ui.component()`, `sap.ui.view()`, `sap.ui.controller()` (instantiation) → document in `MODERNIZATION-ISSUES.md`.
4. **`MODERNIZATION-ISSUES.md` is a last resort.** Valid: no skill exists, or a skill genuinely failed. Invalid: "~N remaining errors for rule X" while a skill exists.

## Git Commit Strategy

One commit per phase, five total (plus documentation). Stage only files modified in that phase — never `git add -A`.

**Never stage:** `headless-chrome.json`, `pom.xml` (dev profile patch), `.gitignore` (local test infra).

| # | After Phase | Message |
|---|---|---|
| 1 | 1 | `chore: apply UI5 linter autofix and modernize test starter` |
| 2 | 2 | `fix: modernize manifest.json and Component.js` |
| 3 | 3 | `fix: modernize module system (globals, pseudo-modules, cycles, blind spots)` |
| 4 | 4 | `fix: replace deprecated UI5 APIs` |
| 5 | 5 | `fix: enforce CSP compliance` |
| 6 | Docs | `docs: add modernization report and issues` |

Skip commit if phase makes no changes.

## Phase 1: Mechanical Baseline

### Step 1.1: Initial Analysis

```bash
npx @ui5/linter --details 2>&1 | tee /tmp/ui5-linter-baseline.txt
grep -c " error \| warning " /tmp/ui5-linter-baseline.txt || echo "0"
```

Parse: total errors/warnings, grouped by rule ID and file. Store for final comparison.

### Step 1.2: Apply Autofix

```bash
npx @ui5/linter --fix
npx @ui5/linter --details 2>&1 | tee /tmp/ui5-linter-post-autofix.txt
```

### Step 1.3: Test Starter modernization

Launch sub-agent with `modernize-test-starter`. Use custom prompt instructing it to: read the skill, run Phase 0 detection completely before changes, follow ALL phases, verify against the 14-item Completion Checklist.

### Phase 1 commit + gate

## Phase 2: Foundation

### Step 2.1: manifest.json

Launch sub-agent with `fix-manifest-json`. Pass all `manifest.json` errors from rules: `no-outdated-manifest-version`, `no-legacy-ui5-version-in-manifest`, `no-deprecated-library`, `no-deprecated-component`, `no-removed-manifest-property`, plus `no-deprecated-api` with "view type"/"model type"/"resources/js".

### Step 2.2: Component.js

Launch sub-agent with `fix-component-async`. Unconditional — apply even if linter didn't flag `async-component-flags` (the error only appears after manifest.json removes `async: true` from rootView).

### Step 2.3: Verify Component.js

```bash
node {skills-dir}/fix-component-async/scripts/verify-component.js {project-path}
```

If exit code 1, fix: `imported-interface` → remove from deps, use string literal; `interface-not-string` → replace variable with string; `missing-interface` → add to metadata. Re-run to confirm.

### Phase 2 commit + gate

## Phase 3: Module System & Globals

**Strategy:** Three global/module skills run **in parallel** (different files). `fix-linter-blind-spots` and `fix-cyclic-deps` run **sequentially after** (need stable complete JS layer).

**Critical:** Always use sub-agents for Step 3.1. The `fix-js-globals` Key Rules are not in main-agent context.

### Step 3.1: Parallel batch

Launch sub-agents in parallel (up to 8 concurrent):
- `fix-js-globals` for JS `no-globals` errors + routed `no-deprecated-api` cases
- `fix-pseudo-modules` for `no-pseudo-modules` / `no-implicit-globals`
- `fix-xml-globals` for ALL XML `no-globals` / `no-ambiguous-event-handler` (including app-namespace globals)

**Test resources are included** — same rules apply to `test/` files.

### Step 3.1b: Regression check

Re-run linter. If new errors appear for Step 3.1 rules, launch a second batch for those. Ignore errors belonging to other phases.

### Step 3.2: fix-linter-blind-spots

Launch one sub-agent. Instruct it to: read the skill, read manifest for namespace, run `detect-blind-spots.js`, fix all patterns, re-run script to confirm zero total.

### Step 3.3: fix-cyclic-deps

Launch one sub-agent. Instruct it to: read the skill, build dependency graph, auto-fix 2-node cycles (lazy require), flag 3+ node chains in MODERNIZATION-ISSUES.md.

### Phase 3 commit + gate

Re-run linter to verify no regression before committing.

## Phase 4: Deprecated APIs

**Strategy:** Skills target different rules/files → run **in parallel** by skill. Group errors by skill using the mapping tables, launch one sub-agent per file (or cluster).

### Execution

Launch sub-agents in parallel (up to 8 concurrent). Use the Sub-Agent Prompt Template. Group files by skill.

### Step 4.2: Regression check

Re-run linter. Second batch for new Phase 4 errors only.

### Phase 4 commit + gate

## Phase 5: CSP Compliance

CSP comes last because earlier phases may introduce inline blocks.

**Critical: never delete inline scripts — always externalize.** Move inline code to `.js` file, replace with `<script src="...">`.

Launch sub-agents for files with `csp-unsafe-inline-script`. Use template with `fix-csp-compliance`.

### Phase 5 commit + gate

Final linter run for error count.

## Verification Gate

After every phase commit, run the gate matching the mode chosen in Phase 0. **Use 600000ms timeout** for all test commands.

### Full autonomous

**Delegate to a sub-agent.** Print `⏳ Phase {N} gate: launching test sub-agent...`

Sub-agent instructions:
1. Read `references/build-and-test-commands.md` → detect Maven vs npm
2. Run the test command (Maven §1.3 or npm test). **Linter-only is NOT verification** unless no test command exists.
3. **Maven: exit code 0 ≠ all tests passed.** Check output for failure summaries AND `target/surefire-reports/`.
4. On pass → report `✅ TESTS OK`
5. On fail → analyze, attempt minimal fix (broken import/path/assertion only — never modernize code), re-run. Stop after 3 retries or 1 failed debug.
6. **Scope constraint:** Only fix failing tests caused by current phase. Never apply other-phase modernizations.

After return: ✅ → proceed. ❌ → print summary, ask user.

### Half autonomous

Same sub-agent but do NOT debug failures. Report results only:
```
✅/❌ Tests: N passed, N failed, N skipped
Failed test names (≤10)
```

Wait for user: "continue" / "skip phase" / "run tests" / "abort".

### Manual

Print: `Phase {N} done. Files: {count}. Fixed: {count}. Deferred: {count}.`
Wait for user "continue".

## Sub-Agent Prompt Template (Phases 1–5)

```
Fix UI5 linter errors in the following file(s) using the {skill-name} skill.

Project root: {project-path}

File: {file-path}
Errors to fix:
{errors}

Instructions:
1. Read {skills-dir}/{skill-name}/SKILL.md
2. Pay special attention to "Key Rules" — load-bearing constraints from past failures.
3. Read reference files mentioned in the skill.
4. Read the affected file(s).
5. Apply fix patterns EXACTLY as documented.
6. Verify each error is resolved.
7. Report: files modified, errors fixed, unfixable errors ({file}:{line} | {rule} | {reason}).
```

### Sub-agent execution rules

- **Foreground mode only.** Launch all sub-agents for a phase step in a SINGLE message — blocks until all return.
- **Cap ~8 concurrent per message.** Batch sequentially if more — do NOT stop after one batch.
- **Group related files** (controller + its XML view) into one sub-agent.
- **No validation between batches within a phase step.** Checks happen AFTER phase step completes.
- **Every file with a mapped error MUST be processed.**

### Per-phase skill dispatch

| Phase | Skills |
|-------|--------|
| 1 | `modernize-test-starter` |
| 2 | `fix-manifest-json`, `fix-component-async` |
| 3 (parallel) | `fix-js-globals`, `fix-pseudo-modules`, `fix-xml-globals` |
| 3 (sequential) | `fix-linter-blind-spots`, `fix-cyclic-deps` |
| 4 | `fix-bootstrap-params`, `fix-library-init`, `fix-control-renderer`, `fix-deprecated-controls`, `fix-fiori-elements-extensions`, `fix-partially-deprecated-apis`, `fix-table-row-mode`, `fix-xml-native-html` |
| 5 | `fix-csp-compliance` |

## Documentation Phase (after Phase 5)

Create `MODERNIZATION-ISSUES.md` and `MODERNIZATION-REPORT.md` using templates in `references/documentation-templates.md`.

Commit: `docs: add modernization report and issues`

## Context Management

The main agent never reads child skill files — only sub-agents do.

1. **Never read child skills.** Routing table tells you which skill; sub-agent reads its own.
2. **Parse and discard linter output.** Give each sub-agent only its filtered errors.
3. **Compress sub-agent results.** Keep: count fixed, unfixable errors, files modified.
4. **Prioritize completion.** If context runs low, finish Phase 5. Skip documentation if needed.

## Error Handling

If a fix genuinely fails: log, add to MODERNIZATION-ISSUES.md, continue with next error.

## Completion Checklist

- [ ] User picked verification mode in Phase 0; agent did not re-ask
- [ ] Each of phases 1–5 has a commit (or was skipped — no changes)
- [ ] Verification gate ran after every phase per chosen mode
- [ ] Phase 3 ran ALL three steps (parallel + blind-spots + cycles), even if linter showed 0 after batch
- [ ] Sub-agents launched in foreground, single-message batches
- [ ] Files staged per-phase (no `git add -A`)
- [ ] MODERNIZATION-ISSUES.md contains only genuinely unfixable errors
