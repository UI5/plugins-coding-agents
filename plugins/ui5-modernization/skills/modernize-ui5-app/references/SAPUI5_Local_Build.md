# SAP UI5 Local Build & Test — Maven Parent-Pom Projects

Reference for local development workflows on SAP UI5 / Fiori Maven projects that inherit from a shared parent pom. Covers three workflows and associated failure modes.

## Applicability

These workflows apply when the project's `pom.xml` inherits from a shared SAP UI5 parent pom and:

- `webapp/test/testsuite.qunit.js` exists

If `pom.xml` exists but does not inherit from the UI5 parent pom, these workflows do not apply.

---

## §1. Local dev server (Tomcat, no tests)

### §1.0 Preflight — patch pom BEFORE first boot

Before booting the dev server, verify that the dev deploy profile in `pom.xml` is complete. A fresh checkout typically has an incomplete profile that fails at startup with:

```
SEVERE: Exception starting filter InstrumentationFilter
java.lang.ClassNotFoundException: <instrumentation-filter-class>
...
[ERROR] Failed to execute goal ... run-war
        Could not start Tomcat: ... A child container failed during start
```

The `test-resources/` 404 case (§1.2) is the *follow-up* failure once the server does start — on a fresh checkout missing both pieces, the startup failure hits first. Patching upfront avoids the sequence.

Detect with:

```bash
grep -n "<id>tomcat.dev.deploy</id>" pom.xml      # must exist
grep -nE "jscoverage|maven-war-plugin" pom.xml    # both must hit inside the profile block
```

If the dev deploy profile exists but the instrumentation dependency and/or `maven-war-plugin` are missing from it, apply the patch in §1.2 before running the boot command. If the profile (or `<profiles>` block) is entirely absent, see `pom-dev-profile-patch.md` for the full wrapper.

Skip preflight only if the profile already contains both the instrumentation runtime dependency and the `maven-war-plugin` `webResources` block.

### §1.1 Boot command

```bash
mvn clean package tomcat7:run-war -Ptomcat.dev.deploy -DskipTests -Dmaven.tomcat.port=8090
```

URLs after the server is up:

- App: `http://localhost:8090/<artifactId>/`
- Test bootstrap: `http://localhost:8090/<artifactId>/test-resources/testFLPService.html`
- Test Starter: `http://localhost:8090/<artifactId>/test-resources/<namespace-path>/Test.qunit.html?testsuite=test-resources/<namespace-path>/testsuite.qunit&test=<entry-key>`

Replace `<artifactId>` with the value from `pom.xml` (e.g., `my.sample.app`) and `<namespace-path>` with the slash-separated app namespace (e.g., `my/sample/app`).

### §1.2 Failure: `test-resources/` 404s OR `ClassNotFoundException` at boot

**Root cause:** The dev deploy profile in `pom.xml` is missing the `maven-war-plugin` `webResources` block and/or the instrumentation runtime dependency. The base `pom.xml` on `origin/main` typically does NOT include them — they are a local dev-only addition.

Two distinct symptoms map to this single cause:

- **Boot fails entirely** — `ClassNotFoundException` for the instrumentation filter followed by `A child container failed during start` and `BUILD FAILURE`. The parent pom wires an instrumentation filter into `web.xml` that needs a jar on the runtime classpath; without it Tomcat fails and the engine aborts.
- **Boot succeeds but `test-resources/*` returns 404** — server logs show no errors, app loads, but `testFLPService.html` and friends are absent. The `maven-war-plugin` `webResources` block is missing.

A fresh checkout missing both hits the boot failure first; once the instrumentation dependency is added, the 404 surfaces.

**Fix (single patch for both):**

```diff
         <profile>
             <id>tomcat.dev.deploy</id>
+            <dependencies>
+                <dependency>
+                    <groupId>${ui5.groupId}</groupId>
+                    <artifactId>jscoverage</artifactId>
+                    <version>${ui5.version}</version>
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

- **Instrumentation runtime dependency** — without it the deploy fails with `ClassNotFoundException` for the instrumentation filter wired in by the parent pom.
- **`maven-war-plugin` `webResources`** — copies `webapp/test/` into the WAR under `test-resources/`. That makes `testFLPService.html`, `testsuite.qunit.js`, and OPA `.qunit.js` files reachable from the browser. Production builds intentionally omit this; the dev profile re-enables it.

The release/optimized build profile is unaffected — keep these additions scoped to the dev deploy profile.

**Version selection:** The version of the instrumentation dependency should match the UI5 framework version used elsewhere in the project. Check other UI5 dependencies in `pom.xml` or use the version property (e.g., `${ui5.version}`) if the parent pom defines one.

**Commit convention:** The conventional choice is to keep this patch local (uncommitted) and out of the published history.

### §1.3 After code changes — rebuild + clear browser cache

The Tomcat dev server serves resources from the WAR built at boot time. It does **not** hot-reload `webapp/` edits. After ANY change under `webapp/` (controllers, views, fragments, tests, i18n, manifest, etc.):

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

For rapid iteration on `webapp/` code, a standalone UI5 dev server (`ui5 serve`) hot-reloads and bypasses this cycle. Reserve the Tomcat server for verifying the production-shape WAR (servlet config, FLP integration, Selenium runs).

---

## §2. OPA/QUnit tests with visible Chrome

```bash
mvn clean verify -P execute.qunit -Dwebdriver.chrome.driver=$(which chromedriver)
```

Notes:

- `execute.qunit` profile is inherited from the parent pom and wires Surefire to a QUnit test runner.
- `$(which chromedriver)` resolves to the chromedriver binary on PATH (`brew install --cask chromedriver` on macOS).
- chromedriver major version must match installed Chrome major version; otherwise: `session not created: This version of ChromeDriver only supports Chrome version N`.
- Reports: `target/surefire-reports/`. Failure screenshots: `target/screenshots/`.

---

## §3. OPA/QUnit tests headless

Same Selenium run as §2 but Chrome runs without a window. Requires a capabilities JSON and extra `-D` flags.

### §3.1 Capabilities JSON location

Place `headless-chrome.json` next to `pom.xml` at the project root. The parent pom forwards `-Dfiori.test.capabilities.file` as-is; absolute paths via `$(pwd)/headless-chrome.json` work regardless of directory.

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

Do not deviate from the nesting — the capabilities parser is strict and silently breaks on common-looking alternatives. See `headless-capabilities.md` for the exact format rules.

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

When the run dies with `java.lang.ExceptionInInitializerError` at the QUnit test runner init and the surefire report has no `Caused by:` line, the cause is almost always a malformed `headless-chrome.json`. The capabilities parser only catches IO errors — JSON parse and structural errors escape and surface as the bare `ExceptionInInitializerError`.

Diagnostic order:

1. Re-read the JSON — top-level keys must be browser names, NOT capability keys. A flat `{"browserName": "chrome", "chromeOptions": {...}}` throws `ClassCastException`. See `headless-capabilities.md` for the full format spec.
2. Check JSON syntax (valid JSON, no trailing commas).

### §3.5 Troubleshooting: chromedriver version mismatch

`session not created: This version of ChromeDriver only supports Chrome version N` — upgrade or downgrade chromedriver to match the installed Chrome major version.

---

## Related references

- `headless-capabilities.md` — full capabilities JSON format spec, parser quirks, extending for Firefox / proxy / custom prefs.
- `pom-dev-profile-patch.md` — extended rationale for dev profile additions and handling version drift.
- `headless-chrome.json` — canonical headless Chrome capabilities file (copy verbatim to project root).
