#!/usr/bin/env node
/**
 * detect-blind-spots.js
 *
 * Scans all JS files in a UI5 project for app-namespace global access patterns
 * that the UI5 linter does NOT report (it only checks sap.* globals).
 *
 * Uses a character-level scanner to distinguish namespace occurrences in bare code
 * (findings) from those inside string literals or comments (skipped).
 *
 * Also detects QUnit assertion issues (missing assert param, QUnit.ok/equal globals).
 *
 * Usage: node detect-blind-spots.js <project-root> [--webapp-dir <dir>]
 *
 * Output (JSON to stdout):
 *   namespace, findings, skipped, summary, warnings, errors
 *
 * Info/progress is logged to stderr so stdout stays clean JSON.
 */

const fs = require("fs");
const path = require("path");

// ---------------------------------------------------------------------------
// Character-level scanner — finds namespace occurrences and their context
// ---------------------------------------------------------------------------

const IN_CODE = 0;
const IN_STRING_SINGLE = 1;
const IN_STRING_DOUBLE = 2;
const IN_TEMPLATE = 3;
const IN_LINE_COMMENT = 4;
const IN_BLOCK_COMMENT = 5;

/**
 * Scans source for all occurrences of the app namespace and classifies each as
 * either "code" (bare code context) or "string"/"comment" (inside quotes/comments).
 *
 * Returns array of { line, column, context: "code"|"string"|"comment", lineText }
 */
function scanNamespaceOccurrences(source, nsDots) {
	const occurrences = [];
	const len = source.length;
	let state = IN_CODE;
	let lineNum = 1;
	let lineStart = 0;

	// Precompute line start positions for fast line text extraction
	const lineStarts = [0];
	for (let k = 0; k < len; k++) {
		if (source[k] === "\n") lineStarts.push(k + 1);
	}

	function getLineText(ln) {
		const start = lineStarts[ln - 1] || 0;
		const end = lineStarts[ln] !== undefined ? lineStarts[ln] - 1 : len;
		return source.slice(start, end);
	}

	let i = 0;
	while (i < len) {
		const ch = source[i];

		if (ch === "\n") {
			lineNum++;
			lineStart = i + 1;
		}

		switch (state) {
			case IN_CODE:
				if (ch === "'" ) { state = IN_STRING_SINGLE; i++; continue; }
				if (ch === '"' ) { state = IN_STRING_DOUBLE; i++; continue; }
				if (ch === "`" ) { state = IN_TEMPLATE; i++; continue; }
				if (ch === "/" && i + 1 < len && source[i + 1] === "/") { state = IN_LINE_COMMENT; i += 2; continue; }
				if (ch === "/" && i + 1 < len && source[i + 1] === "*") { state = IN_BLOCK_COMMENT; i += 2; continue; }

				// Check if namespace starts here
				if (source.startsWith(nsDots, i)) {
					// Verify it's not a partial match (preceded by a word char)
					if (i > 0 && /\w/.test(source[i - 1])) { i++; continue; }
					// Verify it's followed by a dot (namespace access) not just end of token
					const afterNs = i + nsDots.length;
					if (afterNs < len && source[afterNs] === ".") {
						occurrences.push({
							line: lineNum,
							column: i - lineStart + 1,
							context: "code",
							offset: i,
							lineText: getLineText(lineNum)
						});
					}
				}
				i++;
				break;

			case IN_STRING_SINGLE:
				if (ch === "\\") { i += 2; continue; }
				if (ch === "'") {
					state = IN_CODE;
				} else if (source.startsWith(nsDots, i)) {
					const afterNs = i + nsDots.length;
					if (afterNs < len && source[afterNs] === ".") {
						occurrences.push({
							line: lineNum,
							column: i - lineStart + 1,
							context: "string",
							offset: i,
							lineText: getLineText(lineNum)
						});
					}
				}
				i++;
				break;

			case IN_STRING_DOUBLE:
				if (ch === "\\") { i += 2; continue; }
				if (ch === '"') {
					state = IN_CODE;
				} else if (source.startsWith(nsDots, i)) {
					const afterNs = i + nsDots.length;
					if (afterNs < len && source[afterNs] === ".") {
						occurrences.push({
							line: lineNum,
							column: i - lineStart + 1,
							context: "string",
							offset: i,
							lineText: getLineText(lineNum)
						});
					}
				}
				i++;
				break;

			case IN_TEMPLATE:
				if (ch === "\\") { i += 2; continue; }
				if (ch === "`") {
					state = IN_CODE;
				} else if (source.startsWith(nsDots, i)) {
					const afterNs = i + nsDots.length;
					if (afterNs < len && source[afterNs] === ".") {
						occurrences.push({
							line: lineNum,
							column: i - lineStart + 1,
							context: "string",
							offset: i,
							lineText: getLineText(lineNum)
						});
					}
				}
				i++;
				break;

			case IN_LINE_COMMENT:
				if (ch === "\n") { state = IN_CODE; }
				i++;
				break;

			case IN_BLOCK_COMMENT:
				if (ch === "*" && i + 1 < len && source[i + 1] === "/") {
					state = IN_CODE;
					i += 2;
					continue;
				}
				i++;
				break;
		}
	}

	return occurrences;
}

