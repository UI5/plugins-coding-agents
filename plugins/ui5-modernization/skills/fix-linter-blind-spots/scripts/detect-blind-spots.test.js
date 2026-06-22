#!/usr/bin/env node
/**
 * Unit tests for detect-blind-spots.js
 *
 * Tests cover patterns found in real UI5 projects:
 *   - Deep namespace (com.example.app): global assignments, reads, returns,
 *     method calls, mocks, jQuery.proxy, sap.ui.xmlfragment, etc.
 *   - Short namespace (my.app): EventBus subscribe/publish, sap.ui.controller,
 *     Object.extend, Opa5.extend, facet IDs, viewNamespace property.
 *
 * Run: node detect-blind-spots.test.js
 */

const assert = require("assert");
const { scanNamespaceOccurrences, classifyCodeOccurrence, detectQUnitIssues, detectLegacyJQueryDeps } = require("./detect-blind-spots");

let passed = 0;
let failed = 0;
const failures = [];

function test(name, fn) {
	try {
		fn();
		passed++;
	} catch (e) {
		failed++;
		failures.push({ name, message: e.message });
		console.error(`  FAIL: ${name}`);
		console.error(`        ${e.message}`);
	}
}

function findByContext(occs, ctx) { return occs.filter(o => o.context === ctx); }

function scan(source, ns) { return scanNamespaceOccurrences(source, ns); }

function classify(source, ns, filePath) {
	const occs = scan(source, ns);
	const codeOccs = findByContext(occs, "code");
	return codeOccs.map(occ => classifyCodeOccurrence(occ, source, filePath || "webapp/test.js", ns));
}

// ===========================================================================
// scanNamespaceOccurrences — context classification
// ===========================================================================

console.log("\n--- scanNamespaceOccurrences: context classification ---");

const NS_DEEP = "com.example.app";
const NS_SHORT = "my.app";

test("namespace in bare code → context: code", function () {
	const source = 'var x = com.example.app.utils.Helper;';
	const occs = scan(source, NS_DEEP);
	assert.strictEqual(occs.length, 1);
	assert.strictEqual(occs[0].context, "code");
	assert.strictEqual(occs[0].line, 1);
});

test("namespace in double-quoted string → context: string", function () {
	const source = 'Controller.extend("com.example.app.controller.Main", {});';
	const occs = scan(source, NS_DEEP);
	assert.strictEqual(occs.length, 1);
	assert.strictEqual(occs[0].context, "string");
});

test("namespace in single-quoted string → context: string", function () {
	const source = "jQuery.sap.declare('com.example.app.Component');";
	const occs = scan(source, NS_DEEP);
	assert.strictEqual(occs.length, 1);
	assert.strictEqual(occs[0].context, "string");
});

test("namespace in template literal → context: string", function () {
	const source = '`Module com.example.app.utils.Helper loaded`;';
	const occs = scan(source, NS_DEEP);
	assert.strictEqual(occs.length, 1);
	assert.strictEqual(occs[0].context, "string");
});

test("namespace in line comment → not reported", function () {
	const source = '// com.example.app.utils.OldStuff was removed';
	const occs = scan(source, NS_DEEP);
	assert.strictEqual(occs.length, 0);
});

test("namespace in block comment → not reported", function () {
	const source = '/* com.example.app.model.OldModel is deprecated */';
	const occs = scan(source, NS_DEEP);
	assert.strictEqual(occs.length, 0);
});

test("namespace without trailing dot → not reported (not a property access)", function () {
	const source = 'var x = "com.example.app";';
	const occs = scan(source, NS_DEEP);
	assert.strictEqual(occs.length, 0);
});

test("namespace preceded by word char → not reported (partial match)", function () {
	const source = 'var xcom.example.app.foo = 1;';
	const occs = scan(source, NS_DEEP);
	assert.strictEqual(occs.length, 0);
});

// --- sap.ui.controller() string argument (the bug that motivated the script) ---

test("sap.ui.controller(\"ns.controller.Name\") → string, not code (deep ns)", function () {
	const source = 'var oController = new sap.ui.controller("com.example.app.controller.Booklet");';
	const occs = scan(source, NS_DEEP);
	assert.strictEqual(occs.length, 1);
	assert.strictEqual(occs[0].context, "string");
});

test("sap.ui.controller(\"ns.controller.Name\") → string, not code (short ns)", function () {
	const source = 'sap.ui.controller("my.app.ext.controller.ObjectPageExt").loadNSave();';
	const occs = scan(source, NS_SHORT);
	assert.strictEqual(occs.length, 1);
	assert.strictEqual(occs[0].context, "string");
});

// --- EventBus subscribe with namespace string ---

test("oEventBus.subscribe(\"ns.controller\", ...) → string", function () {
	const source = 'oEventBus.subscribe("my.app.ext.controller.ListReportExt", "onLoadPersOk", this.handler, this);';
	const occs = scan(source, NS_SHORT);
	assert.strictEqual(occs.length, 1);
	assert.strictEqual(occs[0].context, "string");
});

