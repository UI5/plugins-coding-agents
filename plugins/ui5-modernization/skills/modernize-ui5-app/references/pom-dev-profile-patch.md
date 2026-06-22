# `tomcat.dev.deploy` Profile — Patch Rationale & Variants

This is the deep reference for the `pom.xml` change in §1.1 of SKILL.md. Read it when the simple diff doesn't apply cleanly — the surrounding repo has a non-standard `tomcat.dev.deploy` block, the parent pom version differs, or the user wants to understand why this change isn't already on `origin/main`.

## What the patch does

Two additions, both inside the `tomcat.dev.deploy` profile in `pom.xml`:

1. A runtime `dependency` on `com.sap.ui5:jscoverage:<version>`.
2. A `maven-war-plugin` `webResources` block that copies `webapp/test/` into the WAR under `test-resources/`.

Both are dev-only. The `optimized.build` profile must NOT receive them — production WARs intentionally exclude `webapp/test/` and don't load the jscoverage filter.

## Why neither is on `origin/main`

`fnf-parent-pom` wires the SAP Tomcat dev image to expect a jscoverage filter in the deployed WAR's runtime classpath. The filter is provided by `com.sap.ui5:jscoverage`, but the artifact is intentionally not declared as a default dependency — release builds skip it to avoid bundling instrumentation code into customer-facing artifacts. The dev profile is the right place to opt into it locally.

The `webResources` block is similarly absent because release WARs must not contain the test bootstrap (`testFLPService.html`), the OPA `.qunit.js` files, or the testsuite definition. Including them in `origin/main`'s `tomcat.dev.deploy` would mean every developer's local build silently differs from CI, but since this is a dev-only profile it's safer to make it explicit per checkout.

The trade-off: every developer who wants test-resources reachable locally has to apply the patch. Some teams accept this; others ship a `pom.xml` with the dev profile patched and rely on `[skip ci]` commits or a sibling `pom-dev.xml` to keep CI green.

## Picking the `jscoverage` version

The version of `com.sap.ui5:jscoverage` should match the major SAP UI5 dist version in use elsewhere in the project. To find it:

1. Look for any other `com.sap.ui5:*` dependency in `pom.xml` or the parent — match its version.
2. If the parent pom uses property-driven versions (`${ui5.version}`, `${sap.ui5.version}`, etc.), reuse the same property: `<version>${ui5.version}</version>`.
3. Common values: `1.149.0-SNAPSHOT`, `1.140.0-SNAPSHOT`, `1.136.0`. When in doubt, `mvn dependency:tree | grep com.sap.ui5` shows what the project already resolves.

A mismatched version usually still works at runtime (the jscoverage API is stable), but a matched version avoids occasional class-version conflicts on Tomcat startup.

### Fallback when the SNAPSHOT version isn't resolvable

If the SAP internal Maven repo is unreachable or the desired SNAPSHOT was never published locally, Maven fails to resolve `1.149.0-SNAPSHOT` (or whichever SNAPSHOT) and the dev server won't start. Use the last released version that exists locally instead:

```bash
ls ~/.m2/repository/com/sap/ui5/jscoverage
# 1.148.0  1.149.0-SNAPSHOT
```

Pick the highest non-SNAPSHOT entry (e.g., `1.148.0`) and pin it in the profile dep. Released versions are stable across UI5 minor releases — runtime behavior won't differ for the InstrumentationFilter the parent pom needs. Treat the SNAPSHOT version as the "ideal" and the released version as the working fallback.

## Variants

### Repo already has SOME `webResources` in `tomcat.dev.deploy`

Merge into the existing list rather than replacing:

```xml
<webResources>
    <resource>
        <directory>some/existing</directory>
        <targetPath>existing-target</targetPath>
    </resource>
    <resource>
        <directory>webapp/test</directory>
        <targetPath>test-resources</targetPath>
    </resource>
</webResources>
```

### Repo uses a non-default test directory

