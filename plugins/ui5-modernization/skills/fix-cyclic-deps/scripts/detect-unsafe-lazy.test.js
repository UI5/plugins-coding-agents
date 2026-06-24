#!/usr/bin/env node
/**
 * Unit tests for detect-unsafe-lazy.js
 *
 * Tests cover:
 *   - findLazyRequires: detection of sap.ui.require("M") single-string calls
 *   - extractAsyncRequireDeps: async sap.ui.require([...], cb) edge extraction
 *   - reachableFrom: BFS reachability over static graph
 *   - discoverEntryPoints: manifest.json → controller entry-point mapping
 *   - Integration: full static-coverage gap detection on fixture
 *
 * Run: node detect-unsafe-lazy.test.js
 */

const assert = require("assert");
const path = require("path");
const fs = require("fs");
const os = require("os");

const {
	buildGraph,
	reachableFrom
} = require("./lib/graph-utils");

const {
	findLazyRequires,
	extractAsyncRequireDeps,
	discoverEntryPoints
} = require("./detect-unsafe-lazy");

// ---------------------------------------------------------------------------
// Test runner
// ---------------------------------------------------------------------------

let passed = 0;
let failed = 0;

function test(name, fn) {
	try {
		fn();
		passed++;
		console.log(`  ✓ ${name}`);
	} catch (e) {
		failed++;
		console.log(`  ✗ ${name}`);
		console.log(`    ${e.message}`);
	}
}

function section(title) {
	console.log(`\n${title}`);
}

// ---------------------------------------------------------------------------
// findLazyRequires
// ---------------------------------------------------------------------------

section("findLazyRequires");

test("detects single-string sap.ui.require calls", () => {
	const source = `
sap.ui.define(["sap/ui/base/Object"], function(BaseObject) {
    return {
        doStuff: function() {
            var Helper = sap.ui.require("com/example/app/utils/Helper");
            Helper.run();
        }
    };
});`;
	const results = findLazyRequires(source, "com/example/app");
	assert.strictEqual(results.length, 1);
	assert.strictEqual(results[0].target, "com/example/app/utils/Helper");
});

test("ignores async array form sap.ui.require([...])", () => {
	const source = `
sap.ui.define([], function() {
    return {
        load: function() {
            sap.ui.require(["com/example/app/utils/Heavy"], function(Heavy) {
                Heavy.init();
            });
        }
    };
});`;
	const results = findLazyRequires(source, "com/example/app");
	assert.strictEqual(results.length, 0);
});

test("ignores framework modules (sap/*)", () => {
	const source = `
function test() {
    var Log = sap.ui.require("sap/base/Log");
}`;
	const results = findLazyRequires(source, "com/example/app");
	assert.strictEqual(results.length, 0);
});

test("finds multiple lazy requires in same file", () => {
	const source = `
sap.ui.define([], function() {
    return {
        methodA: function() {
            var A = sap.ui.require("com/example/app/A");
            A.run();
        },
        methodB: function() {
            var B = sap.ui.require("com/example/app/B");
            B.run();
        },
        methodC: function() {
            var A = sap.ui.require("com/example/app/A");
            A.other();
        }
    };
});`;
	const results = findLazyRequires(source, "com/example/app");
	assert.strictEqual(results.length, 3);
	assert.strictEqual(results.filter(r => r.target === "com/example/app/A").length, 2);
	assert.strictEqual(results.filter(r => r.target === "com/example/app/B").length, 1);
});

test("handles multi-line sap.ui.require", () => {
	const source = `
function run() {
    var X = sap
        .ui
        .require("com/example/app/X");
}`;
	const results = findLazyRequires(source, "com/example/app");
	assert.strictEqual(results.length, 1);
	assert.strictEqual(results[0].target, "com/example/app/X");
});

test("handles single-quoted strings", () => {
	const source = `
function run() {
    var X = sap.ui.require('com/example/app/X');
}`;
	const results = findLazyRequires(source, "com/example/app");
	assert.strictEqual(results.length, 1);
	assert.strictEqual(results[0].target, "com/example/app/X");
});

// ---------------------------------------------------------------------------
// extractAsyncRequireDeps
// ---------------------------------------------------------------------------

section("extractAsyncRequireDeps");

test("extracts deps from async sap.ui.require([...], cb)", () => {
	const source = `
function init() {
    sap.ui.require(["com/example/app/Heavy", "com/example/app/Light", "sap/base/Log"], function(Heavy, Light, Log) {
        Heavy.start();
    });
}`;
	const deps = extractAsyncRequireDeps(source, "com/example/app");
	assert(deps.includes("com/example/app/Heavy"));
	assert(deps.includes("com/example/app/Light"));
	assert(!deps.includes("sap/base/Log"));
});

test("returns empty for no async requires", () => {
	const source = `var x = sap.ui.require("com/example/app/X");`;
	const deps = extractAsyncRequireDeps(source, "com/example/app");
	assert.strictEqual(deps.length, 0);
});

