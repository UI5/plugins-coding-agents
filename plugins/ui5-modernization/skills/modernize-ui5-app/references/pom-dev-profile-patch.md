# Dev Deploy Profile — Patch Rationale & Variants

This is the deep reference for the `pom.xml` change in §1.1 of SKILL.md. Read it when the simple diff doesn't apply cleanly — the surrounding repo has a non-standard dev deploy block, the parent pom version differs, or the user wants to understand why this change isn't already on `origin/main`.

## What the patch does

Two additions, both inside the dev deploy profile in `pom.xml`:

1. A runtime `dependency` on the UI5 instrumentation library (jscoverage).
2. A `maven-war-plugin` `webResources` block that copies `webapp/test/` into the WAR under `test-resources/`.

Both are dev-only. The optimized/release build profile must NOT receive them — production WARs intentionally exclude `webapp/test/` and don't load the instrumentation filter.

## Why neither is on `origin/main`

The parent pom wires an instrumentation filter into the deployed WAR's runtime classpath. The filter dependency is intentionally not declared as a default dependency — release builds skip it to avoid bundling instrumentation code into customer-facing artifacts. The dev profile is the right place to opt into it locally.

The `webResources` block is similarly absent because release WARs must not contain the test bootstrap (`testFLPService.html`), the OPA `.qunit.js` files, or the testsuite definition. Including them in `origin/main`'s dev profile would mean every developer's local build silently differs from CI, but since this is a dev-only profile it's safer to make it explicit per checkout.

The trade-off: every developer who wants test-resources reachable locally has to apply the patch. Some teams accept this; others ship a `pom.xml` with the dev profile patched and rely on `[skip ci]` commits or a sibling `pom-dev.xml` to keep CI green.

## Picking the instrumentation dependency version

The version should match the major UI5 framework version in use elsewhere in the project. To find it:

1. Look for any other UI5 dependency in `pom.xml` or the parent — match its version.
2. If the parent pom uses property-driven versions (e.g., `${ui5.version}`), reuse the same property.
3. Run `mvn dependency:tree | grep <ui5-groupId>` to see what the project already resolves.

A mismatched version usually still works at runtime (the API is stable), but a matched version avoids occasional class-version conflicts on startup.

### Fallback when the SNAPSHOT version isn't resolvable

If the internal Maven repository is unreachable or the desired SNAPSHOT was never published locally, Maven fails to resolve the dependency and the dev server won't start. Use the last released version that exists in your local Maven cache instead:

```bash
ls ~/.m2/repository/<groupId-path>/jscoverage/
```

Pick the highest non-SNAPSHOT entry and pin it in the profile dependency. Released versions are stable across minor releases — runtime behavior won't differ for the instrumentation filter. Treat the SNAPSHOT version as the "ideal" and the released version as the working fallback.

## Variants

### Repo already has SOME `webResources` in the dev profile

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

The patch is independent of the parent pom version — it only depends on the child's `pom.xml` having a dev deploy profile to extend. If the profile doesn't exist at all, add the whole block:

```xml
<profile>
    <id>tomcat.dev.deploy</id>
    <dependencies>
        <dependency>
            <groupId>${ui5.groupId}</groupId>
            <artifactId>jscoverage</artifactId>
            <version>${ui5.version}</version>
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

Some lean child poms inherit everything from the parent pom and never declare a `<profiles>` element themselves. Adding the profile alone won't be enough — Maven needs the wrapping `<profiles>` element. Insert the full wrapper after the closing `</build>` (or after `</dependencies>` if no `<build>` exists):

```xml
    </build>
    <profiles>
        <profile>
            <id>tomcat.dev.deploy</id>
            <dependencies>
                <dependency>
                    <groupId>${ui5.groupId}</groupId>
                    <artifactId>jscoverage</artifactId>
                    <version>${ui5.version}</version>
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

Detect this case: `grep -n "<profiles>\|<profile>\|tomcat.dev.deploy" pom.xml` returns nothing. The `mvn ... -Ptomcat.dev.deploy` invocation succeeds anyway (Maven silently ignores unknown profiles when launched from CLI), but startup fails with `ClassNotFoundException` because the parent pom wires the instrumentation filter without the dependency being on the runtime classpath.

### Repo uses a different Tomcat plugin version

Keep the rest of the patch as-is. The `webResources` and instrumentation dependency additions are independent of which Tomcat plugin runs the WAR — the change is to the WAR packaging, not the runner.

## Keeping the change local

The conventional pattern is to keep this patch out of published commits. Mechanics:

1. After applying, run `git status pom.xml` — should show `M pom.xml`.
2. Don't `git add pom.xml` when committing other work.
3. If the change accidentally landed in a commit, amend it out: save the working-tree pom, restore the parent's version, amend the commit, restore.
4. Use `git update-index --skip-worktree pom.xml` if you want git to stop showing the modification (caveat: rebases sometimes need this turned back off).

If the team prefers committing the patch instead, that's also fine — the shape of the change is identical either way.