// --- EventBus publish with namespace string ---

test("oEventBus.publish(\"ns.controller\", ...) → string", function () {
	const source = 'oEventBus.publish("my.app.ext.controller.Chart", "onbarSelection", {});';
	const occs = scan(source, NS_SHORT);
	assert.strictEqual(occs.length, 1);
	assert.strictEqual(occs[0].context, "string");
});

// --- jQuery.sap.declare with namespace string ---

test("jQuery.sap.declare(\"ns.Component\") → string", function () {
	const source = 'jQuery.sap.declare("com.example.app.utils.Formatter");';
	const occs = scan(source, NS_DEEP);
	assert.strictEqual(occs.length, 1);
	assert.strictEqual(occs[0].context, "string");
});

// --- sap.ui.xmlfragment with namespace string ---

test("sap.ui.xmlfragment(\"ns.fragment.Name\") → string", function () {
	const source = 'this._oDialog = sap.ui.xmlfragment("com.example.app.fragment.DataLossWarning", this);';
	const occs = scan(source, NS_DEEP);
	assert.strictEqual(occs.length, 1);
	assert.strictEqual(occs[0].context, "string");
});

// --- fragment name stored in variable as string ---

test("fragment name in variable → string", function () {
	const source = 'var sFragmentName = "com.example.app.fragment.report.SmartChart";';
	const occs = scan(source, NS_DEEP);
	assert.strictEqual(occs.length, 1);
	assert.strictEqual(occs[0].context, "string");
});

// --- _sFileName property with namespace string ---

test("_sFileName property with namespace string → string", function () {
	const source = '_sFileName: "com.example.app.Component",';
	const occs = scan(source, NS_DEEP);
	assert.strictEqual(occs.length, 1);
	assert.strictEqual(occs[0].context, "string");
});

// --- Object.extend() string argument ---

test("Object.extend(\"ns.utils.AppHelper\") → string", function () {
	const source = 'var AppHelper = Object.extend("my.app.ext.utils.AppHelper", {});';
	const occs = scan(source, NS_SHORT);
	assert.strictEqual(occs.length, 1);
	assert.strictEqual(occs[0].context, "string");
});

// --- viewNamespace property ---

test("viewNamespace: \"ns.ext.view.\" → string", function () {
	const source = 'viewNamespace: "my.app.ext.view.",';
	const occs = scan(source, NS_SHORT);
	assert.strictEqual(occs.length, 1);
	assert.strictEqual(occs[0].context, "string");
});

// --- Opa5.extend() string argument ---

test("Opa5.extend(\"ns.test.pages.Common\") → string", function () {
	const source = 'return Opa5.extend("my.app.test.integration.pages.Common", {});';
	const occs = scan(source, NS_SHORT);
	assert.strictEqual(occs.length, 1);
	assert.strictEqual(occs[0].context, "string");
});

// --- Facet ID strings with namespace followed by :: ---

test("facet ID with namespace followed by :: → no match (no trailing dot)", function () {
	const source = 'var sId = "my.app::sap.suite.ui.generic.template.ObjectPage.view.Details::C_WorkCenter";';
	const occs = scan(source, NS_SHORT);
	assert.strictEqual(occs.length, 0);
});

// --- Mixed: code occurrence on same line as string occurrence ---

test("code and string on same line → both detected with correct context", function () {
	const source = 'var x = com.example.app.utils.Helper; // "com.example.app.x"';
	const occs = scan(source, NS_DEEP);
	assert.strictEqual(occs.length, 1);
	assert.strictEqual(occs[0].context, "code");
});

// --- Escaped quote inside string should not break string detection ---

test("escaped quote inside string → namespace stays in string context", function () {
	const source = 'var s = "escaped \\" com.example.app.Component \\".";';
	const occs = scan(source, NS_DEEP);
	assert.strictEqual(occs.length, 1);
	assert.strictEqual(occs[0].context, "string");
});

// --- Multiple occurrences across contexts ---

test("multiple occurrences in different contexts", function () {
	const source = [
		'// comment: com.example.app.removed',
		'var x = com.example.app.utils.Helper;',
		'Controller.extend("com.example.app.controller.Main", {',
		'    return com.example.app.utils.Formatter;',
		'});'
	].join("\n");
	const occs = scan(source, NS_DEEP);
	const code = findByContext(occs, "code");
	const str = findByContext(occs, "string");
	assert.strictEqual(code.length, 2);
	assert.strictEqual(str.length, 1);
	assert.strictEqual(code[0].line, 2);
	assert.strictEqual(code[1].line, 4);
	assert.strictEqual(str[0].line, 3);
});

// ===========================================================================
// classifyCodeOccurrence — pattern classification
// ===========================================================================

console.log("--- classifyCodeOccurrence: pattern classification ---");

