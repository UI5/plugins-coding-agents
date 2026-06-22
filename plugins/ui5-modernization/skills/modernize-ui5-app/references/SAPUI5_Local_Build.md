# SAP UI5 Local Build & Test — fnf-parent-pom Projects

Reference for local development workflows on SAP UI5 / Fiori Maven projects that inherit from `fnf-parent-pom`. Covers three workflows and associated failure modes.

## Applicability

These workflows apply when the project's `pom.xml` has at least one of:

- `<artifactId>fnf-parent-pom</artifactId>` in the `<parent>` block
- groupId `com.sap.ui5`, `com.sap.fiori`, or `com.sap.ushell` anywhere
- `webapp/test/testsuite.qunit.js` exists

If `pom.xml` exists but none of these markers do, this is a different Maven project and these workflows do not apply.

---

## §1. Local dev server (Tomcat, no tests)

### §1.0 Preflight — patch pom BEFORE first boot

Before booting the dev server, verify that the `tomcat.dev.deploy` profile in `pom.xml` is complete. A fresh checkout typically has an incomplete profile that fails at startup with:

```
SEVERE: Exception starting filter InstrumentationFilter
java.lang.ClassNotFoundException: com.sap.ui5.jscoverage.InstrumentationFilter
...
[ERROR] Failed to execute goal org.apache.tomcat.maven:tomcat7-maven-plugin:2.2:run-war
        Could not start Tomcat: ... A child container failed during start
```

The `test-resources/` 404 case (§1.2) is the *follow-up* failure once the server does start — on a fresh checkout missing both pieces, the startup failure hits first. Patching upfront avoids the sequence.

Detect with:

```bash
grep -n "<id>tomcat.dev.deploy</id>" pom.xml      # must exist
grep -nE "jscoverage|maven-war-plugin" pom.xml    # both must hit inside the profile block
```

If `tomcat.dev.deploy` exists but `jscoverage` and/or `maven-war-plugin` are missing from it, apply the patch in §1.2 before running the boot command. If `tomcat.dev.deploy` profile (or `<profiles>` block) is entirely absent, see `pom-dev-profile-patch.md` for the full wrapper.

Skip preflight only if the profile already contains both the `jscoverage` runtime dep and the `maven-war-plugin` `webResources` block.

### §1.1 Boot command

```bash
mvn clean package tomcat7:run-war -Ptomcat.dev.deploy -DskipTests -Dmaven.tomcat.port=8090
```

URLs after the server is up:

- App: `http://localhost:8090/<artifactId>/`
- Test bootstrap: `http://localhost:8090/<artifactId>/test-resources/testFLPService.html`
- Test Starter: `http://localhost:8090/<artifactId>/test-resources/<namespace-path>/Test.qunit.html?testsuite=test-resources/<namespace-path>/testsuite.qunit&test=<entry-key>`

Replace `<artifactId>` with the value from `pom.xml` (e.g., `ui.cloudfnd.analyticsdesigntool.s1`) and `<namespace-path>` with the slash-separated app namespace (e.g., `ui/cloudfnd/analyticsdesigntool/s1`).

### §1.2 Failure: `test-resources/` 404s OR `ClassNotFoundException` at boot

**Root cause:** The `tomcat.dev.deploy` profile in `pom.xml` is missing the `maven-war-plugin` `webResources` block and/or the `jscoverage` runtime dep. The base `pom.xml` on `origin/main` of these repos typically does NOT include them — they are a local dev-only addition.

Two distinct symptoms map to this single cause:

- **Boot fails entirely** — `ClassNotFoundException: com.sap.ui5.jscoverage.InstrumentationFilter` followed by `A child container failed during start` and `BUILD FAILURE` on `tomcat7:run-war`. The SAP parent pom wires an `InstrumentationFilter` into `web.xml` that needs this jar on the runtime classpath; without it Tomcat's StandardContext fails filterStart and the engine aborts.
- **Boot succeeds but `test-resources/*` returns 404** — server logs show no errors, app loads, but `testFLPService.html` and friends are absent. The `maven-war-plugin` `webResources` block is missing.

