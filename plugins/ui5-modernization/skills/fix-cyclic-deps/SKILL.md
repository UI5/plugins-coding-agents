---
name: fix-cyclic-deps
description: |
  Detect and resolve cyclic module dependencies introduced during UI5 modernization.
  Trigger when user mentions: "cyclic dependency", "circular import", "undefined module at runtime",
  "lazy require", "sap.ui.require sync", "import cycle", or when a module returns undefined despite
  a correct import path. Classic symptom: a module is `undefined` at runtime despite a correct
  sap.ui.define import path.
  Auto-fixes 2-node cycles (A↔B) by converting the lesser-used edge to lazy sap.ui.require().
  Auto-fixes longer chains (3+ nodes) via hub-based approach. Reports unfixable chains to
  MODERNIZATION-ISSUES.md. Runs as Phase 3, Step 3.3 (final step) after all other Phase 3 steps.
---

# Fix Cyclic Module Dependencies

This skill detects and resolves cyclic module dependencies that arise during UI5 modernization. When modernization converts global namespace access to `sap.ui.define` imports, new dependency edges can create circular imports (A imports B, B imports A), causing the UI5 AMD loader to return `undefined` for the back-edge module.

The fix: replace the back-edge `sap.ui.define` dependency with a lazy `sap.ui.require("path/to/Module")` (synchronous form) at each call site, retrieving the already-loaded module from the loader cache without creating a dependency edge.

## Linter Rule

| Rule ID | Message Pattern | This Skill's Action |
|---------|-----------------|---------------------|
| (none — structural) | Runtime: module is `undefined` despite correct import path | Detect cycle in dependency graph, convert back-edge to lazy `sap.ui.require()` |

This skill is NOT triggered by a UI5 linter rule. It addresses a structural problem in the module dependency graph. It is triggered as the final fix phase in the modernization workflow, or standalone when a developer encounters `undefined` modules at runtime.

## When to Use

- **In modernization workflow**: As Phase 3, Step 3.3 (final step) after ALL other Phase 3 steps complete. Multiple steps add `sap.ui.define` edges that can create cycles — running once at the end operates on the final dependency graph.
- **Standalone**: When a module returns `undefined` at runtime despite a correct import path.
- **After manual refactoring**: When a developer adds a new `sap.ui.define` dependency and gets an unexpected `undefined`.

## Sources of Cycles

Three modernization operations add new `sap.ui.define` dependency edges that can introduce cycles:

### 1. fix-js-globals Case 1c — Global Namespace Reads

Converting `var Helper = com.example.app.utils.Helper;` to a `sap.ui.define` dependency. If `Helper` already imports the current module, adding the reverse edge creates a 2-node cycle.

### 2. fix-js-globals Case 10 — jQuery.sap.declare/require Modernization

Wrapping legacy `jQuery.sap.declare` / `jQuery.sap.require` code in `sap.ui.define`. The `jQuery.sap.require` calls become dependencies, potentially creating cycles the legacy synchronous loader handled differently.

### 3. modernize-test-starter — Test File Dependencies

Test files that previously accessed modules via the global namespace chain now get proper `sap.ui.define` imports. Test utility files that reference each other can create cycles.

## Background — Why Cycles Break the UI5 Loader

The UI5 AMD loader resolves `sap.ui.define` dependencies via depth-first traversal. When it encounters a cycle:

1. Loader starts loading Module A
2. A depends on B → loader starts loading B
3. B depends on A → but A isn't finished yet
4. Loader returns `undefined` for A's factory result (the back-edge)
5. B's factory receives `undefined` where it expected A's exports

**2-node cycles (A↔B)** are guaranteed to break. **Longer chains (A→B→C→A)** may or may not break at runtime depending on load order — they are latent bugs.

### Why `sap.ui.require` (synchronous) Breaks the Cycle

The synchronous form `sap.ui.require("path/to/Module")` does NOT create a loader dependency edge. It reads from the module cache without triggering a load.

**Critical caveat**: `sap.ui.require(path)` returns `undefined` if the target module's factory has not yet executed. So it is safe **only when the target module is reachable via a static-only path from the active entry point** that fires before the lazy call site.

When you remove a static edge A → B and replace it with `var B = sap.ui.require("B")` inside a function in A, you must verify B remains reachable from every entry-point controller that loads A.