// --- Global Assignment: ns.Module = { object literal } ---

test("global_assignment: namespace = { object literal }", function () {
	const source = [
		'sap.ui.define([], function() {',
		'    "use strict";',
		'    com.example.app.test.opa.utils.FilterTestScripts = {',
		'        runTests: function() {}',
		'    };',
		'});'
	].join("\n");
	const results = classify(source, NS_DEEP, "webapp/test/opa/scripts/FilterTestScripts.js");
	assert.strictEqual(results.length, 1);
	assert.strictEqual(results[0].type, "global_assignment");
	assert.strictEqual(results[0].moduleName, "FilterTestScripts");
});

test("global_assignment: namespace = jQuery.proxy(...)", function () {
	const source = '    com.example.app.utils.Persistence.getNewPage = jQuery.proxy(function() {}, this);';
	const results = classify(source, NS_DEEP, "webapp/utils/Persistence.js");
	assert.strictEqual(results.length, 1);
	assert.strictEqual(results[0].type, "global_assignment");
});

// --- Global Return ---

test("global_return: return namespace.Module", function () {
	const source = [
		'    };',
		'    return com.example.app.test.opa.utils.DefaultValuesTestScripts;',
		'});'
	].join("\n");
	const results = classify(source, NS_DEEP, "webapp/test/opa/scripts/DefaultValuesTestScripts.js");
	assert.strictEqual(results.length, 1);
	assert.strictEqual(results[0].type, "global_return");
	assert.strictEqual(results[0].moduleName, "DefaultValuesTestScripts");
});

test("global_return: return with leading whitespace", function () {
	const source = '        return com.example.app.test.opa.utils.FilterTestScripts;';
	const results = classify(source, NS_DEEP, "webapp/test/opa/scripts/FilterTestScripts.js");
	assert.strictEqual(results.length, 1);
	assert.strictEqual(results[0].type, "global_return");
});

// --- Global Read: var/let/const = ns.Module ---

test("global_read: var x = namespace.Module", function () {
	const source = '    var oTableManager = com.example.app.utils.ReportTableManager;';
	const results = classify(source, NS_DEEP, "webapp/controller/ObjectList.controller.js");
	assert.strictEqual(results.length, 1);
	assert.strictEqual(results[0].type, "global_read");
	assert.strictEqual(results[0].moduleName, "ReportTableManager");
});

test("global_read: var x = namespace.Module.method()", function () {
	const source = '    var oValidation = com.example.app.utils.Validations.validateTitle(sTitle, "REP");';
	const results = classify(source, NS_DEEP, "webapp/controller/CreatePage.controller.js");
	assert.strictEqual(results.length, 1);
	assert.strictEqual(results[0].type, "global_read");
});

test("global_read: var with nested namespace", function () {
	const source = '            var oMiniTileManager = com.example.app.utils.report.MiniTileManager;';
	const results = classify(source, NS_DEEP, "webapp/utils/report/MiniTileManager.js");
	assert.strictEqual(results.length, 1);
	assert.strictEqual(results[0].type, "global_read");
	assert.strictEqual(results[0].moduleName, "MiniTileManager");
});

// --- Global Read: namespace as function argument (jQuery.proxy) ---

test("global_read: jQuery.proxy(namespace.method, this)", function () {
	const source = '    jQuery.proxy(com.example.app.utils.Favorites.handleAddRemove, this)(oEvent);';
	const results = classify(source, NS_DEEP, "webapp/controller/ObjectList.controller.js");
	assert.strictEqual(results.length, 1);
	assert.strictEqual(results[0].type, "global_read");
	assert.strictEqual(results[0].moduleName, "Favorites");
});

// --- Global Read: namespace after new keyword ---

test("global_read: new namespace.Module()", function () {
	const source = '    oHelper = new my.app.ext.utils.AppHelper().getInstance();';
	const results = classify(source, NS_SHORT, "webapp/Component.js");
	assert.strictEqual(results.length, 1);
	assert.strictEqual(results[0].moduleName, "AppHelper");
});

// --- Global Read: namespace in ternary ---

test("global_read: namespace in ternary expression", function () {
	const source = '    ? [com.example.app.utils.FilterManager.getNewFilterData(oModel)]';
	const results = classify(source, NS_DEEP, "webapp/utils/FilterManager.js");
	assert.strictEqual(results.length, 1);
	assert.strictEqual(results[0].moduleName, "FilterManager");
});

// --- Global Method Call ---

test("global_method_call: namespace.Module.method()", function () {
	const source = '    com.example.app.utils.TableManager.closeDialog("CreateReport", "reportDialog");';
	const results = classify(source, NS_DEEP, "webapp/controller/ObjectList.controller.js");
	assert.strictEqual(results.length, 1);
	assert.strictEqual(results[0].type, "global_method_call");
	assert.strictEqual(results[0].moduleName, "TableManager");
});