A fresh checkout missing both hits the boot failure first; once `jscoverage` is added, the 404 surfaces.

**Fix (single patch for both):**

```diff
         <profile>
             <id>tomcat.dev.deploy</id>
+            <dependencies>
+                <dependency>
+                    <groupId>com.sap.ui5</groupId>
+                    <artifactId>jscoverage</artifactId>
+                    <version>1.149.0-SNAPSHOT</version>
+                    <scope>runtime</scope>
+                </dependency>
+            </dependencies>
             <build>
                 <plugins>
                     <plugin>
                         <groupId>org.apache.tomcat.maven</groupId>
                         <artifactId>tomcat7-maven-plugin</artifactId>
                     </plugin>
+                    <plugin>
+                        <artifactId>maven-war-plugin</artifactId>
+                        <configuration>
+                            <webResources>
+                                <resource>
+                                    <directory>webapp/test</directory>
+                                    <targetPath>test-resources</targetPath>
+                                </resource>
+                            </webResources>
+                        </configuration>
+                    </plugin>
                 </plugins>
             </build>
         </profile>
```

Why each piece matters:

- **`jscoverage` runtime dep** — without it the deploy fails with `ClassNotFoundException` for the jscoverage filter wired in by the parent pom.
- **`maven-war-plugin` `webResources`** — copies `webapp/test/` into the WAR under `test-resources/`. That makes `testFLPService.html`, `testsuite.qunit.js`, and OPA `.qunit.js` files reachable from the browser. Production builds intentionally omit this; the dev profile re-enables it.

The release/optimized build (`optimized.build` profile) is unaffected — keep these additions scoped to `tomcat.dev.deploy`.

**Version selection:** If the `<version>` of `jscoverage` in the surrounding repo's other deps differs from `1.149.0-SNAPSHOT`, adjust to match. Read one of the existing `com.sap.ui5` deps in the parent pom or sibling repos.

**SNAPSHOT not resolvable:** If the SAP Maven repo is unreachable (`mvn` reports `Could not find artifact com.sap.ui5:jscoverage:1.149.0-SNAPSHOT`), fall back to the latest released version in `~/.m2/repository/com/sap/ui5/jscoverage/` (e.g., `1.148.0`). See `pom-dev-profile-patch.md` § "Fallback when the SNAPSHOT version isn't resolvable".

**No `<profiles>` block at all:** If the project's `pom.xml` has no `<profiles>` block (lean child pom inheriting everything from `fnf-parent-pom`), the diff above won't apply. Add the full `<profiles>` wrapper after `</build>` (or `</dependencies>` if no `<build>` exists). See `pom-dev-profile-patch.md` § "Repo has no `<profiles>` block at all". Detect with `grep -n "<profiles>\|<profile>\|tomcat.dev.deploy" pom.xml` — empty output means the wrapper is missing.

**Commit convention:** The conventional choice for SAP UI5 repos is to keep this patch local (uncommitted) and out of the published history.

### §1.3 After code changes — rebuild + clear browser cache

The Tomcat dev server (port 8090, `tomcat7:run-war`) serves resources from the WAR built at boot time. It does **not** hot-reload `webapp/` edits. After ANY change under `webapp/` (controllers, views, fragments, tests, i18n, manifest, etc.):

1. Stop the running server (Ctrl+C, or `lsof -i :8090 -t | xargs kill` if detached).
2. Rerun the boot command from §1.1:
   ```bash
   mvn clean package tomcat7:run-war -Ptomcat.dev.deploy -DskipTests -Dmaven.tomcat.port=8090
   ```
3. **Clear the browser cache before reloading.** The dev server emits long-lived `Cache-Control` / `ETag` headers, and Chrome returns the previous build's JS even after `mvn clean package`. Symptom: tests still fail (or pass) on old code despite a successful rebuild.

   Options:
   - DevTools open + hard reload (`Cmd+Shift+R` / `Ctrl+Shift+R`), with "Disable cache" ticked in DevTools → Network tab.
   - Open the URL in a fresh Incognito/Private window.
   - Append a cache-buster query param (`?_=<timestamp>`) to the test URL.

