#!/usr/bin/env node
/**
 * Unit tests for verify-this-bind.js
 * Run: node verify-this-bind.test.js
 */

"use strict";

const assert = require("assert");
const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");

const {
	auditFn,
	extractBody,
	stripNoise,
	detectThis,
	resolveAliases,
	verifyXml,
} = require("./verify-this-bind");

const FIX = path.join(__dirname, "__fixtures__");
const SCRIPT = path.join(__dirname, "verify-this-bind.js");

let passed = 0;
let failed = 0;
const failures = [];

function test(name, fn) {
	try {
		fn();
		passed++;
	} catch (e) {
		failed++;
		failures.push({ name, message: e.message, stack: e.stack });
		console.error(`  FAIL: ${name}`);
		console.error(`        ${e.message}`);
	}
}

// ---------------------------------------------------------------------------
// extractBody
// ---------------------------------------------------------------------------

test("extractBody finds object-literal method body", () => {
	const src = fs.readFileSync(path.join(FIX, "no_this.js"), "utf8");
	const result = extractBody(src, "formatDate");
	assert.ok(result, "should return result");
	assert.ok(result.body.includes("toLocaleDateString"));
	assert.ok(result.body.startsWith("{"));
	assert.ok(result.body.endsWith("}"));
	assert.strictEqual(typeof result.startLine, "number");
});

test("extractBody returns null when fn not found", () => {
	const src = fs.readFileSync(path.join(FIX, "not_found.js"), "utf8");
	const result = extractBody(src, "missingFn");
	assert.strictEqual(result, null);
});

// ---------------------------------------------------------------------------
// stripNoise
// ---------------------------------------------------------------------------

test("stripNoise removes line comments", () => {
	const out = stripNoise("var x = 1; // this.foo\n");
	assert.ok(!out.includes("this.foo"));
});

test("stripNoise removes block comments", () => {
	const out = stripNoise("var x = 1; /* this.foo */ var y = 2;");
	assert.ok(!out.includes("this.foo"));
});

test("stripNoise removes double-quoted strings", () => {
	const out = stripNoise('var x = "this.foo";');
	assert.ok(!out.includes("this.foo"));
});

test("stripNoise removes single-quoted strings", () => {
	const out = stripNoise("var x = 'this.foo';");
	assert.ok(!out.includes("this.foo"));
});

test("stripNoise removes template literals", () => {
	const out = stripNoise("var x = `this.foo`;");
	assert.ok(!out.includes("this.foo"));
});

test("stripNoise removes nested function bodies but keeps arrow bodies", () => {
	const src = "{ var x = function () { return this.a; }; var y = () => this.b; }";
	const out = stripNoise(src);
	assert.ok(!out.includes("this.a"), "nested function this should be stripped, got: " + out);
	assert.ok(out.includes("this.b"), "arrow this should be kept, got: " + out);
});

// ---------------------------------------------------------------------------
// detectThis
// ---------------------------------------------------------------------------

test("detectThis finds member access this.foo", () => {
	const result = detectThis("{ return this.x; }");
	assert.ok(result, "should hit");
	assert.strictEqual(result.reason, "member-access");
});

test("detectThis finds dynamic property this[name]", () => {
	const result = detectThis("{ return this[k]; }");
	assert.ok(result);
	assert.strictEqual(result.reason, "dynamic-property");
});

test("detectThis finds bare this in fn args", () => {
	const result = detectThis("{ jQuery.proxy(fn, this); }");
	assert.ok(result);
	assert.strictEqual(result.reason, "bare-this");
});

test("detectThis returns null when no this", () => {
	const result = detectThis("{ return 1 + 2; }");
	assert.strictEqual(result, null);
});

// ---------------------------------------------------------------------------
// auditFn — fixture-driven verdicts
// ---------------------------------------------------------------------------

test("auditFn returns NO_THIS for pure-value formatter", () => {
	const result = auditFn({ file: path.join(FIX, "no_this.js"), fn: "formatDate" });
	assert.strictEqual(result.verdict, "NO_THIS");
});

test("auditFn returns NOT_FOUND when fn missing", () => {
	const result = auditFn({ file: path.join(FIX, "not_found.js"), fn: "missingFn" });
	assert.strictEqual(result.verdict, "NOT_FOUND");
});

