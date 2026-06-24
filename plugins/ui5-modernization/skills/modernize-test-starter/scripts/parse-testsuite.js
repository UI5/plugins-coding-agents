#!/usr/bin/env node
/**
 * parse-testsuite.js
 *
 * Parses a UI5 project's test infrastructure to extract all test entries.
 * Auto-detects the test pattern:
 *   Pattern A: Single HTML + AllJourneys.js orchestrator
 *   Pattern B: Many individual HTML files per test
 *
 * Outputs a JSON mapping suitable for building testsuite.qunit.js entries.
 *
 * Usage:
 *   node parse-testsuite.js <testsuite.qunit.html> <test-base-dir> <namespace>
 *   node parse-testsuite.js --scan-bootstrap-overrides <test-base-dir>
 *   node parse-testsuite.js --detect-launcher <test-base-dir>
 *
 * The --scan-bootstrap-overrides mode walks every HTML file under the test
 * base dir and emits a JSON list of bootstrap override patterns
 * (sap.ui.define = ..., sap.ui.require = ..., defineModuleSync) that
 * cannot be auto-migrated to Test Starter and require manual review.
 *
 * The --detect-launcher mode scans every JS file under the test base dir
 * for OPA app-launcher calls AND every HTML file for FLP-sandbox load
 * markers, then combines the two into a single verdict the skill consumes:
 *   launcher: "iframe" | "in-window" | "mixed" | "none"
 *   flpSandbox: true when any test HTML loads sap/ushell/bootstrap/sandbox*
 *               or declares window["sap-ushell-config"]
 *   needsIframeMigration: true iff launcher === "in-window" && flpSandbox
 *
 * Phase 5b of the modernize-test-starter skill is gated on
 * `needsIframeMigration`. Pattern U projects with no FLP sandbox in their
 * legacy test pages are plain in-window apps — they do not depend on the
 * `sap.ushell.*` API and do not need the bare-Component iframe migration.
 *
 * Exports the same scan and parse helpers as a Node module so the unit
 * tests can drive them without spawning a child process.
 */

const fs = require("fs");
const path = require("path");

// =============================================
// Bootstrap override scan (point 2 — report-only)
// =============================================

/**
 * Patterns that indicate the legacy bootstrap monkey-patches the UI5 loader
 * or pre-registers a module synchronously. These are not migrated automatically
 * because the right replacement (sap.ui.predefine, removal, etc.) depends on
 * project-specific intent.
 *
 * Each pattern's `id` is stable so the report consumer can group findings.
 */