test("global_method_call: namespace._privateMethod()", function () {
	const source = '    com.example.app.utils.DataRequestManager._getEntityDetails(oModel, sPath);';
	const results = classify(source, NS_DEEP, "webapp/utils/DataRequestManager.js");
	assert.strictEqual(results.length, 1);
	assert.strictEqual(results[0].type, "global_method_call");
	assert.strictEqual(results[0].moduleName, "DataRequestManager");
});

test("global_method_call: chained after &&", function () {
	const source = '    && com.example.app.utils.CopyDialogManager.selectParentNode(oNode);';
	const results = classify(source, NS_DEEP, "webapp/utils/CopyDialogManager.js");
	assert.strictEqual(results.length, 1);
	assert.strictEqual(results[0].type, "global_method_call");
});

test("global_method_call: return !namespace.method()", function () {
	const source = '    return !(com.example.app.utils.Formatter.checkIfDelivered(sLandscape, sNs));';
	const results = classify(source, NS_DEEP, "webapp/utils/Formatter.js");
	assert.strictEqual(results.length, 1);
	assert.strictEqual(results[0].type, "global_method_call");
});

test("global_method_call: namespace.Module.applyRebind(this)", function () {
	const source = '            com.example.app.utils.ReportManager.applyRebind(this);';
	const results = classify(source, NS_DEEP, "webapp/utils/report/SettingsDialogManager.js");
	assert.strictEqual(results.length, 1);
	assert.strictEqual(results[0].type, "global_method_call");
});

// --- Global Mock ---

test("global_mock: jQuery.extend(true, {}, namespace) backup", function () {
	const source = '    var oUtilsBackup = jQuery.extend(true, {}, com.example.app.utils);';
	const results = classify(source, NS_DEEP, "webapp/test/qunit/utils/Formatter.js");
	assert.strictEqual(results.length, 1);
	assert.strictEqual(results[0].type, "global_mock");
});

test("global_mock: namespace.method = function in test file", function () {
	const source = '    com.example.app.utils.CommonActions.getInvalidParams = function() { return []; };';
	const results = classify(source, NS_DEEP, "webapp/test/qunit/utils/Formatter.js");
	assert.strictEqual(results.length, 1);
	assert.strictEqual(results[0].type, "global_mock");
});

test("global_assignment (not mock): namespace.method = function in NON-test file", function () {
	const source = '    com.example.app.utils.CommonActions.getItems = function() { return []; };';
	const results = classify(source, NS_DEEP, "webapp/utils/CommonActions.js");
	assert.strictEqual(results.length, 1);
	assert.strictEqual(results[0].type, "global_assignment");
});

// --- == and === should NOT be classified as assignment ---

test("namespace == value → global_read, not global_assignment", function () {
	const source = '    if (com.example.app.utils.Mode == "EDIT") {}';
	const results = classify(source, NS_DEEP, "webapp/controller/Main.controller.js");
	assert.strictEqual(results.length, 1);
	assert.strictEqual(results[0].type, "global_read");
});

test("namespace === value → global_read, not global_assignment", function () {
	const source = '    if (com.example.app.utils.Mode === "EDIT") {}';
	const results = classify(source, NS_DEEP, "webapp/controller/Main.controller.js");
	assert.strictEqual(results.length, 1);
	assert.strictEqual(results[0].type, "global_read");
});

// --- Module name extraction ---

test("moduleName: picks capitalized segment", function () {
	const source = '    var x = com.example.app.utils.Favorites.handleAddRemove;';
	const results = classify(source, NS_DEEP, "webapp/controller/Main.controller.js");
	assert.strictEqual(results[0].moduleName, "Favorites");
});

test("moduleName: nested path picks first capitalized", function () {
	const source = '    var x = com.example.app.utils.report.MiniTileManager;';
	const results = classify(source, NS_DEEP, "webapp/utils/report/MiniTileManager.js");
	assert.strictEqual(results[0].moduleName, "MiniTileManager");
});

test("moduleName: all lowercase → picks last segment", function () {
	const source = '    var x = com.example.app.utils.formatter;';
	const results = classify(source, NS_DEEP, "webapp/model/formatter.js");
	assert.strictEqual(results[0].moduleName, "formatter");
});

// --- namespacePath extraction ---

test("namespacePath: full dotted path captured", function () {
	const source = '    com.example.app.utils.ReportManager.applyRebind(this);';
	const results = classify(source, NS_DEEP, "webapp/utils/ReportManager.js");
	assert.strictEqual(results[0].namespacePath, "com.example.app.utils.ReportManager.applyRebind");
});

// ===========================================================================
// detectQUnitIssues
// ===========================================================================

console.log("--- detectQUnitIssues ---");

// --- Non-test files → no findings ---

test("non-test file returns empty", function () {
	const source = 'ok(true, "test");';
	const lines = source.split("\n");
	const findings = detectQUnitIssues(source, "webapp/controller/Main.controller.js", lines);
	assert.strictEqual(findings.length, 0);
});

