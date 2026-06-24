# verify-this-bind.js

Decides whether a JS function uses `this`, so its XML formatter ref needs `.bind($control)`.

## Why

UI5 XML formatters declared via `core:require` lose their `this` context unless explicitly bound. Skill `fix-xml-globals` must add `.bind($control)` for every formatter that reads `this` (member access, `jQuery.proxy(fn, this)`, aliased `var self = this`, arrow-inherited, …) and must NOT add it for pure-value formatters.

Manual `grep` misses bare-`this` idioms. This script is the canonical detector.

## Subcommands

### `audit-fn` — query (exit 0 always)

```bash
# By file path
node verify-this-bind.js audit-fn \
    --file webapp/utils/Formatter.js \
    --fn formatTagsText [--fn ...]

# By namespace, resolved via XML core:require
node verify-this-bind.js audit-fn \
    --namespace TableMgr \
    --fn formatTagsText \
    --xml-context webapp/fragment/KPIsTable.fragment.xml \
    --js-roots webapp/utils,webapp/model

# By namespace, explicit alias map
node verify-this-bind.js audit-fn \
    --namespace TableMgr \
    --fn formatTagsText \
    --alias TableMgr=webapp/utils/Manager.js
```

Output (one line per fn):

```
webapp/utils/Formatter.js::formatTagsText::USES_THIS::line=87
webapp/utils/Formatter.js::isEnabled::USES_THIS::line=269 (bare-this)
webapp/utils/Formatter.js::formatDate::NO_THIS::line=12
webapp/utils/Formatter.js::missing::NOT_FOUND
```

`--json` for JSON output.

### `verify-xml` — gate (exit 0 clean / 1 violations)

```bash
node verify-this-bind.js verify-xml \
    --xml-root webapp \
    --js-roots webapp/utils,webapp/model
```

Output (one line per violation):

```
webapp/fragment/KPIsTable.fragment.xml:73 TableMgr.getKPIsTileCount MISSING_BIND (uses this at webapp/utils/Manager.js:242)
```

## Detection rules

1. Locate function via 4 patterns: object-literal method, prototype assignment, static assignment, shorthand method.
2. Brace-balanced body extraction (string- and comment-aware).
3. Strip noise: `//` comments, `/* */` comments, `'...'` / `"..."` / `` `...` `` strings, nested non-arrow `function (...) { ... }` bodies. Keep arrow `(...) => ...` bodies.
4. Detect `this`: `\bthis\.`, `\bthis\[`, bare arg `\bthis\s*[,)]`, standalone `\bthis\s*$`, expression operand.
5. Aliased `this`: `var|let|const X = this; ... X.foo` — UI5 idiom (`self`, `that`, `_this`, `me`, etc.).

## CLI flags

| Flag | Used by | Meaning |
|---|---|---|
| `--file <path>` | audit-fn | JS source path |
| `--fn <name>` | audit-fn | Function name (repeatable) |
| `--namespace <Alias>` | audit-fn | Resolve to file via `--xml-context`, `--alias`, or `--js-roots` |
| `--xml-context <file>` | audit-fn | XML to parse `core:require` from for namespace lookup |
| `--alias Name=path/to/file.js` | audit-fn, verify-xml | Explicit alias entry (highest precedence) |
| `--xml-root <dir>` | verify-xml | Walk this dir for `.view.xml` and `.fragment.xml` |
| `--js-roots <a,b,c>` | both | Comma-separated JS roots for namespace resolution |
| `--json` | both | JSON output |

## Limitations

- Cross-file inheritance: `Parent.prototype.fn.call(this)` from another file is not chased.
- TypeScript: out of scope. Plain-JS regex parser.
- Re-export wrappers: `module.exports.x = require('./y').x` audits the file pointed at, not the re-export target.
- Dynamic dispatch (`this[sName]()`): caught conservatively as `dynamic-property`.
- Decorators / non-standard fn declarations: may report `NOT_FOUND`.

## Tests

```bash
node verify-this-bind.test.js
```

Expected: `35 passed, 0 failed`.

Fixtures in `__fixtures__/`. Each one targets a specific detection branch — see file names.