test("handles multiple async requires in one file", () => {
	const source = `
function a() {
    sap.ui.require(["com/example/app/A"], function(A) {});
}
function b() {
    sap.ui.require(["com/example/app/B", "com/example/app/C"], function(B, C) {});
}`;
	const deps = extractAsyncRequireDeps(source, "com/example/app");
	assert(deps.includes("com/example/app/A"));
	assert(deps.includes("com/example/app/B"));
	assert(deps.includes("com/example/app/C"));
});

// ---------------------------------------------------------------------------
// reachableFrom
// ---------------------------------------------------------------------------

section("reachableFrom");

test("finds transitive dependencies", () => {
	const graph = {
		"A": ["B", "C"],
		"B": ["D"],
		"C": [],
		"D": ["E"],
		"E": []
	};
	const reached = reachableFrom(graph, "A");
	assert(reached.has("A"));
	assert(reached.has("B"));
	assert(reached.has("C"));
	assert(reached.has("D"));
	assert(reached.has("E"));
});

test("does not reach disconnected nodes", () => {
	const graph = {
		"A": ["B"],
		"B": [],
		"C": ["D"],
		"D": []
	};
	const reached = reachableFrom(graph, "A");
	assert(reached.has("A"));
	assert(reached.has("B"));
	assert(!reached.has("C"));
	assert(!reached.has("D"));
});

test("handles cycles without infinite loop", () => {
	const graph = {
		"A": ["B"],
		"B": ["C"],
		"C": ["A"]
	};
	const reached = reachableFrom(graph, "A");
	assert(reached.has("A"));
	assert(reached.has("B"));
	assert(reached.has("C"));
});

test("handles missing nodes gracefully", () => {
	const graph = {
		"A": ["B", "MISSING"],
		"B": []
	};
	const reached = reachableFrom(graph, "A");
	assert(reached.has("B"));
	assert(reached.has("MISSING")); // Visited even if no outgoing edges defined
});

// ---------------------------------------------------------------------------
// Integration test with fixture
// ---------------------------------------------------------------------------

section("static-coverage integration");

function createFixture() {
	const fixtureDir = fs.mkdtempSync(path.join(os.tmpdir(), "unsafe-lazy-test-"));
	const webappDir = path.join(fixtureDir, "webapp");
	const controllerDir = path.join(webappDir, "controller");
	const utilsDir = path.join(webappDir, "utils");
	fs.mkdirSync(controllerDir, { recursive: true });
	fs.mkdirSync(utilsDir, { recursive: true });

	// manifest.json with 2 routes → 2 controllers
	fs.writeFileSync(path.join(webappDir, "manifest.json"), JSON.stringify({
		"sap.app": { id: "com.example.app" },
		"sap.ui5": {
			routing: {
				targets: {
					main: { viewName: "Main" },
					detail: { viewName: "Detail" }
				}
			}
		}
	}));

	// Component.js — imports ActionHandler
	fs.writeFileSync(path.join(webappDir, "Component.js"), `
sap.ui.define([
    "com/example/app/utils/ActionHandler"
], function(ActionHandler) {
    return {};
});`);

	// Main.controller.js — imports ActionHandler AND DialogHelper
	fs.writeFileSync(path.join(controllerDir, "Main.controller.js"), `
sap.ui.define([
    "com/example/app/utils/ActionHandler",
    "com/example/app/utils/DialogHelper"
], function(ActionHandler, DialogHelper) {
    return {};
});`);

	// Detail.controller.js — imports ActionHandler but NOT DialogHelper
	fs.writeFileSync(path.join(controllerDir, "Detail.controller.js"), `
sap.ui.define([
    "com/example/app/utils/ActionHandler"
], function(ActionHandler) {
    return {};
});`);

	// ActionHandler.js — has lazy require to DialogHelper
	fs.writeFileSync(path.join(utilsDir, "ActionHandler.js"), `
sap.ui.define([
    "sap/base/Log"
], function(Log) {
    return {
        deleteEntity: function() {
            var DialogHelper = sap.ui.require("com/example/app/utils/DialogHelper");
            DialogHelper.delete();
        },
        editEntity: function() {
            var DialogHelper = sap.ui.require("com/example/app/utils/DialogHelper");
            DialogHelper.edit();
        }
    };
});`);

	// DialogHelper.js — standalone module
	fs.writeFileSync(path.join(utilsDir, "DialogHelper.js"), `
sap.ui.define([
    "sap/base/Log"
], function(Log) {
    return { delete: function() {}, edit: function() {} };
});`);

	return fixtureDir;
}