// --- Pattern 5: Missing assert param ---

test("missing_assert_param: QUnit.test with function() and assert. usage", function () {
	const source = [
		'QUnit.test("handleDialogUpdate", function(){',
		'    var stub = sandbox.stub(itemsBinding, "filter");',
		'    var oController = new sap.ui.controller("ns.controller.App");',
		'    oController.handleDialogUpdate(itemsBinding, searchValue);',
		'    assert.ok(stub.called);',
		'});'
	].join("\n");
	const lines = source.split("\n");
	const findings = detectQUnitIssues(source, "webapp/test/qunit/controller/App.js", lines);
	const missing = findings.filter(f => f.type === "missing_assert_param");
	assert.strictEqual(missing.length, 1);
	assert.strictEqual(missing[0].line, 1);
});

test("missing_assert_param: NOT triggered when function(assert) is present", function () {
	const source = [
		'QUnit.test("test name", function(assert){',
		'    assert.ok(true);',
		'});'
	].join("\n");
	const lines = source.split("\n");
	const findings = detectQUnitIssues(source, "webapp/test/unit/test.js", lines);
	const missing = findings.filter(f => f.type === "missing_assert_param");
	assert.strictEqual(missing.length, 0);
});

test("missing_assert_param: NOT triggered when function() body has no assert.", function () {
	const source = [
		'QUnit.test("no assert usage", function(){',
		'    console.log("just logging");',
		'});'
	].join("\n");
	const lines = source.split("\n");
	const findings = detectQUnitIssues(source, "webapp/test/unit/test.js", lines);
	const missing = findings.filter(f => f.type === "missing_assert_param");
	assert.strictEqual(missing.length, 0);
});

// --- Pattern 6a: QUnit.ok(), QUnit.equal() ---

test("qunit_global_assertion: QUnit.ok() in OPA file → Opa5.assert.ok", function () {
	const source = '    QUnit.ok(true, "Selected chart in dialog");';
	const lines = source.split("\n");
	const findings = detectQUnitIssues(source, "webapp/test/opa/utils/SettingsDialogUtils.js", lines);
	const qunit = findings.filter(f => f.type === "qunit_global_assertion");
	assert.strictEqual(qunit.length, 1);
	assert.strictEqual(qunit[0].assertionName, "ok");
	assert.strictEqual(qunit[0].replacement, "Opa5.assert.ok");
});

test("qunit_global_assertion: QUnit.ok() in unit test → assert.ok", function () {
	const source = '    QUnit.ok(result, "check passed");';
	const lines = source.split("\n");
	const findings = detectQUnitIssues(source, "webapp/test/unit/formatter.qunit.js", lines);
	const qunit = findings.filter(f => f.type === "qunit_global_assertion");
	assert.strictEqual(qunit.length, 1);
	assert.strictEqual(qunit[0].replacement, "assert.ok");
});

test("qunit_global_assertion: QUnit.equal()", function () {
	const source = '    QUnit.equal(1, 1, "numbers match");';
	const lines = source.split("\n");
	const findings = detectQUnitIssues(source, "webapp/test/unit/test.js", lines);
	const qunit = findings.filter(f => f.type === "qunit_global_assertion");
	assert.strictEqual(qunit.length, 1);
	assert.strictEqual(qunit[0].assertionName, "equal");
});

test("qunit_global_assertion: QUnit.strictEqual()", function () {
	const source = '    QUnit.strictEqual(a, b, "strict");';
	const lines = source.split("\n");
	const findings = detectQUnitIssues(source, "webapp/test/unit/test.js", lines);
	const qunit = findings.filter(f => f.type === "qunit_global_assertion");
	assert.strictEqual(qunit.length, 1);
	assert.strictEqual(qunit[0].assertionName, "strictEqual");
});

test("qunit_global_assertion: QUnit.deepEqual()", function () {
	const source = '    QUnit.deepEqual({a: 1}, {a: 1}, "deep");';
	const lines = source.split("\n");
	const findings = detectQUnitIssues(source, "webapp/test/unit/test.js", lines);
	const qunit = findings.filter(f => f.type === "qunit_global_assertion");
	assert.strictEqual(qunit.length, 1);
	assert.strictEqual(qunit[0].assertionName, "deepEqual");
});

// --- Pattern 6b: Bare global assertions ---

test("bare_global_assertion: ok() in OPA file → Opa5.assert.ok", function () {
	const source = [
		'            success : function() {',
		'                ok(true, sCheckMessage + " - has passed");',
		'            },'
	].join("\n");
	const lines = source.split("\n");
	const findings = detectQUnitIssues(source, "webapp/test/opa/utils/LanguageUtils.js", lines);
	const bare = findings.filter(f => f.type === "bare_global_assertion");
	assert.strictEqual(bare.length, 1);
	assert.strictEqual(bare[0].assertionName, "ok");
	assert.strictEqual(bare[0].replacement, "Opa5.assert.ok");
});

