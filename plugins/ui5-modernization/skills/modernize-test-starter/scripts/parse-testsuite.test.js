"use strict";
/**
 * Tests for parse-testsuite.js
 *
 * Covers the bootstrap-override scan added for the migrate-test-starter
 * skill improvements (point 2 of MIGRATE_TEST_STARTER_IMPROVEMENTS.md):
 * the scanner must report any sap.ui.define / sap.ui.require override or
 * defineModuleSync usage so a human can manually migrate it.
 *
 * Also covers the multi-module HTML rule (point 1): when an OPA test HTML
 * loads more than one journey module, parse-testsuite.js must emit one
 * testsuite entry per loaded module instead of inventing a synthetic
 * *Combined name.
 *
 * Run with:  node --test scripts/parse-testsuite.test.js
 */

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const os = require("os");
const path = require("path");

const {
    scanContentForBootstrapOverrides,
    scanBootstrapOverrides,
    scanContentForLauncher,
    detectLauncher,
    scanContentForFlpSandbox,
    detectFlpSandbox,
    listHtmlFiles
} = require("./parse-testsuite.js");

function withTempDir(fn) {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "parse-testsuite-test-"));
    try {
        return fn(dir);
    } finally {
        fs.rmSync(dir, { recursive: true, force: true });
    }
}

// ----- scanContentForBootstrapOverrides ---------------------------------

test("flags sap.ui.define override", () => {
    const html = `
        <script>
            var orig = sap.ui.define;
            sap.ui.define = function () {};
        </script>
    `;
    const findings = scanContentForBootstrapOverrides(html, "host.html");
    assert.equal(findings.length, 1);
    assert.equal(findings[0].patternId, "sap.ui.define-override");
    assert.equal(findings[0].file, "host.html");
    assert.match(findings[0].snippet, /sap\.ui\.define\s*=/);
});

test("flags sap.ui.require override", () => {
    const html = "sap.ui.require = function (deps, cb) { cb(); };";
    const findings = scanContentForBootstrapOverrides(html, "host.html");
    assert.equal(findings.length, 1);
    assert.equal(findings[0].patternId, "sap.ui.require-override");
});

test("flags defineModuleSync calls", () => {
    const html = `
        sap.ui.loader._.defineModuleSync("foo/Bar", {});
        defineModuleSync("baz", {});
    `;
    const findings = scanContentForBootstrapOverrides(html, "host.html");
    assert.equal(findings.length, 2);
    assert.ok(findings.every(f => f.patternId === "defineModuleSync"));
});

test("ignores patterns inside // comments", () => {
    const html = `
        // sap.ui.define = oldRef;  -- example only
        var x = 1;
    `;
    const findings = scanContentForBootstrapOverrides(html, "host.html");
    assert.equal(findings.length, 0);
});

test("does not flag legitimate sap.ui.define([deps], cb) calls", () => {
    const html = `
        sap.ui.define(["dep/A"], function (A) {
            return A;
        });
    `;
    const findings = scanContentForBootstrapOverrides(html, "host.html");
    assert.equal(findings.length, 0);
});

test("returns line numbers (1-based) and trimmed snippets", () => {
    const html = [
        "<html>",
        "    <head>",
        "        sap.ui.define = function () {};",
        "    </head>",
        "</html>"
    ].join("\n");
    const findings = scanContentForBootstrapOverrides(html, "host.html");
    assert.equal(findings.length, 1);
    assert.equal(findings[0].line, 3);
    assert.equal(findings[0].snippet, "sap.ui.define = function () {};");
});

test("only one finding per line even when multiple patterns match", () => {
    // Single line, both override patterns present — must not double-report.
    const html = "sap.ui.define = sap.ui.require = function () {};";
    const findings = scanContentForBootstrapOverrides(html, "host.html");
    assert.equal(findings.length, 1);
});

// ----- listHtmlFiles + scanBootstrapOverrides (file-walking) -------------

test("listHtmlFiles walks subdirectories", () => {
    withTempDir(dir => {
        fs.mkdirSync(path.join(dir, "sub"));
        fs.writeFileSync(path.join(dir, "a.html"), "");
        fs.writeFileSync(path.join(dir, "sub", "b.html"), "");
        fs.writeFileSync(path.join(dir, "skip.js"), "");

        const files = listHtmlFiles(dir).map(f => path.relative(dir, f)).sort();
        assert.deepEqual(files, ["a.html", path.join("sub", "b.html")]);
    });
});

test("listHtmlFiles returns empty list when dir is missing", () => {
    assert.deepEqual(listHtmlFiles("/no/such/path/here-xyz"), []);
});

