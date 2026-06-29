# Async Patterns in QUnit Tests

This reference covers every async decision point: rendering, event waiting, fake timers, and when NOT to convert.

---

## 1. Rendering  -  nextUIUpdate() vs Core.applyChanges()

**Default:** use `await nextUIUpdate()`. Make the test function `async`. Import from `sap/ui/test/utils/nextUIUpdate`.

```js
// Bad
oControl.setVisible(false);
Core.applyChanges();
assert.notOk(oControl.getDomRef(), "not rendered");

// Good
oControl.setVisible(false);
await nextUIUpdate();
assert.notOk(oControl.getDomRef(), "not rendered");
```

**With fake timers:** pass the sinon clock instance — `nextUIUpdate` will tick it automatically:

```js
QUnit.module("with fake timers", {
    beforeEach: function() {
        this.clock = sinon.useFakeTimers();
    },
    afterEach: function() {
        this.clock.restore();
    }
});

QUnit.test("renders after setVisible", async function(assert) {
    assert.expect(1);
    oControl.setVisible(true);
    await nextUIUpdate(this.clock);  // ticks the clock internally
    assert.ok(oControl.getDomRef(), "rendered");
});
```

**Keep `Core.applyChanges()`  -  do NOT replace  -  in these cases:**

| Situation | Preferred fix | Why `Core.applyChanges()` stays |
|---|---|---|
| Sinon fake timers active (`sinon.useFakeTimers()`, `sinon.config.useFakeTimers = true`, or sinon's QUnit integration) | Pass the clock: `await nextUIUpdate(this.clock)` | The clock must be ticked to advance past the `setTimeout(0)` used by async rendering. `nextUIUpdate(clock)` does this automatically and is the standard modern approach (widely used across OpenUI5). Only fall back to `Core.applyChanges()` when the render requires more than a single clock tick and `nextUIUpdate(clock)` cannot handle it. |
| Shared helper functions (`renderObject`, `waitForUIUpdates`) used by many tests | Consider `nextUIUpdate.runSync()` (test-only escape hatch — see below) | Callers need synchronous DOM state without async coordination. |
| Inside a `load` event callback that must flush a subsequent `invalidate()` synchronously | — | `Core.applyChanges()` must be called inside the callback. |

**`nextUIUpdate.runSync()`  -  synchronous escape hatch for shared helpers (test code only):**

When a shared helper function must remain synchronous (e.g. `renderObject` called by many tests that cannot all be made async), use `nextUIUpdate.runSync()` instead of `Core.applyChanges()`. It flushes pending renders synchronously and is explicitly intended for test code. It logs a warning each call as a reminder to migrate.

```js
// In a shared helper - synchronous, test code only
function renderObject(oControl) {
    oControl.placeAt("qunit-fixture");
    nextUIUpdate.runSync();  // test-only; logs a warning to encourage migration
}
```

Do not use `nextUIUpdate.runSync()` in production code.

**Important:** `Core.applyChanges()` is not available in legacy-free UI5. When keeping it instead of converting, add an inline comment on each occurrence explaining why it cannot be converted:

```js
// keep Core.applyChanges() - load event callback, must flush invalidate() synchronously
Core.applyChanges();
```

Do not rely solely on the commit message  -  20 different places can have 20 different reasons, and mapping between commit message and code is cumbersome.

**Only `sap/ui/test/utils/nextUIUpdate` must be used.** The legacy path `sap/ui/qunit/utils/nextUIUpdate` is a deprecated re-export (since UI5 1.127) that resolves to the same implementation — do not use it in new code.

---

## 2. Waiting for control events  -  waitForEvent() helper

Wrap one-time event listeners in a Promise helper instead of `assert.async()` + callback boilerplate.

**Generic helper  -  define once per file:**

```js
function waitForEvent(oControl, sEventName) {
    return new Promise((resolve) => {
        oControl.attachEventOnce(sEventName, resolve);
    });
}
```

```js
// Bad
QUnit.test("something", function(assert) {
    const done = assert.async();
    oControl.attachEventOnce("someEvent", function() {
        assert.ok(oControl.getProperty("x"), "property set");
        done();
    });
});

// Good
QUnit.test("something", async function(assert) {
    assert.expect(1);
    await waitForEvent(oControl, "someEvent");
    assert.ok(oControl.getProperty("x"), "property set");
});
```

**ObjectPageLayout example**  -  `onAfterRenderingDOMReady` fires after internal scroll/height calculations, after the render cycle:

```js
function waitForDOMReady(oOPL) {
    return new Promise((resolve) => {
        oOPL.attachEventOnce("onAfterRenderingDOMReady", resolve);
    });
}
```

**Waiting for a specific control's next render cycle** - use `addEventDelegate` when the assertion depends on a particular control re-rendering, not just any pending render:

```js
function waitForRendering(oControl) {
    return new Promise((resolve) => {
        const oDelegate = {
            onAfterRendering: function() {
                oControl.removeEventDelegate(oDelegate);
                resolve();
            }
        };
        oControl.addEventDelegate(oDelegate);
    });
}

QUnit.test("toolbar updates after model change", async function(assert) {
    assert.expect(1);
    const oRenderPromise = waitForRendering(this.oToolbar);
    this.oModel.setProperty("/title", "Updated");
    await oRenderPromise;
    assert.strictEqual(this.oToolbar.getDomRef().textContent, "Updated", "title updated");
});
```

**FlexibleColumnLayout helpers:**

```js
function waitForColumnsResize(oFCL) {
    return oFCL._oAnimationEndListener.waitForAllColumnsResizeEnd();
}

function waitForColumnsResizeOnce(oFCL) {
    return new Promise((resolve) => {
        oFCL._attachAfterAllColumnsResizedOnce(resolve);
    });
}
```

---

## 3. assert.async()  -  when to convert, when to leave

**Convert** simple one-callback patterns to `async` + `await new Promise(...)`.

**Do NOT convert** when the callback contains any of:

| Pattern | Reason to keep assert.async() |
|---|---|
| `setTimeout` with a non-zero delay inside the callback | The delay is intentional  -  see section 4. |
| Nested `attachEventOnce` calls | Complex event chains are harder to reason about as nested awaits. |
| Multiple `done()` call sites | Cannot be represented as a single Promise resolution. |
| Stubs or spies that call `done()` internally | The done reference is captured inside the stub  -  removing it breaks the test. |

---

## 4. Intentional setTimeout delays  -  do not remove

Some `setTimeout` calls are genuinely necessary:

- **Post-render DOM calculations:** scroll positions, element heights, resize observer results  -  these complete asynchronously *after* the post-render event fires.
- **Animation/transition waits:** resize handler processing, CSS animation completions.
- **Fake timer tests:** `sinon.useFakeTimers()` requires `Core.applyChanges()` and explicit `this.clock.tick(n)`.

When keeping such a `setTimeout`, add a brief inline comment with the actual reason:

```js
// column resize animation completes asynchronously after afterOpen fires
setTimeout(() => {
    assert.strictEqual(oDialog.getDomRef().offsetWidth, iExpected, "width correct");
    done();
}, 300);
```

Do not use generic labels  -  write the actual cause.