test("bare_global_assertion: ok(false, ...) error case", function () {
	const source = [
		'            error: function () {',
		'                ok(false, sTestName + " Test Failed");',
		'            }'
	].join("\n");
	const lines = source.split("\n");
	const findings = detectQUnitIssues(source, "webapp/test/opa/utils/ObjectListUtils.js", lines);
	const bare = findings.filter(f => f.type === "bare_global_assertion");
	assert.strictEqual(bare.length, 1);
	assert.strictEqual(bare[0].assertionName, "ok");
});

test("bare_global_assertion: ok() in unit test → assert.ok", function () {
	const source = '    ok(true, "bare ok");';
	const lines = source.split("\n");
	const findings = detectQUnitIssues(source, "webapp/test/unit/formatter.qunit.js", lines);
	const bare = findings.filter(f => f.type === "bare_global_assertion");
	assert.strictEqual(bare.length, 1);
	assert.strictEqual(bare[0].replacement, "assert.ok");
});

test("bare_global_assertion: equal() in unit test", function () {
	const source = '    equal(1, 1, "bare equal");';
	const lines = source.split("\n");
	const findings = detectQUnitIssues(source, "webapp/test/unit/test.js", lines);
	const bare = findings.filter(f => f.type === "bare_global_assertion");
	assert.strictEqual(bare.length, 1);
	assert.strictEqual(bare[0].assertionName, "equal");
});

test("bare_global_assertion: deepEqual() in unit test", function () {
	const source = '    deepEqual({a: 1}, {a: 1}, "bare deep");';
	const lines = source.split("\n");
	const findings = detectQUnitIssues(source, "webapp/test/unit/test.js", lines);
	const bare = findings.filter(f => f.type === "bare_global_assertion");
	assert.strictEqual(bare.length, 1);
	assert.strictEqual(bare[0].assertionName, "deepEqual");
});

test("bare_global_assertion: strictEqual() in unit test", function () {
	const source = '    strictEqual(a, b, "bare strict");';
	const lines = source.split("\n");
	const findings = detectQUnitIssues(source, "webapp/test/unit/test.js", lines);
	const bare = findings.filter(f => f.type === "bare_global_assertion");
	assert.strictEqual(bare.length, 1);
	assert.strictEqual(bare[0].assertionName, "strictEqual");
});

// --- Bare assertion NOT triggered when properly prefixed ---

test("bare ok NOT triggered when prefixed with assert.", function () {
	const source = '    assert.ok(true, "properly prefixed");';
	const lines = source.split("\n");
	const findings = detectQUnitIssues(source, "webapp/test/unit/test.js", lines);
	const bare = findings.filter(f => f.type === "bare_global_assertion");
	assert.strictEqual(bare.length, 0);
});

test("bare ok NOT triggered when prefixed with Opa5.assert.", function () {
	const source = '    Opa5.assert.ok(true, "properly prefixed");';
	const lines = source.split("\n");
	const findings = detectQUnitIssues(source, "webapp/test/integration/test.js", lines);
	const bare = findings.filter(f => f.type === "bare_global_assertion");
	assert.strictEqual(bare.length, 0);
});

test("bare ok NOT triggered for function definition", function () {
	const source = '    function ok(val) { return !!val; }';
	const lines = source.split("\n");
	const findings = detectQUnitIssues(source, "webapp/test/unit/test.js", lines);
	const bare = findings.filter(f => f.type === "bare_global_assertion");
	assert.strictEqual(bare.length, 0);
});

test("bare ok NOT triggered for object property { ok: value }", function () {
	const source = '    var obj = { ok: true };';
	const lines = source.split("\n");
	const findings = detectQUnitIssues(source, "webapp/test/unit/test.js", lines);
	const bare = findings.filter(f => f.type === "bare_global_assertion");
	assert.strictEqual(bare.length, 0);
});

test("bare ok IS triggered after function body open brace on previous line", function () {
	const source = [
		'QUnit.test("test", function(assert) {',
		'    ok(true, "bare ok in body");',
		'});'
	].join("\n");
	const lines = source.split("\n");
	const findings = detectQUnitIssues(source, "webapp/test/unit/test.js", lines);
	const bare = findings.filter(f => f.type === "bare_global_assertion");
	assert.strictEqual(bare.length, 1);
	assert.strictEqual(bare[0].line, 2);
});

// --- ok() in OPA integration test ---

test("bare_global_assertion: ok() in integration test → Opa5.assert.ok", function () {
	const source = [
		'    success: function (chart) {',
		'        ok(chart, "The chart is ready");',
		'    },'
	].join("\n");
	const lines = source.split("\n");
	const findings = detectQUnitIssues(source, "webapp/test/integration/pages/ObjectPage.js", lines);
	const bare = findings.filter(f => f.type === "bare_global_assertion");
	assert.strictEqual(bare.length, 1);
	assert.strictEqual(bare[0].replacement, "Opa5.assert.ok");
});

