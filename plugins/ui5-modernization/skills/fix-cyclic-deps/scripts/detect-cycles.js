#!/usr/bin/env node
/**
 * detect-cycles.js
 *
 * Builds the module dependency graph for a UI5 project and detects cyclic dependencies.
 * Auto-discovers the project namespace from manifest.json.
 *
 * Usage: node detect-cycles.js <project-root> [--webapp-dir <dir>]
 *
 * Example: node detect-cycles.js /path/to/myapp
 *          node detect-cycles.js /path/to/myapp --webapp-dir src
 *
 * Output (JSON to stdout):
 *   namespace, graph, twoNodeCycles, longerChains, warnings, errors
 *
 * Info/progress is logged to stderr so stdout stays clean JSON.
 */

const fs = require("fs");
const path = require("path");
const {
	stripComments,
	DEFINE_RE,
	extractDeps,
	buildGraph
} = require("./lib/graph-utils");

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------

const args = process.argv.slice(2);
if (args.length === 0 || args[0] === "--help" || args[0] === "-h") {
	console.error("Usage: node detect-cycles.js <project-root> [--webapp-dir <dir>]");
	console.error("  <project-root>   Root of the UI5 project (contains webapp/ or src/)");
	console.error("  --webapp-dir     Override the webapp directory name (default: auto-detect)");
	process.exit(args.length === 0 ? 1 : 0);
}

const projectRoot = path.resolve(args[0]);
let webappDirOverride = null;
for (let i = 1; i < args.length; i++) {
	if (args[i] === "--webapp-dir" && args[i + 1]) {
		webappDirOverride = args[++i];
	}
}

// ---------------------------------------------------------------------------
// Build dependency graph using shared utilities
// ---------------------------------------------------------------------------

const { namespace, webappDir, graph, parseMetadata, warnings, errors } = buildGraph(projectRoot, {
	webappDirOverride,
	includeTests: true,
	verbose: true
});

// ---------------------------------------------------------------------------
// Detect 2-node cycles
// ---------------------------------------------------------------------------

const twoNodeCycles = [];
const seenPairs = new Set();

for (const [a, deps] of Object.entries(graph)) {
	for (const b of deps) {
		if (graph[b] && graph[b].includes(a)) {
			const key = [a, b].sort().join("|");
			if (!seenPairs.has(key)) {
				seenPairs.add(key);
				twoNodeCycles.push({ a, b });
			}
		}
	}
}

console.error(`2-node cycles found: ${twoNodeCycles.length}`);

// ---------------------------------------------------------------------------
// Tarjan's SCC algorithm
// ---------------------------------------------------------------------------

function tarjanSCC(graph) {
	let indexCounter = 0;
	const stack = [];
	const lowlinks = {};
	const index = {};
	const onStack = {};
	const result = [];

	function strongconnect(node) {
		index[node] = indexCounter;
		lowlinks[node] = indexCounter;
		indexCounter++;
		stack.push(node);
		onStack[node] = true;

		const successors = graph[node] || [];
		for (const succ of successors) {
			if (!(succ in index)) {
				strongconnect(succ);
				lowlinks[node] = Math.min(lowlinks[node], lowlinks[succ]);
			} else if (onStack[succ]) {
				lowlinks[node] = Math.min(lowlinks[node], index[succ]);
			}
		}

		if (lowlinks[node] === index[node]) {
			const scc = [];
			let w;
			do {
				w = stack.pop();
				onStack[w] = false;
				scc.push(w);
			} while (w !== node);
			if (scc.length >= 3) {
				result.push(scc);
			}
		}
	}

	for (const node of Object.keys(graph)) {
		if (!(node in index)) {
			strongconnect(node);
		}
	}
	return result;
}

const sccs = tarjanSCC(graph);
console.error(`Longer chains (3+ node SCCs): ${sccs.length}`);

// ---------------------------------------------------------------------------
// Usage counting — count code references of one module in another's source
// ---------------------------------------------------------------------------

function countUsages(filePath, paramName) {
	if (!paramName) return 0;
	const raw = fs.readFileSync(filePath, "utf-8");
	const stripped = stripComments(raw);

	// Remove the sap.ui.define wrapper line and function(...) line
	const defineEnd = stripped.search(/function\s*\([^)]*\)\s*\{/);
	const body = defineEnd >= 0 ? stripped.slice(defineEnd) : stripped;

	// Remove the function parameter declaration itself
	const bodyAfterParams = body.replace(/^function\s*\([^)]*\)/, "");

	const re = new RegExp("\\b" + escapeRegExp(paramName) + "\\b", "g");
	const matches = bodyAfterParams.match(re);
	return matches ? matches.length : 0;
}

