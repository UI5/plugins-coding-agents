# Async Patterns in QUnit Tests

This reference covers every async decision point: rendering, event waiting, fake timers, and when NOT to convert.

---

## 1. Rendering  -  nextUIUpdate() vs Core.applyChanges()

**Default:** use `await nextUIUpdate()`. Make the test function `async`.

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

**Keep `Core.applyChanges()`  -  do NOT replace  -  in these cases:**

| Situation | Why |
|---|---|
| Sinon fake timers active (`sinon.useFakeTimers()`, `sinon.config.useFakeTimers = true`, or sinon's QUnit integration) | `await nextUIUpdate()` queues a microtask that never resolves when the clock is frozen  -  the test hangs indefinitely. |
| `placeAt()` called in `beforeEach` and assertions run immediately after in the test body | `nextUIUpdate()` only resolves if a render is already pending at the moment of the call. |
| Shared helper functions (`renderObject`, `waitForUIUpdates`) used by many tests | Keep them synchronous so callers can reason about DOM state without async coordination. |
| Inside a `load` event callback that must flush a subsequent `invalidate()` synchronously | `Core.applyChanges()` must be called inside the callback. |

Note the reason in the commit message when keeping `Core.applyChanges()` so future reviewers do not flag it.

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
