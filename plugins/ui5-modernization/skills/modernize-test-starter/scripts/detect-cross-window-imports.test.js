/**
 * Tests for detect-cross-window-imports.js
 *
 * Run with: node --test detect-cross-window-imports.test.js
 *           (Node 18+ built-in test runner)
 */

"use strict";

const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const os = require("node:os");

const { sanitize, parseDefine, scanFile, isOpaSafeModule } = require("./detect-cross-window-imports.js");

function tmpFile(contents, name = "Page.js") {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "xwingate-"));
    const fp = path.join(dir, name);
    fs.writeFileSync(fp, contents, "utf8");
    return fp;
}

test("isOpaSafeModule allowlist", () => {
    assert.equal(isOpaSafeModule("sap/ui/test/Opa5"), true);
    assert.equal(isOpaSafeModule("sap/ui/test/actions/Press"), true);
    assert.equal(isOpaSafeModule("sap/ui/test/matchers/Properties"), true);
    assert.equal(isOpaSafeModule("sap/ui/core/routing/History"), true);
    assert.equal(isOpaSafeModule("sap/m/Token"), false);
    assert.equal(isOpaSafeModule("sap/uxap/ObjectPageLayout"), false);
    assert.equal(isOpaSafeModule("sap/f/Card"), false);
    assert.equal(isOpaSafeModule("sap/ndc/BarcodeScannerButton"), false);
});

test("sanitize strips block + line comments, preserves length", () => {
    const src = "var x = 1; // line comment\n/* block */ var y = 2;";
    const out = sanitize(src);
    assert.equal(out.length, src.length);
    assert.match(out, /var x = 1;/);
    assert.match(out, /var y = 2;/);
    assert.doesNotMatch(out, /line comment/);
    assert.doesNotMatch(out, /block/);
});

test("parseDefine extracts dep paths and param names", () => {
    const src = `sap.ui.define([
        "sap/ui/test/Opa5",
        "sap/m/Token",
        "sap/ui/core/routing/History"
    ], function(Opa5, Token, History) {
        return {};
    });`;
    const def = parseDefine(src);
    assert.deepEqual(
        def.deps.map((d) => [d.path, d.param]),
        [
            ["sap/ui/test/Opa5", "Opa5"],
            ["sap/m/Token", "Token"],
            ["sap/ui/core/routing/History", "History"],
        ]
    );
});

test("parseDefine handles single-quoted dep paths", () => {
    const src = `sap.ui.define([
        'sap/ui/test/Opa5',
        'sap/m/Token'
    ], function(Opa5, Token) {
        return {};
    });`;
    const def = parseDefine(src);
    assert.deepEqual(
        def.deps.map((d) => [d.path, d.param]),
        [
            ["sap/ui/test/Opa5", "Opa5"],
            ["sap/m/Token", "Token"],
        ]
    );
});

test("parseDefine handles mixed single + double quoted dep paths", () => {
    const src = `sap.ui.define([
        "sap/ui/test/Opa5",
        'sap/m/Token',
        "sap/uxap/ObjectPageLayout",
        'sap/ui/core/routing/History'
    ], function(Opa5, Token, OPL, History) {
        return {};
    });`;
    const def = parseDefine(src);
    assert.deepEqual(
        def.deps.map((d) => [d.path, d.param]),
        [
            ["sap/ui/test/Opa5", "Opa5"],
            ["sap/m/Token", "Token"],
            ["sap/uxap/ObjectPageLayout", "OPL"],
            ["sap/ui/core/routing/History", "History"],
        ]
    );
});

test("scanFile flags new <Class> when dep is single-quoted", () => {
    const fp = tmpFile(`sap.ui.define([
        'sap/ui/test/Opa5',
        'sap/m/Token'
    ], function(Opa5, Token) {
        return Opa5.extend("X", {
            iAct: function() {
                var t = new Token({ key: 'k', text: 't' });
            }
        });
    });`);
    const findings = scanFile(fp);
    assert.equal(
        findings.some((f) => f.kind === "new-from-define-dep" && f.identifier === "Token" && f.modulePath === "sap/m/Token"),
        true,
    );
});

test("scanFile does NOT flag single-quoted OPA-safe dep used as constructor", () => {
    const fp = tmpFile(`sap.ui.define([
        'sap/ui/test/Opa5',
        'sap/ui/test/actions/Press'
    ], function(Opa5, Press) {
        return Opa5.extend("X", {
            iAct: function() {
                var p = new Press();
            }
        });
    });`);
    const findings = scanFile(fp);
    assert.equal(findings.filter((f) => f.kind === "new-from-define-dep").length, 0);
});