// ---------------------------------------------------------------------------
// Classify code-context namespace occurrences by syntactic pattern
// ---------------------------------------------------------------------------

/**
 * Given a namespace occurrence in code context, classify it as one of:
 * - global_assignment: <NS>.Module = { or = function
 * - global_return: return <NS>.Module
 * - global_read: var x = <NS>.Module or standalone read
 * - global_method_call: <NS>.Module.method(
 * - global_mock: jQuery.extend(true, {}, <NS> or <NS>.X = function in test
 */
function classifyCodeOccurrence(occ, source, filePath, nsDots) {
	const line = occ.lineText;
	const lineTrimmed = line.trim();
	const offset = occ.offset;
	const nsLen = nsDots.length;

	// Extract the full namespace path after the app namespace prefix
	// e.g., "com.myapp.utils.Helper.doSomething" → capture "utils.Helper" or "utils.Helper.doSomething"
	let endIdx = offset + nsLen + 1; // skip the dot after namespace
	while (endIdx < source.length && /[\w.]/.test(source[endIdx])) endIdx++;
	const fullPath = source.slice(offset, endIdx);
	const segments = fullPath.slice(nsLen + 1).split(".");
	// moduleName = first segment after the sub-path that's likely a module name (capitalized)
	// For com.myapp.utils.Helper → segments = ["utils", "Helper"]
	// For com.myapp.utils.Helper.doSomething → segments = ["utils", "Helper", "doSomething"]
	const moduleName = segments.find(s => /^[A-Z]/.test(s)) || segments[segments.length - 1];

	// Check what comes after the full matched path
	let afterIdx = endIdx;
	while (afterIdx < source.length && /\s/.test(source[afterIdx])) afterIdx++;
	const charAfter = source[afterIdx] || "";

	// Check what comes before the namespace on this line
	const beforeOnLine = line.slice(0, occ.column - 1).trim();

	const isTestFile = filePath.includes("/test/");

	// Pattern: return <NS>.Something
	if (/^return\s*$/.test(beforeOnLine) || beforeOnLine === "return") {
		return {
			type: "global_return",
			file: filePath,
			line: occ.line,
			column: occ.column,
			code: lineTrimmed,
			moduleName,
			namespacePath: fullPath
		};
	}

	// Pattern: <NS>.Something = { or = function (but NOT == or ===)
	if (charAfter === "=" && source[afterIdx + 1] !== "=") {
		// Check what's on the right side of =
		let rhsStart = afterIdx + 1;
		while (rhsStart < source.length && /\s/.test(source[rhsStart])) rhsStart++;
		const rhsChar = source[rhsStart] || "";

		if (isTestFile && (rhsChar === "f" || source.slice(rhsStart, rhsStart + 8) === "function")) {
			return {
				type: "global_mock",
				file: filePath,
				line: occ.line,
				column: occ.column,
				code: lineTrimmed,
				moduleName,
				namespacePath: fullPath
			};
		}

		return {
			type: "global_assignment",
			file: filePath,
			line: occ.line,
			column: occ.column,
			code: lineTrimmed,
			moduleName,
			namespacePath: fullPath
		};
	}

	// Pattern: var/let/const X = <NS>.Something
	if (/^(?:var|let|const)\s+\w+\s*=\s*$/.test(beforeOnLine)) {
		return {
			type: "global_read",
			file: filePath,
			line: occ.line,
			column: occ.column,
			code: lineTrimmed,
			moduleName,
			namespacePath: fullPath
		};
	}

	// Pattern: jQuery.extend(true, {}, <NS>  (backup for mocking)
	if (lineTrimmed.includes("jQuery.extend") && lineTrimmed.includes(nsDots)) {
		return {
			type: "global_mock",
			file: filePath,
			line: occ.line,
			column: occ.column,
			code: lineTrimmed,
			moduleName,
			namespacePath: fullPath
		};
	}

	// Pattern: <NS>.Something.method( — method call
	if (charAfter === "(") {
		return {
			type: "global_method_call",
			file: filePath,
			line: occ.line,
			column: occ.column,
			code: lineTrimmed,
			moduleName,
			namespacePath: fullPath
		};
	}

	// Default: classify as global_read (property access, argument, etc.)
	return {
		type: "global_read",
		file: filePath,
		line: occ.line,
		column: occ.column,
		code: lineTrimmed,
		moduleName,
		namespacePath: fullPath
	};
}