const BOOTSTRAP_OVERRIDE_PATTERNS = [
    {
        id: "sap.ui.define-override",
        regex: /sap\.ui\.define\s*=\s*/,
        note: "sap.ui.define is reassigned — fragile when dep arrays change. Replace with sap.ui.predefine for the modules being mocked."
    },
    {
        id: "sap.ui.require-override",
        regex: /sap\.ui\.require\s*=\s*/,
        note: "sap.ui.require is reassigned — interferes with Test Starter's module loading. Review and remove or replace."
    },
    {
        id: "defineModuleSync",
        regex: /sap\.ui\.loader\._\.defineModuleSync\s*\(|defineModuleSync\s*\(/,
        note: "defineModuleSync is too late once async loading has started. Replace with sap.ui.predefine placed before any sap.ui.require."
    }
];

/**
 * Returns true when the line is fully inside a single-line comment.
 * We deliberately do not strip block comments — the report is best-effort,
 * and a false positive in a /* ... *\/ block costs only a manual glance.
 */
function isCommentedOut(line, columnIndex) {
    const before = line.slice(0, columnIndex);
    const slashSlash = before.indexOf("//");
    return slashSlash !== -1;
}

/**
 * Walks `dir` recursively and returns absolute paths of every *.html file.
 */
function listHtmlFiles(dir) {
    const out = [];
    if (!fs.existsSync(dir)) {
        return out;
    }
    const stack = [dir];
    while (stack.length) {
        const current = stack.pop();
        const stat = fs.statSync(current);
        if (stat.isDirectory()) {
            for (const entry of fs.readdirSync(current)) {
                stack.push(path.join(current, entry));
            }
        } else if (stat.isFile() && current.endsWith(".html")) {
            out.push(current);
        }
    }
    return out;
}

/**
 * Scans the given HTML content for bootstrap override patterns.
 * Returns one finding per matched line. Pure function for testability.
 *
 * @param {string} content
 * @param {string} filePath used only to populate the finding's `file` field
 * @returns {Array<{file:string,line:number,patternId:string,snippet:string,note:string}>}
 */
function scanContentForBootstrapOverrides(content, filePath) {
    const findings = [];
    const lines = content.split(/\r?\n/);
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        for (const pattern of BOOTSTRAP_OVERRIDE_PATTERNS) {
            const match = pattern.regex.exec(line);
            if (!match) {
                continue;
            }
            if (isCommentedOut(line, match.index)) {
                continue;
            }
            findings.push({
                file: filePath,
                line: i + 1,
                patternId: pattern.id,
                snippet: line.trim(),
                note: pattern.note
            });
            // One finding per line is enough — multiple pattern hits on the
            // same line would only duplicate the manual-review entry.
            break;
        }
    }
    return findings;
}

/**
 * Scans every HTML file under `testBaseDir` for bootstrap override patterns.
 * Returns the aggregated findings list along with the set of files inspected.
 */
function scanBootstrapOverrides(testBaseDir) {
    const files = listHtmlFiles(testBaseDir);
    const findings = [];
    for (const file of files) {
        const content = fs.readFileSync(file, "utf-8");
        for (const finding of scanContentForBootstrapOverrides(content, file)) {
            findings.push(finding);
        }
    }
    return {
        scannedFileCount: files.length,
        findings
    };
}

// =============================================
// Launcher classification (iframe vs in-window)
// =============================================

/**
 * The OPA app-launcher shape determines whether the skill stops at Phase 5
 * (iframe already in place) or continues into Phase 5b (migrate the
 * in-window component start to a bare-Component iframe).
 *
 *   iStartMyAppInAFrame   -> Pattern I (iframe)
 *   iStartMyUIComponent   -> Pattern U (in-window)
 *
 * Both shapes coexisting is unsupported — Phase 5b assumes a uniform
 * starting point — so the scanner reports "mixed" and lets the skill halt.
 */
const LAUNCHER_PATTERNS = [
    { id: "iframe", regex: /\biStartMyAppInAFrame\b/ },
    { id: "in-window", regex: /\biStartMyUIComponent\b/ }
];

/**
 * Walks `dir` recursively and returns absolute paths of every *.js file.
 * The launcher scan only inspects JS — HTML files do not call iStartMy*.
 */
function listJsFiles(dir) {
    const out = [];
    if (!fs.existsSync(dir)) {
        return out;
    }
    const stack = [dir];
    while (stack.length) {
        const current = stack.pop();
        const stat = fs.statSync(current);
        if (stat.isDirectory()) {
            for (const entry of fs.readdirSync(current)) {
                stack.push(path.join(current, entry));
            }
        } else if (stat.isFile() && current.endsWith(".js")) {
            out.push(current);
        }
    }
    return out;
}

/**
 * Returns one finding per matched line for the given content. Pure for tests.
 *
 * @returns {Array<{file:string,line:number,launcher:string,snippet:string}>}
 */
function scanContentForLauncher(content, filePath) {
    const findings = [];
    const lines = content.split(/\r?\n/);
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        for (const pattern of LAUNCHER_PATTERNS) {
            const match = pattern.regex.exec(line);
            if (!match) {
                continue;
            }
            if (isCommentedOut(line, match.index)) {
                continue;
            }
            findings.push({
                file: filePath,
                line: i + 1,
                launcher: pattern.id,
                snippet: line.trim()
            });
        }
    }
    return findings;
}

/**
 * Scans every JS file under `testBaseDir` and classifies the project.
 * Returns hits split by launcher kind plus the summary verdict so the
 * skill (and its tests) can decide which branch to follow.
 */
function detectLauncher(testBaseDir) {
    const files = listJsFiles(testBaseDir);
    const iframeHits = [];
    const inWindowHits = [];
    for (const file of files) {
        const content = fs.readFileSync(file, "utf-8");
        for (const finding of scanContentForLauncher(content, file)) {
            if (finding.launcher === "iframe") {
                iframeHits.push(finding);
            } else if (finding.launcher === "in-window") {
                inWindowHits.push(finding);
            }
        }
    }
    let launcher;
    if (iframeHits.length && inWindowHits.length) {
        launcher = "mixed";
    } else if (iframeHits.length) {
        launcher = "iframe";
    } else if (inWindowHits.length) {
        launcher = "in-window";
    } else {
        launcher = "none";
    }
    return {
        launcher,
        scannedFileCount: files.length,
        iframeHits,
        inWindowHits
    };
}

