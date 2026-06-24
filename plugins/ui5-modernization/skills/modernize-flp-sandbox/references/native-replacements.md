# Native Replacements for `sap/ushell/*` Symbols

This file is the **authoritative registry** of `sap/ushell/*` symbols that the
`/nsbx-migrate` skill is permitted to rewrite **automatically** in modules
reachable from the `beforeFlpStart` hook's transitive AMD graph (Section 6f of
`SKILL.md`).

> **Adding an entry here means Section 6f will mutate user code automatically.**
> Each new entry MUST come with:
> - An atomic fixture under `fixtures/atomic/` covering the rewrite end-to-end.
> - "Behavior caveats" listing every observable difference, even minor ones.
> - A registered eval in `evals/evals.json`.
>
> Anything not listed here → gap-report only (textual sketch or relocation diff).
> Never auto-apply a rewrite that isn't in this file.

---

## Schema

Each entry uses the following structure:

- **Symbol** — fully-qualified module path (e.g. `sap/ushell/services/URLParsing`)
- **Methods covered** — which exported methods/properties this entry handles
- **Native replacement** — the JS built-in (or platform) substitute
- **Auto-apply** — `YES` (Section 6f rewrites) or `NO` (gap-report only, kept here for reference)
- **Recipe** — concrete rewrite steps the migration applies
- **Behavior caveats** — every observable behavior difference
- **Test coverage** — name of the atomic fixture proving the rewrite

---

## Registry

### sap/ushell/services/URLParsing

- **Methods covered:** `parseParameters`
- **Native replacement:** `URLSearchParams` (built-in, ES2017)
- **Auto-apply:** YES
- **Recipe:**
  1. Remove `"sap/ushell/services/URLParsing"` from the `sap.ui.define([...])` dep array.
  2. Remove the corresponding factory parameter (typically `URLParsing`).
  3. Insert this helper at the top of the factory body (after `"use strict"` if present), if not already present:
     ```js
     function parseParams(sQuery) {
         var oResult = {};
         new URLSearchParams(sQuery).forEach(function (sValue, sKey) {
             (oResult[sKey] = oResult[sKey] || []).push(sValue);
         });
         return oResult;
     }
     ```
  4. Replace each call `URLParsing.parseParameters(sQuery)` with `parseParams(sQuery)`.
  5. If the only call site already inlined the parsing logic differently, leave the helper out and substitute inline.
- **Behavior caveats:**
  - `URLSearchParams` decodes `+` as space (legacy URL encoding). `URLParsing.parseParameters` did the same. **No drift.**
  - Repeated keys: `URLSearchParams.forEach` yields each occurrence. The recipe aggregates into an array — matches `parseParameters`'s array-valued semantics.
  - Empty query string (`""`): `URLSearchParams("")` produces an empty iterator, helper returns `{}`. `URLParsing.parseParameters("")` returned `{}`. **No drift.**
  - Leading `?`: `URLSearchParams` accepts query strings with or without a leading `?`. `URLParsing.parseParameters` did too. **No drift.**
- **Test coverage:** `fixtures/atomic/ushell-in-hook-graph`

---

## Future entries

When adding a new entry:

1. Add a new `### sap/ushell/...` section using the schema above.
2. Create a matching atomic fixture under `fixtures/atomic/<descriptive-name>/`.
3. Register it in `evals/evals.json`.
4. Update `SKILL.md` Section 6f if the recipe needs new helper logic.
5. Add a history note to `references/maintainer-guide.md`.