// ---------------------------------------------------------------------------
// QUnit assertion pattern detection
// ---------------------------------------------------------------------------

const QUNIT_ASSERTIONS = [
	"ok", "equal", "notEqual", "deepEqual", "notDeepEqual",
	"strictEqual", "notStrictEqual", "propEqual", "notPropEqual",
	"throws", "expect", "push"
];

const QUNIT_ASSERTION_RE = new RegExp(
	"QUnit\\.(" + QUNIT_ASSERTIONS.join("|") + ")\\s*\\(", "g"
);

const BARE_ASSERTION_RE = new RegExp(
	"(?:^|[^.\\w])(" + QUNIT_ASSERTIONS.join("|") + ")\\s*\\(", "g"
);

function detectQUnitIssues(source, filePath, lines) {
	const findings = [];
	const isTestFile = filePath.includes("/test/");
	if (!isTestFile) return findings;

	const isOpaFile = filePath.includes("/opa/") || filePath.includes("/integration/");

	// Pattern 5: Missing assert parameter in QUnit.test callbacks
	const testCallRe = /QUnit\.test\s*\(\s*(?:"[^"]*"|'[^']*')\s*,\s*function\s*\(\s*\)/g;
	let match;
	while ((match = testCallRe.exec(source)) !== null) {
		// Check if function body uses assert.
		const bodyStart = match.index + match[0].length;
		const bodySlice = source.slice(bodyStart, bodyStart + 5000);
		if (/\bassert\./.test(bodySlice)) {
			const line = source.slice(0, match.index).split("\n").length;
			findings.push({
				type: "missing_assert_param",
				file: filePath,
				line,
				code: lines[line - 1] ? lines[line - 1].trim() : match[0]
			});
		}
	}

	// Pattern 6a: QUnit.ok(), QUnit.equal(), etc.
	QUNIT_ASSERTION_RE.lastIndex = 0;
	while ((match = QUNIT_ASSERTION_RE.exec(source)) !== null) {
		const line = source.slice(0, match.index).split("\n").length;
		const assertName = match[1];
		findings.push({
			type: "qunit_global_assertion",
			file: filePath,
			line,
			code: lines[line - 1] ? lines[line - 1].trim() : match[0],
			assertionName: assertName,
			replacement: isOpaFile ? `Opa5.assert.${assertName}` : `assert.${assertName}`
		});
	}

	// Pattern 6b: Bare global assertions — ok(), equal(), etc.
	// Must not be preceded by assert. or Opa5.assert. or QUnit.
	BARE_ASSERTION_RE.lastIndex = 0;
	while ((match = BARE_ASSERTION_RE.exec(source)) !== null) {
		const assertName = match[1];
		const beforeMatch = source.slice(Math.max(0, match.index - 20), match.index);
		if (/assert\.\s*$/.test(beforeMatch)) continue;
		if (/Opa5\.assert\.\s*$/.test(beforeMatch)) continue;
		if (/QUnit\.\s*$/.test(beforeMatch)) continue;
		// Skip if it's a function definition: function ok(
		if (/function\s*$/.test(beforeMatch)) continue;
		// Skip if it's a property: { ok: or , ok:  (same line only)
		const beforeOnSameLine = beforeMatch.slice(beforeMatch.lastIndexOf("\n") + 1);
		if (/[{,]\s*$/.test(beforeOnSameLine)) continue;

		const line = source.slice(0, match.index).split("\n").length;
		findings.push({
			type: "bare_global_assertion",
			file: filePath,
			line,
			code: lines[line - 1] ? lines[line - 1].trim() : match[0],
			assertionName: assertName,
			replacement: isOpaFile ? `Opa5.assert.${assertName}` : `assert.${assertName}`
		});
	}

	return findings;
}

// ---------------------------------------------------------------------------
// Pattern 8: Legacy "jquery.sap.global" dependency detection
// ---------------------------------------------------------------------------

const JQUERY_SAP_GLOBAL_RE = /["']jquery\.sap\.global["']/g;

function detectLegacyJQueryDeps(source, filePath, lines) {
	const findings = [];
	JQUERY_SAP_GLOBAL_RE.lastIndex = 0;
	let match;
	while ((match = JQUERY_SAP_GLOBAL_RE.exec(source)) !== null) {
		const line = source.slice(0, match.index).split("\n").length;
		findings.push({
			type: "legacy_jquery_dep",
			file: filePath,
			line,
			code: lines[line - 1] ? lines[line - 1].trim() : match[0],
			replacement: '"sap/ui/thirdparty/jquery"'
		});
	}
	return findings;
}

// ---------------------------------------------------------------------------
// Exports for unit testing — when required as a module, export core functions
// ---------------------------------------------------------------------------

module.exports = { scanNamespaceOccurrences, classifyCodeOccurrence, detectQUnitIssues, detectLegacyJQueryDeps };

// ---------------------------------------------------------------------------
// CLI — only runs when executed directly
// ---------------------------------------------------------------------------

if (require.main === module) {
	const args = process.argv.slice(2);
	if (args.length === 0 || args[0] === "--help" || args[0] === "-h") {
		console.error("Usage: node detect-blind-spots.js <project-root> [--webapp-dir <dir>]");
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

	function findWebappDir() {
		if (webappDirOverride) return path.join(projectRoot, webappDirOverride);
		for (const candidate of ["webapp", "src", "."]) {
			const dir = path.join(projectRoot, candidate);
			if (fs.existsSync(path.join(dir, "manifest.json"))) return dir;
		}
		return null;
	}

	const webappDir = findWebappDir();
	if (!webappDir) {
		console.error("ERROR: Cannot find manifest.json in webapp/, src/, or project root.");
		process.exit(1);
	}

	const manifestPath = path.join(webappDir, "manifest.json");
	const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf-8"));
	const appId = manifest["sap.app"] && manifest["sap.app"].id;
	if (!appId) {
		console.error("ERROR: manifest.json missing sap.app.id");
		process.exit(1);
	}
	const namespace = appId.replace(/\./g, "/");
	const namespaceDots = appId;
	console.error(`Project namespace: ${namespaceDots} (${namespace})`);
	console.error(`Webapp dir: ${webappDir}`);

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

	const testDir = path.join(projectRoot, "test");
	const webappTestDir = path.join(webappDir, "test");
	const jsFiles = [
		...collectJsFiles(webappDir),
		...(testDir !== webappTestDir && fs.existsSync(testDir) ? collectJsFiles(testDir) : [])
	];
	console.error(`Found ${jsFiles.length} JS files`);

	const findings = [];
	const skipped = [];
	const warnings = [];
	const errors = [];
	let filesWithFindings = 0;

	for (const filePath of jsFiles) {
		let source;
		try {
			source = fs.readFileSync(filePath, "utf-8");
		} catch (err) {
			errors.push({ file: filePath, message: `Cannot read file: ${err.message}` });
			continue;
		}

		const relPath = path.relative(projectRoot, filePath);
		const lines = source.split("\n");
		let fileHasFindings = false;

		const occurrences = scanNamespaceOccurrences(source, namespaceDots);

		for (const occ of occurrences) {
			if (occ.context === "code") {
				const classified = classifyCodeOccurrence(occ, source, relPath, namespaceDots);
				findings.push(classified);
				fileHasFindings = true;
			} else {
				skipped.push({
					file: relPath,
					line: occ.line,
					reason: `namespace in ${occ.context}`,
					code: occ.lineText.trim()
				});
			}
		}

		const qunitFindings = detectQUnitIssues(source, relPath, lines);
		if (qunitFindings.length > 0) {
			findings.push(...qunitFindings);
			fileHasFindings = true;
		}

		const jqueryFindings = detectLegacyJQueryDeps(source, relPath, lines);
		if (jqueryFindings.length > 0) {
			findings.push(...jqueryFindings);
			fileHasFindings = true;
		}

		if (fileHasFindings) filesWithFindings++;
	}

	const summary = {
		globalAssignment: 0, globalRead: 0, globalReturn: 0,
		globalMock: 0, globalMethodCall: 0, missingAssertParam: 0,
		qunitGlobalAssertion: 0, bareGlobalAssertion: 0, legacyJqueryDep: 0, total: 0
	};

	for (const f of findings) {
		switch (f.type) {
			case "global_assignment": summary.globalAssignment++; break;
			case "global_read": summary.globalRead++; break;
			case "global_return": summary.globalReturn++; break;
			case "global_mock": summary.globalMock++; break;
			case "global_method_call": summary.globalMethodCall++; break;
			case "missing_assert_param": summary.missingAssertParam++; break;
			case "qunit_global_assertion": summary.qunitGlobalAssertion++; break;
			case "bare_global_assertion": summary.bareGlobalAssertion++; break;
			case "legacy_jquery_dep": summary.legacyJqueryDep++; break;
		}
		summary.total++;
	}

	console.error(`\nScan complete:`);
	console.error(`  Files analyzed: ${jsFiles.length}`);
	console.error(`  Files with findings: ${filesWithFindings}`);
	console.error(`  Total findings: ${summary.total}`);
	console.error(`  Skipped (in strings/comments): ${skipped.length}`);
	if (summary.globalAssignment) console.error(`  Global assignments: ${summary.globalAssignment}`);
	if (summary.globalRead) console.error(`  Global reads: ${summary.globalRead}`);
	if (summary.globalReturn) console.error(`  Global returns: ${summary.globalReturn}`);
	if (summary.globalMock) console.error(`  Global mocks: ${summary.globalMock}`);
	if (summary.globalMethodCall) console.error(`  Global method calls: ${summary.globalMethodCall}`);
	if (summary.missingAssertParam) console.error(`  Missing assert params: ${summary.missingAssertParam}`);
	if (summary.qunitGlobalAssertion) console.error(`  QUnit global assertions: ${summary.qunitGlobalAssertion}`);
	if (summary.bareGlobalAssertion) console.error(`  Bare global assertions: ${summary.bareGlobalAssertion}`);
	if (summary.legacyJqueryDep) console.error(`  Legacy jquery.sap.global deps: ${summary.legacyJqueryDep}`);

	const output = {
		namespace,
		namespaceDots,
		webappDir: path.relative(projectRoot, webappDir),
		filesAnalyzed: jsFiles.length,
		summary,
		findings,
		skipped,
		warnings,
		errors
	};

	console.log(JSON.stringify(output, null, 2));
}