test("scanBootstrapOverrides aggregates findings from all html files", () => {
    withTempDir(dir => {
        fs.writeFileSync(
            path.join(dir, "host.html"),
            "sap.ui.define = function () {};\n"
        );
        fs.mkdirSync(path.join(dir, "sub"));
        fs.writeFileSync(
            path.join(dir, "sub", "page.html"),
            "sap.ui.loader._.defineModuleSync('m', {});\n"
        );
        fs.writeFileSync(path.join(dir, "clean.html"), "<div>nothing</div>\n");

        const result = scanBootstrapOverrides(dir);
        assert.equal(result.scannedFileCount, 3);
        assert.equal(result.findings.length, 2);

        const ids = result.findings.map(f => f.patternId).sort();
        assert.deepEqual(ids, ["defineModuleSync", "sap.ui.define-override"]);
    });
});

// ----- Multi-module HTML rule (point 1) ---------------------------------

test("parse() emits one entry per module for multi-module Pattern B HTML", () => {
    withTempDir(dir => {
        const namespace = "my/app";
        const testBaseDir = path.join(dir, "webapp", "test");
        fs.mkdirSync(path.join(testBaseDir, "opa", "Area"), { recursive: true });

        // testsuite.qunit.html that registers one HTML test page (Pattern B style).
        const testsuiteHtml = path.join(testBaseDir, "testsuite.qunit.html");
        fs.writeFileSync(
            testsuiteHtml,
            `<html><script>
                var sContextPath = "";
                var oSuite = {};
                oSuite.addTestPage(sContextPath + "opa/Area/Combined.qunit.html");
            </script></html>`
        );

        // The HTML page loads TWO journey modules — the legacy multi-module pattern.
        fs.writeFileSync(
            path.join(testBaseDir, "opa", "Area", "Combined.qunit.html"),
            `<html><head><title>Combined</title></head><body><script>
                sap.ui.require([
                    "my/app/test/opa/view/Area/JourneyOne",
                    "my/app/test/opa/view/Area/JourneyTwo"
                ], function () {});
            </script></body></html>`
        );

        const { parse } = require("./parse-testsuite.js");
        const out = parse(testsuiteHtml, testBaseDir, namespace);

        assert.equal(out.pattern, "B");
        // Critical: TWO entries, one per module — no synthetic *Combined key.
        assert.ok(
            out.entries["opa/view/Area/JourneyOne"],
            "JourneyOne entry must exist"
        );
        assert.ok(
            out.entries["opa/view/Area/JourneyTwo"],
            "JourneyTwo entry must exist"
        );
        // No invented key like "opa/view/Area/JourneyOneCombined".
        for (const key of Object.keys(out.entries)) {
            assert.doesNotMatch(key, /Combined$/, `synthetic key emitted: ${key}`);
        }
        // Both entries trace back to the source HTML for diagnostics.
        assert.equal(
            out.entries["opa/view/Area/JourneyOne"]._fromMultiModuleHtml,
            "opa/Area/Combined.qunit.html"
        );
    });
});

// ----- scanContentForLauncher / detectLauncher --------------------------
//
// The launcher scan is what tells the modernize-test-starter skill whether
// the project arrived already in an iframe (continue normal flow) or in
// the in-window component shape (Pattern U — run Phase 5b iframe migration).
// Mixed projects must halt; a clean iframe/in-window classification is the
// only safe input to Phase 5b.

test("scanContentForLauncher flags iStartMyAppInAFrame", () => {
    const js = `
        sap.ui.define([], function () {
            return {
                iStartMyApp: function () {
                    this.iStartMyAppInAFrame({ source: "x.html" });
                }
            };
        });
    `;
    const findings = scanContentForLauncher(js, "Common.js");
    assert.equal(findings.length, 1);
    assert.equal(findings[0].launcher, "iframe");
    assert.match(findings[0].snippet, /iStartMyAppInAFrame/);
});

test("scanContentForLauncher flags iStartMyUIComponent", () => {
    const js = `
        Given.iStartMyUIComponent({
            componentConfig: { name: "my.app", async: true }
        });
    `;
    const findings = scanContentForLauncher(js, "Journey.js");
    assert.equal(findings.length, 1);
    assert.equal(findings[0].launcher, "in-window");
});

test("scanContentForLauncher ignores commented-out launcher calls", () => {
    const js = `
        // Given.iStartMyUIComponent({ componentConfig: {} });
        Given.iStartMyAppInAFrame({ source: "x.html" });
    `;
    const findings = scanContentForLauncher(js, "Journey.js");
    assert.equal(findings.length, 1);
    assert.equal(findings[0].launcher, "iframe");
});

test("detectLauncher classifies iframe-only project", () => {
    withTempDir((dir) => {
        const integ = path.join(dir, "integration");
        fs.mkdirSync(integ, { recursive: true });
        fs.writeFileSync(
            path.join(integ, "Common.js"),
            'this.iStartMyAppInAFrame({ source: "x.html" });'
        );
        const result = detectLauncher(dir);
        assert.equal(result.launcher, "iframe");
        assert.equal(result.iframeHits.length, 1);
        assert.equal(result.inWindowHits.length, 0);
    });
});

