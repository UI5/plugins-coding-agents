#!/usr/bin/env node
/**
 * check-dangling-entries.js
 *
 * Asserts that every test entry declared in `<testBaseDir>/testsuite.qunit.js`
 * resolves to a real `<testBaseDir>/<key>.qunit.js` file. Test Starter appends
 * `.qunit` to each entry key automatically, so an entry "integration/Foo"
 * requires `integration/Foo.qunit.js` to exist.
 *
 * This is the Phase 7 "dangling-entry check" of the modernize-test-starter
 * skill — it catches the multi-module-HTML failure mode where a synthetic
 * combined name was emitted with no backing file. See SKILL.md Phase 7 and
 * references/pattern-b-modernization.md Step 7.
 *
 * Usage:
 *   node check-dangling-entries.js <test-base-dir>
 *
 * Exit codes:
 *   0 — every entry resolves
 *   1 — at least one entry is dangling (list printed to stderr)
 *   2 — usage / file-not-found
 */

const fs = require("fs");
const path = require("path");

/**
 * Extract the body of the top-level `tests:` object from a testsuite.qunit.js
 * source. We do a single pass that tracks strings/comments so that a `tests:`
 * substring inside a string literal does not falsely match, then a brace-
 * balanced scan to capture the matching `}`. A regex on `"key": {` would also
 * pick up `loader.paths` / `loader.map` keys (which legitimately contain
 * slashes) and produce false positives, so we look specifically for `tests:`.
 *
 * Returns the substring between (and excluding) the matching `{` and `}` of
 * the `tests:` block, or null if no `tests:` block was found.
 */
function extractTestsBlock(source) {
    let inString = null;
    let inLineComment = false;
    let inBlockComment = false;
    let prev = "";
    let markerStart = -1;

    for (let i = 0; i < source.length; i++) {
        const ch = source[i];

        if (inLineComment) {
            if (ch === "\n") inLineComment = false;
            prev = ch;
            continue;
        }
        if (inBlockComment) {
            if (prev === "*" && ch === "/") inBlockComment = false;
            prev = ch;
            continue;
        }
        if (inString) {
            if (ch === "\\") { i++; prev = source[i] || ""; continue; }
            if (ch === inString) inString = null;
            prev = ch;
            continue;
        }

        if (ch === "/" && source[i + 1] === "/") { inLineComment = true; i++; prev = "/"; continue; }
        if (ch === "/" && source[i + 1] === "*") { inBlockComment = true; i++; prev = "*"; continue; }
        if (ch === '"' || ch === "'" || ch === "`") { inString = ch; prev = ch; continue; }

        // Look for the identifier `tests` followed by optional whitespace and `:`.
        if (ch === "t" && source.slice(i, i + 5) === "tests") {
            // Must be a word boundary on the left (no JS identifier char immediately before).
            const left = source[i - 1] || "";
            if (!/[A-Za-z0-9_$]/.test(left)) {
                let k = i + 5;
                while (k < source.length && /\s/.test(source[k])) k++;
                if (source[k] === ":") {
                    markerStart = i;
                    // Advance to the `{` after the colon.
                    k++;
                    while (k < source.length && /\s/.test(source[k])) k++;
                    if (source[k] === "{") {
                        return scanBlock(source, k);
                    }
                }
            }
        }

        prev = ch;
    }
    return markerStart === -1 ? null : null;
}

/**
 * Given a source string and the index of the opening `{`, scan with brace-
 * balance + string/comment tracking and return the body between the braces.
 * Returns null if no matching brace is found.
 */
function scanBlock(source, openIdx) {
    let depth = 0;
    let inString = null;
    let inLineComment = false;
    let inBlockComment = false;
    let prev = "";

    for (let i = openIdx; i < source.length; i++) {
        const ch = source[i];

        if (inLineComment) {
            if (ch === "\n") inLineComment = false;
            prev = ch;
            continue;
        }
        if (inBlockComment) {
            if (prev === "*" && ch === "/") inBlockComment = false;
            prev = ch;
            continue;
        }
        if (inString) {
            if (ch === "\\") { i++; prev = source[i] || ""; continue; }
            if (ch === inString) inString = null;
            prev = ch;
            continue;
        }

        if (ch === "/" && source[i + 1] === "/") { inLineComment = true; i++; prev = "/"; continue; }
        if (ch === "/" && source[i + 1] === "*") { inBlockComment = true; i++; prev = "*"; continue; }
        if (ch === '"' || ch === "'" || ch === "`") { inString = ch; prev = ch; continue; }

        if (ch === "{") {
            depth++;
        } else if (ch === "}") {
            depth--;
            if (depth === 0) {
                return source.slice(openIdx + 1, i);
            }
        }
        prev = ch;
    }
    return null;
}

