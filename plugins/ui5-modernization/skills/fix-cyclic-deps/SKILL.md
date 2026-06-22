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

This skill detects and resolves cyclic module dependencies that arise during UI5 modernization. When modernization phases convert global namespace access to proper `sap.ui.define` imports, new dependency edges are added to the module graph. If these edges create a circular import (A imports B, B imports A), the UI5 AMD loader returns `undefined` for the back-edge module.

The fix: replace the back-edge `sap.ui.define` dependency with a lazy `sap.ui.require("path/to/Module")` (synchronous form) at each call site. This retrieves the already-loaded module from the loader cache without creating a dependency edge.

## Linter Rule

| Rule ID | Message Pattern | This Skill's Action |
|---------|-----------------|---------------------|
| (none — structural) | Runtime: module is `undefined` despite correct import path | Detect cycle in dependency graph, convert back-edge to lazy `sap.ui.require()` |

This skill is NOT triggered by a UI5 linter rule. It addresses a structural problem in the module dependency graph that the linter does not check. It is triggered as the final fix phase in the modernization workflow, or standalone when a developer encounters `undefined` modules at runtime.

## When to Use

- **In modernization workflow**: As Phase 3, Step 3.3 (final step) after ALL other Phase 3 steps (3.1 globals/pseudo-modules + 3.2 blind-spots) complete. Multiple steps add `sap.ui.define` edges that can create cycles — running once at the end operates on the final dependency graph.
- **Standalone**: When a module returns `undefined` at runtime despite a correct import path in the `sap.ui.define` array. This is the classic symptom of a cyclic dependency.
- **After manual refactoring**: When a developer adds a new `sap.ui.define` dependency and gets an unexpected `undefined`.

## Sources of Cycles

Three modernization operations add new `sap.ui.define` dependency edges that can introduce cycles:

### 1. fix-js-globals Case 1c — Global Namespace Reads

Converting `var Helper = com.example.app.utils.Helper;` to a `sap.ui.define` dependency. If `Helper` already imports the current module, adding the reverse edge creates a 2-node cycle.

### 2. fix-js-globals Case 10 — jQuery.sap.declare/require Modernization

Wrapping legacy `jQuery.sap.declare` / `jQuery.sap.require` code in `sap.ui.define`. The `jQuery.sap.require` calls become `sap.ui.define` dependencies, potentially creating cycles that the legacy synchronous loader handled differently.

### 3. modernize-test-starter — Test File Dependencies

Test files that previously accessed modules via the global namespace chain now get proper `sap.ui.define` imports. Test utility files that reference each other, or test files that import app modules which import test utilities, can create cycles.

## Background — Why Cycles Break the UI5 Loader

The UI5 AMD loader resolves `sap.ui.define` dependencies via depth-first traversal. When it encounters a cycle:

1. Loader starts loading Module A
2. A depends on B → loader starts loading B
3. B depends on A → but A isn't finished yet
4. Loader returns `undefined` for A's factory result (the back-edge)
5. B's factory receives `undefined` where it expected A's exports
6. Any call to the `undefined` module causes `TypeError: Cannot read properties of undefined`

**2-node cycles (A↔B)** are guaranteed to break — the loader must pick one to load first, and the other always gets `undefined`.

**Longer chains (A→B→C→A)** may or may not break at runtime, depending on which module the loader visits first and which edge becomes the back-edge. They are latent bugs that can surface under different load orders, lazy loading, or Test Starter isolation.

### Why `sap.ui.require` (synchronous) Breaks the Cycle

The synchronous form `sap.ui.require("path/to/Module")` does NOT create a loader dependency edge. It reads from the module cache without triggering a load.

**Critical caveat**: `sap.ui.require(path)` (single-string sync form) returns `undefined` if the target module's factory has not yet executed. The module's factory executes only when some static `sap.ui.define` chain has already pulled it in. So `sap.ui.require` is safe **only when the target module is reachable via a static-only path from the active entry point (Component or controller) that fires before the lazy call site**.

When you remove a static edge A → B and replace it with `var B = sap.ui.require("B")` inside a function in A, you must verify B remains reachable from every entry-point controller that loads A. Otherwise B stays defined-but-unevaluated in `Component-preload.js`, and the lazy require returns `undefined`.

**Three forms of `sap.ui.require`** — know the difference:
- `sap.ui.require("path/to/B")` — sync cache read. Does NOT trigger load. Returns `undefined` if B not in cache.
- `sap.ui.require(["path/to/B"], function(B) {...})` — async load + callback. DOES trigger load.
- `sap.ui.requireSync("path/to/B")` — sync load + return. DOES trigger load. Deprecated.

