# Build & Test Commands — Full Reference

This reference contains the full details for detecting project type, setting up prerequisites, and running build/test commands at verification gates.

---

## General Prerequisites

### Chrome DevTools MCP

The Chrome DevTools MCP server must be available for browser-based test verification. It is used to:
- Navigate to test runner URLs after the dev server starts
- Observe test results in the browser (pass/fail counts, error messages)
- Take screenshots of test failures for debugging

If Chrome DevTools MCP is not connected, install it using the `/install-mcps` skill before proceeding. The agent needs browser access for verification gates.

---

## Project Type Detection

Check once at the start and reuse throughout all gates:

1. **`pom.xml` exists** → Run §1.0 Applicability Check. If applicable, use §1 Maven commands. If not, continue to step 2.
2. **Read `package.json` scripts** (§2) — look for test scripts. If found, use those. Only if no test scripts exist at all, fall back to linter-only verification.

---

## §1. Maven Projects (fnf-parent-pom)

For full background on dev server boot, visible-Chrome tests, and headless tests, read `SAPUI5_Local_Build.md`.

### §1.0 Applicability Check

A `pom.xml` alone does not guarantee the Maven test workflow applies. The full criteria are documented in `SAPUI5_Local_Build.md` § Applicability. Before setting up prerequisites, verify the project has **at least one** of these markers:

```bash
# 1. fnf-parent-pom in <parent> block — sufficient on its own (profiles are inherited)
grep -q "fnf-parent-pom" pom.xml && echo "MAVEN APPLICABLE: fnf-parent-pom found" || echo "No fnf-parent-pom"

# 2. SAP UI5/Fiori/Shell groupId anywhere
grep -qE "com\.sap\.(ui5|fiori|ushell)" pom.xml && echo "MAVEN APPLICABLE: SAP UI5 groupId found" || echo "No SAP UI5 groupId"

# 3. QUnit testsuite exists
test -f webapp/test/testsuite.qunit.js && echo "MAVEN APPLICABLE: testsuite.qunit.js found" || echo "No testsuite.qunit.js"
```

**Decision logic:**

- **Any marker found → Maven project.** Proceed to §1.1. Note: `fnf-parent-pom` provides `tomcat.dev.deploy` and `execute.qunit` profiles via inheritance — you will NOT find them in the local `pom.xml`. The absence of local profiles does NOT mean the project isn't Maven-based.
- **No markers found → NOT a Maven project.** Fall through to §2 (npm-based). You MUST read `package.json` scripts before falling back to linter-only.

For full background on dev server boot sequences, profile patches, and headless test setup, see `SAPUI5_Local_Build.md`.

### §1.1 Prerequisites (before first test run)

All three must be in place before running tests. Check once at the start of the workflow.

#### headless-chrome.json

Must exist at the project root. If missing, create it.

**Important:** Never commit or push this file. It is a local-only test prerequisite. Add `headless-chrome.json` to `.gitignore` immediately after creating it.

```json
{
  "chrome": {
    "goog:chromeOptions": {
      "args": [
        "--headless=new",
        "--disable-gpu",
        "--no-sandbox",
        "--disable-dev-shm-usage",
        "--window-size=1920,1080"
      ]
    }
  }
}
```

#### pom.xml dev profile patch

The `tomcat.dev.deploy` profile needs two additions for `test-resources/` to be reachable and the jscoverage filter to load. Check if the profile already has them; if not, apply the patch from `pom-dev-profile-patch.md`.

**Important:** Never commit or push the dev profile patch to `pom.xml`. These additions are local-only test infrastructure. Exclude `pom.xml` from any commits (do not stage it).

- Add runtime dependency `com.sap.ui5:jscoverage:<version>` (match existing `com.sap.ui5:*` version in the project)
- Add `maven-war-plugin` `webResources` block copying `webapp/test/` into `test-resources/`

Detect with:
```bash
grep -n "<id>tomcat.dev.deploy</id>" pom.xml
grep -nE "jscoverage|maven-war-plugin" pom.xml
```

If either is missing, see `SAPUI5_Local_Build.md` §1.0 and §1.2 for the full patch and variants.

#### .gitignore

Add the following entries if not already present:
- `target/` — Maven builds generate output here which must not be committed
- `headless-chrome.json` — local-only test configuration, never commit or push

**Important:** Never commit or push the `.gitignore` changes themselves. Keep them locally — they are part of the local test infrastructure alongside the other prerequisites. Do not stage `.gitignore`.

**Before committing**, also ensure the dev profile patch changes to `pom.xml` (jscoverage dependency and maven-war-plugin webResources block) are not staged. These are local-only test infrastructure and must not be pushed. Do not revert them — they are needed for local testing.

### §1.2 Build command (interactive dev server)

**This is for interactive browser-based verification only.** It starts a Tomcat dev server that blocks the terminal. Do NOT use this as a "build step" before headless tests — §1.3 is self-contained and handles compilation, packaging, and test execution in one command.

```bash
mvn clean package tomcat7:run-war -Ptomcat.dev.deploy -DskipTests -Dmaven.tomcat.port=8090
```

**Timeout:** Use a 600000ms (10 minute) timeout when running this command.

### §1.3 Test command (headless — use this for verification gates)

This command is **self-contained**: it compiles, packages, and runs all QUnit tests headlessly in one invocation. It does NOT require §1.2 to be running. **For verification gate sub-agents, this is the only command you need to run.**

```bash
mvn clean verify -P execute.qunit \
  -Dwebdriver.chrome.driver=$(which chromedriver) \
  -Dfiori.test.browser=chrome \
  -Dfiori.test.capabilities.file=$(pwd)/headless-chrome.json
```

**Timeout:** Use a 600000ms (10 minute) timeout when running this command.

### §1.4 Troubleshooting

| Symptom | Cause | Fix |
|---------|-------|-----|
| `ClassNotFoundException: com.sap.ui5.jscoverage.InstrumentationFilter` | Missing jscoverage runtime dep | Apply profile patch (§1.1) |
| `test-resources/` returns 404 | Missing `maven-war-plugin` `webResources` block | Apply profile patch (§1.1) |
| `ExceptionInInitializerError at QUnitTest.<clinit>:218` | Malformed `headless-chrome.json` | See `SAPUI5_Local_Build.md` §3.4 and `headless-capabilities.md` |
| `session not created: ChromeDriver only supports Chrome version N` | chromedriver/Chrome major version mismatch | Upgrade or downgrade chromedriver |

---

## §2. npm-based Projects

**You MUST read `package.json`** to determine the actual test commands. Do not assume command names, do not skip this step, and do not fall back to linter-only without first confirming that no test scripts exist:

```bash
# Read the scripts block — this is mandatory before deciding on verification strategy
cat package.json | grep -A 30 '"scripts"'
```

Common patterns:

```bash
# Build (look for "build" script)
npm run build

# Test (look for "test", "test:unit", "test:opa", "test:integration", "test-runner")
npm test
```

Use whatever script names are defined. Look for:
- `"test"` or `"test:unit"` — unit test runner
- `"test:integration"` or `"test:opa"` — OPA5 integration tests
- `"test-runner"` — ui5-test-runner based setup (common with Test Starter)
- `"start"` — dev server (often `ui5 serve`)

If `package.json` has no test script, fall back to running the linter only (`npx @ui5/linter --details`) as the verification step.

**Timeout:** Use a 600000ms (10 minute) timeout when running build and test commands.