test("detects unsafe lazy require — target not reachable from Detail.controller", () => {
	const fixtureDir = createFixture();
	try {
		const { graph } = buildGraph(fixtureDir, { includeTests: false });
		const entryPoints = discoverEntryPoints(path.join(fixtureDir, "webapp"), "com/example/app");

		assert(entryPoints.includes("com/example/app/Component"));
		assert(entryPoints.includes("com/example/app/controller/Main.controller"));
		assert(entryPoints.includes("com/example/app/controller/Detail.controller"));

		// Main.controller statically imports DialogHelper → reachable
		const mainReach = reachableFrom(graph, "com/example/app/controller/Main.controller");
		assert(mainReach.has("com/example/app/utils/DialogHelper"));

		// Detail.controller does NOT import DialogHelper → not reachable
		const detailReach = reachableFrom(graph, "com/example/app/controller/Detail.controller");
		assert(!detailReach.has("com/example/app/utils/DialogHelper"));

		// Both reach ActionHandler (the file with lazy requires)
		assert(mainReach.has("com/example/app/utils/ActionHandler"));
		assert(detailReach.has("com/example/app/utils/ActionHandler"));
	} finally {
		fs.rmSync(fixtureDir, { recursive: true, force: true });
	}
});

test("no issue when all entry points cover the lazy target", () => {
	const fixtureDir = createFixture();
	try {
		// Patch Detail.controller to also import DialogHelper
		fs.writeFileSync(path.join(fixtureDir, "webapp/controller/Detail.controller.js"), `
sap.ui.define([
    "com/example/app/utils/ActionHandler",
    "com/example/app/utils/DialogHelper"
], function(ActionHandler, DialogHelper) {
    return {};
});`);
		// Patch Component to also import DialogHelper
		fs.writeFileSync(path.join(fixtureDir, "webapp/Component.js"), `
sap.ui.define([
    "com/example/app/utils/ActionHandler",
    "com/example/app/utils/DialogHelper"
], function(ActionHandler, DialogHelper) {
    return {};
});`);

		const { graph } = buildGraph(fixtureDir, { includeTests: false });
		const entryPoints = discoverEntryPoints(path.join(fixtureDir, "webapp"), "com/example/app");

		// Now ALL entry points that reach ActionHandler also reach DialogHelper
		for (const ep of entryPoints) {
			const reach = reachableFrom(graph, ep);
			if (reach.has("com/example/app/utils/ActionHandler")) {
				assert(reach.has("com/example/app/utils/DialogHelper"),
					`${ep} reaches ActionHandler but not DialogHelper`);
			}
		}
	} finally {
		fs.rmSync(fixtureDir, { recursive: true, force: true });
	}
});

// ---------------------------------------------------------------------------
// discoverEntryPoints
// ---------------------------------------------------------------------------

section("discoverEntryPoints");

test("discovers Component + route controllers", () => {
	const fixtureDir = fs.mkdtempSync(path.join(os.tmpdir(), "ep-test-"));
	const webappDir = path.join(fixtureDir, "webapp");
	const controllerDir = path.join(webappDir, "controller");
	fs.mkdirSync(controllerDir, { recursive: true });

	fs.writeFileSync(path.join(webappDir, "manifest.json"), JSON.stringify({
		"sap.app": { id: "com.example.app" },
		"sap.ui5": {
			routing: {
				targets: {
					home: { viewName: "Home" },
					settings: { viewName: "Settings" }
				}
			}
		}
	}));
	fs.writeFileSync(path.join(controllerDir, "Home.controller.js"), `sap.ui.define([], function() {});`);
	fs.writeFileSync(path.join(controllerDir, "Settings.controller.js"), `sap.ui.define([], function() {});`);

	try {
		const eps = discoverEntryPoints(webappDir, "com/example/app");
		assert(eps.includes("com/example/app/Component"));
		assert(eps.includes("com/example/app/controller/Home.controller"));
		assert(eps.includes("com/example/app/controller/Settings.controller"));
	} finally {
		fs.rmSync(fixtureDir, { recursive: true, force: true });
	}
});

test("skips targets whose controller file doesn't exist", () => {
	const fixtureDir = fs.mkdtempSync(path.join(os.tmpdir(), "ep-test-"));
	const webappDir = path.join(fixtureDir, "webapp");
	const controllerDir = path.join(webappDir, "controller");
	fs.mkdirSync(controllerDir, { recursive: true });

	fs.writeFileSync(path.join(webappDir, "manifest.json"), JSON.stringify({
		"sap.app": { id: "com.example.app" },
		"sap.ui5": {
			routing: {
				targets: {
					phantom: { viewName: "Phantom" }
				}
			}
		}
	}));

	try {
		const eps = discoverEntryPoints(webappDir, "com/example/app");
		assert(eps.includes("com/example/app/Component"));
		assert(!eps.includes("com/example/app/controller/Phantom.controller"));
	} finally {
		fs.rmSync(fixtureDir, { recursive: true, force: true });
	}
});

// ---------------------------------------------------------------------------
// Summary
// ---------------------------------------------------------------------------

console.log(`\n${"─".repeat(60)}`);
console.log(`Results: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