**Key distinction:**
- `sap.ui.define(["path/to/B"], function(B) {...})` — creates a loader edge A→B (cycle risk)
- `var B = sap.ui.require("path/to/B")` inside a function body — no loader edge (safe, IF B is already in cache)

## Detection Algorithm

### Automated Detection Script

A bundled script automates the entire detection phase (graph building, verification, cycle detection, usage counting, and hub identification). Run it first:

```bash
node <skill-dir>/scripts/detect-cycles.js <project-root>
```

The script:
1. Discovers the project namespace from `manifest.json`
2. Scans all `.js` files (app source + tests), strips comments, parses `sap.ui.define` arrays
3. Builds the dependency graph (internal project modules only)
4. Verifies graph completeness with fallback analysis
5. Detects 2-node cycles and longer chains (Tarjan's SCC)
6. Counts usages and identifies which side gets lazy treatment (2-node) or which hub to fix (3+ node)

Output is JSON to stdout. Use this output to drive the fix phase — no need to build the graph manually.

If the script is unavailable or you need to understand the algorithm details, the manual procedure is documented below and in `references/dependency-graph-analysis.md`.

### Manual Procedure

#### Step 1 — Discover Project Namespace

Read `manifest.json` to get the project namespace:

```javascript
// manifest.json → sap.app.id → e.g. "com.example.myapp"
// Convert to slash notation: "com/example/myapp"
```

This namespace identifies which dependencies are internal project modules (vs. `sap/*` framework deps that never cause cycles).

#### Step 2 — Build Dependency Graph

Parse all `.js` files in the project (app source AND test files). For each file:

1. **Strip comments** before any parsing. Remove `//` single-line and `/* */` multi-line comments while preserving string contents (single-quoted, double-quoted, and template literal strings must not be corrupted). This prevents matching `sap.ui.define` inside commented-out code (e.g., `// sap.ui.define -` in a log message).

2. **Find `sap.ui.define`** using a regex that allows arbitrary whitespace and newlines between all tokens:
   ```
   /sap\s*\.\s*ui\s*\.\s*define\s*\(/
   ```
   **Critical**: The simpler regex `sap\.ui\.define\s*\(` will MISS files where `sap.ui.define` is split across lines (e.g., `sap.ui\n\t.define(` or `sap.ui.\ndefine(`). These multi-line patterns exist in real codebases and missing even one module can hide entire cycle chains.

3. **Extract the dependency array**: Starting from the `(` after `define`, skip whitespace, find `[`, then find the matching `]` respecting bracket depth. Extract all string literals from within the brackets.

4. **Filter to internal project modules** only (matching the project namespace). Framework dependencies (`sap/*`) never cause project-level cycles. Include `test-resources/`-prefixed paths — these are test module dependencies (e.g., `test-resources/com/example/myapp/test/unit/Helper`) and can participate in cycles.

5. **Build a directed graph**: node = module path (relative to base dir, without `.js`), edge = dependency. For test files, the module ID uses the `test-resources/` prefix as it appears in `sap.ui.define` arrays.

**Important exclusions:**
- Framework dependencies (`sap/*`, `sap/ui/*`, etc.) — never cause project-level cycles
- `sap.ui.require` calls in function bodies — these are NOT dependency edges
- String literals (extend names, fragment paths, log messages) — not dependencies

#### Step 2b — Verify Graph Completeness

After building the graph, verify that every referenced dependency was also successfully parsed. A missing module can hide entire cycle chains.

For every module referenced as a dependency in the graph that has NO entry as a graph node (0 internal deps extracted):

1. **Check if the source file exists**. If not, it may live in a different base directory or be generated at build time — skip with an info note.

2. **If the file exists**, run a **fallback analysis**:
   - Scan the file (after comment stripping) for internal namespace strings that appear inside `[...]` array brackets
   - If internal dependency strings are found inside arrays but the primary parser extracted nothing, the file likely uses an unrecognized `sap.ui.define` pattern
   - Flag as ERROR and **merge the suspected dependencies into the graph** before cycle detection

3. **Also check files where `sap.ui.define` was found but the first argument was not an array** (e.g., a string module name as first arg). Run the same fallback analysis.

This verification step catches modules with unusual `sap.ui.define` formatting that the primary regex handles but the array extraction might miss. Without it, the graph is incomplete and cycles go undetected.

#### Step 3 — Detect 2-Node Cycles

For every edge A→B in the graph, check if B→A also exists. Collect unique pairs (deduplicated — A↔B and B↔A are the same cycle).

#### Step 4 — Detect Longer Chains (3+ Nodes)

Run Tarjan's strongly-connected-components (SCC) algorithm on the dependency graph. Any SCC with 3 or more nodes represents a longer cycle chain.

See `references/dependency-graph-analysis.md` for the full algorithm pseudocode and extraction procedure.

## Fix Strategy for 2-Node Cycles

### Decision: Which Side Gets Lazy Treatment

For each 2-node cycle A↔B, the decision has two phases: **runtime reachability** (correctness) then **usage counts** (convenience).

#### Phase 1 — Runtime Reachability Check (NEW — prevents undefined at runtime)

1. **Identify entry points** for the cycle pair: Component.js + every controller that statically imports A or B (directly or transitively).
2. **For each entry point**, walk the static-only dep graph and check which of {A, B} is reachable.
3. **Choose the lazy side based on coverage**:
   - If A is reachable from every entry point that uses B's behavior → safe to make A lazy in B.
   - If B is reachable from every entry point that uses A's behavior → safe to make B lazy in A.
   - If both sides have full coverage → proceed to Phase 2 (usage counts as tiebreaker).
   - If NEITHER side has full coverage from all relevant entry points → the cycle break requires ALSO adding a static dep to one or more controllers (see "Append-to-Controller Remedy" below).

#### Phase 2 — Usage Count Tiebreaker (existing logic)

When both sides are equally safe from a reachability standpoint:

1. **Count usages**: How many times does A's code body reference B? How many times does B's code body reference A? (Exclude string literals, comments, and the `sap.ui.define` array itself.)
2. **Fewer usages wins**: The side with fewer usages of the other module gets the lazy treatment (fewer call sites to modify = less code churn).
3. **Tiebreaker 1**: The module with more total `sap.ui.define` dependencies keeps its normal import. It is likely an "orchestrator" module; the other is more "utility-like".
4. **Tiebreaker 2**: The module whose path sorts alphabetically first keeps its normal import.

### Transformation Steps

To make B lazy in A (i.e., A no longer statically imports B):

**Step 1 — Remove B from A's dependency array:**

```javascript
// Before:
sap.ui.define(["path/to/B", "path/to/C"], function(B, C) {

// After:
sap.ui.define(["path/to/C"], function(C) {
```

Remove the dependency string AND the corresponding function parameter at the same positional index. Verify remaining parameters still align with remaining deps.

**Step 2 — Add lazy require at each usage site:**

At every location in A's code where B is referenced, add a `sap.ui.require` call inside the enclosing function body:

```javascript
// Before:
someMethod: function() {
    B.doSomething();
    // ... later ...
    B.doSomethingElse();
}

// After:
someMethod: function() {
    var B = sap.ui.require("path/to/B");
    B.doSomething();
    // ... later ...
    B.doSomethingElse();
}
```

**One `sap.ui.require` per function** — if multiple functions use B, each needs its own declaration.

**Declaration keyword**: Match the surrounding code style. If the file uses `const`/`let`, use `const` for the lazy require (the module reference is never reassigned). If the file uses `var`, use `var`. Examples:
- `const B = sap.ui.require("path/to/B");` — modern style
- `var B = sap.ui.require("path/to/B");` — legacy style

**Step 3 — Clean up artifacts:**

- If removing B's dep leaves a `var B = B;` self-assignment, delete that line
- If B was imported but had zero code references (unused dep), just remove from deps and params — no lazy require needed

### Special Case: Module Already Partially Lazy

If A already has some `sap.ui.require("path/to/B")` calls (from a previous partial fix), and ALSO has B in its `sap.ui.define` array, remove B from `sap.ui.define` and ensure all remaining usage sites have lazy requires. Don't duplicate existing lazy require calls.

## Longer Chains (3+ Nodes) — Hub-Based Auto-Fix

Longer chains are also auto-fixed using a **hub-based approach**. Instead of tracing individual cycle paths, identify the hub module within each strongly connected component (SCC) and make its cycle-creating dependencies lazy. One hub fix can eliminate many chains simultaneously.

### Why Hub-Based?

A hub module sits at the center of multiple cycle paths. For example, a `ModelManager` might participate in 7 different 3–5 node cycles. Rather than fixing 7 edges in 7 files, converting 2 deps in `ModelManager` to lazy requires breaks all 7 cycles at once.

### Hub Identification Algorithm

For each SCC with 3+ nodes:

1. **Compute cycle participation score** for each node in the SCC:
   - Count how many of the node's `sap.ui.define` deps are also in the SCC (outgoing SCC edges)
   - Score = outgoing SCC edge count (more outgoing edges = more cycles broken by making those deps lazy)

2. **Select the hub**: The node with the highest score. Tiebreaker: the node with more total `sap.ui.define` dependencies (it is the orchestrator module). Final tiebreaker: alphabetical by module path.

3. **Identify cycle-creating deps**: From the hub's `sap.ui.define` array, find which deps are members of the same SCC. These are the deps that participate in cycles.

4. **Apply the same transformation as 2-node cycles**: Remove each cycle-creating dep from the hub's `sap.ui.define` array, add lazy `sap.ui.require` at each usage site.

5. **Re-run SCC detection**: If cycles remain (possible when an SCC has multiple independent hubs), repeat from step 1 on the remaining SCCs.

### Decision: Which Hub Deps to Make Lazy

Not all of a hub's deps within the SCC need to be made lazy — only those that create back-paths. However, in practice it is safest to **make all SCC-internal deps of the hub lazy**. This guarantees all cycles through the hub are broken, and the cost is minimal (lazy `sap.ui.require` at a few call sites).

If a hub's SCC-internal dep has zero code usages (unused import), just remove it — no lazy require needed.

### Fallback: Report to MODERNIZATION-ISSUES.md

If the hub-based fix cannot be applied (e.g., a module references the cycle-creating dep at the top level outside any function body, where lazy `sap.ui.require` would return `undefined`), report the chain in `MODERNIZATION-ISSUES.md`:

```markdown
### Cyclic Dependency Chain (unfixable automatically)

- **SCC nodes**: A, B, C, D
- **Hub identified**: A (3 outgoing SCC edges, 4 incoming)
- **Blocking reason**: A references B at module top level (line 15), outside any function body. Lazy `sap.ui.require` at this location may return `undefined` because B is not yet loaded during A's module initialization.
- **Suggested manual fix**: Restructure A to defer the B reference into a function body, or extract the top-level initialization into a separate non-cyclic module.
```

## Before/After Examples

### Example 1 — 2-Node Cycle with 1 Usage (ModuleA ↔ ModuleB)

ModuleA imports ModuleB, ModuleB imports ModuleA. ModuleB only uses ModuleA at 1 call site.

**Before (broken — cycle causes ModuleA to be `undefined` in ModuleB):**
```javascript
// ModuleB.js
sap.ui.define([
    "com/example/myapp/utils/ModuleA",
    "sap/ui/thirdparty/jquery"
], function(ModuleA, jQuery) {
    var ModuleB = {
        handleStatus: function(aSelectedItems, sId) {
            ModuleA.processStatus(aSelectedItems, sId);  // ModuleA is undefined!
        }
    };
    return ModuleB;
});
```

**After (fixed — lazy require at call site):**
```javascript
// ModuleB.js
sap.ui.define([
    "sap/ui/thirdparty/jquery"
], function(jQuery) {
    var ModuleB = {
        handleStatus: function(aSelectedItems, sId) {
            var ModuleA = sap.ui.require("com/example/myapp/utils/ModuleA");
            ModuleA.processStatus(aSelectedItems, sId);  // Works: ModuleA loaded from cache
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
    "com/example/myapp/utils/Validator",
    // ... other deps
], function(Helper, Validator, ...) {
    var Orchestrator = {
        openDialog: function() {
            Helper.openDialog();  // Helper could be undefined
        },
        refreshAll: function() {
            Helper.refreshAll();
        }
        // ... 3 more Helper usage sites
    };
    return Orchestrator;
});
```

**After (fixed):**
```javascript
// Orchestrator.js
sap.ui.define([
    "com/example/myapp/utils/Validator",
    // ... other deps (Helper removed)
], function(Validator, ...) {
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

### Example 3 — Unused Dependency Removal (ModuleX → ModuleY)

ModuleX imports ModuleY but never references it in code. No cycle fix needed — just remove the dead import.

**Before:**
```javascript
// ModuleX.js
sap.ui.define([
    "com/example/myapp/utils/ModuleY",
    "com/example/myapp/utils/ModuleZ"
], function(ModuleY, ModuleZ) {
    // ModuleY never used anywhere in the file body
```

**After:**
```javascript
// ModuleX.js
sap.ui.define([
    "com/example/myapp/utils/ModuleZ"
], function(ModuleZ) {
```

### Example 4 — Longer Chain Auto-Fixed via Hub (ModelManager Hub)

ModelManager participates in 7 cycle chains through its deps FilterHelper and ChartHelper:
- ModelManager → FilterHelper → Formatter → ModelManager
- ModelManager → FilterHelper → MessageHelper → ModelManager
- ModelManager → ChartHelper → ReportHelper → ModelManager
- ... and 4 more chains

**Hub analysis**: ModelManager has 2 outgoing SCC edges (FilterHelper, ChartHelper) and multiple incoming edges. It is the hub.

**Before (broken — ModelManager is `undefined` for downstream importers):**
```javascript
// ModelManager.js
sap.ui.define(["sap/ui/thirdparty/jquery",
    "com/example/myapp/utils/FilterHelper",
    "com/example/myapp/utils/Payload",
    "com/example/myapp/utils/ChartHelper",
    "sap/base/Log"
],
function (jQuery, FilterHelper, oPayload, ChartHelper, Log) {
    var ModelManager = {
        // ... 1 usage of FilterHelper, 2 usages of ChartHelper
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
],
function (jQuery, oPayload, Log) {
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

**Result**: Removing 2 deps from 1 file broke all 7 cycle chains simultaneously. Note: `var oFilterConfig = FilterHelper;` is a common legacy pattern (aliasing the module reference). The skill preserves existing code patterns — it only transforms the import mechanism, not the surrounding code.

## Implementation Steps

1. **Run the detection script** to build the dependency graph and detect all cycles:
   ```bash
   node <skill-dir>/scripts/detect-cycles.js <project-root>
   ```
   The JSON output contains `twoNodeCycles` (with usage counts and lazy-side decisions) and `longerChains` (with hub identification). If the script is unavailable, follow the manual procedure in the Detection Algorithm section.

2. **Review the script output**: Check `warnings` and `errors` arrays for graph completeness issues. Address any errors before proceeding.

3. **Fix each 2-node cycle** (from `twoNodeCycles[]`):
   - The script's `lazySide` field tells you which module to patch
   - Remove the cyclic dep from that module's `sap.ui.define` array + function parameter
   - Add `var Module = sap.ui.require("path/to/Module")` at each usage site within function bodies
   - Clean up artifacts (`var X = X;` lines, unused deps)

4. **Fix longer chains via hub approach** (from `longerChains[]`):
   - The script's `hub` and `hubInternalDeps` fields identify which module and deps to make lazy
   - For each hub-internal dep: check all usage sites in the hub's code — if ALL usages are inside function bodies, apply lazy require transformation (same as step 3)
   - If any usage is at module top level (outside a function body), report to MODERNIZATION-ISSUES.md instead
   - Re-run SCC detection on the updated graph — repeat if cycles remain

5. **Verify — re-run cycle detection**: Run the detection script again on the modified codebase to confirm zero cycles remain:
   ```bash
   node <skill-dir>/scripts/detect-cycles.js <project-root>
   ```
   The output should show `twoNodeCycles: []` and `longerChains: []`. If cycles persist, return to step 3/4. Then run `npx @ui5/linter --details` as a secondary check for regressions in other linter rules.

6. **Verify static coverage — detect unsafe lazy requires**: After cycles are cleared, run the static-coverage post-check:
   ```bash
   node <skill-dir>/scripts/detect-unsafe-lazy.js <project-root>
   ```
   This script checks that every `sap.ui.require("M")` call in the codebase has its target M reachable via a static-only `sap.ui.define` chain from every entry-point controller that loads the calling file. If any findings exist, apply the "Append-to-Controller Remedy" below. Re-run until output shows `unsafeCount: 0`. **The skill cannot mark "done" until BOTH `detect-cycles.js` reports 0 cycles AND `detect-unsafe-lazy.js` reports 0 unsafe lazy requires.**

### Append-to-Controller Remedy

When `detect-unsafe-lazy.js` reports uncovered entry points, the fix is to append the lazy target to the `sap.ui.define` dep array of each uncovered controller. This is a load-only side-effect import — no factory parameter needed if the controller doesn't reference the module directly:

```javascript
// Before — Detail.controller.js does NOT statically import DialogHelper
sap.ui.define([
    "com/example/myapp/utils/ActionHandler",
    "sap/ui/core/mvc/Controller"
], function(ActionHandler, Controller) {
    // ActionHandler has lazy require to DialogHelper
    // DialogHelper is NOT in cache when this controller's route activates
    // → sap.ui.require("DialogHelper") returns undefined → crash

// After — append DialogHelper as load-only dep
sap.ui.define([
    "com/example/myapp/utils/ActionHandler",
    "sap/ui/core/mvc/Controller",
    "com/example/myapp/utils/DialogHelper"   // load-only, no factory param
], function(ActionHandler, Controller /* no DialogHelper param */) {
    // DialogHelper is now evaluated before any function in ActionHandler fires
    // → sap.ui.require("DialogHelper") returns the module object ✓
```

**Rules for the append-to-controller fix:**
- Append at end of dep array
- No corresponding factory parameter (unless the controller also uses the module directly)
- If `staticUncovered` lists more than 3 controllers, consider adding the dep to `BaseController.js` or `Component.js` instead (single patch, broader coverage)
- Re-run `detect-unsafe-lazy.js` after each fix to confirm the finding is resolved

## Notes — Critical Rules

1. **Lazy require INSIDE function body**: Place `var B = sap.ui.require("path/to/B")` inside the function that uses B, not at module top level. At define-time, B may not be in the cache yet. At function-call-time (runtime), B is in the cache **only if** some static path from the active entry point has already loaded it. This is why the static-coverage check (step 6) is essential.

2. **One require per function**: Each function body that uses the lazy-required module needs its own `var B = sap.ui.require(...)` declaration. The variable is function-scoped — it cannot be shared across functions.

3. **Only internal project modules**: Framework dependencies (`sap/*`) never cause project-level cycles. Only process dependencies whose path contains the project namespace.

4. **String literals are NOT usages**: Log messages (`Log.error("path/to/Module/method")`), `.extend()` class names, fragment paths, and `sFileName`/`sMethodName` assignments are strings, not code references. Do not count them as usages. Do not modify them.

5. **Commented-out code is NOT a usage**: Lines inside `//` or `/* */` blocks do not count as usages and should not receive lazy require treatment.

6. **Parameter alignment**: When removing a dependency at index N in the array, remove the function parameter at the same positional index N. If there are fewer parameters than dependencies (trailing side-effect imports without params), only adjust if the removed dep had a corresponding parameter.

7. **Existing lazy requires are NOT dependency edges**: If a file already contains `sap.ui.require("path/to/X")` calls in function bodies, those do NOT create loader dependency edges. Only `sap.ui.define` array entries are edges. Do not double-count.

8. **Idempotent**: Running this skill twice on the same codebase is safe. On the second run, the cycles are already broken (the back-edge was removed from `sap.ui.define`), so no changes are made.

9. **Test files included**: The dependency graph must include test files (`test/unit/`, `test/integration/`, `test/opa/`). Test files can participate in cycles, especially after `modernize-test-starter` adds `sap.ui.define` dependencies.

10. **Do not touch `sap.ui.require` async callbacks**: The async form `sap.ui.require(["path/to/B"], function(B) {...})` is a different pattern and creates a loader edge. This skill only uses the synchronous single-string form.

11. **Multi-line `sap.ui.define` patterns**: Real codebases contain `sap.ui.define` split across lines (e.g., `sap.ui\n\t.define(`, `sap.ui.\ndefine(`). The regex MUST allow arbitrary whitespace/newlines between `sap`, `.`, `ui`, `.`, `define`, and `(`. Using a simpler regex like `sap\.ui\.define\s*\(` will miss these files entirely. Missing one module can hide an entire cycle chain.

12. **Strip comments before parsing**: Always remove `//` and `/* */` comments (respecting string literals) before searching for `sap.ui.define`. Files may contain `sap.ui.define` in comments (e.g., `// sap.ui.define -` as a section marker) that would produce false matches.

13. **Verify graph completeness**: After building the graph, check that every referenced dependency was also parsed. Run fallback analysis on files where the primary parser found nothing — they may use unrecognized `sap.ui.define` patterns. Merge any discovered dependencies into the graph before cycle detection.

## Related Skills

- **fix-js-globals**: Case 1c (global namespace reads → imports) and case 10 (jQuery.sap.declare wrapping) are the primary sources of new dependency edges that create cycles. Run `fix-cyclic-deps` AFTER `fix-js-globals` completes.
- **modernize-test-starter**: Test file modernization adds `sap.ui.define` dependencies that can create cycles between test utilities or between test and app modules.
- **modernize-ui5-app**: Parent workflow that orchestrates phase ordering. This skill runs as Phase 3, Step 3.3 (final step) after all other Phase 3 steps complete.