test("auditFn returns USES_THIS for member access fixture", () => {
	const result = auditFn({ file: path.join(FIX, "uses_this_member.js"), fn: "formatTagsText" });
	assert.strictEqual(result.verdict, "USES_THIS");
	assert.strictEqual(result.reason, "member-access");
});

test("auditFn returns USES_THIS for bare-this (jQuery.proxy)", () => {
	const result = auditFn({ file: path.join(FIX, "uses_this_bare.js"), fn: "isKPIsTileCountEnabled" });
	assert.strictEqual(result.verdict, "USES_THIS");
	assert.strictEqual(result.reason, "bare-this");
});

test("auditFn returns USES_THIS for arrow-fn this (inherited)", () => {
	const result = auditFn({ file: path.join(FIX, "uses_this_arrow.js"), fn: "formatViaArrow" });
	assert.strictEqual(result.verdict, "USES_THIS");
});

test("auditFn returns USES_THIS for this in nested if branch", () => {
	const result = auditFn({ file: path.join(FIX, "uses_this_nested_in_if.js"), fn: "getKPIsTileCount" });
	assert.strictEqual(result.verdict, "USES_THIS");
});

test("auditFn returns NO_THIS when this is only inside nested function", () => {
	const result = auditFn({ file: path.join(FIX, "nested_function_shadow.js"), fn: "formatDate" });
	assert.strictEqual(result.verdict, "NO_THIS");
});

test("auditFn returns NO_THIS when this is in comments only", () => {
	const result = auditFn({ file: path.join(FIX, "this_in_comment.js"), fn: "formatDate" });
	assert.strictEqual(result.verdict, "NO_THIS");
});

test("auditFn returns NO_THIS when this is in strings only", () => {
	const result = auditFn({ file: path.join(FIX, "this_in_string.js"), fn: "formatDate" });
	assert.strictEqual(result.verdict, "NO_THIS");
});

test("auditFn detects var self = this alias", () => {
	const result = auditFn({ file: path.join(FIX, "uses_this_alias.js"), fn: "formatViaAlias" });
	assert.strictEqual(result.verdict, "USES_THIS");
	assert.ok(result.reason.startsWith("alias"), "reason should mention alias, got: " + result.reason);
});

// ---------------------------------------------------------------------------
// CLI — audit-fn
// ---------------------------------------------------------------------------

test("CLI audit-fn human format outputs USES_THIS line", () => {
	const r = spawnSync("node", [
		SCRIPT, "audit-fn",
		"--file", path.join(FIX, "uses_this_member.js"),
		"--fn", "formatTagsText",
	], { encoding: "utf8" });
	assert.strictEqual(r.status, 0, "stderr: " + r.stderr);
	assert.ok(r.stdout.includes("USES_THIS"), "stdout: " + r.stdout);
	assert.ok(r.stdout.includes("formatTagsText"));
});

test("CLI audit-fn supports multiple --fn flags", () => {
	const r = spawnSync("node", [
		SCRIPT, "audit-fn",
		"--file", path.join(FIX, "uses_this_member.js"),
		"--fn", "formatTagsText",
		"--fn", "missing",
	], { encoding: "utf8" });
	const lines = r.stdout.trim().split("\n");
	assert.strictEqual(lines.length, 2);
	assert.ok(lines[0].includes("USES_THIS"));
	assert.ok(lines[1].includes("NOT_FOUND"));
});

test("CLI audit-fn --json outputs JSON array", () => {
	const r = spawnSync("node", [
		SCRIPT, "audit-fn",
		"--file", path.join(FIX, "no_this.js"),
		"--fn", "formatDate",
		"--json",
	], { encoding: "utf8" });
	const parsed = JSON.parse(r.stdout);
	assert.ok(Array.isArray(parsed));
	assert.strictEqual(parsed[0].verdict, "NO_THIS");
});

test("CLI audit-fn exits 0 even on NOT_FOUND", () => {
	const r = spawnSync("node", [
		SCRIPT, "audit-fn",
		"--file", path.join(FIX, "not_found.js"),
		"--fn", "missing",
	], { encoding: "utf8" });
	assert.strictEqual(r.status, 0);
});

// ---------------------------------------------------------------------------
// resolveAliases
// ---------------------------------------------------------------------------

