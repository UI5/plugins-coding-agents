/**
 * graph-utils.js
 *
 * Shared utilities for building and querying the UI5 module dependency graph.
 * Used by detect-cycles.js and detect-unsafe-lazy.js.
 */

const fs = require("fs");
const path = require("path");

// ---------------------------------------------------------------------------
// Comment stripper — preserves string contents
// ---------------------------------------------------------------------------

function stripComments(source) {
	let result = "";
	let i = 0;
	const len = source.length;
	while (i < len) {
		const ch = source[i];
		if (ch === "'" || ch === '"' || ch === "`") {
			const start = i;
			i++;
			while (i < len) {
				if (source[i] === "\\") { i += 2; continue; }
				if (source[i] === ch) { i++; break; }
				i++;
			}
			result += source.slice(start, i);
		} else if (ch === "/" && i + 1 < len && source[i + 1] === "/") {
			while (i < len && source[i] !== "\n") i++;
		} else if (ch === "/" && i + 1 < len && source[i + 1] === "*") {
			i += 2;
			while (i < len && !(source[i] === "*" && i + 1 < len && source[i + 1] === "/")) {
				if (source[i] === "\n") result += "\n";
				i++;
			}
			if (i < len) i += 2;
		} else {
			result += ch;
			i++;
		}
	}
	return result;
}

// ---------------------------------------------------------------------------
// Parse sap.ui.define dependencies from a file
// ---------------------------------------------------------------------------

const DEFINE_RE = /sap\s*\.\s*ui\s*\.\s*define\s*\(/;

function extractDeps(source) {
	const match = DEFINE_RE.exec(source);
	if (!match) return { matched: false, deps: [], noArray: false };

	let idx = match.index + match[0].length;
	// Skip whitespace
	while (idx < source.length && /\s/.test(source[idx])) idx++;

	if (source[idx] !== "[") {
		return { matched: true, deps: [], noArray: true };
	}

	// Find matching ]
	let depth = 1;
	let start = idx + 1;
	idx++;
	while (idx < source.length && depth > 0) {
		if (source[idx] === "[") depth++;
		else if (source[idx] === "]") depth--;
		idx++;
	}
	const arrayContent = source.slice(start, idx - 1);

	// Extract string literals from the array
	const deps = [];
	const strRe = /["']([^"']+)["']/g;
	let m;
	while ((m = strRe.exec(arrayContent)) !== null) {
		deps.push(m[1]);
	}

	return { matched: true, deps, noArray: false };
}

// ---------------------------------------------------------------------------
// File collection
// ---------------------------------------------------------------------------

function collectJsFiles(dir) {
	const results = [];
	if (!fs.existsSync(dir)) return results;
	const entries = fs.readdirSync(dir, { withFileTypes: true });
	for (const entry of entries) {
		const fullPath = path.join(dir, entry.name);
		if (entry.isDirectory()) {
			if (entry.name === "node_modules" || entry.name === ".git") continue;
			results.push(...collectJsFiles(fullPath));
		} else if (entry.name.endsWith(".js")) {
			results.push(fullPath);
		}
	}
	return results;
}

// ---------------------------------------------------------------------------
// Module ID helpers
// ---------------------------------------------------------------------------

function isInternalDep(dep, namespace) {
	return dep.startsWith(namespace + "/") || dep.startsWith("test-resources/" + namespace + "/");
}

function fileToModuleId(filePath, webappDir, projectRoot, namespace) {
	let rel = path.relative(webappDir, filePath);
	if (rel.startsWith("..")) {
		rel = path.relative(projectRoot, filePath);
	}
	rel = rel.replace(/\\/g, "/").replace(/\.js$/, "");
	return namespace + "/" + rel;
}

// ---------------------------------------------------------------------------
// Webapp / namespace discovery
// ---------------------------------------------------------------------------

function findWebappDir(projectRoot, webappDirOverride) {
	if (webappDirOverride) return path.join(projectRoot, webappDirOverride);
	for (const candidate of ["webapp", "src", "."]) {
		const dir = path.join(projectRoot, candidate);
		if (fs.existsSync(path.join(dir, "manifest.json"))) return dir;
	}
	return null;
}

function discoverNamespace(webappDir) {
	const manifestPath = path.join(webappDir, "manifest.json");
	const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf-8"));
	const appId = manifest["sap.app"] && manifest["sap.app"].id;
	if (!appId) return null;
	return appId.replace(/\./g, "/");
}

// ---------------------------------------------------------------------------
// Fallback analysis for modules the primary parser might have missed
// ---------------------------------------------------------------------------

function fallbackAnalysis(filePath, namespace) {
	const raw = fs.readFileSync(filePath, "utf-8");
	const stripped = stripComments(raw);

	const nsEscaped = namespace.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
	const internalRefRe = new RegExp(`["']((?:test-resources\\/)?${nsEscaped}\\/[^"']+)["']`, "g");
	const allRefs = [];
	let m;
	while ((m = internalRefRe.exec(stripped)) !== null) {
		allRefs.push(m[1]);
	}
	if (allRefs.length === 0) {
		return { hasSuspiciousDeps: false, reason: "no internal namespace strings" };
	}

	// Check which refs appear inside [...] brackets
	const bracketRe = /\[([^\]]*)\]/g;
	const depsInArrays = new Set();
	while ((m = bracketRe.exec(stripped)) !== null) {
		const block = m[1];
		let ref;
		while ((ref = internalRefRe.exec(block)) !== null) {
			depsInArrays.add(ref[1]);
		}
		internalRefRe.lastIndex = 0;
	}

	if (depsInArrays.size > 0) {
		return {
			hasSuspiciousDeps: true,
			deps: [...depsInArrays],
			reason: "internal dep strings found inside [...] arrays but primary parser missed"
		};
	}
	return { hasSuspiciousDeps: false, reason: "internal strings found only in non-array contexts" };
}