test("detectLauncher classifies in-window-only project", () => {
    withTempDir((dir) => {
        const integ = path.join(dir, "integration");
        fs.mkdirSync(integ, { recursive: true });
        fs.writeFileSync(
            path.join(integ, "JourneyOne.js"),
            'Given.iStartMyUIComponent({ componentConfig: { name: "my.app" } });'
        );
        fs.writeFileSync(
            path.join(integ, "JourneyTwo.js"),
            'Given.iStartMyUIComponent({ componentConfig: { name: "my.app" } });'
        );
        const result = detectLauncher(dir);
        assert.equal(result.launcher, "in-window");
        assert.equal(result.iframeHits.length, 0);
        assert.equal(result.inWindowHits.length, 2);
    });
});

test("detectLauncher reports mixed when both shapes coexist", () => {
    withTempDir((dir) => {
        const integ = path.join(dir, "integration");
        fs.mkdirSync(integ, { recursive: true });
        fs.writeFileSync(
            path.join(integ, "OldJourney.js"),
            'Given.iStartMyUIComponent({ componentConfig: { name: "my.app" } });'
        );
        fs.writeFileSync(
            path.join(integ, "NewJourney.js"),
            'this.iStartMyAppInAFrame({ source: "x.html" });'
        );
        const result = detectLauncher(dir);
        assert.equal(result.launcher, "mixed");
        assert.equal(result.iframeHits.length, 1);
        assert.equal(result.inWindowHits.length, 1);
    });
});

test("detectLauncher reports none when no launcher calls present", () => {
    withTempDir((dir) => {
        const integ = path.join(dir, "integration");
        fs.mkdirSync(integ, { recursive: true });
        fs.writeFileSync(
            path.join(integ, "Helper.js"),
            'sap.ui.define([], function () { return {}; });'
        );
        const result = detectLauncher(dir);
        assert.equal(result.launcher, "none");
        assert.equal(result.iframeHits.length, 0);
        assert.equal(result.inWindowHits.length, 0);
    });
});

// ----- scanContentForFlpSandbox / detectFlpSandbox ----------------------
//
// FLP sandbox presence gates Phase 5b — Pattern U projects without any
// `sap/ushell/bootstrap/sandbox.js` load (or `window["sap-ushell-config"]`
// declaration) in their legacy test pages are plain in-window apps that
// don't depend on the ushell API and should be left alone.

test("scanContentForFlpSandbox flags ushell sandbox script tag", () => {
    const html = `
        <script id="sap-ushell-bootstrap" src="../../test-resources/sap/ushell/bootstrap/sandbox.js"></script>
    `;
    const findings = scanContentForFlpSandbox(html, "flpSandbox.html");
    assert.equal(findings.length, 1);
    assert.equal(findings[0].patternId, "sandbox-script");
});

test("scanContentForFlpSandbox flags older flpSandbox.js script", () => {
    const html = '<script src="flpSandbox.js"></script>';
    const findings = scanContentForFlpSandbox(html, "host.html");
    assert.equal(findings.length, 1);
    assert.equal(findings[0].patternId, "sandbox-script");
});

test("scanContentForFlpSandbox flags window['sap-ushell-config'] block", () => {
    const html = `
        <script>
            window["sap-ushell-config"] = { defaultRenderer: "fiori2" };
        </script>
    `;
    const findings = scanContentForFlpSandbox(html, "host.html");
    assert.equal(findings.length, 1);
    assert.equal(findings[0].patternId, "sap-ushell-config");
});

test("scanContentForFlpSandbox ignores commented-out markers", () => {
    const html = `
        // <script src="sap/ushell/bootstrap/sandbox.js"></script>
        <p>plain text</p>
    `;
    const findings = scanContentForFlpSandbox(html, "host.html");
    assert.equal(findings.length, 0);
});

test("scanContentForFlpSandbox does not flag unrelated script tags", () => {
    const html = '<script src="../resources/sap-ui-core.js"></script>';
    const findings = scanContentForFlpSandbox(html, "opaTests.qunit.html");
    assert.equal(findings.length, 0);
});

test("detectFlpSandbox reports false when no test HTML loads sandbox.js", () => {
    withTempDir((dir) => {
        fs.writeFileSync(
            path.join(dir, "opaTests.qunit.html"),
            '<script src="../resources/sap-ui-core.js"></script>'
        );
        const result = detectFlpSandbox(dir);
        assert.equal(result.flpSandbox, false);
        assert.equal(result.hits.length, 0);
    });
});

test("detectFlpSandbox reports true when any test HTML loads sandbox.js", () => {
    withTempDir((dir) => {
        fs.writeFileSync(
            path.join(dir, "opaTests.qunit.html"),
            '<script src="../resources/sap-ui-core.js"></script>'
        );
        fs.writeFileSync(
            path.join(dir, "flpSandbox.qunit.html"),
            '<script src="../../test-resources/sap/ushell/bootstrap/sandbox.js"></script>'
        );
        const result = detectFlpSandbox(dir);
        assert.equal(result.flpSandbox, true);
        assert.equal(result.hits.length, 1);
    });
});
