# Refreshing this skill

The skill is a snapshot of SAP Fiori guidelines + UI5 APIs. Sources change. This is the repeatable
process to re-sync it and keep it up to date. **No unattended writes** — the process reports drift and proposes edits; a
human reviews and applies.

## Authoritative sources

| Source | URL | Reachable? | Use for |
|---|---|---|---|
| Fiori Design Guidelines | `sap.com/design-system/fiori-design-web/` | Yes, via versioned `.plain.html` (below) | Design rules, when-to-use |
| SAPUI5 / OpenUI5 API | `ui5.sap.com/` | Yes | Verifying `sap.*` class names, deprecations, OpenUI5 library membership |
| Theming tokens | `github.com/SAP/theming-base-content` | Yes (raw.githubusercontent.com) | CSS token names + values |

### Fetching the design guidelines

The portal is client-rendered, but each page's content is served as a static HTML fragment:

```bash
B=https://www.sap.com/design-system/fiori-design-web
curl -sS "$B/v1-151/ui-elements/button/usage.plain.html"   # guideline body (When to Use, Types, Guidelines…)
curl -sS "$B/v1-151/ui-elements/button.plain.html"         # hero: title + sap.* classes
```

- **Use a versioned path.** Unversioned URLs (`$B/ui-elements/button/`) return 404. Versions are published
  every third release (`v1-136`, `v1-139`, … `v1-151`); find the newest by probing upward until 404.
- **Headers.** Plain `curl` works. A browser `User-Agent` *without* an `Accept` header gets a 403 from the
  bot filter; send `Accept: text/html` with it. `WebFetch`-style tools hit the unversioned URL and fail.
- **Slug** = the control name in kebab case (`menu-button`, `segmented-button`, `upload-set`). Links inside a
  page point to sibling slugs.
- **Strip before use.** Content contains `[internal_only]…[/internal_only]` blocks and links to
  `wiki.one.int.sap` / `wiki.wdf.sap.corp` — drop both (internal SAP material). Keep `[external_only]` text.
- **API JSON** for step 2: `ui5.sap.com/test-resources/<lib path>/designtime/apiref/api.json`
  (e.g. `sap/m`, `sap/ui/core`); current version at `ui5.sap.com/resources/sap-ui-version.json`.

## Refresh process (agent-driven diff + review)

Run one agent per file group so context stays scoped. Each agent:
1. Reads its current reference file(s).
2. Fetches the matching live source(s) above. For every `sap.*` class, checks `ui5.sap.com` for
   existence, deprecation, and whether the library is part of OpenUI5 or SAPUI5-only. For tokens, fetches
   `theming-base-content`.
3. Diffs live vs current and **reports** — new/renamed/deprecated controls, changed token values,
   new wrong-component pitfalls, dead links — plus a proposed edit list. It does **not** write.
4. A human reviews the report and applies edits.

File groups: `ui-actions/inputs/navigation` · `ui-containers/layouts/lists-tables` ·
`ui-display/messages/ai/upload` ·
`SKILL.md + component-selection/theming-tokens`.

Can be launched as a Workflow (one agent per group, results collected) or via the Agent tool.

### Scheduled refresh

The Fiori design portal cannot be fetched live while the skill runs, so the skill is maintained as a
snapshot. To keep it from drifting, run the process above on a schedule — at least once per UI5
release — for example from a CI job that runs the agents and opens a pull request containing only the
drift report and proposed edits. The "no unattended writes" rule still applies: a human reviews and
merges.

## Invariants every refresh must preserve

- Decision-first contract per section: **OpenUI5 / SAPUI5 control · Use when · Do NOT use when → alternative · Rules · Gotchas.** No anatomy, no state prose.
- Every control names its `sap.*` class and OpenUI5 vs SAPUI5 availability.
- When a guideline page names a deprecated API, follow the API: recommend the replacement and mention the deprecated name only as a gotcha.
- A section with no guideline page is marked "API-based, no guideline page" on its control line.
- SKILL.md body stays a router: Wrong→Right table, Use-case→Component map, routing table, one-liners. Keep it under ~200 lines; keep `description` under ~1,536 chars.
- Tone: short, concise, no fluff.

## Verification after any refresh

```bash
# 1. No scrape artifacts or dead/internal links (must return nothing)
grep -rnE '\+-+x-+\+|:badge|:decline:|:overflow:|:bell:|builder-prospect|ui5\.github\.io|wiki\.one\.int\.sap|&#x[0-9a-f]+;|Section Metadata|external_only' references/ SKILL.md

# 2. Every ui-*.md component section names a sap.* identifier (spot-check)
grep -rnE '`sap\.' references/ui-*.md | head

# 3. SKILL.md budget
wc -l SKILL.md   # target < 200
```
- For each `sap.*` class, confirm via `ui5.sap.com` that it exists and note OpenUI5 vs SAPUI5 availability.
- Run the cases in `tests/eval.json` (see `tests/README.md`); add a case for every new control or wrong→right row.
- Trigger test in a fresh session: "how do I build a navigation bar in Fiori", "I'm using sap.m.Bar
  for my header", "which table for large and complex data", "design an object page" should each surface the right
  guidance.

## Version stamping

- Record the SAP Fiori guideline version and refresh date in `README.md`.
- On material change, bump the version line in `README.md`.
