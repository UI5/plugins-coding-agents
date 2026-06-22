/**
 * Gate script: verifies Component.js was modernized correctly.
 *
 * Checks:
 * 1. IAsyncContentCreation is NOT imported as a module dependency
 * 2. interfaces array uses string literal "sap.ui.core.IAsyncContentCreation"
 * 3. manifest: "json" is present in metadata
 *
 * Usage:
 *   node verify-component.js <project-root>
 *
 * Output: JSON to stdout with { pass, findings }
 * Exit code: 0 if pass, 1 if findings exist
 */

const fs = require("fs");
const path = require("path");

function findComponentFiles(projectRoot) {
	const results = [];
	const webappDir = path.join(projectRoot, "webapp");

	function walk(dir) {
		if (!fs.existsSync(dir)) return;
		for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
			const full = path.join(dir, entry.name);
			if (entry.isDirectory() && entry.name !== "node_modules") {
				walk(full);
			} else if (entry.isFile() && entry.name === "Component.js") {
				results.push(full);
			}
		}
	}

	walk(webappDir);
	// Also check project root for Component.js (rare but possible)
	const rootComponent = path.join(projectRoot, "Component.js");
	if (fs.existsSync(rootComponent)) results.push(rootComponent);

	return results;
}

function verifyComponent(filePath) {
	const findings = [];
	const content = fs.readFileSync(filePath, "utf8");
	const relPath = path.relative(process.cwd(), filePath);

	// Check 1: IAsyncContentCreation must NOT be in the dependency array
	const depArrayMatch = content.match(/sap\.ui\.define\(\s*\[([\s\S]*?)\]/);
	if (depArrayMatch) {
		const deps = depArrayMatch[1];
		if (deps.includes("sap/ui/core/IAsyncContentCreation")) {
			findings.push({
				file: relPath,
				type: "imported-interface",
				message: "IAsyncContentCreation is imported as a module dependency — this causes a runtime error. Remove it from sap.ui.define and use the string literal in interfaces array instead.",
				severity: "error"
			});
		}
	}

	// Check 2: interfaces array should use string literal
	const interfacesMatch = content.match(/interfaces\s*:\s*\[([\s\S]*?)\]/);
	if (interfacesMatch) {
		const interfacesContent = interfacesMatch[1];
		// Check if it uses a variable reference instead of string
		if (interfacesContent.match(/\bIAsyncContentCreation\b/) &&
			!interfacesContent.includes('"sap.ui.core.IAsyncContentCreation"') &&
			!interfacesContent.includes("'sap.ui.core.IAsyncContentCreation'")) {
			findings.push({
				file: relPath,
				type: "interface-not-string",
				message: "interfaces array uses a variable reference instead of the string literal \"sap.ui.core.IAsyncContentCreation\". The runtime checks for the string name, not the module.",
				severity: "error"
			});
		}
	} else {
		// No interfaces array found — check if metadata exists
		if (content.includes("metadata")) {
			findings.push({
				file: relPath,
				type: "missing-interface",
				message: "No interfaces array found in metadata. Add: interfaces: [\"sap.ui.core.IAsyncContentCreation\"]",
				severity: "error"
			});
		}
	}

	// Check 3: manifest: "json" should be present
	if (content.includes("metadata") && !content.match(/manifest\s*:\s*["']json["']/)) {
		// Only flag if there's no inline manifest object either
		if (!content.match(/manifest\s*:\s*\{/)) {
			findings.push({
				file: relPath,
				type: "missing-manifest-json",
				message: "metadata is missing manifest: \"json\" declaration.",
				severity: "warning"
			});
		}
	}

	return findings;
}

// Exported for testing
module.exports = { findComponentFiles, verifyComponent };

// CLI entry point
if (require.main === module) {
	const projectRoot = process.argv[2];
	if (!projectRoot) {
		console.error("Usage: node verify-component.js <project-root>");
		process.exit(2);
	}

	const resolvedRoot = path.resolve(projectRoot);
	if (!fs.existsSync(resolvedRoot)) {
		console.error(`Project root does not exist: ${resolvedRoot}`);
		process.exit(2);
	}

	const files = findComponentFiles(resolvedRoot);
	if (files.length === 0) {
		const result = { pass: true, findings: [], message: "No Component.js files found" };
		console.log(JSON.stringify(result, null, 2));
		process.exit(0);
	}

	const allFindings = [];
	for (const file of files) {
		process.stderr.write(`Checking: ${path.relative(resolvedRoot, file)}\n`);
		allFindings.push(...verifyComponent(file));
	}

	const pass = allFindings.filter(f => f.severity === "error").length === 0;
	const result = {
		pass,
		findings: allFindings,
		summary: {
			filesChecked: files.length,
			errors: allFindings.filter(f => f.severity === "error").length,
			warnings: allFindings.filter(f => f.severity === "warning").length
		}
	};

	console.log(JSON.stringify(result, null, 2));
	process.exit(pass ? 0 : 1);
}