/**
 * Returns the list of top-level entry keys inside the `tests:` block body.
 * Only keys whose value starts with `{` count — string-valued or commented
 * lines are skipped. We track brace depth so nested object literals (e.g.
 * `module: {...}` inside an entry) do not contribute their own keys.
 */
function extractTopLevelKeys(testsBody) {
    const keys = [];
    let depth = 0;
    let inString = null;
    let inLineComment = false;
    let inBlockComment = false;
    let prev = "";
    let i = 0;

    function readKey(startIdx) {
        // We've just seen the opening quote at startIdx; read until matching quote.
        const quote = testsBody[startIdx];
        let out = "";
        let j = startIdx + 1;
        while (j < testsBody.length) {
            const c = testsBody[j];
            if (c === "\\") { out += testsBody[j + 1] || ""; j += 2; continue; }
            if (c === quote) return { key: out, end: j };
            out += c;
            j++;
        }
        return null;
    }

    while (i < testsBody.length) {
        const ch = testsBody[i];

        if (inLineComment) {
            if (ch === "\n") inLineComment = false;
            i++; continue;
        }
        if (inBlockComment) {
            if (prev === "*" && ch === "/") inBlockComment = false;
            prev = ch; i++; continue;
        }
        if (inString) {
            if (ch === "\\") { i += 2; continue; }
            if (ch === inString) inString = null;
            i++; continue;
        }

        if (ch === "/" && testsBody[i + 1] === "/") { inLineComment = true; i += 2; continue; }
        if (ch === "/" && testsBody[i + 1] === "*") { inBlockComment = true; i += 2; prev = "*"; continue; }

        if (ch === "{") { depth++; i++; continue; }
        if (ch === "}") { depth--; i++; continue; }

        // Only consider keys at depth 0 of the tests body.
        if (depth === 0 && (ch === '"' || ch === "'")) {
            const read = readKey(i);
            if (!read) { i++; continue; }
            // After the closing quote, look for `:` then `{` (skip whitespace).
            let k = read.end + 1;
            while (k < testsBody.length && /\s/.test(testsBody[k])) k++;
            if (testsBody[k] === ":") {
                k++;
                while (k < testsBody.length && /\s/.test(testsBody[k])) k++;
                if (testsBody[k] === "{") {
                    keys.push(read.key);
                    i = k; // continue from the brace; main loop will increment depth
                    continue;
                }
            }
            i = read.end + 1;
            prev = testsBody[read.end];
            continue;
        }

        // String start at depth > 0 — track so braces inside aren't counted.
        if (ch === '"' || ch === "'" || ch === "`") { inString = ch; i++; continue; }

        prev = ch;
        i++;
    }
    return keys;
}

/**
 * Returns { ok, missing, entries } for the testsuite at <testBaseDir>.
 * `missing` is the list of entry keys whose backing .qunit.js file does not exist.
 */
function checkDanglingEntries(testBaseDir) {
    const testsuitePath = path.join(testBaseDir, "testsuite.qunit.js");
    if (!fs.existsSync(testsuitePath)) {
        const err = new Error(`testsuite.qunit.js not found at ${testsuitePath}`);
        err.code = "TESTSUITE_NOT_FOUND";
        throw err;
    }
    const source = fs.readFileSync(testsuitePath, "utf-8");
    const body = extractTestsBlock(source);
    if (body === null) {
        const err = new Error(`No 'tests:' block found in ${testsuitePath}`);
        err.code = "TESTS_BLOCK_NOT_FOUND";
        throw err;
    }
    const entries = extractTopLevelKeys(body);
    const missing = entries.filter(
        key => !fs.existsSync(path.join(testBaseDir, key + ".qunit.js"))
    );
    return { ok: missing.length === 0, missing, entries };
}

module.exports = {
    extractTestsBlock,
    extractTopLevelKeys,
    checkDanglingEntries
};

// =============================================
// CLI
// =============================================

if (require.main === module) {
    const testBaseDir = process.argv[2];
    if (!testBaseDir) {
        console.error("Usage: node check-dangling-entries.js <test-base-dir>");
        process.exit(2);
    }
    let result;
    try {
        result = checkDanglingEntries(testBaseDir);
    } catch (e) {
        console.error(e.message);
        process.exit(2);
    }
    if (!result.ok) {
        console.error(`Dangling entries (${result.missing.length}):`);
        for (const key of result.missing) {
            console.error(`  - ${key}  (expected ${path.join(testBaseDir, key + ".qunit.js")})`);
        }
        process.exit(1);
    }
    console.log(`OK: ${result.entries.length} entries all resolve`);
}