// --- Multiple assertion types in one source ---

test("multiple QUnit assertion types detected", function () {
	const source = [
		'    QUnit.ok(true, "ok");',
		'    QUnit.equal(1, 1, "equal");',
		'    QUnit.notEqual(1, 2, "notEqual");',
		'    QUnit.strictEqual(a, b, "strict");',
		'    QUnit.deepEqual({}, {}, "deep");',
		'    QUnit.throws(fn, "throws");'
	].join("\n");
	const lines = source.split("\n");
	const findings = detectQUnitIssues(source, "webapp/test/unit/test.js", lines);
	const qunit = findings.filter(f => f.type === "qunit_global_assertion");
	assert.strictEqual(qunit.length, 6);
	const names = qunit.map(q => q.assertionName);
	assert(names.includes("ok"));
	assert(names.includes("equal"));
	assert(names.includes("notEqual"));
	assert(names.includes("strictEqual"));
	assert(names.includes("deepEqual"));
	assert(names.includes("throws"));
});

// ===========================================================================
// Integration: end-to-end with full files
// ===========================================================================

console.log("--- Integration: realistic full file patterns ---");

// --- OPA test script: assignment + return + bare assertions ---

test("OPA test script: assignment, return, bare assertions", function () {
	const source = [
		'sap.ui.define([], function() {',
		'    "use strict";',
		'',
		'    com.example.app.test.opa.utils.TestScripts = {',
		'        runTests: function(Given, When, Then) {',
		'            Then.waitFor({',
		'                success: function() {',
		'                    ok(true, "Test passed");',
		'                }',
		'            });',
		'        }',
		'    };',
		'',
		'    return com.example.app.test.opa.utils.TestScripts;',
		'});'
	].join("\n");
	const occs = scan(source, NS_DEEP);
	const code = findByContext(occs, "code");
	assert.strictEqual(code.length, 2);

	const results = code.map(occ => classifyCodeOccurrence(occ, source, "webapp/test/opa/utils/TestScripts.js", NS_DEEP));
	assert.strictEqual(results[0].type, "global_assignment");
	assert.strictEqual(results[1].type, "global_return");

	const lines = source.split("\n");
	const qunitFindings = detectQUnitIssues(source, "webapp/test/opa/utils/TestScripts.js", lines);
	const bare = qunitFindings.filter(f => f.type === "bare_global_assertion");
	assert.strictEqual(bare.length, 1);
	assert.strictEqual(bare[0].replacement, "Opa5.assert.ok");
});

// --- Formatter test: mock backup + read + mock override ---

test("formatter test: mock backup, read, mock override", function () {
	const source = [
		'sap.ui.define(["com/example/app/utils/Formatter"], function(FormatterModule) {',
		'    QUnit.test("showMergeButton", function(assert) {',
		'        var oUtilsBackup = jQuery.extend(true, {}, com.example.app.utils);',
		'        var oFormatter = com.example.app.utils.Formatter;',
		'        com.example.app.utils.CommonActions.getInvalidParams = function() {',
		'            return [];',
		'        };',
		'        assert.strictEqual(oFormatter.showMergeButton(), false);',
		'    });',
		'});'
	].join("\n");
	const results = classify(source, NS_DEEP, "webapp/test/qunit/utils/Formatter.js");
	assert.strictEqual(results.length, 3);
	assert.strictEqual(results[0].type, "global_mock");
	assert.strictEqual(results[1].type, "global_read");
	assert.strictEqual(results[2].type, "global_mock");
});

// --- Component: global read as code, extend() as string ---

test("Component.js: new ns.Module() as code, extend() as string", function () {
	const source = [
		'jQuery.sap.declare("my.app.Component");',
		'sap.ui.generic.app.AppComponent.extend("my.app.Component", {',
		'    metadata: { "manifest": "json" },',
		'    onAfterRendering: function() {',
		'        oHelper = new my.app.ext.utils.AppHelper().getInstance();',
		'    }',
		'});'
	].join("\n");
	const occs = scan(source, NS_SHORT);
	const code = findByContext(occs, "code");
	const str = findByContext(occs, "string");
	assert.strictEqual(code.length, 1);
	assert.strictEqual(str.length, 2);
	assert.strictEqual(code[0].line, 5);
});

// --- Controller: many string skips (EventBus, sap.ui.controller) ---

