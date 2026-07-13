# Modernizing Existing QUnit Tests

Follow this reference when refactoring, reviewing, or fixing existing test code. Each section is an independent transformation  -  apply whichever are relevant.

---

## 1. var -> const / let

Replace `var` with `const` (never reassigned) or `let` (reassigned). One declaration per line  -  split comma chains.

```js
// Bad
var oPage = this.oObjectPage;
var iCount = 0;
const oSection = oPage.getSections()[0],
    oSubSection = oSection.getSubSections()[0];

// Good
const oPage = this.oObjectPage;
let iCount = 0;
const oSection = oPage.getSections()[0];
const oSubSection = oSection.getSubSections()[0];
```

When an uninitialized declaration is followed by a single assignment, inline them:

```js
// Bad
let oItem;
// ... setup ...
oItem = oList.getFirstItem();

// Good
const oItem = oList.getFirstItem();
```

---

## 2. .bind(this) -> arrow functions

Replace `.bind(this)` callbacks with arrow functions when the callback does not need its own `this`.

```js
// Bad
aItems.forEach(function(oItem) {
    assert.ok(oItem.getVisible(), "item is visible");
}.bind(this));

// Good
aItems.forEach((oItem) => {
    assert.ok(oItem.getVisible(), "item is visible");
});
```

---

## 3. assert.async() -> async/await

Convert simple one-callback patterns. Leave complex ones unchanged.

```js
// Bad
QUnit.test("event fires", function(assert) {
    assert.expect(1);
    const done = assert.async();
    oControl.attachEventOnce("afterOpen", function() {
        assert.ok(true, "afterOpen fired");
        done();
    });
    oControl.open();
});

// Good
QUnit.test("event fires", async function(assert) {
    assert.expect(1);
    await new Promise((resolve) => {
        oControl.attachEventOnce("afterOpen", () => {
            assert.ok(true, "afterOpen fired");
            resolve();
        });
    });
    oControl.open();
});
```

**Do NOT convert** when the callback has nested `attachEventOnce` chains, multiple `done()` call sites, or stubs/spies that call `done()` internally. See [`async-patterns.md`](async-patterns.md) for the full rules.

---

## 4. Core.applyChanges() -> await nextUIUpdate()

Replace `Core.applyChanges()` with `await nextUIUpdate()` and make the function `async`.

**Do NOT replace** when fake timers are active, the pattern is in a shared helper, or the call is inside a `load` event callback. See [`async-patterns.md`](async-patterns.md) for all exceptions  -  check them before converting.

When replacing, add `assert.expect(N)` to the test if it is now `async` and did not have one before.

---

## 5. sinon.sandbox.create() -> sinon.createSandbox()

```js
// Bad
const oSandbox = sinon.sandbox.create();

// Good
const oSandbox = sinon.createSandbox();
```

When the QUnit-sinon integration is already active, `this.stub()`, `this.spy()`, and `this.clock` are available directly on the QUnit context  -  a manual sandbox is not needed at all.

**Do not mix** the QUnit-sinon bridge (`this.stub()`, `this.spy()`) with an explicitly created sandbox in the same test or module. Use one approach consistently:

- **Bridge only:** rely on `this.stub()`, `this.spy()`, `this.clock`  -  the bridge restores everything automatically in `afterEach`.
- **Sandbox only:** create with `sinon.createSandbox()`, call `oSandbox.restore()` in `afterEach` (or `finally`).

Note: migrating from a manual sandbox to the bridge is straightforward in most cases. The bridge also exposes `this.verifyAndRestore()`. The only scenario where keeping a sandbox is justified is when the sandbox `verify()` method (without restore) is called mid-test  -  `this.verifyAndRestore()` always restores, so it cannot replace a standalone `verify()` call.

---

## 6. Add assert.expect(N) to async tests that lack it

Every `async` test must declare the expected assertion count. Scan the test body to count the assertions and add the call as the first line.

```js
// Bad - if the await never resolves, 0 assertions pass silently
QUnit.test("change event fires", async function(assert) {
    await waitForEvent(oControl, "change");
    assert.ok(oControl.getSelectedItem(), "item selected");
});

// Good
QUnit.test("change event fires", async function(assert) {
    assert.expect(1);
    await waitForEvent(oControl, "change");
    assert.ok(oControl.getSelectedItem(), "item selected");
});
```

---

## 7. Remove unused imports

After replacing all `Core.applyChanges()` calls, remove `sap/ui/core/Core` from the `sap.ui.define` array and function parameters  -  unless the import representing `sap/ui/core/Core` is still used elsewhere.

Check for all uses of the parameter bound to `sap/ui/core/Core`  -  it may be named `Core`, `oCore`, `CoreInstance`, or anything else. Remove it only when no usage of that parameter remains:

