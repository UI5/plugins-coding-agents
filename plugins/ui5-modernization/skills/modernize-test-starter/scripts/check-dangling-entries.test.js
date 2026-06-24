"use strict";
/**
 * Tests for check-dangling-entries.js
 *
 * Run with: node --test scripts/check-dangling-entries.test.js
 */

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const os = require("os");
const path = require("path");

const {
    extractTestsBlock,
    extractTopLevelKeys,
    checkDanglingEntries
} = require("./check-dangling-entries.js");

function withTempDir(fn) {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "check-dangling-test-"));
    try {
        return fn(dir);
    } finally {
        fs.rmSync(dir, { recursive: true, force: true });
    }
}

function writeTestsuite(dir, body) {
    fs.writeFileSync(
        path.join(dir, "testsuite.qunit.js"),
        body
    );
}

function touchEntry(dir, relKey) {
    const full = path.join(dir, relKey + ".qunit.js");
    fs.mkdirSync(path.dirname(full), { recursive: true });
    fs.writeFileSync(full, "// stub\n");
}

// ----- extractTestsBlock --------------------------------------------------

test("extractTestsBlock returns body of tests block", () => {
    const src = `
        sap.ui.define(function () {
            return {
                defaults: { qunit: { version: 2 } },
                tests: {
                    "unit/unitTests": { title: "Unit" }
                }
            };
        });
    `;
    const body = extractTestsBlock(src);
    assert.ok(body);
    assert.match(body, /"unit\/unitTests"/);
    // Body must NOT include the surrounding `defaults:` config.
    assert.doesNotMatch(body, /qunit:/);
});

test("extractTestsBlock handles nested braces inside entries", () => {
    const src = `
        return {
            tests: {
                "a/b": { title: "X", ui5: { theme: "horizon" } },
                "c/d": { title: "Y" }
            }
        };
    `;
    const body = extractTestsBlock(src);
    assert.match(body, /"a\/b"/);
    assert.match(body, /"c\/d"/);
});

test("extractTestsBlock returns null when no tests block exists", () => {
    assert.equal(extractTestsBlock("var x = {};"), null);
});

test("extractTestsBlock ignores `tests:` inside string literals", () => {
    const src = `
        var s = "tests: { fake: {} }";
        return { tests: { "real/entry": { title: "R" } } };
    `;
    const body = extractTestsBlock(src);
    assert.match(body, /"real\/entry"/);
    assert.doesNotMatch(body, /fake/);
});

// ----- extractTopLevelKeys ------------------------------------------------

test("extractTopLevelKeys returns only depth-0 entry keys", () => {
    const body = `
        "unit/unitTests": { title: "Unit" },
        "integration/Foo": {
            title: "Foo",
            ui5: { theme: "horizon" }
        },
        "integration/Bar": { title: "Bar" }
    `;
    const keys = extractTopLevelKeys(body);
    assert.deepEqual(keys, ["unit/unitTests", "integration/Foo", "integration/Bar"]);
});

test("extractTopLevelKeys does NOT pick up keys inside loader config or nested objects", () => {
    // Realistic snippet — note `module: { ... }` inside an entry has its own
    // keys that look slashed, but they live at depth > 0 and must be ignored.
    const body = `
        "integration/Foo": {
            title: "Foo",
            module: { "sap/m/Button": "sap/m/Button" }
        },
        "integration/Bar": { title: "Bar" }
    `;
    const keys = extractTopLevelKeys(body);
    assert.deepEqual(keys, ["integration/Foo", "integration/Bar"]);
});

test("extractTopLevelKeys ignores keys whose value is not an object", () => {
    const body = `
        "title": "QUnit suite",
        "integration/Real": { title: "Real" }
    `;
    const keys = extractTopLevelKeys(body);
    assert.deepEqual(keys, ["integration/Real"]);
});

test("extractTopLevelKeys skips // and /* */ comments", () => {
    const body = `
        // "integration/Commented": { title: "X" },
        /* "integration/AlsoCommented": { title: "Y" }, */
        "integration/Live": { title: "Live" }
    `;
    const keys = extractTopLevelKeys(body);
    assert.deepEqual(keys, ["integration/Live"]);
});

// ----- checkDanglingEntries (filesystem) ----------------------------------

test("passes when every entry has a backing .qunit.js file", () => {
    withTempDir(dir => {
        writeTestsuite(dir, `
            sap.ui.define(function () {
                return {
                    tests: {
                        "unit/unitTests": { title: "Unit" },
                        "integration/Foo": { title: "Foo" }
                    }
                };
            });
        `);
        touchEntry(dir, "unit/unitTests");
        touchEntry(dir, "integration/Foo");

        const result = checkDanglingEntries(dir);
        assert.equal(result.ok, true);
        assert.deepEqual(result.missing, []);
        assert.deepEqual(result.entries.sort(), ["integration/Foo", "unit/unitTests"]);
    });
});

test("fails and lists missing entries", () => {
    withTempDir(dir => {
        writeTestsuite(dir, `
            return {
                tests: {
                    "unit/unitTests": { title: "Unit" },
                    "integration/JourneyOneCombined": { title: "Bad synthetic" }
                }
            };
        `);
        touchEntry(dir, "unit/unitTests");
        // Note: no integration/JourneyOneCombined.qunit.js — this is the
        // multi-module HTML failure mode the dangling-entry check guards against.

        const result = checkDanglingEntries(dir);
        assert.equal(result.ok, false);
        assert.deepEqual(result.missing, ["integration/JourneyOneCombined"]);
    });
});

test("does NOT flag loader.paths or other config-block keys", () => {
    withTempDir(dir => {
        writeTestsuite(dir, `
            return {
                defaults: {
                    loader: {
                        paths: {
                            "my/app": "../",
                            "test-resources/my/app": "./"
                        },
                        map: {
                            "*": { "sap/ui/thirdparty/sinon": "sap/ui/thirdparty/sinon-4" }
                        }
                    }
                },
                tests: {
                    "unit/unitTests": { title: "Unit" }
                }
            };
        `);
        touchEntry(dir, "unit/unitTests");

        const result = checkDanglingEntries(dir);
        assert.equal(result.ok, true);
        assert.deepEqual(result.entries, ["unit/unitTests"]);
        // Loader keys must not leak into entries.
        assert.ok(!result.entries.includes("my/app"));
        assert.ok(!result.entries.includes("test-resources/my/app"));
    });
});

test("throws TESTSUITE_NOT_FOUND when file is missing", () => {
    withTempDir(dir => {
        assert.throws(
            () => checkDanglingEntries(dir),
            err => err.code === "TESTSUITE_NOT_FOUND"
        );
    });
});

test("throws TESTS_BLOCK_NOT_FOUND when file has no tests: block", () => {
    withTempDir(dir => {
        writeTestsuite(dir, "sap.ui.define(function () { return {}; });");
        assert.throws(
            () => checkDanglingEntries(dir),
            err => err.code === "TESTS_BLOCK_NOT_FOUND"
        );
    });
});
