#!/usr/bin/env node
/**
 * verify-this-bind.js
 *
 * Decides whether a JS function uses `this` (so its XML formatter ref needs
 * `.bind($control)`).
 *
 * Subcommands:
 *   audit-fn    Query: does (file, fn) use `this`? Exit 0 always.
 *   verify-xml  Gate: scan XML formatter refs, flag MISSING_BIND.
 *               Exit 0 clean / 1 violations.
 *
 * Stdout: human format (default) or --json. Stderr: progress / errors.
 *
 * See README.md for usage and detection rules.
 */

"use strict";

const fs = require("fs");
const path = require("path");

// ---------------------------------------------------------------------------
// Body extraction
// ---------------------------------------------------------------------------

/**
 * Locate function `fnName` in `source` and return its body (including braces)
 * plus 1-based start line.
 *
 * Patterns matched (first hit wins):
 *   <fn>: function (...) { ... }                 // object-literal method
 *   <fn> = function (...) { ... }                // assignment
 *   <fn> (...) { ... }                           // shorthand method
 *   <Anything>.prototype.<fn> = function (...)   // prototype
 *   <Anything>.<fn> = function (...)             // static
 *
 * Returns {body, startLine} or null.
 */
function extractBody(source, fnName) {
	const escaped = fnName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
	const patterns = [
		new RegExp(`(?:^|[\\s,{;])${escaped}\\s*[:=]\\s*(?:async\\s+)?function\\s*\\*?\\s*\\([^)]*\\)\\s*\\{`, "m"),
		new RegExp(`\\.prototype\\.${escaped}\\s*=\\s*(?:async\\s+)?function\\s*\\*?\\s*\\([^)]*\\)\\s*\\{`),
		new RegExp(`\\w+\\.${escaped}\\s*=\\s*(?:async\\s+)?function\\s*\\*?\\s*\\([^)]*\\)\\s*\\{`),
		new RegExp(`(?:^|[\\s,{;])${escaped}\\s*\\([^)]*\\)\\s*\\{`, "m"),
	];

	let match = null;
	for (const re of patterns) {
		const m = re.exec(source);
		if (m) {
			match = m;
			break;
		}
	}
	if (!match) return null;

	const openIdx = source.indexOf("{", match.index);
	if (openIdx === -1) return null;

	const close = findMatchingBrace(source, openIdx);
	if (close === -1) return null;

	const body = source.slice(openIdx, close + 1);
	const startLine = source.slice(0, openIdx).split("\n").length;
	return { body, startLine };
}

/**
 * Given source and an opening-brace index, return matching closing-brace index
 * (or -1). String- and comment-aware so braces inside literals don't unbalance.
 */
function findMatchingBrace(source, openIdx) {
	const len = source.length;
	let depth = 0;
	let i = openIdx;
	let state = 0; // 0 code, 1 ', 2 ", 3 `, 4 //, 5 /* */
	while (i < len) {
		const ch = source[i];
		const nx = source[i + 1];
		if (state === 0) {
			if (ch === "/" && nx === "/") { state = 4; i += 2; continue; }
			if (ch === "/" && nx === "*") { state = 5; i += 2; continue; }
			if (ch === '"') { state = 2; i++; continue; }
			if (ch === "'") { state = 1; i++; continue; }
			if (ch === "`") { state = 3; i++; continue; }
			if (ch === "{") depth++;
			else if (ch === "}") {
				depth--;
				if (depth === 0) return i;
			}
		} else if (state === 1) {
			if (ch === "\\") { i += 2; continue; }
			if (ch === "'") state = 0;
			else if (ch === "\n") state = 0;
		} else if (state === 2) {
			if (ch === "\\") { i += 2; continue; }
			if (ch === '"') state = 0;
			else if (ch === "\n") state = 0;
		} else if (state === 3) {
			if (ch === "\\") { i += 2; continue; }
			if (ch === "`") state = 0;
		} else if (state === 4) {
			if (ch === "\n") state = 0;
		} else if (state === 5) {
			if (ch === "*" && nx === "/") { state = 0; i += 2; continue; }
		}
		i++;
	}
	return -1;
}

// ---------------------------------------------------------------------------
// Noise stripping
// ---------------------------------------------------------------------------

