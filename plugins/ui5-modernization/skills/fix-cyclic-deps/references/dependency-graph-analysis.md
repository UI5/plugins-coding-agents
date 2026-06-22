# Dependency Graph Analysis — Reference

This document provides the technical procedures for building, analyzing, and querying the module dependency graph used by the `fix-cyclic-deps` skill.

## 1. Extracting the Dependency Graph

### Step 1 — Discover Project Namespace

```bash
# From manifest.json, extract sap.app.id and convert to slash notation
NAMESPACE=$(node -e "
  var m = require('./webapp/manifest.json');
  console.log(m['sap.app'].id.replace(/\./g, '/'));
")
echo "Project namespace: $NAMESPACE"
# Example output: com/example/myapp
```

### Step 2 — Extract Dependencies from All JS Files

For each `.js` file, strip comments, parse the `sap.ui.define` dependency array, and filter to internal project modules.

#### 2a — Strip Comments

Before any parsing, remove all comments from the source while preserving string contents. This prevents matching `sap.ui.define` inside comments (e.g., `// sap.ui.define -` in a log message or section marker).

```
Algorithm: stripComments(source)
  result = ""
  i = 0
  while i < length(source):
    if source[i] is quote character (' or " or `):
      # String literal — copy verbatim until matching close quote
      end = findStringEnd(source, i, source[i])
      result += source[i..end]
      i = end
    elif source[i..i+1] == "//":
      # Single-line comment — skip until newline
      while i < length and source[i] != '\n': i++
    elif source[i..i+1] == "/*":
      # Multi-line comment — skip until */. Preserve newlines for line tracking
      i += 2
      while i < length and source[i..i+1] != "*/":
        if source[i] == '\n': result += '\n'
        i++
      i += 2  # skip */
    else:
      result += source[i]
      i++
  return result

function findStringEnd(source, start, quoteChar):
  i = start + 1
  while i < length(source):
    if source[i] == '\\': i += 2; continue  # escaped character
    if source[i] == quoteChar: return i + 1
    i++
  return i