**Three forms of `sap.ui.require`** — know the difference:
- `sap.ui.require("path/to/B")` — sync cache read. No load trigger. Returns `undefined` if not in cache.
- `sap.ui.require(["path/to/B"], function(B) {...})` — async load + callback. Triggers load.
- `sap.ui.requireSync("path/to/B")` — sync load + return. Triggers load. Deprecated.

**Key distinction:**
- `sap.ui.define(["path/to/B"], ...)` — creates a loader edge A→B (cycle risk)
- `var B = sap.ui.require("path/to/B")` inside a function body — no loader edge (safe if B is in cache)

## Detection Algorithm

### Automated Detection Script

A bundled script automates detection (graph building, verification, cycle detection, usage counting, hub identification):

```bash
node <skill-dir>/scripts/detect-cycles.js <project-root>
```

The script:
1. Discovers the project namespace from `manifest.json`
2. Scans all `.js` files (app + tests), strips comments, parses `sap.ui.define` arrays
3. Builds the dependency graph (internal project modules only)
4. Verifies graph completeness with fallback analysis
5. Detects 2-node cycles and longer chains (Tarjan's SCC)
6. Counts usages and identifies lazy side (2-node) or hub (3+ node)

Output is JSON to stdout. Use this to drive the fix phase. If unavailable, the manual procedure is below and in `references/dependency-graph-analysis.md`.

### Manual Procedure

#### Step 1 — Discover Project Namespace

Read `manifest.json` → `sap.app.id` → e.g. `"com.example.myapp"` → convert to slash notation: `"com/example/myapp"`. This identifies internal project modules vs. `sap/*` framework deps.

#### Step 2 — Build Dependency Graph

Parse all `.js` files (app source AND tests). For each file:

1. **Strip comments** (`//` and `/* */`) while preserving string contents. Prevents matching `sap.ui.define` in commented-out code.

2. **Find `sap.ui.define`** using a regex allowing arbitrary whitespace between tokens:
   ```
   /sap\s*\.\s*ui\s*\.\s*define\s*\(/
   ```
   **Critical**: The simpler `sap\.ui\.define\s*\(` MISSES files where `sap.ui.define` is split across lines. These patterns exist in real codebases.

3. **Extract the dependency array**: From `(` after `define`, find `[` ... `]` respecting bracket depth. Extract string literals.

4. **Filter to internal project modules** only (matching namespace). Include `test-resources/`-prefixed paths.

5. **Build directed graph**: node = module path (without `.js`), edge = dependency.

**Exclusions**: Framework deps (`sap/*`), `sap.ui.require` calls in function bodies, string literals (extend names, fragment paths).

#### Step 2b — Verify Graph Completeness

After building the graph, verify every referenced dependency was also parsed. A missing module can hide entire cycle chains.

For every module referenced as a dependency but having no graph node entry:
1. Check if source file exists. If not, skip with info note.
2. If file exists, run **fallback analysis**: scan for internal namespace strings inside `[...]` arrays. If found but primary parser extracted nothing, merge into graph.
3. Also check files where `sap.ui.define` was found but first argument was not an array. Run same fallback.

#### Step 3 — Detect 2-Node Cycles

For every edge A→B, check if B→A also exists. Collect unique pairs (deduplicated).

#### Step 4 — Detect Longer Chains (3+ Nodes)

Run Tarjan's SCC algorithm. Any SCC with 3+ nodes is a longer cycle chain. See `references/dependency-graph-analysis.md` for full algorithm pseudocode.

## Fix Strategy for 2-Node Cycles

### Decision: Which Side Gets Lazy Treatment

#### Phase 1 — Runtime Reachability Check

1. Identify entry points: Component.js + every controller that statically imports A or B.
2. For each entry point, walk static dep graph and check which of {A, B} is reachable.
3. Choose lazy side based on coverage:
   - If A reachable from every entry point using B → safe to make A lazy in B.
   - If B reachable from every entry point using A → safe to make B lazy in A.
   - If both have full coverage → proceed to Phase 2.
   - If NEITHER has full coverage → requires also adding a static dep to controllers (see "Append-to-Controller Remedy").

#### Phase 2 — Usage Count Tiebreaker

When both sides are equally safe:
1. **Count usages**: References to B in A's code body vs. references to A in B's code body (exclude strings, comments, `sap.ui.define` array).
2. **Fewer usages wins**: Less code churn.
3. **Tiebreaker 1**: Module with more total deps keeps normal import (orchestrator pattern).
4. **Tiebreaker 2**: Alphabetically first keeps normal import.

### Transformation Steps

To make B lazy in A (A no longer statically imports B):

**Step 1 — Remove B from A's dependency array and corresponding parameter:**
```javascript
// Before:
sap.ui.define(["path/to/B", "path/to/C"], function(B, C) {
// After:
sap.ui.define(["path/to/C"], function(C) {
```

**Step 2 — Add lazy require at each usage site:**
```javascript
// Before:
someMethod: function() {
    B.doSomething();
    B.doSomethingElse();
}
// After:
someMethod: function() {
    var B = sap.ui.require("path/to/B");
    B.doSomething();
    B.doSomethingElse();
}
```

**One `sap.ui.require` per function** — each function using B needs its own declaration.

**Declaration keyword**: Match surrounding style (`const` for modern, `var` for legacy).

**Step 3 — Clean up**: Remove `var X = X;` self-assignments. If B had zero code references, just remove from deps — no lazy require needed.

### Special Case: Module Already Partially Lazy

If A already has `sap.ui.require("path/to/B")` calls AND B in its `sap.ui.define` array, remove B from `sap.ui.define` and ensure all remaining usage sites have lazy requires. Don't duplicate existing calls.

## Longer Chains (3+ Nodes) — Hub-Based Auto-Fix

Longer chains are auto-fixed using a **hub-based approach**. Identify the hub module within each SCC and make its cycle-creating dependencies lazy. One hub fix can eliminate many chains simultaneously.

### Why Hub-Based?

A hub module sits at the center of multiple cycle paths. Rather than fixing edges in many files, converting a few deps in the hub breaks all cycles at once.

### Hub Identification Algorithm

For each SCC with 3+ nodes:

1. **Cycle participation score** per node: count outgoing edges to other SCC members. Higher = more cycles broken by making those deps lazy.
2. **Select hub**: Highest score. Tiebreaker: more total deps (orchestrator). Final: alphabetical.
3. **Identify cycle-creating deps**: Hub's `sap.ui.define` deps that are SCC members.
4. **Apply same transformation as 2-node cycles**.
5. **Re-run SCC detection**: Repeat if cycles remain.

### Decision: Which Hub Deps to Make Lazy

Make **all SCC-internal deps of the hub lazy**. This guarantees all cycles through the hub are broken. If a hub's SCC-internal dep has zero usages, just remove it.

### Fallback: Report to MODERNIZATION-ISSUES.md

If a module references the cycle-creating dep at top level outside any function body (where lazy `sap.ui.require` would return `undefined`), report:

```markdown
### Cyclic Dependency Chain (unfixable automatically)

- **SCC nodes**: A, B, C, D
- **Hub identified**: A (3 outgoing SCC edges, 4 incoming)
- **Blocking reason**: A references B at module top level (line 15), outside any function body.
- **Suggested manual fix**: Restructure A to defer the B reference into a function body, or extract the top-level initialization into a separate non-cyclic module.
```

## Before/After Examples

### Example 1 — 2-Node Cycle with 1 Usage (ModuleA ↔ ModuleB)

ModuleA imports ModuleB, ModuleB imports ModuleA. ModuleB only uses ModuleA at 1 call site.

**Before (broken):**
```javascript
// ModuleB.js
sap.ui.define([
    "com/example/myapp/utils/ModuleA",
    "sap/ui/thirdparty/jquery"
], function(ModuleA, jQuery) {
    var ModuleB = {
        handleStatus: function(aSelectedItems, sId) {
            ModuleA.processStatus(aSelectedItems, sId);  // undefined!
        }
    };
    return ModuleB;
});
```

**After (fixed):**
```javascript
// ModuleB.js
sap.ui.define([
    "sap/ui/thirdparty/jquery"
], function(jQuery) {
    var ModuleB = {
        handleStatus: function(aSelectedItems, sId) {
            var ModuleA = sap.ui.require("com/example/myapp/utils/ModuleA");
            ModuleA.processStatus(aSelectedItems, sId);
        }
    };
    return ModuleB;
});
```

### Example 2 — 2-Node Cycle with Multiple Usages (Orchestrator ↔ Helper)

Orchestrator imports Helper (5 usages), Helper imports Orchestrator (25 usages). Decision: make Helper lazy in Orchestrator (fewer sites to patch).

**Before (broken):**
```javascript
// Orchestrator.js
sap.ui.define([
    "com/example/myapp/utils/Helper",
    "com/example/myapp/utils/Validator"
], function(Helper, Validator) {
    var Orchestrator = {
        openDialog: function() { Helper.openDialog(); },
        refreshAll: function() { Helper.refreshAll(); }
        // ... 3 more Helper usage sites
    };
    return Orchestrator;
});
```

**After (fixed):**
```javascript
// Orchestrator.js
sap.ui.define([
    "com/example/myapp/utils/Validator"
], function(Validator) {
    var Orchestrator = {
        openDialog: function() {
            var Helper = sap.ui.require("com/example/myapp/utils/Helper");
            Helper.openDialog();
        },
        refreshAll: function() {
            var Helper = sap.ui.require("com/example/myapp/utils/Helper");
            Helper.refreshAll();
        }
        // ... each function gets its own lazy require
    };
    return Orchestrator;
});
```

### Example 3 — Unused Dependency Removal

ModuleX imports ModuleY but never references it in code — just remove the dead import.

**Before:**
```javascript
sap.ui.define([
    "com/example/myapp/utils/ModuleY",
    "com/example/myapp/utils/ModuleZ"
], function(ModuleY, ModuleZ) {
    // ModuleY never used
```

**After:**
```javascript
sap.ui.define([
    "com/example/myapp/utils/ModuleZ"
], function(ModuleZ) {
```

### Example 4 — Longer Chain Auto-Fixed via Hub (ModelManager Hub)

ModelManager participates in 7 cycle chains through deps FilterHelper and ChartHelper. Hub analysis: ModelManager has 2 outgoing SCC edges — it is the hub.

**Before (broken):**
```javascript
// ModelManager.js
sap.ui.define(["sap/ui/thirdparty/jquery",
    "com/example/myapp/utils/FilterHelper",
    "com/example/myapp/utils/Payload",
    "com/example/myapp/utils/ChartHelper",
    "sap/base/Log"
], function(jQuery, FilterHelper, oPayload, ChartHelper, Log) {
    var ModelManager = {
        getFilterConfig: function() {
            var oFilterConfig = FilterHelper;  // undefined due to cycle!
        },
        getChartType: function() {
            var oChartType = ChartHelper.getAnnotationType();  // undefined!
        }
    };
    return ModelManager;
});
```

**After (fixed — both SCC-internal deps made lazy):**
```javascript
// ModelManager.js
sap.ui.define(["sap/ui/thirdparty/jquery",
    "com/example/myapp/utils/Payload",
    "sap/base/Log"
], function(jQuery, oPayload, Log) {
    var ModelManager = {
        getFilterConfig: function() {
            var FilterHelper = sap.ui.require("com/example/myapp/utils/FilterHelper");
            var oFilterConfig = FilterHelper;
        },
        getChartType: function() {
            var ChartHelper = sap.ui.require("com/example/myapp/utils/ChartHelper");
            var oChartType = ChartHelper.getAnnotationType();
        }
    };
    return ModelManager;
});
```

Removing 2 deps from 1 file broke all 7 cycle chains. Note: `var oFilterConfig = FilterHelper;` is a legacy aliasing pattern — the skill preserves existing code, only transforming the import mechanism.

## Implementation Steps

1. **Run detection script** to build the dependency graph and detect all cycles:
   ```bash
   node <skill-dir>/scripts/detect-cycles.js <project-root>
   ```
   JSON output contains `twoNodeCycles` (with usage counts and lazy-side decisions) and `longerChains` (with hub identification). If unavailable, follow the manual procedure above.

2. **Review output**: Check `warnings` and `errors` arrays for graph completeness issues. Address errors before proceeding.

3. **Fix each 2-node cycle** (from `twoNodeCycles[]`):
   - `lazySide` field identifies which module to patch
   - Remove cyclic dep from `sap.ui.define` array + function parameter
   - Add `var Module = sap.ui.require("path/to/Module")` at each usage site
   - Clean up artifacts

4. **Fix longer chains via hub** (from `longerChains[]`):
   - `hub` and `hubInternalDeps` fields identify module and deps to make lazy
   - If ALL usages are inside function bodies → apply lazy require transformation
   - If any usage at module top level → report to MODERNIZATION-ISSUES.md
   - Re-run SCC detection — repeat if cycles remain

5. **Verify — re-run cycle detection**:
   ```bash
   node <skill-dir>/scripts/detect-cycles.js <project-root>
   ```
   Output should show `twoNodeCycles: []` and `longerChains: []`. Then run `npx @ui5/linter --details` for regression check.

6. **Verify static coverage**:
   ```bash
   node <skill-dir>/scripts/detect-unsafe-lazy.js <project-root>
   ```
   Checks every `sap.ui.require("M")` has M reachable via static chain from every entry-point controller. If findings exist, apply "Append-to-Controller Remedy" below. Re-run until `unsafeCount: 0`. **Skill is not done until BOTH scripts report 0 issues.**

### Append-to-Controller Remedy

When `detect-unsafe-lazy.js` reports uncovered entry points, append the lazy target to the controller's `sap.ui.define` array as a load-only side-effect import:

```javascript
// Before — controller does NOT statically import DialogHelper
sap.ui.define([
    "com/example/myapp/utils/ActionHandler",
    "sap/ui/core/mvc/Controller"
], function(ActionHandler, Controller) {
    // ActionHandler has lazy require to DialogHelper
    // → sap.ui.require("DialogHelper") returns undefined

// After — append as load-only dep (no factory param)
sap.ui.define([
    "com/example/myapp/utils/ActionHandler",
    "sap/ui/core/mvc/Controller",
    "com/example/myapp/utils/DialogHelper"
], function(ActionHandler, Controller /* no DialogHelper param */) {
    // DialogHelper now in cache → lazy require works
```

**Rules:**
- Append at end of dep array, no corresponding factory parameter
- If `staticUncovered` lists 3+ controllers, add dep to `BaseController.js` or `Component.js` instead
- Re-run `detect-unsafe-lazy.js` after each fix to confirm resolution

## Notes — Critical Rules

1. **Lazy require INSIDE function body**: Place `var B = sap.ui.require("path/to/B")` inside the function that uses B, not at module top level. At define-time, B may not be in cache yet.

2. **One require per function**: Each function body using the module needs its own declaration. The variable is function-scoped.

3. **Only internal project modules**: Framework deps (`sap/*`) never cause project-level cycles. Only process deps matching the project namespace.

4. **String literals are NOT usages**: Log messages, `.extend()` class names, fragment paths are strings, not code references. Do not count or modify them.

5. **Commented-out code is NOT a usage**: Lines inside `//` or `/* */` do not count as usages.

6. **Parameter alignment**: Removing dep at index N → remove function parameter at index N. Adjust only if the removed dep had a corresponding parameter.

7. **Existing lazy requires are NOT dependency edges**: `sap.ui.require("path/to/X")` in function bodies does NOT create loader edges. Only `sap.ui.define` array entries are edges.

8. **Idempotent**: Running twice is safe. On second run, cycles are already broken — no changes made.

9. **Test files included**: Dependency graph must include test files. They can participate in cycles after `modernize-test-starter` adds `sap.ui.define` deps.

10. **Do not touch async `sap.ui.require`**: The async form `sap.ui.require(["path/to/B"], function(B) {...})` creates a loader edge. This skill only uses the synchronous single-string form.

11. **Multi-line `sap.ui.define` patterns**: Regex MUST allow arbitrary whitespace/newlines between `sap`, `.`, `ui`, `.`, `define`, `(`. Simpler regexes miss split patterns, hiding cycle chains.

12. **Strip comments before parsing**: Always remove comments (respecting string literals) before searching for `sap.ui.define`. Files may contain it in comments as section markers.

13. **Verify graph completeness**: Check every referenced dependency was parsed. Run fallback analysis on files where primary parser found nothing. Merge discovered deps before cycle detection.

## Related Skills

- **fix-js-globals**: Case 1c and case 10 are primary sources of new dependency edges creating cycles. Run `fix-cyclic-deps` AFTER `fix-js-globals` completes.
- **modernize-test-starter**: Test file modernization adds `sap.ui.define` dependencies that can create cycles between test utilities or between test and app modules.
- **modernize-ui5-app**: Parent workflow that orchestrates phase ordering. This skill runs as Phase 3, Step 3.3 (final step).
