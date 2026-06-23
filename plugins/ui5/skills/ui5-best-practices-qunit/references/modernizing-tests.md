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

After replacing all `Core.applyChanges()` calls, remove `sap/ui/core/Core` from the `sap.ui.define` array and function parameters  -  unless `Core` is still used elsewhere (e.g. `Core.byId`, `Core.getConfiguration`).

---

## 8. Fix non-ASCII characters

Replace em dashes (U+2014) and other non-ASCII characters in comments with plain ASCII hyphens. Files must be ISO 8859-1 compliant.

```js
// Bad - em dash U+2014 renders as a garbled character
// Exception <U+2014> keep Core.applyChanges() when...

// Good - plain ASCII hyphen
// Exception - keep Core.applyChanges() when...
```

Find violations:
```bash
grep -Pn '[^\x00-\x7E]' src/<library>/test/**/*.qunit.js
```

---

## 9. What NOT to change

| Pattern | Leave it |
|---|---|
| `Core.applyChanges()` with fake timers active | Converting hangs the test  -  see [`async-patterns.md`](async-patterns.md) |
| `setTimeout` with a non-zero delay inside an event callback | The delay is intentional  -  do not remove or replace with `await` |
| `assert.async()` with nested event chains or multiple `done()` sites | Complex control flow cannot be collapsed into a single Promise |
| `Core.applyChanges()` inside `load` event callbacks | Must flush `invalidate()` synchronously |