/**
 * Replace comments, string literals, and nested non-arrow function bodies with
 * spaces (preserves line numbers). Arrow function bodies are kept — `this`
 * inside them is inherited from the caller.
 */
function stripNoise(source) {
	let s = stripCommentsAndStrings(source);
	s = stripNestedFunctionBodies(s);
	return s;
}

function stripCommentsAndStrings(source) {
	const len = source.length;
	const out = [];
	let i = 0;
	let state = 0; // 0 code, 1 ', 2 ", 3 `, 4 //, 5 /* */
	while (i < len) {
		const ch = source[i];
		const nx = source[i + 1];
		if (state === 0) {
			if (ch === "/" && nx === "/") { state = 4; out.push("  "); i += 2; continue; }
			if (ch === "/" && nx === "*") { state = 5; out.push("  "); i += 2; continue; }
			if (ch === '"') { state = 2; out.push(" "); i++; continue; }
			if (ch === "'") { state = 1; out.push(" "); i++; continue; }
			if (ch === "`") { state = 3; out.push(" "); i++; continue; }
			out.push(ch);
			i++;
		} else if (state === 1) {
			if (ch === "\\") { out.push("  "); i += 2; continue; }
			if (ch === "'") { state = 0; out.push(" "); i++; continue; }
			if (ch === "\n") { state = 0; out.push("\n"); i++; continue; }
			out.push(" "); i++;
		} else if (state === 2) {
			if (ch === "\\") { out.push("  "); i += 2; continue; }
			if (ch === '"') { state = 0; out.push(" "); i++; continue; }
			if (ch === "\n") { state = 0; out.push("\n"); i++; continue; }
			out.push(" "); i++;
		} else if (state === 3) {
			if (ch === "\\") { out.push("  "); i += 2; continue; }
			if (ch === "`") { state = 0; out.push(" "); i++; continue; }
			out.push(ch === "\n" ? "\n" : " "); i++;
		} else if (state === 4) {
			if (ch === "\n") { state = 0; out.push("\n"); i++; continue; }
			out.push(" "); i++;
		} else if (state === 5) {
			if (ch === "*" && nx === "/") { state = 0; out.push("  "); i += 2; continue; }
			out.push(ch === "\n" ? "\n" : " "); i++;
		}
	}
	return out.join("");
}

/**
 * Replace bodies of nested `function (...) { ... }` declarations with spaces,
 * preserving newlines. Outermost body (the one at depth 0 entering) is
 * preserved. Arrow function bodies are not touched (arrows inherit `this`).
 *
 * Walks depth-tracking; nested function-keyword declarations have their bodies
 * blanked out.
 */
function stripNestedFunctionBodies(source) {
	const len = source.length;
	let i = 0;
	let depth = 0;
	let state = 0;
	const out = [];
	const fnRe = /^function\b\s*\*?\s*\w*\s*\([^)]*\)\s*\{/;

	while (i < len) {
		const ch = source[i];
		const nx = source[i + 1];
		if (state === 0) {
			if (ch === "/" && nx === "/") { state = 4; out.push("//"); i += 2; continue; }
			if (ch === "/" && nx === "*") { state = 5; out.push("/*"); i += 2; continue; }
			if (ch === '"') { state = 2; out.push(ch); i++; continue; }
			if (ch === "'") { state = 1; out.push(ch); i++; continue; }
			if (ch === "`") { state = 3; out.push(ch); i++; continue; }
			// Detect nested `function ... (...) {` only when we are inside an
			// outer body (depth >= 1). The boundary check ensures `function`
			// is its own token (preceded by non-ident char or start of slice).
			if (depth >= 1) {
				const prev = i === 0 ? " " : source[i - 1];
				if (!/[A-Za-z0-9_$]/.test(prev)) {
					const decl = fnRe.exec(source.slice(i));
					if (decl) {
						out.push(decl[0]);
						const innerOpen = i + decl[0].length - 1;
						const innerClose = findMatchingBrace(source, innerOpen);
						if (innerClose !== -1) {
							const inner = source.slice(innerOpen + 1, innerClose);
							out.push(inner.replace(/[^\n]/g, " "));
							out.push("}");
							i = innerClose + 1;
							continue;
						}
					}
				}
			}
			if (ch === "{") depth++;
			else if (ch === "}") depth--;
			out.push(ch);
			i++;
		} else if (state === 1) {
			out.push(ch);
			if (ch === "\\") { out.push(nx || ""); i += 2; continue; }
			if (ch === "'") state = 0;
			i++;
		} else if (state === 2) {
			out.push(ch);
			if (ch === "\\") { out.push(nx || ""); i += 2; continue; }
			if (ch === '"') state = 0;
			i++;
		} else if (state === 3) {
			out.push(ch);
			if (ch === "\\") { out.push(nx || ""); i += 2; continue; }
			if (ch === "`") state = 0;
			i++;
		} else if (state === 4) {
			out.push(ch);
			if (ch === "\n") state = 0;
			i++;
		} else if (state === 5) {
			out.push(ch);
			if (ch === "*" && nx === "/") { out.push("/"); state = 0; i += 2; continue; }
			i++;
		}
	}
	return out.join("");
}

