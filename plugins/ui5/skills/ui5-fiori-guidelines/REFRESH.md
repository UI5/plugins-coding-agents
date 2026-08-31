# Refreshing this skill

The skill is a snapshot of SAP Fiori guidelines + UI5 APIs. Sources change. This is the repeatable
process to re-sync it and keep it up to date. **No unattended writes** — the process reports drift and proposes edits; a
human reviews and applies.

## Authoritative sources

| Source | URL | Reachable? | Use for |
|---|---|---|---|
| Fiori Design Guidelines | `sap.com/design-system/fiori-design-web/` | Often 403s automated fetches | Human reference for design rules, when-to-use |
| SAPUI5 API | `ui5.sap.com/` | Yes | Verifying `sap.*` class names, deprecations |
| UI5 Web Components | `sap.github.io/ui5-webcomponents/` | Yes | Verifying `ui5-*` tags, slots, properties |
| Theming tokens | `github.com/SAP/theming-base-content` | Yes (raw.githubusercontent.com) | CSS token names + values |
| UI5 Web Components MCP server | local MCP (`get_component_api`, `get_doc`, `list_docs`) | Yes | Fastest tag/API verification + V2→V3 migration/deprecations |

The design portal blocks scrapers; treat it as a human-read source. Everything machine-checkable
(control names, tags, tokens) comes from the API sources and the MCP server.

## Refresh process (agent-driven diff + review)

Run one agent per file group so context stays scoped. Each agent:
1. Reads its current reference file(s).
2. Fetches the matching live source(s) above. For every `ui5-*` tag, calls MCP `get_component_api`
   to confirm it still exists and its package hasn't moved. For tokens, fetches
   `theming-base-content`. For `sap.*` classes, checks `ui5.sap.com`.
3. Diffs live vs current and **reports** — new/renamed/deprecated controls, changed tags or
   packages, changed token values, new wrong-component pitfalls, dead links — plus a proposed edit
   list. It does **not** write.
4. A human reviews the report and applies edits.

File groups: `ui-actions/inputs/navigation` · `ui-containers/lists-tables` ·
`ui-display/messages/ai/upload` ·
`SKILL.md + component-selection/theming-tokens`.

Can be launched as a Workflow (one agent per group, results collected) or via the Agent tool.

## Invariants every refresh must preserve

- Decision-first contract per section: **SAPUI5 + Web Component identifiers · Use when · Do NOT use when → alternative · Rules · Gotchas.** No anatomy, no state prose.
- Every control names both framework identifiers, or explicitly states "none" when one doesn't exist.
- SKILL.md body stays a router: Wrong→Right table, Use-case→Component map, routing table, one-liners. Keep it under ~200 lines; keep `description` under ~1,536 chars.
- Tone: short, concise, no fluff.

## Verification after any refresh

```bash
# 1. No scrape artifacts or dead/internal links (must return nothing)
grep -rnE '\+-+x-+\+|:badge|:decline:|:overflow:|:bell:|builder-prospect|ui5\.github\.io|wiki\.one\.int\.sap|&#x[0-9a-f]+;|Section Metadata|external_only' references/ SKILL.md

# 2. Every ui-*.md component section names an identifier (spot-check)
grep -rnE '`sap\.|`ui5-' references/ui-*.md | head

# 3. SKILL.md budget
wc -l SKILL.md   # target < 200
```
- For each `ui5-*` tag referenced anywhere, confirm via MCP `get_component_api` that it resolves
  (this catches invented tags like the non-existent `ui5-menu-button`).
- Trigger test in a fresh session: "how do I build a navigation bar in Fiori", "I'm using sap.m.Bar
  for my header", "which table for 5000 rows", "design an object page" should each surface the right
  guidance.

## Version stamping

- Record the SAP Fiori guideline version and refresh date in `README.md`.
- On material change, bump the version line in `README.md`.
