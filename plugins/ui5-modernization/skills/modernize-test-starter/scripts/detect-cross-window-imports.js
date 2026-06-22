#!/usr/bin/env node
/**
 * detect-cross-window-imports.js
 *
 * Pattern-U gate: every UI5 control / class instantiated in a page-object
 * file must be re-resolved through Opa5.getWindow().sap.ui.require(...) at
 * the call site, not pulled into the parent sap.ui.define dependency array.
 * Bare jQuery / document / window references must go through Opa5.getJQuery()
 * or Opa5.getWindow().
 *
 * Module paths cannot be enumerated (UI5 has too many libs: sap/m, sap/ui/core,
 * sap/uxap, sap/suite, sap/viz, sap/ndc, sap/f, sap/ui/layout, sap/gantt, custom
 * libs ...). Instead this gate checks **usage shapes**:
 *
 *   1. `new <Identifier>(...)` where <Identifier> is a sap.ui.define dependency
 *      parameter and the dep path is NOT on the OPA-safe allowlist
 *      (sap/ui/test/*, sap/ui/core/routing/History).
 *   2. `<x> instanceof <Identifier>` — same identifier rule.
 *   3. Bare `$(`, `jQuery(`, `document.`, `window.` not routed through
 *      `Opa5.getJQuery()` / `Opa5.getWindow()`.
 *
 * Ship as a hard gate before Phase 7 verification. Non-zero exit halts the
 * skill and prints file:line for every offence.
 *
 * Usage:
 *   node detect-cross-window-imports.js <project-root>
 *
 * Exit codes:
 *   0 — clean
 *   1 — at least one offence found
 *   2 — usage error
 */

"use strict";

const fs = require("fs");
const path = require("path");

const OPA_SAFE_PREFIXES = ["sap/ui/test/"];
const OPA_SAFE_EXACT = new Set(["sap/ui/core/routing/History"]);

function isOpaSafeModule(modulePath) {
    if (OPA_SAFE_EXACT.has(modulePath)) return true;
    return OPA_SAFE_PREFIXES.some((p) => modulePath.startsWith(p));
}

/**
 * Strip block comments and line comments. String contents are kept (we never
 * index-match against them — string ranges are only consulted when extracting
 * sap.ui.define dep paths via the dedicated `"foo"` regex).
 *
 * Length is preserved so absolute offsets stay valid between raw and sanitized.
 */
function sanitize(src) {
    let out = src;
    // Block comments
    out = out.replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, " "));
    // Line comments — preserve newline
    out = out.replace(/\/\/[^\n]*/g, (m) => m.replace(/[^\n]/g, " "));
    return out;
}

/**
 * Locate the FIRST sap.ui.define([...], function(...){...}) and return
 * { deps: [{path, param}], bodyStart, bodyEnd } or null when not found.
 *
 * Parser-light: assumes the conventional shape. Does not handle
 * `sap.ui.define("name", [...], fn)` form (rare in page objects), nor
 * `sap.ui.predefine`.
 */
