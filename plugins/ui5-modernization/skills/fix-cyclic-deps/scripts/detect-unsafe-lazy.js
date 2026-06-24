#!/usr/bin/env node
/**
 * detect-unsafe-lazy.js
 *
 * Detects lazy sap.ui.require("M") calls where the target module M is NOT
 * statically reachable from all entry-point controllers that load the calling file.
 *
 * This is the safety-net post-check after fix-cyclic-deps breaks cycles.
 * Cycles = 0 is necessary but NOT sufficient for runtime correctness.
 * A lazy require returns undefined if the target hasn't been evaluated via
 * some other static dependency chain.
 *
 * Usage: node detect-unsafe-lazy.js <project-root> [--webapp-dir <dir>]
 *
 * Output (JSON to stdout):
 *   { entryPoints, unsafeLazyRequires, summary }
 *
 * Info/progress is logged to stderr so stdout stays clean JSON.
 */

const fs = require("fs");
const path = require("path");
const {
	stripComments,
	buildGraph,
	reachableFrom,
	isInternalDep
} = require("./lib/graph-utils");

// ---------------------------------------------------------------------------
// Core functions (exported for testing)
// ---------------------------------------------------------------------------

const ASYNC_REQUIRE_RE = /sap\s*\.\s*ui\s*\.\s*require\s*\(\s*\[/g;

/**
 * Extract deps from async sap.ui.require([deps], cb) calls.
 * These DO trigger module loading → count as static edges for reachability.
 */
function extractAsyncRequireDeps(source, ns) {
	const deps = [];
	const re = new RegExp(ASYNC_REQUIRE_RE.source, "g");
	let match;
	while ((match = re.exec(source)) !== null) {
		// Find the matching ]
		let idx = match.index + match[0].length - 1; // at the [
		let depth = 1;
		let start = idx + 1;
		idx++;
		while (idx < source.length && depth > 0) {
			if (source[idx] === "[") depth++;
			else if (source[idx] === "]") depth--;
			idx++;
		}
		const arrayContent = source.slice(start, idx - 1);
		const strRe = /["']([^"']+)["']/g;
		let m;
		while ((m = strRe.exec(arrayContent)) !== null) {
			if (isInternalDep(m[1], ns)) {
				deps.push(m[1]);
			}
		}
	}
	return deps;
}

/**
 * Discover entry points from manifest.json routing configuration.
 * Returns Component + all controllers mapped from routing targets.
 */
function discoverEntryPoints(webappDir, ns) {
	const manifestPath = path.join(webappDir, "manifest.json");
	const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf-8"));
	const entryPoints = new Set();

	// Component.js is always an entry point
	entryPoints.add(ns + "/Component");

	// Extract controllers from routing targets
	const routing = manifest["sap.ui5"] && manifest["sap.ui5"].routing;
	if (routing && routing.targets) {
		for (const [, target] of Object.entries(routing.targets)) {
			const viewName = target.viewName || target.name;
			if (!viewName) continue;

			const viewPath = viewName.replace(/\./g, "/");
			const controllerModuleId = ns + "/controller/" + viewPath + ".controller";
			const controllerRelPath = "controller/" + viewPath + ".controller.js";
			const controllerFilePath = path.join(webappDir, controllerRelPath);
			if (fs.existsSync(controllerFilePath)) {
				entryPoints.add(controllerModuleId);
			}
		}
	}

	// Also check for controllers referenced via viewPath pattern
	if (routing && routing.targets) {
		for (const [, target] of Object.entries(routing.targets)) {
			if (target.viewPath) {
				const controllerModuleId = ns + "/controller/" + (target.viewName || target.name).replace(/\./g, "/") + ".controller";
				const controllerRelPath = "controller/" + (target.viewName || target.name).replace(/\./g, "/") + ".controller.js";
				const controllerFilePath = path.join(webappDir, controllerRelPath);
				if (fs.existsSync(controllerFilePath) && !entryPoints.has(controllerModuleId)) {
					entryPoints.add(controllerModuleId);
				}
			}
		}
	}

	return [...entryPoints];
}

/**
 * Detect single-string sap.ui.require("M") calls that target internal modules.
 */
function findLazyRequires(source, ns) {
	const results = [];

	// Match sap.ui.require("path") or sap.ui.require('path') — single string, NOT array
	const lazyRe = /sap\s*\.\s*ui\s*\.\s*require\s*\(\s*["']([^"']+)["']\s*\)/g;
	let match;
	while ((match = lazyRe.exec(source)) !== null) {
		const target = match[1];
		if (!isInternalDep(target, ns)) continue;

		// Check we're NOT inside a [...] array (which would be async form)
		// Simple heuristic: look backward for unmatched [
		const before = source.slice(Math.max(0, match.index - 200), match.index);
		if (/\[\s*$/.test(before) || /\[\s*["']/.test(before.slice(-50))) continue;

		results.push({
			target,
			index: match.index,
			line: source.slice(0, match.index).split("\n").length
		});
	}

	return results;
}

// ---------------------------------------------------------------------------
// Exports
// ---------------------------------------------------------------------------

module.exports = {
	findLazyRequires,
	extractAsyncRequireDeps,
	discoverEntryPoints
};

// ---------------------------------------------------------------------------
// CLI — only runs when invoked directly
// ---------------------------------------------------------------------------

if (require.main === module) {
	const args = process.argv.slice(2);
	if (args.length === 0 || args[0] === "--help" || args[0] === "-h") {
		console.error("Usage: node detect-unsafe-lazy.js <project-root> [--webapp-dir <dir>]");
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

	// Build static dependency graph
	const { namespace, webappDir, graph, parseMetadata, warnings, errors } = buildGraph(projectRoot, {
		webappDirOverride,
		includeTests: false,
		verbose: true
	});

	// Augment graph with async require edges (they trigger real loads)
	for (const [moduleId, meta] of Object.entries(parseMetadata)) {
		if (!meta.filePath) continue;
		const raw = fs.readFileSync(meta.filePath, "utf-8");
		const stripped = stripComments(raw);
		const asyncDeps = extractAsyncRequireDeps(stripped, namespace);
		if (asyncDeps.length > 0) {
			const existing = graph[moduleId] || [];
			const merged = [...new Set([...existing, ...asyncDeps])];
			graph[moduleId] = merged;
		}
	}

	console.error(`Graph (with async require edges): ${Object.keys(graph).length} nodes, ${Object.values(graph).reduce((s, d) => s + d.length, 0)} edges`);

	// Discover entry points
	const entryPoints = discoverEntryPoints(webappDir, namespace);
	console.error(`Entry points discovered: ${entryPoints.length}`);
	for (const ep of entryPoints) {
		console.error(`  - ${ep}`);
	}

	// Compute reachability from each entry point
	const reachabilityCache = {};
	for (const ep of entryPoints) {
		reachabilityCache[ep] = reachableFrom(graph, ep);
	}

	// Find all lazy requires and check coverage
	const unsafeLazyRequires = [];
	const lazyCallSites = {};

	for (const [moduleId, meta] of Object.entries(parseMetadata)) {
		if (!meta.filePath) continue;
		if (meta.filePath.includes("/test/")) continue;

		const raw = fs.readFileSync(meta.filePath, "utf-8");
		const stripped = stripComments(raw);
		const lazyCalls = findLazyRequires(stripped, namespace);
		if (lazyCalls.length === 0) continue;

		const targetCounts = {};
		for (const call of lazyCalls) {
			targetCounts[call.target] = (targetCounts[call.target] || 0) + 1;
		}

		for (const [target, count] of Object.entries(targetCounts)) {
			const key = moduleId + "|" + target;
			lazyCallSites[key] = { callerModule: moduleId, target, count };
		}
	}

	console.error(`Lazy require call sites found: ${Object.keys(lazyCallSites).length} unique (caller, target) pairs`);

	// Check static coverage for each pair
	for (const { callerModule, target, count } of Object.values(lazyCallSites)) {
		const callerEntries = entryPoints.filter(ep => reachabilityCache[ep].has(callerModule));
		if (callerEntries.length === 0) continue;

		const covered = callerEntries.filter(ep => reachabilityCache[ep].has(target));
		const uncovered = callerEntries.filter(ep => !reachabilityCache[ep].has(target));

		if (uncovered.length > 0) {
			const shortCaller = callerModule.replace(namespace + "/", "");
			const shortTarget = target.replace(namespace + "/", "");
			const shortCovered = covered.map(ep => ep.replace(namespace + "/", ""));
			const shortUncovered = uncovered.map(ep => ep.replace(namespace + "/", ""));

			unsafeLazyRequires.push({
				lazyTarget: target,
				lazyTargetShort: shortTarget,
				lazyCallSiteFile: callerModule,
				lazyCallSiteFileShort: shortCaller,
				lazyCallSiteCount: count,
				staticCovered: shortCovered,
				staticUncovered: shortUncovered,
				suggestedFix: `Append "${target}" to the sap.ui.define deps of: ${shortUncovered.join(", ")}`
			});
		}
	}

	// Output
	const output = {
		namespace,
		webappDir: path.relative(projectRoot, webappDir),
		entryPoints: entryPoints.map(ep => ep.replace(namespace + "/", "")),
		unsafeLazyRequires,
		summary: {
			totalLazyCallSitePairs: Object.keys(lazyCallSites).length,
			unsafeCount: unsafeLazyRequires.length,
			affectedFiles: [...new Set(unsafeLazyRequires.map(f => f.lazyCallSiteFileShort))],
			affectedTargets: [...new Set(unsafeLazyRequires.map(f => f.lazyTargetShort))]
		},
		warnings,
		errors
	};

	console.log(JSON.stringify(output, null, 2));

	if (unsafeLazyRequires.length === 0) {
		console.error("\n✓ All lazy requires are statically covered. Safe.");
		process.exit(0);
	} else {
		console.error(`\n✗ ${unsafeLazyRequires.length} unsafe lazy require(s) found.`);
		console.error("  These will return undefined at runtime for the uncovered entry points.");
		console.error("  Fix: append the lazy target to sap.ui.define deps of each uncovered controller.");
		process.exit(1);
	}
}