// ---------------------------------------------------------------------------
// Graph building — builds the full static dependency graph for a project
// ---------------------------------------------------------------------------

/**
 * Build the static dependency graph for a UI5 project.
 *
 * @param {string} projectRoot - Absolute path to project root
 * @param {object} [opts] - Options
 * @param {string} [opts.webappDirOverride] - Override for webapp dir name
 * @param {boolean} [opts.includeTests=true] - Include test files in graph
 * @param {boolean} [opts.verbose=false] - Log progress to stderr
 * @returns {{ namespace, webappDir, graph, parseMetadata, warnings, errors }}
 */
function buildGraph(projectRoot, opts = {}) {
	const { webappDirOverride, includeTests = true, verbose = false } = opts;

	const webappDir = findWebappDir(projectRoot, webappDirOverride);
	if (!webappDir) {
		throw new Error("Cannot find manifest.json in webapp/, src/, or project root.");
	}

	const namespace = discoverNamespace(webappDir);
	if (!namespace) {
		throw new Error("manifest.json missing sap.app.id");
	}

	if (verbose) {
		console.error(`Project namespace: ${namespace}`);
		console.error(`Webapp dir: ${webappDir}`);
	}

	// Collect JS files
	const testDir = path.join(projectRoot, "test");
	const webappTestDir = path.join(webappDir, "test");
	const jsFiles = [
		...collectJsFiles(webappDir),
		...(includeTests && testDir !== webappTestDir && fs.existsSync(testDir)
			? collectJsFiles(testDir) : [])
	];

	if (verbose) console.error(`Found ${jsFiles.length} JS files`);

	// Parse all files
	const graph = {};
	const parseMetadata = {};
	const warnings = [];
	const errors = [];

	for (const filePath of jsFiles) {
		const raw = fs.readFileSync(filePath, "utf-8");
		const stripped = stripComments(raw);
		const moduleId = fileToModuleId(filePath, webappDir, projectRoot, namespace);
		const result = extractDeps(stripped);

		parseMetadata[moduleId] = {
			filePath,
			matched: result.matched,
			noArray: result.noArray
		};

		const internalDeps = result.deps.filter(d => isInternalDep(d, namespace));
		if (internalDeps.length > 0 || result.matched) {
			graph[moduleId] = internalDeps;
		}
	}

	if (verbose) {
		console.error(`Graph nodes: ${Object.keys(graph).length}`);
		console.error(`Total edges: ${Object.values(graph).reduce((s, d) => s + d.length, 0)}`);
	}

	// Verify graph completeness — fallback analysis for missing modules
	const allReferencedDeps = new Set();
	for (const deps of Object.values(graph)) {
		for (const dep of deps) allReferencedDeps.add(dep);
	}

	for (const dep of allReferencedDeps) {
		if (graph[dep] !== undefined) continue;

		const relPath = dep.startsWith("test-resources/")
			? dep.replace("test-resources/" + namespace + "/", "test/")
			: dep.replace(namespace + "/", "");
		const candidates = [
			path.join(webappDir, relPath + ".js"),
			path.join(projectRoot, relPath + ".js")
		];
		const filePath = candidates.find(f => fs.existsSync(f));

		if (!filePath) {
			warnings.push(`Referenced but file not found: ${dep}`);
			continue;
		}

		const meta = parseMetadata[dep];
		const fb = fallbackAnalysis(filePath, namespace);

		if (fb.hasSuspiciousDeps) {
			const reason = meta
				? (meta.noArray ? "sap.ui.define found but first arg not array" : "primary parser extracted 0 internal deps")
				: "no sap.ui.define found by primary parser";
			errors.push(`${dep}: ${reason}. Fallback found deps: ${fb.deps.join(", ")}`);
			graph[dep] = fb.deps;
		}
	}

	if (verbose) console.error(`After verification — Graph nodes: ${Object.keys(graph).length}`);

	return { namespace, webappDir, graph, parseMetadata, warnings, errors };
}

// ---------------------------------------------------------------------------
// BFS reachability
// ---------------------------------------------------------------------------

/**
 * Compute the set of all nodes reachable from `start` in `graph` via BFS.
 * @param {object} graph - Adjacency list { nodeId: [depId, ...] }
 * @param {string} start - Starting node
 * @returns {Set<string>} - All reachable nodes (including start itself)
 */
function reachableFrom(graph, start) {
	const visited = new Set();
	const queue = [start];
	visited.add(start);
	while (queue.length > 0) {
		const node = queue.shift();
		const deps = graph[node] || [];
		for (const dep of deps) {
			if (!visited.has(dep)) {
				visited.add(dep);
				queue.push(dep);
			}
		}
	}
	return visited;
}

// ---------------------------------------------------------------------------
// Exports
// ---------------------------------------------------------------------------

module.exports = {
	stripComments,
	DEFINE_RE,
	extractDeps,
	collectJsFiles,
	isInternalDep,
	fileToModuleId,
	findWebappDir,
	discoverNamespace,
	fallbackAnalysis,
	buildGraph,
	reachableFrom
};