test("scanFile flags new <Class> from non-OPA-safe dep", () => {
    const fp = tmpFile(`sap.ui.define([
        "sap/ui/test/Opa5",
        "sap/m/Token"
    ], function(Opa5, Token) {
        return Opa5.extend("X", {
            iAct: function() {
                var t = new Token({ key: "k", text: "t" });
            }
        });
    });`);
    const findings = scanFile(fp);
    assert.equal(findings.some((f) => f.kind === "new-from-define-dep" && f.identifier === "Token"), true);
});

test("scanFile flags instanceof <Class> from non-OPA-safe dep", () => {
    const fp = tmpFile(`sap.ui.define([
        "sap/ui/test/Opa5",
        "sap/uxap/ObjectPageLayout"
    ], function(Opa5, ObjectPageLayout) {
        return Opa5.extend("X", {
            iAct: function(o) {
                if (o instanceof ObjectPageLayout) { return; }
            }
        });
    });`);
    const findings = scanFile(fp);
    assert.equal(findings.some((f) => f.kind === "instanceof-from-define-dep" && f.identifier === "ObjectPageLayout"), true);
});

test("scanFile does NOT flag new from sap/ui/test/* dep", () => {
    const fp = tmpFile(`sap.ui.define([
        "sap/ui/test/Opa5",
        "sap/ui/test/actions/Press"
    ], function(Opa5, Press) {
        return Opa5.extend("X", {
            iAct: function() {
                var p = new Press();
            }
        });
    });`);
    const findings = scanFile(fp);
    assert.equal(findings.filter((f) => f.kind === "new-from-define-dep").length, 0);
});

test("scanFile does NOT flag History (allowlisted exact)", () => {
    const fp = tmpFile(`sap.ui.define([
        "sap/ui/test/Opa5",
        "sap/ui/core/routing/History"
    ], function(Opa5, History) {
        return Opa5.extend("X", {
            iAct: function() {
                var dir = History.getInstance().getDirection();
            }
        });
    });`);
    const findings = scanFile(fp);
    assert.equal(findings.length, 0);
});

test("scanFile flags bare $( and jQuery(", () => {
    const fp = tmpFile(`sap.ui.define([
        "sap/ui/test/Opa5"
    ], function(Opa5) {
        return Opa5.extend("X", {
            iAct: function() {
                return $(".x").length + jQuery(".y").length;
            }
        });
    });`);
    const findings = scanFile(fp);
    assert.equal(findings.some((f) => f.kind === "bare-jquery-dollar"), true);
    assert.equal(findings.some((f) => f.kind === "bare-jquery-named"), true);
});

test("scanFile flags bare document. and window.", () => {
    const fp = tmpFile(`sap.ui.define([
        "sap/ui/test/Opa5"
    ], function(Opa5) {
        return Opa5.extend("X", {
            iAct: function() {
                var d = document.querySelector(".x");
                var l = window.location.hash;
            }
        });
    });`);
    const findings = scanFile(fp);
    assert.equal(findings.some((f) => f.kind === "bare-document"), true);
    assert.equal(findings.some((f) => f.kind === "bare-window"), true);
});

test("scanFile skips lines that already route through Opa5.getWindow()", () => {
    const fp = tmpFile(`sap.ui.define([
        "sap/ui/test/Opa5"
    ], function(Opa5) {
        return Opa5.extend("X", {
            iAct: function() {
                var d = Opa5.getWindow().document.querySelector(".x");
                var t = Opa5.getJQuery()(".sapMToast");
            }
        });
    });`);
    const findings = scanFile(fp);
    assert.equal(findings.length, 0);
});

test("scanFile does NOT flag $.method() calls (jQuery static, not bare $())", () => {
    // Bare $(...) means call the jQuery factory. $.extend(...) is a member access.
    const fp = tmpFile(`sap.ui.define([
        "sap/ui/test/Opa5"
    ], function(Opa5) {
        return Opa5.extend("X", {
            iAct: function() {
                var o = $.extend({}, { a: 1 });
            }
        });
    });`);
    const findings = scanFile(fp);
    assert.equal(findings.filter((f) => f.kind === "bare-jquery-dollar").length, 0);
});

test("scanFile does NOT flag this.foo or obj.document or x.window", () => {
    const fp = tmpFile(`sap.ui.define([
        "sap/ui/test/Opa5"
    ], function(Opa5) {
        return Opa5.extend("X", {
            iAct: function(req) {
                var d = req.document;
                var w = ctx.window;
            }
        });
    });`);
    const findings = scanFile(fp);
    // req.document and ctx.window — preceded by a word char, regex skips.
    assert.equal(findings.filter((f) => f.kind === "bare-document" || f.kind === "bare-window").length, 0);
});