If `webapp/test/` isn't where the project keeps its test sources (e.g., `src/test/webapp` or `webapp/qunit-tests`), update `<directory>` to match. Find the right path by locating `testsuite.qunit.js`.

### Repo's parent pom version differs

The patch is independent of `fnf-parent-pom` version — it only depends on the child's `pom.xml` having a `tomcat.dev.deploy` profile to extend. If the profile doesn't exist at all, add the whole block:

```xml
<profile>
    <id>tomcat.dev.deploy</id>
    <dependencies>
        <dependency>
            <groupId>com.sap.ui5</groupId>
            <artifactId>jscoverage</artifactId>
            <version>1.149.0-SNAPSHOT</version>
            <scope>runtime</scope>
        </dependency>
    </dependencies>
    <build>
        <plugins>
            <plugin>
                <groupId>org.apache.tomcat.maven</groupId>
                <artifactId>tomcat7-maven-plugin</artifactId>
            </plugin>
            <plugin>
                <artifactId>maven-war-plugin</artifactId>
                <configuration>
                    <webResources>
                        <resource>
                            <directory>webapp/test</directory>
                            <targetPath>test-resources</targetPath>
                        </resource>
                    </webResources>
                </configuration>
            </plugin>
        </plugins>
    </build>
</profile>
```

### Repo has no `<profiles>` block at all

Some lean child poms inherit everything from `fnf-parent-pom` and never declare a `<profiles>` element themselves. Adding the profile alone won't be enough — Maven needs the wrapping `<profiles>` element. Insert the full wrapper after the closing `</build>` (or after `</dependencies>` if no `<build>` exists):

```xml
    </build>
    <profiles>
        <profile>
            <id>tomcat.dev.deploy</id>
            <dependencies>
                <dependency>
                    <groupId>com.sap.ui5</groupId>
                    <artifactId>jscoverage</artifactId>
                    <version>1.148.0</version>
                    <scope>runtime</scope>
                </dependency>
            </dependencies>
            <build>
                <plugins>
                    <plugin>
                        <groupId>org.apache.tomcat.maven</groupId>
                        <artifactId>tomcat7-maven-plugin</artifactId>
                    </plugin>
                    <plugin>
                        <artifactId>maven-war-plugin</artifactId>
                        <configuration>
                            <webResources>
                                <resource>
                                    <directory>webapp/test</directory>
                                    <targetPath>test-resources</targetPath>
                                </resource>
                            </webResources>
                        </configuration>
                    </plugin>
                </plugins>
            </build>
        </profile>
    </profiles>
</project>
```

Detect this case: `grep -n "<profiles>\|<profile>\|tomcat.dev.deploy" pom.xml` returns nothing. The `mvn ... -Ptomcat.dev.deploy` invocation succeeds anyway (Maven silently ignores unknown profiles when launched from CLI), but Tomcat startup fails with `ClassNotFoundException: com.sap.ui5.jscoverage.InstrumentationFilter` because the parent pom wires the filter without the dep being on the runtime classpath.

### Repo uses `tomcat9-maven-plugin` or a different Tomcat plugin

Keep the rest of the patch as-is. The `webResources` and `jscoverage` additions are independent of which Tomcat plugin runs the WAR — the change is to the WAR packaging, not the runner.

## Keeping the change local

The conventional pattern in SAP UI5 repos is to keep this patch out of published commits. Mechanics:

1. After applying, run `git status pom.xml` — should show `M pom.xml`.
2. Don't `git add pom.xml` when committing other work.
3. If the change accidentally landed in a commit, amend it out: save the working-tree pom (`cp pom.xml /tmp/pom.kept`), restore the parent's version (`git checkout HEAD~1 -- pom.xml`), `git commit --amend --no-edit`, restore (`cp /tmp/pom.kept pom.xml`).
4. Use `git update-index --skip-worktree pom.xml` if you want git to stop showing the modification (caveat: rebases sometimes need this turned back off).

If the team prefers committing the patch instead, that's also fine — the shape of the change is identical either way.
