# Writing New QUnit Tests

Follow this reference when creating a new QUnit test file or adding a new `QUnit.module`.

---

## 1. Module structure

Every module must have `beforeEach` / `afterEach` hooks. No shared mutable state between tests.

```js
QUnit.module("My Feature", {
    beforeEach: async function() {
        this.oControl = new MyControl({ /* ... */ });
        this.oControl.placeAt("qunit-fixture");
        await nextUIUpdate();
    },
    afterEach: function() {
        this.oControl.destroy();
        this.oControl = null;
    }
});
```

**Exception:** If tests attach event handlers before the initial render fires, use synchronous `placeAt` without `await nextUIUpdate()` in `beforeEach`  -  otherwise the initial event fires before the test can attach its handler.

---

## 2. Test structure  -  Arrange / Act / Assert

Add section comments when the test body has distinct phases. Omit for single-assertion tests.

```js
QUnit.test("title is updated on section change", async function(assert) {
    assert.expect(1);

    // Arrange
    const oSection = this.oPage.getSections()[1];

    // Act
    this.oPage.setSelectedSection(oSection.getId());
    await nextUIUpdate();

    // Assert
    assert.strictEqual(this.oPage.getTitle().getText(), "Section 2", "title updated");
});
```

---

## 3. Descriptive test names

Test names must read as sentences describing the verified behavior.

| Bad | Good |
|---|---|
| `"basic"` | `"renders with default properties"` |
| `"API"` | `"setVisible triggers layout adjustment"` |
| `"it should render correctly"` | `"header is expanded after initial render"` |

- Never start with "it should"
- Every name within a module must be unique  -  duplicates cause QUnit to append number suffixes (`"getSelectedItem() 2"`), making failure reports ambiguous

---

## 4. Async tests

- Make the function `async` and always add `assert.expect(N)` at the top.
- Use `await nextUIUpdate()` for rendering. See [`async-patterns.md`](async-patterns.md) for the full rules including fake-timer exceptions.
- Prefer `await waitForEvent(oControl, "eventName")` over `assert.async()` for event-based patterns.

---

## 5. Helper functions that create controls

Destroy the control in `finally` so cleanup runs even when assertions throw.

```js
// Bad - control leaks if assertion throws
const fnTestProperty = function(mOptions) {
    QUnit.test("get" + mOptions.property + "()", function(assert) {
        assert.strictEqual(mOptions.control.getProperty(mOptions.property), mOptions.expected);
        mOptions.control.destroy();
    });
};

// Good
const fnTestProperty = function(mOptions) {
    QUnit.test("get" + mOptions.property + "()", function(assert) {
        try {
            assert.strictEqual(mOptions.control.getProperty(mOptions.property), mOptions.expected);
        } finally {
            mOptions.control.destroy();
        }
    });
};
```

---

## 6. Repeated async patterns  -  extract a named helper

For async wait patterns that appear more than once in a file, extract a named helper rather than inlining the boilerplate each time.

```js
// Canonical pattern
function waitForEvent(oControl, sEventName) {
    return new Promise((resolve) => {
        oControl.attachEventOnce(sEventName, resolve);
    });
}
```

See [`async-patterns.md`](async-patterns.md) for control-specific helpers (ObjectPageLayout, FlexibleColumnLayout).

---

## 7. File setup

- Add `/*global QUnit */` as the first line so ESLint recognises the QUnit global without requiring an explicit import.
- Declare all dependencies in `sap.ui.define`. Only import `sap/ui/core/Core` if `Core.byId`, `Core.getConfiguration`, or similar is used  -  do not import it just for `Core.applyChanges()` when `nextUIUpdate()` is used instead.
- File must be ISO 8859-1 compliant  -  no non-ASCII characters in comments, strings, or JSDoc. Use plain ASCII hyphens, not em dashes (U+2014).

Verify encoding before committing:
```bash
grep -Pn '[^\x00-\x7E]' src/<library>/test/**/*.qunit.js
```
