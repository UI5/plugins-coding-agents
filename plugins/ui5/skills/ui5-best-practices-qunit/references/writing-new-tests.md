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

**Exception:** If a test must attach an event handler before the initial render fires, do the `attachEvent`, `placeAt`, and `await nextUIUpdate()` inside the test itself rather than in `beforeEach`. QUnit's internal scheduling can insert a `setTimeout` between `beforeEach` and the test body, which may trigger a rendering in between  -  rare, but enough to make the test flaky.

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

- Add `/*global QUnit */` as the first line so ESLint recognises the QUnit global without requiring an explicit import. Note: the Foundation team is working on making this unnecessary (CPOUI5FOUNDATION-1204)  -  once that feature is available, the comment can be removed.
- **Sinon:** use sinon consistently in one of two ways  -  do not mix them:
  - **Via the QUnit-sinon bridge (preferred):** configured in the test starter; sinon is not imported as a dependency. Use `this.stub()`, `this.spy()`, `this.clock` from the QUnit context.
  - **Via explicit dependency:** import sinon as a module dependency and do not configure it via the test starter. Do not use the bridge (`this.stub()` etc.) in this case.
  - Add `/*global sinon */` only when sinon is used via the bridge (it arrives as a global, not an AMD module).
- Declare all other dependencies in `sap.ui.define`. Do not import `sap/ui/core/Core` just for `Core.applyChanges()`  -  use `nextUIUpdate()` instead. Do not use deprecated Core APIs in new tests: replace `Core.byId(id)` with `Element.getElementById(id)` (`sap/ui/core/Element`), `Core.getConfiguration().getAnimationMode()` with `ControlBehavior.getAnimationMode()` (`sap/ui/core/ControlBehavior`), `Core.getConfiguration().getLanguage()` with `Localization.getLanguage()` (`sap/base/i18n/Localization`), and other deprecated configuration getters with their successor module, and other deprecated methods with their documented modern alternatives.
- Avoid non-ASCII characters in comments, strings, or JSDoc  -  use plain ASCII hyphens, not em dashes (U+2014). UTF-8 is the required encoding, but non-ASCII characters in comments have historically caused encoding issues.

Verify encoding before committing (adapt path to project layout):
```bash
# S/4 reuse libraries
grep -Pn '[^\x00-\x7E]' test/<library>/**/*.qunit.js

# Apps
grep -Pn '[^\x00-\x7E]' webapp/test/**/*.qunit.js
```