```

#### 2b — Find sap.ui.define with Multi-Line Regex

**Critical**: `sap.ui.define` can be split across multiple lines in real codebases. Examples:

| Pattern | Description |
|---------|-------------|
| `sap.ui\n\t.define(` | Newline + tab before `.define` |
| `sap.ui.\ndefine(` | Newline after the dot before `define` |
| `sap.ui\n\t\t.define(` | Newline + multiple tabs before `.define` |

The regex MUST allow arbitrary whitespace (including newlines) between all tokens:

```
/sap\s*\.\s*ui\s*\.\s*define\s*\(/
```

**Do NOT use** the simpler `sap\.ui\.define\s*\(` — it cannot match across newlines between `ui` and `.define`. Missing one module can hide entire cycle chains.

#### 2c — Extract the Dependency Array

After matching `sap.ui.define(`, find the dependency array:

```
1. Skip whitespace after the opening (
2. If next char is '[', find the matching ']' (tracking bracket depth)
3. Extract all string literals from within the brackets
4. Filter to strings starting with the project namespace
5. Strip the namespace prefix to get the relative module path
```

If the first argument is not `[` (e.g., a string module name), record this as `noArray` — the file uses an unusual define form that needs fallback analysis.

**Parsing rules:**
- The dependency array is the first argument to `sap.ui.define(`
- Each string in the array is a module path (single or double quoted)
- Internal modules contain the project namespace (e.g., `com/example/myapp/`)
- Framework modules start with `sap/` — exclude these
- `test-resources/` prefixed paths are test modules — include these
- Only extract from the FIRST `sap.ui.define` call (module definition), not nested ones

### Step 3 — Build Adjacency List

For each file, record:
- **Module ID**: the file's module path (derived from file path relative to `webapp/` or test root)
- **Dependencies**: list of internal module paths from its `sap.ui.define` array

```
# Example adjacency list (internal deps only):
ModuleA -> [ModuleB, DataService]
ModuleB -> [ConfigManager]
Orchestrator -> [ModuleA, ErrorHandler, ModuleB, ...]
ModuleC -> [Orchestrator, ErrorHandler, ModuleA, DataService]
```

## 2. Verifying Graph Completeness

After building the graph, verify that every referenced dependency was also successfully parsed. **A single missing module can hide entire cycle chains.**

### Verification Algorithm

```
allModules = set of all graph nodes (modules with extracted deps)
allDeps = set of all modules referenced as dependencies across the entire graph

for each dep in allDeps:
    if dep in allModules: continue  # Already in graph, OK

    filePath = baseDir + "/" + dep + ".js"

    if file does not exist:
        # May be in a different base dir or generated at build time
        log info: "Referenced but file not found: {dep}"
        continue

    # File exists but has no graph entry (0 internal deps extracted)
    parseInfo = metadata from primary parsing of this file

    if parseInfo.matched AND parseInfo.noArray:
        # Primary parser found sap.ui.define but first arg was not [...]
        fallback = fallbackAnalysis(filePath)
        if fallback.hasSuspiciousDeps:
            log ERROR: "sap.ui.define found but first arg not array. Suspected deps: {fallback.deps}"
            MERGE fallback.deps into graph for this module
        else:
            log warn: "sap.ui.define found but first arg not array. {fallback.reason}"

    elif NOT parseInfo.matched:
        # Primary parser found NO sap.ui.define at all
        fallback = fallbackAnalysis(filePath)
        if fallback.hasSuspiciousDeps:
            log ERROR: "No sap.ui.define found by primary parser, but fallback found deps in arrays."
            MERGE fallback.deps into graph for this module

    else:
        # parseInfo.matched, no noArray — sap.ui.define([...]) found with 0 internal deps
        # Normal (only framework deps). Still verify with fallback.
        fallback = fallbackAnalysis(filePath)
        if fallback.hasSuspiciousDeps:
            log ERROR: "Primary extracted 0 internal deps but fallback found deps in arrays — parser bug?"
            MERGE fallback.deps into graph for this module
```

### Fallback Analysis Algorithm

The fallback analysis scans a file (after comment stripping) for internal namespace strings inside `[...]` arrays:

```
function fallbackAnalysis(filePath):
    source = stripComments(readFile(filePath))

    # Step 1: Find ALL internal namespace strings anywhere in the file
    allInternalRefs = findAll(source, regex matching "namespace/..." in quotes)
    if none found: return { hasSuspiciousDeps: false, reason: "no internal namespace strings" }

    # Step 2: Check which of those strings appear inside [...] array brackets
    depsInArrays = []
    for each [...] block in source (non-nested bracket matching):
        find all internal namespace strings within the block
        strip the namespace prefix and add to depsInArrays

    uniqueDepsInArrays = deduplicate(depsInArrays)

    if uniqueDepsInArrays is non-empty:
        return {
            hasSuspiciousDeps: true,
            suspectedDeps: uniqueDepsInArrays,
            reason: "internal dep strings found inside [...] arrays but primary parser missed"
        }

    # Internal refs exist but not in arrays — likely sap.ui.require() calls or string literals
    return { hasSuspiciousDeps: false, reason: "internal strings found only in non-array contexts" }
```

### Why This Matters

Without verification, the graph can be silently incomplete. The consequences:
- Cycles through the missing module go undetected
- The skill reports "0 cycles found" when cycles actually exist
- Runtime `undefined` errors persist after modernization

The verification step is the safety net. If the primary parser misses a module, the fallback catches it and the merged graph produces accurate cycle detection.

## 3. Detecting 2-Node Cycles

Simple pair check — O(E) where E is the number of edges:

```
for each edge (A -> B) in the graph:
    if edge (B -> A) also exists:
        record cycle {A, B} (deduplicated as sorted pair)
```

**Output**: list of unique pairs `{A, B}` where both A→B and B→A exist.

## 4. Detecting Longer Chains — Tarjan's SCC Algorithm

Tarjan's algorithm finds all strongly connected components (SCCs) in a directed graph. An SCC is a maximal set of nodes where every node is reachable from every other node. Any SCC with 2+ nodes represents a cycle.

### Pseudocode

```
index_counter = 0
stack = []
lowlinks = {}
index = {}
on_stack = {}
result = []

function strongconnect(node):
    index[node] = index_counter
    lowlinks[node] = index_counter
    index_counter += 1
    stack.push(node)
    on_stack[node] = true

    for each successor in graph[node]:
        if successor not in index:
            # Successor has not yet been visited; recurse
            strongconnect(successor)
            lowlinks[node] = min(lowlinks[node], lowlinks[successor])
        elif on_stack[successor]:
            # Successor is on stack — part of current SCC
            lowlinks[node] = min(lowlinks[node], index[successor])

    # If node is a root node, pop the stack and generate an SCC
    if lowlinks[node] == index[node]:
        scc = []
        repeat:
            w = stack.pop()
            on_stack[w] = false
            scc.push(w)
        until w == node
        if len(scc) >= 2:
            result.push(scc)

# Run on all nodes
for each node in graph:
    if node not in index:
        strongconnect(node)
```

**Output**: list of SCCs. Each SCC with exactly 2 nodes is a 2-node cycle (already detected in step 2). Each SCC with 3+ nodes is a longer chain to flag.

### Extracting Cycle Path from SCC

An SCC tells you which nodes participate in a cycle, but not the specific path. To find a representative cycle path through an SCC:

1. Pick any node in the SCC as the start
2. BFS/DFS through the subgraph (restricted to SCC nodes) to find a path back to the start
3. Report this path as the cycle

## 5. Decision Matrix — Which Edge to Break

For a 2-node cycle {A, B}:

| Criterion | Check | Result |
|-----------|-------|--------|
| **Usage count** | Count code references of B in A vs A in B | Side with fewer usages gets lazy treatment |
| **Tiebreaker 1** | Count total `sap.ui.define` deps for A vs B | Module with MORE total deps keeps normal import (it's the orchestrator) |
| **Tiebreaker 2** | Compare module paths alphabetically | First alphabetically keeps normal import |

### Counting Usages — What Counts

**IS a usage** (count these):
- `B.someMethod()` — method call on the module object
- `B.someProperty` — property access
- `var x = B;` — assignment of the module reference
- `jQuery.proxy(B.method, this)` — passing module method as callback
- `B["dynamicMethod"]()` — bracket notation access

**Is NOT a usage** (exclude these):
- `"path/to/B"` — string literal (fragment path, extend name, log)
- `// B.someMethod()` — commented out code
- `/* B.someMethod() */` — block comment
- `sap.ui.require("path/to/B")` — already lazy (not a `sap.ui.define` dep usage)
- The `sap.ui.define` dependency array entry itself

### Usage Counting Regex

To count usages of module B (with function parameter name `oB`) in file A:

```bash
# Count non-comment, non-string references to the parameter name
grep -n "\boB\b" webapp/utils/A.js | \
  grep -v "^\s*//" | \           # exclude single-line comments
  grep -v "^\s*\*" | \           # exclude block comment lines
  grep -v "'.*oB.*'" | \         # exclude single-quoted strings
  grep -v '".*oB.*"' | \         # exclude double-quoted strings
  grep -v "sap\.ui\.define" | \  # exclude the define array itself
  grep -v "function(" | \        # exclude the function parameter declaration
  wc -l
```

## 6. Worked Example — Cycle Detection and Fix

### Dependency Graph (partial, internal edges only)

```
ModuleA       -> [ModuleB, DataService]
ModuleB       -> [ConfigManager]
Orchestrator  -> [ModuleA, ErrorHandler, ModuleB, ModelManager, ...]
ModuleC       -> [Orchestrator, ErrorHandler, ModuleA, DataService]
Helper        -> [Orchestrator, Payload, Orchestrator, ...]
Formatter     -> [ModelManager]
FilterHelper  -> [MirrorTable, Payload, MetaParser, Formatter, ...]
```

### 2-Node Cycles Found

| Cycle | A uses B | B uses A | Decision |
|-------|----------|----------|----------|
| ModuleA ↔ ModuleB | 15 | 1 | Lazy ModuleA in ModuleB (1 site) |
| Orchestrator ↔ Helper | 5 | 25 | Lazy Helper in Orchestrator (5 sites) |
| Orchestrator ↔ ModuleC | 1 | 3 | Lazy ModuleC in Orchestrator (1 site) |
| Formatter ↔ FilterHelper | 1 | 1 | Tiebreaker: FilterHelper has more deps → lazy FilterHelper in Formatter |
| ModuleA ↔ Orchestrator | 0 | 4 | Zero usages → just remove Orchestrator from ModuleA deps |

### Fix Applied — ModuleA ↔ ModuleB (1 usage)

**Before** (ModuleB.js):
```javascript
sap.ui.define([
    "com/example/myapp/utils/ModuleA",
    "sap/ui/thirdparty/jquery"
], function(ModuleA, jQuery) {
    var ModuleB = {
        handleStatus: function(aSelectedItems, sId) {
            ModuleA.processStatus(aSelectedItems, sId);
        }
    };
    return ModuleB;
});
```

**After** (ModuleB.js):
```javascript
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

**Changes:**
1. Removed `"com/example/.../ModuleA"` from dependency array
2. Removed `ModuleA` from function parameters
3. Added `var ModuleA = sap.ui.require("com/example/.../ModuleA")` inside `handleStatus`

### Fix Applied — ModuleA → Orchestrator (Unused Dep)

**Before** (ModuleA.js):
```javascript
sap.ui.define([
    "com/example/myapp/utils/Orchestrator",
    "com/example/myapp/utils/ModuleB"
], function(Orchestrator, ModuleB) {
    // Orchestrator never referenced in file body
```

**After** (ModuleA.js):
```javascript
sap.ui.define([
    "com/example/myapp/utils/ModuleB"
], function(ModuleB) {
```

No lazy require needed — the dependency was unused.

## 7. Hub-Based Auto-Fix for Longer Chains (3+ Node SCCs)

When Tarjan's algorithm finds SCCs with 3+ nodes, auto-fix by identifying and treating "hub" modules — nodes that participate in the most cycles within the SCC.

### Step 1 — Compute Cycle Participation Score

For each node in an SCC, count how many SCC-internal dependencies (outgoing edges to other SCC members) it has:

```
for each SCC with 3+ nodes:
    for each node N in SCC:
        score[N] = count of N's sap.ui.define deps that are also in this SCC
```

The node with the highest score is the **hub** — it pulls in the most SCC-internal modules, so making its internal deps lazy breaks the most cycles in one operation.

**Tiebreaker**: if multiple nodes share the highest score, pick the one with the most total `sap.ui.define` dependencies (it's the orchestrator module). Final tiebreaker: alphabetical by module path.

### Step 2 — Identify Hub's SCC-Internal Dependencies

List all `sap.ui.define` dependencies of the hub module that point to other nodes in the same SCC. These are the edges to convert to lazy `sap.ui.require`.

```
hub_internal_deps = []
for each dep in sap.ui.define_deps[hub]:
    if dep is in the same SCC:
        hub_internal_deps.append(dep)
```

### Step 3 — Apply Lazy Require Transformation

For each dependency in `hub_internal_deps`:

1. Remove the dependency from the hub's `sap.ui.define` array
2. Remove the corresponding function parameter (index alignment)
3. At each usage site in the hub file, insert `var Module = sap.ui.require("path/to/Module");` inside the enclosing function body
4. If zero usages exist, just remove the dep (no lazy require needed)

Follow the same usage-counting and transformation rules as 2-node cycle fixes (Section 5).

### Step 4 — Re-Run SCC Detection

After fixing the hub, rebuild the dependency graph and re-run Tarjan's algorithm on the same SCC region. Three outcomes:

| Result | Action |
|--------|--------|
| SCC fully dissolved (no 3+ node SCCs remain) | Done — move to next SCC |
| Smaller SCCs remain | Repeat from Step 1 on each remaining SCC |
| Same SCC unchanged after 3 iterations | Fallback: flag in MODERNIZATION-ISSUES.md |

The re-run loop ensures that one hub fix can cascade — breaking the hub's edges may dissolve multiple sub-cycles.

### Step 5 — Fallback to MODERNIZATION-ISSUES.md

If after 3 iterations an SCC persists (hub fix didn't break it), or if a hub module uses a dep at **module top level** (outside any function — cannot be made lazy), flag in MODERNIZATION-ISSUES.md with:
- SCC member list and cycle path
- Hub module and its score
- Which deps couldn't be made lazy and why
- Suggested manual refactoring

### Worked Example — ModelManager as Hub

**SCC detected** (7 chains through 6 modules):
```
ModelManager → FilterHelper → Formatter → ModelManager
ModelManager → ChartHelper → ReportHelper → ModelManager
ModelManager → FilterHelper → MirrorTable → ModelManager
... (4 more chains)
```

**Cycle participation scores:**
| Module | SCC-Internal Deps | Score |
|--------|-------------------|-------|
| ModelManager | FilterHelper, ChartHelper | 2 |
| FilterHelper | MirrorTable, Formatter | 2 |
| Formatter | ModelManager | 1 |
| ChartHelper | ReportHelper | 1 |
| ReportHelper | ModelManager | 1 |
| MirrorTable | ModelManager | 1 |

**Hub selected**: ModelManager (score 2, tiebreaker: more total deps than FilterHelper)

**Hub's SCC-internal deps**: FilterHelper, ChartHelper

**Transformation applied** (ModelManager.js):

Before deps: `[jquery, FilterHelper, Payload, ChartHelper, Log]`
After deps: `[jquery, Payload, Log]`

Lazy requires inserted at 3 usage sites:
```javascript
// Inside getFilterConfig()
var FilterHelper = sap.ui.require("com/example/myapp/utils/FilterHelper");
var oFilterConfig = FilterHelper;

// Inside getChartType()
var ChartHelper = sap.ui.require("com/example/myapp/utils/ChartHelper");
var oChartType = ChartHelper.getAnnotationType();

// Inside getChartVariant()
var ChartHelper = sap.ui.require("com/example/myapp/utils/ChartHelper");
var oChartVariant = ChartHelper.getAnnotationType();
```

**Result**: All 7 longer-chain cycles broken. Re-run of Tarjan's found zero remaining 3+ node SCCs.

## 8. Static-Coverage Analysis

### Why Cycles = 0 Is Insufficient

Breaking all cycles (0 two-node cycles, 0 longer chains) is **necessary but not sufficient** for runtime correctness. The lazy `sap.ui.require("M")` pattern only works if M's factory has already executed — i.e., M is in the loader cache. M's factory executes only when some static `sap.ui.define` dependency chain has pulled it in.

If a controller reaches file F (which has a lazy require to M) but does NOT reach M via any static path, then `sap.ui.require("M")` returns `undefined` at runtime.

### Definition: Static Reachability

A module M is **statically reachable from entry point E** if and only if there is a directed path E → … → M in the graph where every edge is a `sap.ui.define` dependency.

Additionally, `sap.ui.require([deps], cb)` (async array form) edges are treated as static because they trigger module loading. Only `sap.ui.require("M")` (single-string sync form) is a pure cache read and does NOT contribute to reachability.

### Entry-Point Discovery

Entry points are the modules that the UI5 runtime loads when a route activates:

```
Entry points = { Component.js } ∪ { controller for each routing target }

Algorithm:
1. Read manifest.json → sap.ui5.routing.targets
2. For each target T:
   viewName = T.viewName || T.name
   controllerPath = namespace + "/controller/" + viewName + ".controller"
   if file exists: add to entry points
3. Always include namespace + "/Component"
```

### Reachability Algorithm (BFS)

```
function reachable(graph, startNode):
    visited = { startNode }
    queue = [ startNode ]
    while queue is not empty:
        node = queue.dequeue()
        for each dep in graph[node]:
            if dep not in visited:
                visited.add(dep)
                queue.enqueue(dep)
    return visited
```

Time complexity: O(V + E) per entry point. For P entry points: O(P × (V + E)).

### Static-Coverage Gap Detection

For each lazy `sap.ui.require("M")` call in file F:

```
1. callerEntries = { E ∈ entryPoints : F ∈ reachable(graph, E) }
   // Entry points that load F (and therefore might execute the lazy require)

2. coveredEntries = { E ∈ callerEntries : M ∈ reachable(graph, E) }
   // Of those, which also load M via a static path

3. uncoveredEntries = callerEntries - coveredEntries
   // Entry points where M will be undefined at runtime

4. If uncoveredEntries is non-empty → UNSAFE. Report finding.
```

### The Fix: Append-to-Controller

For each unsafe finding, the fix is deterministic:

```
For each E in uncoveredEntries:
    Append M to sap.ui.define deps array of E
    (No factory parameter needed — load-only side-effect import)
```

This creates a static edge E → M, ensuring M is evaluated before any code path through F can fire the lazy require.

**Threshold heuristic**: If `uncoveredEntries` has more than 3 controllers, append M to `BaseController.js` or `Component.js` instead (broader coverage, fewer patches).

### Worked Example — Unsafe Lazy Require After Cycle-Breaking

Module graph after cycle-breaking:
- `ActionHandler.js` has `var DialogHelper = sap.ui.require("…/DialogHelper")` in 19 functions
- `DialogHelper` is statically imported only by `ObjectList.controller.js`

Entry-point analysis:

| Controller | Reaches ActionHandler? | Reaches DialogHelper? | Safe? |
|---|---|---|---|
| ObjectList.controller | ✓ | ✓ (direct import) | ✓ |
| DetailsPageA.controller | ✓ | ✗ | **UNSAFE** |
| DetailsPageB.controller | ✓ | ✗ | **UNSAFE** |
| GroupDetails.controller | ✓ | ✗ | **UNSAFE** |

Fix: append `DialogHelper` to deps of each uncovered controller.

After fix, re-run shows 0 unsafe lazy requires. Tests pass.

### Edge Cases

1. **Dynamic `sap.ui.require([deps], cb)` in controllers**: These DO trigger module loading. Treat their deps as additional static edges from that controller for reachability purposes. The detection script augments the graph with these edges before analysis.

2. **Base controller extend chains**: Every controller's transitive `extend` chain is in the static graph (extend is invoked at definition time). So if BaseController.js imports M, all controllers that extend BaseController also reach M.

3. **Nested lazy requires**: If `sap.ui.require("M")` returns M, and M's factory itself calls `sap.ui.require("N")`, then N must ALSO be statically covered from the same entry point. Check recursively.

4. **Test files**: Excluded from entry-point analysis. Only app controllers and Component serve as entry points. Test-file lazy requires are validated separately (test runners load all dependencies upfront via the test suite configuration).

5. **Routes with subrouting / nested components**: Each routing target maps to one controller. Walk the full `targets` object regardless of route hierarchy.