// =============================================
// FLP sandbox load detection
// =============================================

/**
 * The bare-Component iframe migration (Phase 5b) only makes sense for apps
 * that already depend on the FLP runtime — i.e. their legacy test pages
 * load `sap/ushell/bootstrap/sandbox.js` (or one of its older variants)
 * or declare `window["sap-ushell-config"]`. Plain in-window apps with no
 * FLP coupling stay on `iStartMyUIComponent` and skip Phase 5b.
 *
 * The two markers are functionally interchangeable for the purpose of
 * the gate: either signals that the app's test setup wires in the FLP
 * shell or its sandbox stubs.
 */
const FLP_SANDBOX_PATTERNS = [
    {
        id: "sandbox-script",
        // Match script tag references to the UI5 ushell sandbox bootstrap,
        // including the older `flpSandbox.js` filename some templates ship.
        regex: /sap\/ushell\/bootstrap\/sandbox(?:[\w-]*)?\.js|\bflpSandbox\.js\b/
    },
    {
        id: "sap-ushell-config",
        // window["sap-ushell-config"] = ... declared inline in the HTML
        // is the other reliable FLP marker — only present when the page
        // intends to bring up the FLP shell or its sandbox stubs.
        regex: /window\s*\[\s*["']sap-ushell-config["']\s*\]\s*=/
    }
];

/**
 * Scans HTML content for FLP sandbox markers. Pure for testability.
 *
 * @returns {Array<{file:string,line:number,patternId:string,snippet:string}>}
 */
function scanContentForFlpSandbox(content, filePath) {
    const findings = [];
    const lines = content.split(/\r?\n/);
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        for (const pattern of FLP_SANDBOX_PATTERNS) {
            const match = pattern.regex.exec(line);
            if (!match) {
                continue;
            }
            if (isCommentedOut(line, match.index)) {
                continue;
            }
            findings.push({
                file: filePath,
                line: i + 1,
                patternId: pattern.id,
                snippet: line.trim()
            });
            // One finding per line is enough.
            break;
        }
    }
    return findings;
}

/**
 * Walks every HTML file under `testBaseDir` for FLP sandbox markers.
 */
function detectFlpSandbox(testBaseDir) {
    const files = listHtmlFiles(testBaseDir);
    const hits = [];
    for (const file of files) {
        const content = fs.readFileSync(file, "utf-8");
        for (const finding of scanContentForFlpSandbox(content, file)) {
            hits.push(finding);
        }
    }
    return {
        flpSandbox: hits.length > 0,
        scannedFileCount: files.length,
        hits
    };
}

// =============================================
// Pattern A: Single HTML + AllJourneys
// =============================================

function handlePatternA(html, testBaseDir, ctx) {
    const allJourneysJsonPath = ctx.allJourneysJsonPath;
    const allJourneysJsPath = ctx.allJourneysJsPath;
    const hasAllJourneysJson = ctx.hasAllJourneysJson;
    const hasAllJourneysJs = ctx.hasAllJourneysJs;

    let journeys = [];
    if (hasAllJourneysJson) {
        journeys = JSON.parse(fs.readFileSync(allJourneysJsonPath, "utf-8"));
        console.error(`Found ${journeys.length} journeys in AllJourneys.json`);
    }

    let opaConfig = {};
    let pageObjects = [];
    let arrangementClass = null;

    if (hasAllJourneysJs) {
        const jsContent = fs.readFileSync(allJourneysJsPath, "utf-8");

        const arrangementsMatch = jsContent.match(/arrangements\s*:\s*new\s+(\w+)\s*\(/);
        if (arrangementsMatch) {
            arrangementClass = arrangementsMatch[1];
        }

        const viewNsMatch = jsContent.match(/viewNamespace\s*:\s*"([^"]+)"/);
        if (viewNsMatch) {
            opaConfig.viewNamespace = viewNsMatch[1];
        }

        const autoWaitMatch = jsContent.match(/autoWait\s*:\s*(true|false)/);
        if (autoWaitMatch) {
            opaConfig.autoWait = autoWaitMatch[1] === "true";
        }

        const timeoutMatch = jsContent.match(/timeout\s*:\s*(\d+)/);
        if (timeoutMatch) {
            opaConfig.timeout = parseInt(timeoutMatch[1]);
        }

        const testLibsMatch = jsContent.match(/testLibs\s*:\s*(\{[\s\S]*?\n\s{8}\})/);
        if (testLibsMatch) {
            opaConfig.hasTestLibs = true;
        }

        const requireMatch = jsContent.match(/sap\.ui\.require\s*\(\s*\[([\s\S]*?)\]/);
        if (requireMatch) {
            const requireContent = requireMatch[1];
            const moduleRegex = /"([^"]+)"/g;
            let modMatch;
            while ((modMatch = moduleRegex.exec(requireContent)) !== null) {
                const mod = modMatch[1];
                if (mod.startsWith("sap/ui/test/") || mod === "sap/ui/test/Opa5" || mod === "sap/ui/test/opaQunit") {
                    continue;
                }
                pageObjects.push(mod);
            }
        }
    }

    const unitTestHtml = path.join(testBaseDir, "unit", "unitTests.qunit.html");
    const hasUnitTests = fs.existsSync(unitTestHtml) ||
        fs.existsSync(path.join(testBaseDir, "unit", "unitTests.qunit.js")) ||
        fs.existsSync(path.join(testBaseDir, "unit", "allTests.qunit.js"));

    const staticEntries = [];
    const staticRegex = /(\/\/\s*)?oSuite\.addTestPage\s*\(\s*sContextPath\s*\+\s*"([^"]+)"\s*\)/g;
    let match;
    while ((match = staticRegex.exec(html)) !== null) {
        if (!match[1]) {
            staticEntries.push(match[2]);
        }
    }

    const testEntries = {};

    if (hasUnitTests) {
        testEntries["unit/unitTests"] = { title: "All Unit Tests" };
    }

    for (const journey of journeys) {
        testEntries["integration/" + journey] = {
            title: journey.replace(/Journey$/, "").replace(/([A-Z])/g, " $1").trim()
        };
    }

    return {
        pattern: "A",
        summary: {
            totalJourneys: journeys.length,
            hasUnitTests: hasUnitTests,
            totalEntries: Object.keys(testEntries).length,
            staticEntries: staticEntries.length
        },
        entries: testEntries,
        opaConfig: opaConfig,
        arrangementClass: arrangementClass,
        pageObjects: pageObjects,
        journeyList: journeys
    };
}