// ---------------------------------------------------------------------------
// `this` detection
// ---------------------------------------------------------------------------

/**
 * Scan a noise-stripped body for `this` usage. Returns {reason, lineOffset} on
 * first hit, or null. Patterns:
 *   member-access:    \bthis\s*\.
 *   dynamic-property: \bthis\s*\[
 *   bare-this:        \bthis\s*[,)]
 *   standalone:       \bthis\s*$        (`return this`, etc.)
 *   expression:       \bthis\s*[+\-*\/<>=&|?]
 *   alias:<name>:     var/let/const X = this; ... X.foo
 */
function detectThis(cleanBody) {
	// Pass 1: alias declarations.
	const aliasDecl = /\b(?:var|let|const)\s+(\w+)\s*=\s*this\b/g;
	const aliases = [];
	let am;
	while ((am = aliasDecl.exec(cleanBody)) !== null) {
		aliases.push({ name: am[1], offset: am.index + am[0].length });
	}

	// Pass 2: direct `this` patterns. Skip occurrences inside an alias decl.
	const direct = [
		{ re: /\bthis\s*\./, reason: "member-access" },
		{ re: /\bthis\s*\[/, reason: "dynamic-property" },
		{ re: /\bthis\s*[,)]/, reason: "bare-this" },
		{ re: /\bthis\s*$/m, reason: "standalone" },
		{ re: /\bthis\s*[+\-*/<>=&|?]/, reason: "expression" },
	];
	for (const { re, reason } of direct) {
		re.lastIndex = 0;
		let dm;
		const gre = new RegExp(re.source, re.flags.includes("g") ? re.flags : re.flags + "g");
		while ((dm = gre.exec(cleanBody)) !== null) {
			// Detect if this match is part of an alias decl (offset of `this` is the start of dm).
			const isInAliasDecl = aliases.some(a => {
				// Alias decl ends right after `this`. Match for `this <op>` starts at thisIdx.
				// Compute thisIdx via slice — simpler: check if region [dm.index, dm.index+4] precedes a decl offset.
				return Math.abs(a.offset - (dm.index + 4)) <= 1;
			});
			if (isInAliasDecl) continue;
			const upToMatch = cleanBody.slice(0, dm.index);
			return { reason, lineOffset: upToMatch.split("\n").length - 1 };
		}
	}

	// Pass 3: alias usage (`<alias>.<...>`) after declaration position.
	for (const a of aliases) {
		const useRe = new RegExp(`\\b${a.name}\\s*\\.`);
		const um = useRe.exec(cleanBody.slice(a.offset));
		if (um) {
			const absIdx = a.offset + um.index;
			const upToMatch = cleanBody.slice(0, absIdx);
			return { reason: `alias:${a.name}`, lineOffset: upToMatch.split("\n").length - 1 };
		}
	}

	return null;
}

// ---------------------------------------------------------------------------
// Public API — auditFn
// ---------------------------------------------------------------------------