function parseDefine(rawSrc) {
    const src = sanitize(rawSrc);
    // Need original for dep paths (sanitize zeroed strings). Re-extract from raw.
    const defineMatch = /sap\.ui\.define\s*\(\s*\[/m.exec(src);
    if (!defineMatch) return null;

    const arrStart = defineMatch.index + defineMatch[0].length;
    const arrEnd = findMatching(src, arrStart - 1, "[", "]");
    if (arrEnd === -1) return null;
    const depsArrayRaw = rawSrc.slice(arrStart, arrEnd);
    const depPaths = [];
    const depRe = /["']([^"']+)["']/g;
    let m;
    while ((m = depRe.exec(depsArrayRaw)) !== null) {
        depPaths.push(m[1]);
    }

    // After ], expect ", function (params) { ... }"
    const afterArr = src.slice(arrEnd + 1);
    const fnMatch = /^\s*,\s*function\s*\(([^)]*)\)\s*\{/.exec(afterArr);
    if (!fnMatch) return { deps: depPaths.map((p) => ({ path: p, param: null })), bodyStart: -1, bodyEnd: -1 };

    const paramList = fnMatch[1]
        .split(",")
        .map((p) => p.trim())
        .filter(Boolean);

    const deps = depPaths.map((p, i) => ({ path: p, param: paramList[i] || null }));

    const bodyOpenIdxInAfter = fnMatch.index + fnMatch[0].length - 1; // position of `{`
    const bodyOpen = arrEnd + 1 + bodyOpenIdxInAfter;
    const bodyClose = findMatching(src, bodyOpen, "{", "}");

    return {
        deps,
        bodyStart: bodyOpen + 1,
        bodyEnd: bodyClose === -1 ? src.length : bodyClose,
    };
}

function findMatching(src, openIdx, openCh, closeCh) {
    let depth = 0;
    for (let i = openIdx; i < src.length; i++) {
        const c = src[i];
        if (c === openCh) depth++;
        else if (c === closeCh) {
            depth--;
            if (depth === 0) return i;
        }
    }
    return -1;
}

function lineNumberAt(src, idx) {
    let line = 1;
    for (let i = 0; i < idx && i < src.length; i++) {
        if (src[i] === "\n") line++;
    }
    return line;
}

function scanFile(filePath) {
    const raw = fs.readFileSync(filePath, "utf8");
    const sanitized = sanitize(raw);
    const define = parseDefine(raw);
    const findings = [];

    // Build forbidden-identifier set: dep params whose module is not OPA-safe.
    const forbiddenIds = new Map(); // identifier -> module path
    if (define) {
        for (const d of define.deps) {
            if (!d.param) continue;
            if (isOpaSafeModule(d.path)) continue;
            forbiddenIds.set(d.param, d.path);
        }
    }

    const bodyStart = define && define.bodyStart >= 0 ? define.bodyStart : 0;
    const bodyEnd = define && define.bodyEnd >= 0 ? define.bodyEnd : sanitized.length;
    const body = sanitized.slice(bodyStart, bodyEnd);
    const bodyOffset = bodyStart;

    // 1. new <Identifier>( and instanceof <Identifier>
    const ctorRe = /\bnew\s+([A-Z][A-Za-z0-9_$]*)\s*\(/g;
    let mm;
    while ((mm = ctorRe.exec(body)) !== null) {
        const id = mm[1];
        if (forbiddenIds.has(id)) {
            findings.push({
                kind: "new-from-define-dep",
                identifier: id,
                modulePath: forbiddenIds.get(id),
                line: lineNumberAt(raw, bodyOffset + mm.index),
                fix: `Replace with: var ${id} = Opa5.getWindow().sap.ui.require("${forbiddenIds.get(id)}"); new ${id}(...)`,
            });
        }
    }

    const instRe = /\binstanceof\s+([A-Z][A-Za-z0-9_$]*)\b/g;
    while ((mm = instRe.exec(body)) !== null) {
        const id = mm[1];
        if (forbiddenIds.has(id)) {
            findings.push({
                kind: "instanceof-from-define-dep",
                identifier: id,
                modulePath: forbiddenIds.get(id),
                line: lineNumberAt(raw, bodyOffset + mm.index),
                fix: `Replace with: oFoo instanceof Opa5.getWindow().sap.ui.require("${forbiddenIds.get(id)}")`,
            });
        }
    }

    // 2. Bare DOM / jQuery — exclude lines that already route through Opa5.
    const lines = raw.split("\n");
    for (let i = 0; i < lines.length; i++) {
        const lineNum = i + 1;
        const ln = lines[i];
        // skip line comments quickly
        const sanitizedLine = sanitize(ln);
        if (/\bOpa5\.getWindow\s*\(\s*\)/.test(ln) || /\bOpa5\.getJQuery\s*\(\s*\)/.test(ln)) {
            // line already mixes parent + Opa5 — only flag if a *separate* bare
            // call also appears. Cheap heuristic: skip the line entirely.
            // The agent will see the cross-window form and the surrounding
            // bare call together if present, and the next clean run will
            // catch any remaining offence after the rewrite.
            continue;
        }
        // Bare $(  — not preceded by a word/$/. char
        if (/(^|[^A-Za-z0-9_$.])\$\(/.test(sanitizedLine)) {
            findings.push({
                kind: "bare-jquery-dollar",
                line: lineNum,
                fix: "Replace `$(...)` with `Opa5.getJQuery()(...)` for app-rendered DOM.",
            });
        }
        if (/(^|[^A-Za-z0-9_$.])jQuery\(/.test(sanitizedLine)) {
            findings.push({
                kind: "bare-jquery-named",
                line: lineNum,
                fix: "Replace `jQuery(...)` with `Opa5.getJQuery()(...)` for app-rendered DOM.",
            });
        }
        if (/(^|[^A-Za-z0-9_$.])document\./.test(sanitizedLine)) {
            findings.push({
                kind: "bare-document",
                line: lineNum,
                fix: "Replace `document.*` with `Opa5.getWindow().document.*` when targeting app DOM.",
            });
        }
        // window. — exclude `Opa5.getWindow()` (already filtered above) and
        // common harmless idioms `window.location.hash` only when bare.
        if (/(^|[^A-Za-z0-9_$.])window\./.test(sanitizedLine)) {
            findings.push({
                kind: "bare-window",
                line: lineNum,
                fix: "Replace `window.*` with `Opa5.getWindow().*` when targeting the app window.",
            });
        }
    }

    return findings;
}

function walkPagesDir(dir) {
    const out = [];
    const stack = [dir];
    while (stack.length) {
        const d = stack.pop();
        let entries;
        try {
            entries = fs.readdirSync(d, { withFileTypes: true });
        } catch (e) {
            continue;
        }
        for (const e of entries) {
            const p = path.join(d, e.name);
            if (e.isDirectory()) stack.push(p);
            else if (e.isFile() && p.endsWith(".js")) out.push(p);
        }
    }
    return out;
}

function main() {
    const projectRoot = process.argv[2];
    if (!projectRoot) {
        process.stderr.write("usage: detect-cross-window-imports.js <project-root>\n");
        process.exit(2);
    }
    const pagesDir = path.join(projectRoot, "webapp", "test", "integration", "pages");
    if (!fs.existsSync(pagesDir)) {
        process.stderr.write(`detect-cross-window-imports: pages dir not found: ${pagesDir}\n`);
        process.stderr.write("                              (no Pattern U page objects to gate — skipping)\n");
        process.stdout.write(JSON.stringify({ findings: [], summary: { total: 0, files: 0, skipped: true } }, null, 2) + "\n");
        process.exit(0);
    }

    const files = walkPagesDir(pagesDir);
    const allFindings = [];
    for (const f of files) {
        const fs_ = scanFile(f);
        for (const finding of fs_) {
            allFindings.push({ file: path.relative(projectRoot, f), ...finding });
        }
    }

    const result = {
        findings: allFindings,
        summary: { total: allFindings.length, files: files.length, skipped: false },
    };
    process.stdout.write(JSON.stringify(result, null, 2) + "\n");

    if (allFindings.length === 0) {
        process.stderr.write(`OK: no cross-window violations across ${files.length} page-object files.\n`);
        process.exit(0);
    }

    process.stderr.write("FAIL: cross-window misuse found in page objects.\n");
    process.stderr.write("      Page objects run in the QUnit (parent) window; the app runs in the iframe.\n");
    process.stderr.write("      Controls instantiated from parent-loaded modules register on the wrong UI5\n");
    process.stderr.write("      Core; bare jQuery/document/window queries miss the iframe DOM.\n\n");
    for (const f of allFindings) {
        process.stderr.write(`${f.file}:${f.line}: ${f.kind}`);
        if (f.identifier) process.stderr.write(` (${f.identifier} from "${f.modulePath}")`);
        process.stderr.write("\n");
        process.stderr.write(`    fix: ${f.fix}\n`);
    }
    process.stderr.write(`\nTotal: ${allFindings.length} finding(s) across ${files.length} file(s).\n`);
    process.exit(1);
}

if (require.main === module) {
    main();
}

module.exports = { sanitize, parseDefine, scanFile, isOpaSafeModule };