// =============================================
// Pattern B: Many Individual HTML Files
// =============================================

function handlePatternB(html, testBaseDir, namespace) {
    const activeEntries = [];
    const commentedEntries = [];
    const addTestPageRegex = /(\/\/\s*)?oSuite\.addTestPage\s*\(\s*sContextPath\s*\+\s*"([^"]+)"\s*\)/g;
    let match;

    while ((match = addTestPageRegex.exec(html)) !== null) {
        const isCommented = !!match[1];
        const htmlRelPath = match[2];
        if (isCommented) {
            commentedEntries.push(htmlRelPath);
        } else {
            activeEntries.push(htmlRelPath);
        }
    }

    console.error(`Found ${activeEntries.length} active addTestPage entries`);
    console.error(`Found ${commentedEntries.length} commented-out entries`);

    const results = [];
    const errors = [];

    for (const htmlRelPath of activeEntries) {
        const htmlFullPath = path.join(testBaseDir, htmlRelPath);
        const entry = {
            htmlPath: htmlRelPath,
            journeyModule: null,
            title: null,
            autoWait: true,
            status: "active"
        };

        if (!fs.existsSync(htmlFullPath)) {
            entry.error = `File not found: ${htmlFullPath}`;
            errors.push(entry);
            results.push(entry);
            continue;
        }

        const fileContent = fs.readFileSync(htmlFullPath, "utf-8");

        const titleMatch = fileContent.match(/<title>([^<]+)<\/title>/);
        if (titleMatch) {
            entry.title = titleMatch[1].trim();
        }

        const autoWaitMatch = fileContent.match(/autoWait\s*:\s*(true|false)/);
        if (autoWaitMatch) {
            entry.autoWait = autoWaitMatch[1] === "true";
        }

        const nsEscaped = namespace.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        const journeyRegex = new RegExp(
            `sap\\.ui\\.require\\(\\s*\\[([^\\]]*${nsEscaped}\\/test\\/opa\\/view\\/[^\\]]+)\\]`,
            "s"
        );
        const journeyMatch = fileContent.match(journeyRegex);

        if (journeyMatch) {
            const requireContent = journeyMatch[1];
            const moduleRegex = new RegExp(`"(${nsEscaped}/test/opa/view/[^"]+)"`, "g");
            const modules = [];
            let modMatch;
            while ((modMatch = moduleRegex.exec(requireContent)) !== null) {
                modules.push(modMatch[1]);
            }

            if (modules.length === 1) {
                entry.journeyModule = modules[0].replace(namespace + "/test/", "");
            } else if (modules.length > 1) {
                entry.journeyModule = modules.map(m => m.replace(namespace + "/test/", ""));
                entry.multiJourney = true;
            }
        }

        if (!entry.journeyModule) {
            const concatRegex = new RegExp(
                `"${nsEscaped}/test/opa/view/"\\s*\\+\\s*"([^"]+)"`,
                "g"
            );
            const concatMatch = fileContent.match(concatRegex);
            if (concatMatch) {
                const parts = concatMatch[0].match(/"([^"]+)"/g);
                if (parts && parts.length >= 2) {
                    const fullPath = parts.map(p => p.replace(/"/g, "")).join("");
                    entry.journeyModule = fullPath.replace(namespace + "/test/", "");
                }
            }
        }

        if (!entry.journeyModule) {
            const baseName = htmlRelPath.replace(".qunit.html", "");
            entry.journeyModule = baseName.replace("opa/", "opa/view/");
            entry.journeyDerived = true;
            entry.warning = "Journey module derived from HTML path — verify manually";
        }

        results.push(entry);
    }

    for (const htmlRelPath of commentedEntries) {
        results.push({
            htmlPath: htmlRelPath,
            journeyModule: htmlRelPath.replace(".qunit.html", "").replace("opa/", "opa/view/"),
            journeyDerived: true,
            title: null,
            autoWait: true,
            status: "commented-out"
        });
    }

    const testEntries = {};
    for (const r of results) {
        if (r.multiJourney) {
            // Emit ONE entry per loaded module — never invent a synthetic
            // *Combined name. The legacy HTML loaded multiple modules in one
            // page; under Test Starter each module becomes its own entry so
            // every entry key resolves to a real .qunit.js file. See
            // references/pattern-b-modernization.md "Multi-module HTML files".
            const modules = Array.isArray(r.journeyModule) ? r.journeyModule : [r.journeyModule];
            for (const mod of modules) {
                const entryObj = { title: r.title || mod.split("/").pop() };
                if (r.status === "commented-out") entryObj.skip = true;
                if (!r.autoWait) entryObj._autoWaitFalse = true;
                entryObj._fromMultiModuleHtml = r.htmlPath;
                testEntries[mod] = entryObj;
            }
        } else {
            const key = r.journeyModule;
            const entryObj = { title: r.title || key.split("/").pop() };
            if (r.status === "commented-out") entryObj.skip = true;
            if (!r.autoWait) entryObj._autoWaitFalse = true;
            if (r.warning) entryObj._warning = r.warning;
            testEntries[key] = entryObj;
        }
    }

    return {
        pattern: "B",
        summary: {
            totalActive: activeEntries.length,
            totalCommented: commentedEntries.length,
            totalEntries: Object.keys(testEntries).length,
            autoWaitFalseCount: results.filter(r => !r.autoWait).length,
            multiJourneyCount: results.filter(r => r.multiJourney).length,
            derivedCount: results.filter(r => r.journeyDerived).length,
            errorCount: errors.length
        },
        entries: testEntries,
        errors: errors.length > 0 ? errors : undefined,
        autoWaitFalseFiles: results.filter(r => !r.autoWait).map(r => r.journeyModule)
    };
}

