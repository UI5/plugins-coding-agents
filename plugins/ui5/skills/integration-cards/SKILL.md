---
name: integration-cards
description: MUST be loaded before any UI Integration Cards (also called UI5 Integration Cards) task — creating, modifying, validating, previewing, or reviewing a card, its `manifest.json`, its Configuration Editor (`dt/Configuration.js`), or any analytical chart configuration. Provides the official guidelines, validation rules, supported chart types, and Configuration Editor patterns.
---

# UI Integration Cards Development Guidelines

Rules an agent must follow when creating, modifying, validating, or previewing a UI Integration Card. Adherence is critical for working cards.

## When to load each reference

| Trigger | Load |
|---|---|
| Working on or planning an Analytical card | [`references/analytical_chart_types.md`](references/analytical_chart_types.md) |
| `dt/Configuration.js` exists, is being created, or is being modified | [`references/configuration_editor_example.md`](references/configuration_editor_example.md) |

If the trigger applies, load before producing any output. Do not work from memory.

## 1. Core rules

| Rule | Detail |
|---|---|
| Prefer declarative cards | Types: List, Table, Calendar, Timeline, Object, Analytical. Create an Extension only in exceptional cases. |
| Use `create_integration_card` MCP tool | When creating a new declarative card. |
| Parameter binding syntax | `{parameters>/parameterKey/value}` — single braces, `>` separator, `value` suffix. |
| Destination binding syntax | `{{destinations.destinationName}}` — double braces, dot. Configure under `sap.card/configuration/destinations/`. Reference by name; never replace with raw URL. |
| i18n binding | Bind every non-data, user-visible string to the i18n model. |
| Links | Use the `actions` property; never inline `<a>` or hand-rolled URL handlers. |
| Validate before declaring done | See [3. Validation](#3-validation). |
| Show preview when requested | See [4. Preview](#4-preview). |
| Don't modify provided data | Use it as supplied. |
| JSON responses only | The endpoint behind `sap.card/data/request` must return JSON. For OData services, append `$format=json` to the request URL or parameters. |

## 2. Data placement

`sap.card/data/` is the only correct top-level location for the data request.

| Path | Purpose |
|---|---|
| `sap.card/data/path` | Primary data path |
| `sap.card/content/data/path` | Content-specific path; **overrides** the primary path if set |
| `sap.card/header/data/path` | Header-specific path; **overrides** the primary path if set |

Forbidden: putting the request itself under `sap.card/content/data/` or `sap.card/header/data/`.

**Symptom — "No data to display":** typically caused by a `content/data` block that overrides the primary data path. Verify [2. Data placement](#2-data-placement) before debugging anything else.

## 3. Validation

| Rule | Detail |
|---|---|
| Valid JSON | `manifest.json` must parse. |
| `sap.app/type` | Must be `"card"`. |
| Schema validation | Use `run_manifest_validation` MCP tool. |
| No deprecated properties | In `manifest.json` or elsewhere. |
| Not a UI5 project | Except for `Component`-type cards. |

## 4. Preview

If asked to preview, first check the card folder for an existing preview entry point — `package.json` `start` script, `README.md`, or an existing HTML file. Reuse it if present. Otherwise create an HTML page with a `<ui-integration-card>` element pointing at the manifest, and serve via an `http` server.

## 5. Configuration Editor

The editor lets the Administrator, Page/Content Administrator, and Translator personas customize a card without editing `manifest.json` directly.

Two pieces:
1. `dt/Configuration.js` — exports a function that returns `new Designtime({ form: {...} })`.
2. `manifest.json` — references the file at `sap.card/configuration/editor`.

Design as the **Administrator** persona.

| Rule | Detail |
|---|---|
| Mirror the manifest | Editor reflects the current structure and parameters of `manifest.json` exactly. `manifestpath` can target any existing path — a `configuration/parameters/*/value` for parameterized fields, or a direct path like `/sap.card/header/icon/shape` for static manifest properties. |
| All existing fields editable | Title, subtitle, header icon, parameters — make them configurable. |
| Ask the user | Before deciding which fields to expose, ask: "Make all manifest fields editable? Anything else to add?" |
| No invented fields | Never add an editor field that does not exist in `manifest.json`. |
| Keep in sync | Add to or remove from the editor when adding to or removing from `manifest.json`. |

Load [`references/configuration_editor_example.md`](references/configuration_editor_example.md) for the canonical paired example.

## 6. Analytical cards

Load [`references/analytical_chart_types.md`](references/analytical_chart_types.md) for the full chart-type catalog (UIDs and per-type examples).

| Rule | Detail |
|---|---|
| Set `chartType` | `sap.card/content/chartType` is required. |
| Match feeds to chart type | `measures`, `dimensions`, and `feeds` must match the UIDs the chart type expects. The reference file lists them per chart. |
| Each feed needs three keys | `type` (`Dimension`\|`Measure`), `uid`, `values`. |
| `chartProperties` | Use it for labels, colors, legend, etc. Do not invent keys. Omit entirely if defaults are fine. |

Minimal feeds example (donut/pie):
```json
"feeds": [
  { "type": "Dimension", "uid": "color", "values": ["Store Name"] },
  { "type": "Measure", "uid": "size", "values": ["Revenue"] }
]
```

## 7. Card Explorer (reference)

- Schema docs and live samples: <https://ui5.sap.com/test-resources/sap/ui/integration/demokit/cardExplorer/webapp/index.html>
- Sample sources: <https://github.com/UI5/openui5/tree/master/src/sap.ui.integration/test/sap/ui/integration/demokit/cardExplorer/webapp/samples>