function escapeRegExp(s) {
	return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function getParamName(filePath, depPath) {
	const raw = fs.readFileSync(filePath, "utf-8");
	const stripped = stripComments(raw);
	const result = extractDeps(stripped);
	if (!result.matched) return null;

	const depIdx = result.deps.indexOf(depPath);
	if (depIdx < 0) return null;

	// Find the function parameter list
	const defineMatch = DEFINE_RE.exec(stripped);
	if (!defineMatch) return null;

	let idx = defineMatch.index + defineMatch[0].length;
	// Skip to past the ] of the dep array
	let depth = 0;
	while (idx < stripped.length) {
		if (stripped[idx] === "[") depth++;
		if (stripped[idx] === "]") { depth--; if (depth === 0) { idx++; break; } }
		idx++;
	}
	// Find function(
	const funcMatch = /function\s*\(([^)]*)\)/.exec(stripped.slice(idx));
	if (!funcMatch) return null;

	const params = funcMatch[1].split(",").map(p => p.trim());
	return depIdx < params.length ? params[depIdx] : null;
}

// ---------------------------------------------------------------------------
// Enrich 2-node cycles with usage counts and lazy-side decision
// ---------------------------------------------------------------------------

const enrichedTwoNode = twoNodeCycles.map(({ a, b }) => {
	const metaA = parseMetadata[a];
	const metaB = parseMetadata[b];

	const paramBinA = metaA ? getParamName(metaA.filePath, b) : null;
	const paramAinB = metaB ? getParamName(metaB.filePath, a) : null;

	const aUsesB = metaA && paramBinA ? countUsages(metaA.filePath, paramBinA) : 0;
	const bUsesA = metaB && paramAinB ? countUsages(metaB.filePath, paramAinB) : 0;

	let lazySide, lazyModule;
	if (aUsesB < bUsesA) {
		lazySide = "a"; lazyModule = a;
	} else if (bUsesA < aUsesB) {
		lazySide = "b"; lazyModule = b;
	} else {
		// Tiebreaker 1: module with more total deps keeps normal import
		const aDeps = (graph[a] || []).length;
		const bDeps = (graph[b] || []).length;
		if (aDeps > bDeps) {
			lazySide = "b"; lazyModule = b;
		} else if (bDeps > aDeps) {
			lazySide = "a"; lazyModule = a;
		} else {
			// Tiebreaker 2: alphabetical — first keeps normal
			lazySide = a < b ? "b" : "a";
			lazyModule = a < b ? b : a;
		}
	}

	return {
		a, b,
		aUsesB, bUsesA,
		paramBinA, paramAinB,
		lazySide, lazyModule,
		lazyFilePath: lazySide === "a" ? (metaA && metaA.filePath) : (metaB && metaB.filePath)
	};
});

// ---------------------------------------------------------------------------
// Enrich longer chains with hub identification
// ---------------------------------------------------------------------------

const enrichedChains = sccs.map(scc => {
	const sccSet = new Set(scc);

	const scores = scc.map(node => {
		const outgoing = (graph[node] || []).filter(d => sccSet.has(d)).length;
		const totalDeps = (graph[node] || []).length;
		return { node, outgoing, totalDeps };
	});

	// Hub = highest outgoing SCC edges; tiebreaker = most total deps; final = alphabetical
	scores.sort((x, y) => {
		if (y.outgoing !== x.outgoing) return y.outgoing - x.outgoing;
		if (y.totalDeps !== x.totalDeps) return y.totalDeps - x.totalDeps;
		return x.node.localeCompare(y.node);
	});

	const hub = scores[0].node;
	const hubInternalDeps = (graph[hub] || []).filter(d => sccSet.has(d));

	return {
		scc,
		hub,
		hubScore: scores[0].outgoing,
		hubTotalDeps: scores[0].totalDeps,
		hubInternalDeps,
		allScores: scores.map(s => ({ module: s.node, sccEdges: s.outgoing, totalDeps: s.totalDeps }))
	};
});

// ---------------------------------------------------------------------------
// Output
// ---------------------------------------------------------------------------

const output = {
	namespace,
	webappDir: path.relative(projectRoot, webappDir),
	modulesAnalyzed: Object.keys(graph).length,
	totalEdges: Object.values(graph).reduce((s, d) => s + d.length, 0),
	graph,
	twoNodeCycles: enrichedTwoNode,
	longerChains: enrichedChains,
	warnings,
	errors
};

console.log(JSON.stringify(output, null, 2));

if (twoNodeCycles.length === 0 && sccs.length === 0) {
	console.error("\nNo cyclic dependencies detected.");
} else {
	console.error(`\nSummary: ${twoNodeCycles.length} two-node cycle(s), ${sccs.length} longer chain(s).`);
}