// =============================================
// Pattern detection + entry point
// =============================================

function detectPattern(html, testBaseDir) {
    const allJourneysJsonPath = path.join(testBaseDir, "integration", "AllJourneys.json");
    const allJourneysJsPath = path.join(testBaseDir, "integration", "AllJourneys.js");
    const hasAllJourneysJson = fs.existsSync(allJourneysJsonPath);
    const hasAllJourneysJs = fs.existsSync(allJourneysJsPath);
    const hasDynamicAddTestPage = /XMLHttpRequest|AllJourneys\.json|\.forEach/.test(html);
    const isPatternA = (hasAllJourneysJson || hasAllJourneysJs) && hasDynamicAddTestPage;
    return {
        pattern: isPatternA ? "A" : "B",
        allJourneysJsonPath,
        allJourneysJsPath,
        hasAllJourneysJson,
        hasAllJourneysJs
    };
}

function parse(testsuiteHtml, testBaseDir, namespace) {
    const html = fs.readFileSync(testsuiteHtml, "utf-8");
    const ctx = detectPattern(html, testBaseDir);
    if (ctx.pattern === "A") {
        console.error("Detected Pattern A: Single HTML + AllJourneys orchestrator");
        return handlePatternA(html, testBaseDir, ctx);
    }
    console.error("Detected Pattern B: Many individual HTML files");
    return handlePatternB(html, testBaseDir, namespace);
}