- `Core.byId(...)`, `Core.getConfiguration()`, `Core.getModel()`, etc.
- `sap.ui.getCore()` calls anywhere in the file **do** count  -  they are a hidden dependency on `sap/ui/core/Core` and prevent removal. Prefer replacing `sap.ui.getCore().someMethod()` with the imported `Core` parameter instead.
- Exception: top-level bootstrap calls like `sap.ui.getCore().attachInit(...)` or `.ready(...)` are harder to replace and are out of scope for this skill  -  keep the import when they are present.

```js
// Before
sap.ui.define([
    "sap/ui/core/Core",
    "sap/ui/test/utils/nextUIUpdate"
], function(Core, nextUIUpdate) {
    // Core.applyChanges() replaced; Core no longer used
});

// After
sap.ui.define([
    "sap/ui/test/utils/nextUIUpdate"
], function(nextUIUpdate) {
    // ...
});
```

---

## 8. Fix non-ASCII characters

Replace non-ASCII characters in comments and strings with plain ASCII alternatives. UTF-8 is the required encoding, but non-ASCII characters  -  especially in comments  -  have historically caused encoding issues (e.g. garbled output when the `<meta charset>` tag is missing). When a non-ASCII character is semantically meaningful and cannot be replaced with an ASCII equivalent, use a Unicode escape instead (e.g. `\u00a0` for a non-breaking space).

```js
// Bad - em dash U+2014 renders as a garbled character
// Exception <U+2014> keep Core.applyChanges() when...

// Good - plain ASCII hyphen
// Exception - keep Core.applyChanges() when...

// Good - Unicode escape when the character is meaningful
const nbsp = "\u00a0";
```

Find violations (adapt the path pattern for your project layout):
```bash
# S/4 reuse libraries
grep -Pn '[^\x00-\x7E]' test/<library>/**/*.qunit.js

# Apps
grep -Pn '[^\x00-\x7E]' webapp/test/**/*.qunit.js
# or
grep -Pn '[^\x00-\x7E]' src/main/webapp/test/**/*.qunit.js
```

---

## 9. QUnit 1 -> QUnit 2 globals migration

QUnit 1 (loaded via `sap/ui/thirdparty/qunit.js` or a test starter with `qunit/version: 1`) exposed `test`, `asyncTest`, `ok`, `equal`, `strictEqual`, and all other assertions as globals. QUnit 2 requires the `QUnit` namespace and passes the `assert` object as a parameter.

**Global functions -> namespaced:**

```js
// Bad - QUnit 1 globals
test("renders", function() {
    ok(oControl.getDomRef(), "rendered");
});

asyncTest("loads data", function() {
    expect(1);
    oModel.attachEventOnce("requestCompleted", function() {
        ok(oModel.getData(), "data loaded");
        start();
    });
});

// Good - QUnit 2
QUnit.test("renders", function(assert) {
    assert.ok(oControl.getDomRef(), "rendered");
});

QUnit.test("loads data", async function(assert) {
    assert.expect(1);
    await new Promise((resolve) => {
        oModel.attachEventOnce("requestCompleted", () => {
            assert.ok(oModel.getData(), "data loaded");
            resolve();
        });
    });
});
```

**Expected assertion count:**

QUnit 1 accepted the count as the second argument to `test()`. QUnit 2 uses `assert.expect(N)` as the first line of the test body:

```js
// Bad - QUnit 1 style
test("fires event", 1, function() { ... });

// Good - QUnit 2 style
QUnit.test("fires event", function(assert) {
    assert.expect(1);
    ...
});
```

**`stop()` / `start()` -> async/await:**

Replace `stop()` / `start()` pairs with `async/await` following the pattern in section 3 above.

| QUnit 1 | QUnit 2 |
|---|---|
| `asyncTest(...)` | `QUnit.test("...", async function(assert) { ... })` |
| `expect(N)` (global) | `assert.expect(N)` |
| `stop()` / `start()` | `await new Promise(...)` |
| `ok(...)` | `assert.ok(...)` |
| `equal(...)` | `assert.equal(...)` |
| `strictEqual(...)` | `assert.strictEqual(...)` |

---

## 10. What NOT to change

| Pattern | Leave it |
|---|---|
| `Core.applyChanges()` with fake timers active | Converting hangs the test  -  see [`async-patterns.md`](async-patterns.md) |
| `setTimeout` with a non-zero delay inside an event callback | The delay is intentional  -  do not remove or replace with `await` |
| `assert.async()` with nested event chains or multiple `done()` sites | Complex control flow cannot be collapsed into a single Promise |
| `Core.applyChanges()` inside `load` event callbacks | Must flush `invalidate()` synchronously |