For rapid iteration on `webapp/` code, the standalone UI5 dev server (`ui5 serve` on port 8080/8083 — see project README) hot-reloads and bypasses this cycle. Reserve port 8090 / Tomcat for verifying the production-shape WAR (servlet config, FLP integration, Selenium runs).

---

## §2. OPA/QUnit tests with visible Chrome

```bash
mvn clean verify -P execute.qunit -Dwebdriver.chrome.driver=$(which chromedriver)
```

Notes:

- `execute.qunit` profile is inherited from `fnf-parent-pom` and wires Surefire to `com.sap.ui5.selenium.qunit.QUnitTest`.
- `$(which chromedriver)` resolves to the chromedriver binary on PATH (`brew install --cask chromedriver` on macOS).
- chromedriver major version must match installed Chrome major version; otherwise: `session not created: This version of ChromeDriver only supports Chrome version N`.
- Reports: `target/surefire-reports/`. Failure screenshots: `target/screenshots/`.

---

## §3. OPA/QUnit tests headless

Same Selenium run as §2 but Chrome runs without a window. Requires a capabilities JSON and extra `-D` flags.

### §3.1 Capabilities JSON location

Place `headless-chrome.json` next to `pom.xml` at the project root. The parent pom forwards `-Dfiori.test.capabilities.file` as-is into `sap.ui5.selenium.qunit.capabilities.json`; absolute paths via `$(pwd)/headless-chrome.json` work regardless of directory.

### §3.2 File contents

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

Do not deviate from the nesting — `JSONCapabilities.parseJSON` in `qunit-utils` is strict and silently breaks on common-looking alternatives. See `headless-capabilities.md` for the exact format rules and parser internals.

### §3.3 Command

```bash
mvn clean verify -P execute.qunit \
  -Dwebdriver.chrome.driver=$(which chromedriver) \
  -Dfiori.test.browser=chrome \
  -Dfiori.test.capabilities.file=$(pwd)/headless-chrome.json
```

The two extra `-D` flags vs. §2:

- `-Dfiori.test.browser=chrome` — selects the top-level browser key inside the JSON.
- `-Dfiori.test.capabilities.file=...` — absolute path to the JSON. Relative paths resolve against `${project.basedir}` but `$(pwd)/...` avoids surprises.

### §3.4 Troubleshooting: `ExceptionInInitializerError`

When the run dies with `java.lang.ExceptionInInitializerError at com.sap.ui5.selenium.qunit.QUnitTest.<clinit>(QUnitTest.java:218)` and the surefire report has no `Caused by:` line, the cause is almost always a malformed `headless-chrome.json`. The file-path branch in `QUnitCapabilities` only catches `IOException` and `FileNotFoundException` — JSON parse and structural errors (`JsonSyntaxException`, `ClassCastException`) escape and surface as the bare `ExceptionInInitializerError`.

Diagnostic order:

1. Re-read the JSON — top-level keys must be browser names, NOT capability keys. A flat `{"browserName": "chrome", "chromeOptions": {...}}` throws `ClassCastException` from `JsonObject.getAsJsonObject`. See `headless-capabilities.md` for the full format spec.
2. Check JSON syntax (valid JSON, no trailing commas).
3. If instrumentation is needed, write a small Java repro calling `new com.sap.ui5.selenium.qunit.QUnitCapabilities(60000L, 60000L, "<abs-path>", null, "QUnit Test Runner")` against the surefire test classpath — this surfaces the real exception.

### §3.5 Troubleshooting: chromedriver version mismatch

`session not created: This version of ChromeDriver only supports Chrome version N` — upgrade or downgrade chromedriver to match the installed Chrome major version.

---

## Related references

- `headless-capabilities.md` — full `JSONCapabilities.parseJSON` format spec, parser quirks, extending for Firefox / proxy / custom prefs.
- `pom-dev-profile-patch.md` — extended rationale for `tomcat.dev.deploy` additions and handling version drift across SAP UI5 repos.
- `headless-chrome.json` — canonical headless Chrome capabilities file (copy verbatim to project root).
