# Testsuite Configuration Reference

## Main Testsuite Structure

The main `testsuite.qunit.js` uses a hybrid approach: unit tests are delegated via a single `"unit/unitTests"` entry, while OPA/integration journeys are listed individually for selective execution:

```javascript
sap.ui.define(function() {
    "use strict";

    return {
        name: "QUnit test suite for <NAMESPACE-WITH-DOTS>",
        defaults: {
            page: "ui5://test-resources/<NAMESPACE>/Test.qunit.html?testsuite={suite}&test={name}",
            qunit: {
                version: 2
            },
            sinon: {
                version: 4
            },
            ui5: {
                theme: "sap_horizon"
            },
            loader: {
                map: {
                    "*": {
                        "sap/ui/thirdparty/sinon": "sap/ui/thirdparty/sinon-4",
                        "sap/ui/thirdparty/sinon-qunit": "sap/ui/qunit/sinon-qunit-bridge"
                    }
                },
                paths: {
                    "<NAMESPACE>": "../"
                }
            },
            coverage: {
                only: ["<NAMESPACE>"],
                never: ["<NAMESPACE>/test"]
            }
        },
        tests: {
            // ----- Unit Tests -----
            "unit/unitTests": {
                title: "Unit Tests"
            },
            // ----- OPA Integration Tests -----
            "integration/NavigationJourney": {
                title: "Navigation Journey"
            },
            "integration/SearchJourney": {
                title: "Search Journey"
            }
        }
    };
});
```

## Configuration Options

### `page`

The URL template for test pages. Uses `{suite}` and `{name}` placeholders:
- `{suite}` — resolves to the testsuite module path
- `{name}` — resolves to the test entry key

The `ui5://` protocol maps to the resource roots defined in `Test.qunit.html`.

### `module`

By default, Test Starter appends `.qunit` to the entry key to resolve the module path. Files referenced by testsuite entry keys must use the `.qunit.js` suffix (e.g., `formatter.qunit.js`, `JourneyMock_Case01.qunit.js`, `OrderDetails.qunit.js`). This applies to unit test files, OPA journey files, and aggregator files. Files loaded only as `sap.ui.define` dependencies (OPA utility modules, page objects, arrangement classes, `OpaSetup.js`) keep their plain `.js` extension — the `.qunit.js` convention is a Test Starter resolution mechanism for entry keys, not a universal requirement. Rename any `.js` journey files to `.qunit.js` during modernization.

No explicit `module` configuration is needed. Do not set `module: "./{name}"` — instead, rename files to follow the `.qunit.js` convention.

### `loader.paths`

Resource root mappings (slashes, not dots). All `loader.paths` values resolve relative to `Test.qunit.html` (at `webapp/test/`):
```javascript
loader: { paths: { "<NAMESPACE>": "../" } }
```

Additional paths for test services or Fiori Elements test libraries:
```javascript
loader: {
    paths: {
        "<NAMESPACE>": "../",
        "<NAMESPACE>/app": "testFLPService"
    }
}
```

### `coverage`

Code coverage configuration:
```javascript
coverage: {
    only: ["<NAMESPACE>"],        // instrument only app code
    never: ["<NAMESPACE>/test"]   // exclude test code
}
```

### `qunit` and `sinon`

Framework version settings. Use `version: 2` for QUnit and `version: 4` for Sinon to match modern UI5 defaults. Pin these explicitly to prevent breakage when UI5 upgrades third-party libraries.

**MockServer passthrough in Test Starter's isolated environment**: UI5's `MockServer` uses sinon's `FakeXMLHttpRequest.useFilters = true` with a filter that only intercepts requests matching registered mock routes — all other requests **pass through** to the real network via `defake()`. This is by design: in development with a real backend, non-mocked requests (annotations, i18n, etc.) resolve normally.

Before Test Starter, tests ran via individual HTML pages served by a development server. Passthrough requests could reach that server (or at least fail silently without breaking test execution). Test Starter runs tests in complete isolation via the `ui5://` protocol — there is no backend. Any request that passes through MockServer's filter hits a non-existent server and fails immediately with a network error, breaking integration tests.

The sinon version (4, the Test Starter default) is correlated but not the root cause — the isolated test environment is. This passthrough design has always existed in MockServer regardless of sinon version. It only becomes visible when the safety net of a real backend disappears.

**Symptoms**: OPA tests fail with timeout or "no response" errors for requests to annotation files, i18n resource bundles, or service endpoints not covered by the MockServer's `rootUri`.

**Fix**: After `oMockServer.start()`, append a catch-all request that intercepts everything the OData simulation doesn't cover:

```javascript
// In mockserver.js — after oMockServer.start()
sap.ui.define([
    "sap/ui/core/util/MockServer",
    "sap/base/Log"
], function(MockServer, Log) {
    "use strict";

    return {
        init: function() {
            var oMockServer = new MockServer({
                rootUri: "/sap/opu/odata/sap/MY_SERVICE/"
            });

            oMockServer.simulate("localService/metadata.xml", {
                sMockdataBaseUrl: "localService/mockdata"
            });

            oMockServer.start();

            // Test Starter isolation: requests outside rootUri pass through
            // to real network (which doesn't exist in Test Starter environment).
            // Add catch-all to respond with 404 instead of leaking.
            var aRequests = oMockServer.getRequests();
            aRequests.push({
                method: "GET",
                path: /.*/,
                response: function(oXhr) {
                    Log.error("MockServer: unmatched GET " + oXhr.url);
                    oXhr.respond(404, { "Content-Type": "text/plain" }, "");
                }
            });
            oMockServer.setRequests(aRequests);
        }
    };
});
```

**Why this works**: `oMockServer.setRequests()` re-registers all routes with sinon's `respondWith`, which also updates the filter list. The catch-all `/.*/` at the end means MockServer's filter now matches *every* URL — nothing passes through to the real network. The OData-specific routes still take precedence because sinon matches in reverse order (last registered wins only if earlier ones don't match first — but MockServer registers specific routes before the catch-all, so they win).

**Alternative — annotation/i18n specific**: If you know exactly which requests leak (e.g., annotation XMLs loaded from a different path), you can mock just those instead of a full catch-all:

```javascript
aRequests.push({
    method: "GET",
    path: /.*annotation.*/,
    response: function(oXhr) {
        oXhr.respondFile(200, {}, "localService/annotations.xml");
    }
});
```


## Per-Test Overrides

Individual test entries can override any default:

```javascript
tests: {
    "model/formatter": {
        title: "Formatter Unit Tests"
    },
    "JourneyMock_Case01": {
        title: "App level Activity Monitor",
        ui5: {
            libs: "sap.m, sap.uxap, sap.suite.ui.generic.template"
        }
    },
    "JourneyMock_Case02": {
        title: "Create project wizard",
        qunit: {
            testTimeout: 60000
        }
    },
    "JourneyMock_Case99": {
        title: "Disabled Test",
        skip: true
    }
}
```

## Organizing Large Test Suites

For testsuites with many entries, use section comments:

```javascript
tests: {
    // ----- Order -----
    "JourneyMock_Case01": { title: "App level Activity Monitor" },
    "JourneyMock_Case02": { title: "Create project wizard, PE project" },
    "JourneyMock_Case03": { title: "Create project wizard, Staging project" },

    // ----- Modernization Objects -----
    "JourneyMock_Case10": { title: "Modernization Object Overview" },
    "JourneyMock_Case11": { title: "Modernization Object Instance" }
}
```

## Documentation

Full configuration reference: [UI5 Test Starter – Configuration Options](https://ui5.sap.com/#/topic/738ed025b36e484fa99046d0f80552fd)
