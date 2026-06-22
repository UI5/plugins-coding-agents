# Linter-Invisible Patterns — Redirect

These patterns are now handled by the dedicated **`fix-linter-blind-spots`** skill. See `fix-linter-blind-spots/SKILL.md` for detection commands, fix patterns, and before/after examples.

The skill covers all runtime-breaking patterns the UI5 linter misses:
- Global namespace assignments in `sap.ui.define` (case 1b)
- Cross-module global namespace references (case 1c extended)
- QUnit 1.x global assert modernization
- QUnit global assertion methods (`QUnit.ok` → `assert.ok`)
- Missing `assert` parameter in QUnit.test callbacks
- Global namespace mocking → sinon.stub
- Runtime globals as module imports

Phase 6 of `modernize-test-starter` delegates to `fix-linter-blind-spots` to run these checks across all JS files (app source + test).