test("resolveAliases extracts core:require map from XML", () => {
	const xml = fs.readFileSync(path.join(FIX, "xml", "needs_bind.fragment.xml"), "utf8");
	const map = resolveAliases(xml);
	assert.strictEqual(map.get("TableMgr"), "uses_this_member");
});

test("CLI audit-fn --namespace --xml-context resolves alias", () => {
	const r = spawnSync("node", [
		SCRIPT, "audit-fn",
		"--namespace", "TableMgr",
		"--fn", "formatTagsText",
		"--xml-context", path.join(FIX, "xml", "needs_bind.fragment.xml"),
		"--js-roots", FIX,
	], { encoding: "utf8" });
	assert.strictEqual(r.status, 0, "stderr: " + r.stderr);
	assert.ok(r.stdout.includes("USES_THIS"), r.stdout);
});

test("CLI audit-fn --alias takes precedence", () => {
	const r = spawnSync("node", [
		SCRIPT, "audit-fn",
		"--namespace", "X",
		"--fn", "formatDate",
		"--alias", `X=${path.join(FIX, "no_this.js")}`,
	], { encoding: "utf8" });
	assert.strictEqual(r.status, 0);
	assert.ok(r.stdout.includes("NO_THIS"));
});

// ---------------------------------------------------------------------------
// verifyXml
// ---------------------------------------------------------------------------

test("verifyXml flags MISSING_BIND for needs_bind.fragment.xml", () => {
	const result = verifyXml({
		xmlRoot: path.join(FIX, "xml"),
		jsRoots: [FIX],
	});
	const found = result.violations.find(v =>
		v.file.endsWith("needs_bind.fragment.xml") &&
		v.alias === "TableMgr" &&
		v.fn === "formatTagsText",
	);
	assert.ok(found, "should flag needs_bind.fragment.xml; got: " + JSON.stringify(result.violations));
});

test("verifyXml does NOT flag has_bind.fragment.xml", () => {
	const result = verifyXml({
		xmlRoot: path.join(FIX, "xml"),
		jsRoots: [FIX],
	});
	const wrong = result.violations.find(v => v.file.endsWith("has_bind.fragment.xml"));
	assert.strictEqual(wrong, undefined);
});

test("verifyXml does NOT flag no_this_no_bind.fragment.xml", () => {
	const result = verifyXml({
		xmlRoot: path.join(FIX, "xml"),
		jsRoots: [FIX],
	});
	const wrong = result.violations.find(v => v.file.endsWith("no_this_no_bind.fragment.xml"));
	assert.strictEqual(wrong, undefined);
});

test("verifyXml flags multi-line core:require / parts-array formatter", () => {
	const result = verifyXml({
		xmlRoot: path.join(FIX, "xml"),
		jsRoots: [FIX],
	});
	const found = result.violations.find(v =>
		v.file.endsWith("multi_line.fragment.xml") &&
		v.fn === "formatTagsText",
	);
	assert.ok(found, "should flag multi_line.fragment.xml; got: " + JSON.stringify(result.violations));
});

test("CLI verify-xml exits 1 when violations exist", () => {
	const r = spawnSync("node", [
		SCRIPT, "verify-xml",
		"--xml-root", path.join(FIX, "xml"),
		"--js-roots", FIX,
	], { encoding: "utf8" });
	assert.strictEqual(r.status, 1);
	assert.ok(r.stdout.includes("MISSING_BIND"));
});

test("CLI verify-xml exits 0 on a clean directory", () => {
	const tmp = path.join(__dirname, "__fixtures__", "xml-clean");
	if (!fs.existsSync(tmp)) fs.mkdirSync(tmp);
	fs.copyFileSync(
		path.join(FIX, "xml", "has_bind.fragment.xml"),
		path.join(tmp, "has_bind.fragment.xml"),
	);
	try {
		const r = spawnSync("node", [
			SCRIPT, "verify-xml",
			"--xml-root", tmp,
			"--js-roots", FIX,
		], { encoding: "utf8" });
		assert.strictEqual(r.status, 0, "stderr: " + r.stderr + " stdout: " + r.stdout);
	} finally {
		fs.rmSync(tmp, { recursive: true });
	}
});

// ---------------------------------------------------------------------------
// Final report
// ---------------------------------------------------------------------------

console.log(`${passed} passed, ${failed} failed`);
if (failed > 0) {
	process.exit(1);
}