function auditFn({ file, fn }) {
	let source;
	try {
		source = fs.readFileSync(file, "utf8");
	} catch (e) {
		return { verdict: "NOT_FOUND", file, fn, error: e.message };
	}
	const extracted = extractBody(source, fn);
	if (!extracted) {
		return { verdict: "NOT_FOUND", file, fn };
	}
	const cleaned = stripNoise(extracted.body);
	const hit = detectThis(cleaned);
	if (!hit) {
		return { verdict: "NO_THIS", file, fn, line: extracted.startLine };
	}
	return {
		verdict: "USES_THIS",
		file,
		fn,
		line: extracted.startLine + hit.lineOffset,
		reason: hit.reason,
	};
}

// ---------------------------------------------------------------------------
// Namespace resolution
// ---------------------------------------------------------------------------

/**
 * Parse `core:require="{Alias: 'a/b/Foo', ...}"` declarations from XML.
 * Returns Map<alias, jsPath>.
 */
function resolveAliases(xmlSource) {
	const map = new Map();
	const re = /core:require\s*=\s*["']\s*\{([\s\S]*?)\}\s*["']/g;
	let m;
	while ((m = re.exec(xmlSource)) !== null) {
		const body = m[1];
		const entryRe = /(\w+)\s*:\s*['"]([^'"]+)['"]/g;
		let em;
		while ((em = entryRe.exec(body)) !== null) {
			map.set(em[1], em[2]);
		}
	}
	return map;
}

function findNamespaceFile(namespace, jsRoots) {
	for (const root of jsRoots) {
		const candidate = path.join(root, namespace + ".js");
		if (fs.existsSync(candidate)) return candidate;
	}
	return null;
}

// ---------------------------------------------------------------------------
// Public API — verifyXml
// ---------------------------------------------------------------------------

const FORMATTER_REF_RE = /formatter\s*:\s*['"]([A-Za-z_$][\w$]*)\.([A-Za-z_$][\w$]*)(\.bind\(\$control\))?['"]/g;

function walkXml(dir, out) {
	const entries = fs.readdirSync(dir, { withFileTypes: true });
	for (const e of entries) {
		const full = path.join(dir, e.name);
		if (e.isDirectory()) walkXml(full, out);
		else if (e.isFile() && /\.(view|fragment)\.xml$/.test(e.name)) out.push(full);
	}
	return out;
}

function verifyXml({ xmlRoot, jsRoots = [], aliases = {} }) {
	const violations = [];
	const xmlFiles = walkXml(xmlRoot, []);
	const explicitMap = new Map(Object.entries(aliases));

	for (const xmlFile of xmlFiles) {
		const xml = fs.readFileSync(xmlFile, "utf8");
		const fileMap = resolveAliases(xml);
		const map = new Map(fileMap);
		for (const [k, v] of explicitMap) map.set(k, v);

		const refRe = new RegExp(FORMATTER_REF_RE.source, FORMATTER_REF_RE.flags);
		let m;
		while ((m = refRe.exec(xml)) !== null) {
			const alias = m[1];
			const fn = m[2];
			const hasBind = !!m[3];
			const aliasPath = map.get(alias);
			if (!aliasPath) continue;

			let jsFile = aliasPath.endsWith(".js") ? aliasPath : aliasPath + ".js";
			if (!fs.existsSync(jsFile)) {
				let resolved = null;
				for (const root of jsRoots) {
					const candidate = path.join(root, aliasPath + ".js");
					if (fs.existsSync(candidate)) { resolved = candidate; break; }
				}
				if (!resolved) continue;
				jsFile = resolved;
			}

			const audit = auditFn({ file: jsFile, fn });
			if (audit.verdict === "USES_THIS" && !hasBind) {
				const upTo = xml.slice(0, m.index);
				const xmlLine = upTo.split("\n").length;
				violations.push({
					file: xmlFile,
					line: xmlLine,
					alias,
					fn,
					jsFile,
					jsLine: audit.line,
					reason: audit.reason,
				});
			}
		}
	}

	return { violations };
}

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------

function parseArgs(argv) {
	const args = { _: [], fn: [], alias: [] };
	let i = 0;
	while (i < argv.length) {
		const a = argv[i];
		if (a === "--file") { args.file = argv[++i]; }
		else if (a === "--fn") { args.fn.push(argv[++i]); }
		else if (a === "--namespace") { args.namespace = argv[++i]; }
		else if (a === "--xml-context") { args.xmlContext = argv[++i]; }
		else if (a === "--xml-root") { args.xmlRoot = argv[++i]; }
		else if (a === "--js-roots") { args.jsRoots = argv[++i].split(","); }
		else if (a === "--alias") { args.alias.push(argv[++i]); }
		else if (a === "--json") { args.json = true; }
		else if (a.startsWith("--")) {
			console.error(`Unknown flag: ${a}`);
			process.exit(2);
		} else {
			args._.push(a);
		}
		i++;
	}
	return args;
}

function formatHuman(r) {
	let line = `${r.file}::${r.fn}::${r.verdict}`;
	if (r.line) line += `::line=${r.line}`;
	if (r.reason && r.reason !== "member-access") line += ` (${r.reason})`;
	return line;
}

function runAuditFn(args) {
	let file = args.file;

	const aliasMap = new Map();
	for (const a of args.alias || []) {
		const idx = a.indexOf("=");
		if (idx === -1) continue;
		aliasMap.set(a.slice(0, idx), a.slice(idx + 1));
	}
	if (args.xmlContext) {
		const xml = fs.readFileSync(args.xmlContext, "utf8");
		const xmlMap = resolveAliases(xml);
		for (const [k, v] of xmlMap) {
			if (!aliasMap.has(k)) aliasMap.set(k, v);
		}
	}

	if (!file && args.namespace) {
		const aliasPath = aliasMap.get(args.namespace);
		if (aliasPath) {
			let candidate = aliasPath.endsWith(".js") ? aliasPath : aliasPath + ".js";
			if (!fs.existsSync(candidate) && args.jsRoots) {
				const found = findNamespaceFile(aliasPath, args.jsRoots);
				if (found) candidate = found;
			}
			if (fs.existsSync(candidate)) file = candidate;
		}
		if (!file && args.jsRoots) {
			file = findNamespaceFile(args.namespace, args.jsRoots);
		}
		if (!file) {
			console.error(`Cannot resolve namespace: ${args.namespace}`);
			process.exit(2);
		}
	}

	if (!file) {
		console.error("audit-fn requires --file or --namespace (with resolution context)");
		process.exit(2);
	}
	if (args.fn.length === 0) {
		console.error("audit-fn requires at least one --fn <name>");
		process.exit(2);
	}
	const results = args.fn.map(fn => auditFn({ file, fn }));
	if (args.json) {
		process.stdout.write(JSON.stringify(results, null, 2) + "\n");
	} else {
		for (const r of results) {
			process.stdout.write(formatHuman(r) + "\n");
		}
	}
	process.exit(0);
}

function runVerifyXml(args) {
	if (!args.xmlRoot) {
		console.error("verify-xml requires --xml-root <dir>");
		process.exit(2);
	}
	const aliases = {};
	for (const a of args.alias || []) {
		const idx = a.indexOf("=");
		if (idx === -1) continue;
		aliases[a.slice(0, idx)] = a.slice(idx + 1);
	}
	const result = verifyXml({
		xmlRoot: args.xmlRoot,
		jsRoots: args.jsRoots || [],
		aliases,
	});
	if (args.json) {
		process.stdout.write(JSON.stringify(result.violations, null, 2) + "\n");
	} else {
		for (const v of result.violations) {
			process.stdout.write(
				`${v.file}:${v.line} ${v.alias}.${v.fn} MISSING_BIND ` +
				`(uses this at ${v.jsFile}:${v.jsLine})\n`,
			);
		}
	}
	process.exit(result.violations.length > 0 ? 1 : 0);
}

module.exports = {
	auditFn,
	verifyXml,
	extractBody,
	findMatchingBrace,
	stripNoise,
	stripCommentsAndStrings,
	stripNestedFunctionBodies,
	detectThis,
	resolveAliases,
	parseArgs,
};

if (require.main === module) {
	const argv = process.argv.slice(2);
	const sub = argv[0];
	const rest = argv.slice(1);
	if (sub === "audit-fn") {
		runAuditFn(parseArgs(rest));
	} else if (sub === "verify-xml") {
		runVerifyXml(parseArgs(rest));
	} else {
		console.error("Usage: verify-this-bind.js {audit-fn|verify-xml} [flags]");
		console.error("See README.md for details.");
		process.exit(2);
	}
}
