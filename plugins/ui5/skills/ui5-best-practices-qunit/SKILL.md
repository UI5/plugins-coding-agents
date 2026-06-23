---
name: ui5-best-practices-qunit
description: |
  Use when the user asks to "write a QUnit test", "fix a failing QUnit test", "add a QUnit module", "modernize QUnit tests", or mentions QUnit-specific constructs such as assert.async, nextUIUpdate, Core.applyChanges, sinon sandbox, or QUnit.module. Covers coding standards for OpenUI5/SAPUI5 unit test files: const/let over var, arrow functions over .bind(this), async/await over assert.async(), assert.expect() in every async test, sinon.createSandbox(), descriptive test names, beforeEach/afterEach module isolation, nextUIUpdate vs Core.applyChanges rules, try/finally teardown in helpers, and ISO 8859-1 compliance.
---

# QUnit Test Best Practices for UI5

## When to load each reference

| Trigger | Load |
|---|---|
| Writing a new QUnit test file or module from scratch | [`references/writing-new-tests.md`](references/writing-new-tests.md) |
| Modernizing, refactoring, or reviewing existing test code | [`references/modernizing-tests.md`](references/modernizing-tests.md) |
| Any test touches `nextUIUpdate`, `Core.applyChanges`, `assert.async`, fake timers, or event-based async | [`references/async-patterns.md`](references/async-patterns.md) |

Load the reference before producing any output. Do not work from memory.

---

## Core rules (always apply)

| Rule | Detail |
|---|---|
| No `var` | Use `const` or `let`. One declaration per line  -  no comma chains. |
| No `.bind(this)` | Use arrow functions for callbacks that do not need their own `this`. |
| `assert.expect(N)` in every `async` test | Guards against silent passes when async callbacks never fire. Not required for sync tests. |
| `sinon.createSandbox()` | `sinon.sandbox.create()` is deprecated  -  never use it. |
| Descriptive test names | Sentence describing behavior. Never start with "it should". Unique within each module. |
| `beforeEach` / `afterEach` in every module | Create all controls in `beforeEach`, destroy them in `afterEach`. No shared mutable state between tests. |
| `try/finally` in helper-created controls | Helpers that create a control must destroy it in `finally` so it is cleaned up even when assertions throw. |
| ISO 8859-1 compliance | No non-ASCII characters in comments, strings, or JSDoc. Use plain ASCII hyphens, not em dashes. |
| ESLint  -  0 errors | Warnings for pre-existing patterns (`max-nested-callbacks`, `no-use-before-define`, `valid-jsdoc`) are acceptable. |

---

## Quick-reference checklist

Use when authoring or reviewing a QUnit test file:

- [ ] No `var`  -  use `const` or `let`; one declaration per line (no comma chains)
- [ ] No `.bind(this)`  -  use arrow functions for callbacks that do not need their own `this`
- [ ] No `assert.async()` in simple cases  -  use `async function` + `await new Promise(...)`
- [ ] Every `async` test has `assert.expect(N)`
- [ ] No `sinon.sandbox.create()`  -  use `sinon.createSandbox()`
- [ ] No `"it should..."` test titles  -  use descriptive sentences
- [ ] Every `QUnit.module` has `beforeEach` / `afterEach` that create and destroy all controls
- [ ] `Core.applyChanges()` kept (not replaced with `nextUIUpdate()`) when `useFakeTimers` is active
- [ ] Helper functions that create controls destroy them in `try/finally`
- [ ] No non-ASCII characters  -  files must be ISO 8859-1 compliant