module.exports = {
    BOOTSTRAP_OVERRIDE_PATTERNS,
    LAUNCHER_PATTERNS,
    FLP_SANDBOX_PATTERNS,
    scanContentForBootstrapOverrides,
    scanBootstrapOverrides,
    scanContentForLauncher,
    detectLauncher,
    scanContentForFlpSandbox,
    detectFlpSandbox,
    listHtmlFiles,
    listJsFiles,
    parse,
    detectPattern
};

// =============================================
// CLI
// =============================================

if (require.main === module) {
    const args = process.argv.slice(2);
    if (args[0] === "--scan-bootstrap-overrides") {
        const testBaseDir = args[1];
        if (!testBaseDir) {
            console.error("Usage: node parse-testsuite.js --scan-bootstrap-overrides <test-base-dir>");
            process.exit(1);
        }
        const result = scanBootstrapOverrides(testBaseDir);
        console.error(`Scanned ${result.scannedFileCount} HTML files; ${result.findings.length} bootstrap override(s) found`);
        console.log(JSON.stringify(result, null, 2));
        return;
    }

    if (args[0] === "--detect-launcher") {
        const testBaseDir = args[1];
        if (!testBaseDir) {
            console.error("Usage: node parse-testsuite.js --detect-launcher <test-base-dir>");
            process.exit(1);
        }
        const launcherResult = detectLauncher(testBaseDir);
        const sandboxResult = detectFlpSandbox(testBaseDir);
        const needsIframeMigration =
            launcherResult.launcher === "in-window" && sandboxResult.flpSandbox;
        const combined = {
            launcher: launcherResult.launcher,
            flpSandbox: sandboxResult.flpSandbox,
            needsIframeMigration,
            scannedJsFileCount: launcherResult.scannedFileCount,
            scannedHtmlFileCount: sandboxResult.scannedFileCount,
            iframeHits: launcherResult.iframeHits,
            inWindowHits: launcherResult.inWindowHits,
            flpSandboxHits: sandboxResult.hits
        };
        console.error(
            `launcher=${combined.launcher} flpSandbox=${combined.flpSandbox} ` +
            `needsIframeMigration=${combined.needsIframeMigration} ` +
            `(JS=${launcherResult.scannedFileCount}, HTML=${sandboxResult.scannedFileCount})`
        );
        console.log(JSON.stringify(combined, null, 2));
        return;
    }

    const testsuiteHtml = args[0];
    const testBaseDir = args[1];
    const namespace = args[2];

    if (!testsuiteHtml || !testBaseDir || !namespace) {
        console.error("Usage: node parse-testsuite.js <testsuite.qunit.html> <test-base-dir> <namespace>");
        console.error("       node parse-testsuite.js --scan-bootstrap-overrides <test-base-dir>");
        console.error("       node parse-testsuite.js --detect-launcher <test-base-dir>");
        process.exit(1);
    }

    const output = parse(testsuiteHtml, testBaseDir, namespace);
    console.log(JSON.stringify(output, null, 2));
}