test("controller with EventBus + sap.ui.controller all skipped", function () {
	const source = [
		'sap.ui.define(["sap/ui/core/mvc/Controller"], function(Controller) {',
		'    return Controller.extend("my.app.ext.controller.Chart", {',
		'        onInit: function() {',
		'            var oEventBus = sap.ui.getCore().getEventBus();',
		'            oEventBus.subscribe("my.app.ext.controller.ListReportExt", "onLoadPersOk", this.handler, this);',
		'            oEventBus.publish("my.app.ext.controller.Chart", "onbarSelection", {});',
		'        },',
		'        onSave: function() {',
		'            sap.ui.controller("my.app.ext.controller.ObjectPageExt").loadNSave();',
		'        }',
		'    });',
		'});'
	].join("\n");
	const occs = scan(source, NS_SHORT);
	const code = findByContext(occs, "code");
	const str = findByContext(occs, "string");
	assert.strictEqual(code.length, 0);
	assert.strictEqual(str.length, 4);
});

// --- Mixed code + string on same line ---

test("code occurrence not confused by string on same line", function () {
	const source = [
		'sap.ui.define([], function() {',
		'    com.example.app.utils.ChartManager = {',
		'        init: function() {',
		'            var sFragmentName = "com.example.app.fragment.report.SmartChart";',
		'            var oFrag = new sap.ui.xmlfragment(sFragmentName);',
		'        }',
		'    };',
		'    return com.example.app.utils.ChartManager;',
		'});'
	].join("\n");
	const occs = scan(source, NS_DEEP);
	const code = findByContext(occs, "code");
	const str = findByContext(occs, "string");
	assert.strictEqual(code.length, 2);
	assert.strictEqual(str.length, 1);
	assert.strictEqual(code[0].line, 2);
	assert.strictEqual(code[1].line, 8);
	assert.strictEqual(str[0].line, 4);
});

// --- Short namespace doesn't false-match longer names ---

test("short namespace doesn't false-match within longer word", function () {
	const source = 'var xmy.app.ext.Foo;';
	const occs = scan(source, NS_SHORT);
	assert.strictEqual(occs.length, 0);
});

// --- Line numbers and columns are accurate ---

test("line numbers and columns are accurate across multiple lines", function () {
	const source = [
		'// line 1',
		'// line 2',
		'    var x = com.example.app.utils.Helper;',
		'// line 4',
		'    return com.example.app.utils.Formatter;'
	].join("\n");
	const occs = scan(source, NS_DEEP);
	assert.strictEqual(occs.length, 2);
	assert.strictEqual(occs[0].line, 3);
	assert.strictEqual(occs[0].column, 13);
	assert.strictEqual(occs[1].line, 5);
	assert.strictEqual(occs[1].column, 12);
});

// ===========================================================================
// detectLegacyJQueryDeps — Pattern 8
// ===========================================================================

console.log("--- detectLegacyJQueryDeps ---");

test("legacy_jquery_dep: double-quoted jquery.sap.global detected", function () {
	const source = [
		'sap.ui.define([',
		'    "sap/ui/core/mvc/Controller",',
		'    "jquery.sap.global"',
		'], function(Controller, jQuery) {',
		'    "use strict";',
		'});'
	].join("\n");
	const lines = source.split("\n");
	const findings = detectLegacyJQueryDeps(source, "webapp/controller/Main.controller.js", lines);
	assert.strictEqual(findings.length, 1);
	assert.strictEqual(findings[0].type, "legacy_jquery_dep");
	assert.strictEqual(findings[0].line, 3);
	assert.strictEqual(findings[0].replacement, '"sap/ui/thirdparty/jquery"');
});

test("legacy_jquery_dep: single-quoted jquery.sap.global detected", function () {
	const source = "sap.ui.define(['jquery.sap.global'], function(jQuery) {});";
	const lines = source.split("\n");
	const findings = detectLegacyJQueryDeps(source, "webapp/utils/Helper.js", lines);
	assert.strictEqual(findings.length, 1);
	assert.strictEqual(findings[0].type, "legacy_jquery_dep");
});

test("legacy_jquery_dep: no false positive for sap/ui/thirdparty/jquery", function () {
	const source = 'sap.ui.define(["sap/ui/thirdparty/jquery"], function(jQuery) {});';
	const lines = source.split("\n");
	const findings = detectLegacyJQueryDeps(source, "webapp/controller/Main.controller.js", lines);
	assert.strictEqual(findings.length, 0);
});

test("legacy_jquery_dep: multiple occurrences in same file", function () {
	const source = [
		'sap.ui.define(["jquery.sap.global"], function(jQuery) {});',
		'sap.ui.require(["jquery.sap.global"], function(jQuery) {});'
	].join("\n");
	const lines = source.split("\n");
	const findings = detectLegacyJQueryDeps(source, "webapp/Component.js", lines);
	assert.strictEqual(findings.length, 2);
});

// ===========================================================================
// Results
// ===========================================================================

console.log(`\n${"=".repeat(60)}`);
console.log(`Tests: ${passed + failed} total, ${passed} passed, ${failed} failed`);
if (failures.length > 0) {
	console.log("\nFailed tests:");
	for (const f of failures) {
		console.log(`  - ${f.name}: ${f.message}`);
	}
}
console.log(`${"=".repeat(60)}`);
process.exit(failed > 0 ? 1 : 0);
