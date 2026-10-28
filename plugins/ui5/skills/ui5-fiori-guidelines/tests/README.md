# Skill Evaluation Cases

## What is this?

An answer key for the skill. After you change the skill, ask it the questions below and check
that it still gives the expected answers. If it does, your change did not break anything.

- `eval.json` — the questions and the expected answers.
- `fixtures/gap-*` — small UI5 files with mistakes planted on purpose. The skill must find them.
- `fixtures/ok-*` — small UI5 files that are correct. The skill must not complain about them.

This is only for people who maintain the skill. App developers never run it — they get a skill
whose advice has been checked.

## How do I use it?

1. Open a new chat in your coding agent with the `ui5` plugin installed.
2. Pick a case from the tables below and send it:
   - **Question cases (`sel-`)** — paste the question.
   - **Review cases (`rev-`)** — write "Review this view against the Fiori guidelines." and attach the fixture file.
3. Compare the answer with the "Expected" column. Same answer → pass. Different → fix the skill and try again.

Use a new chat for every case, so earlier answers do not influence the next one.
There is no script — every case is run and checked by hand.

## Details

`eval.json` is the source of truth; the tables below summarize it. Each case in `eval.json` lists
its exact checks (`assertions`), including which reference file the skill should open.

## Select mode — control choice and reference dispatch

| Case | Prompt topic | Expected |
|---|---|---|
| `sel-001` | `sap.m.Bar` as app header | `sap.f.ShellBar`, answered without opening a reference file |
| `sel-002` | SideNavigation namespace / OpenUI5 | `sap.tnt.SideNavigation`, available in OpenUI5; never `sap.f.SideNavigation` |
| `sel-003` | list → detail → detail | `sap.f.FlexibleColumnLayout` + semantic helper + router `{layout}`; reads `ui-layouts.md` |
| `sel-004` | title + collapsing header + footer | `sap.f.DynamicPage`; reads `ui-layouts.md` |
| `sel-005` | switch suite products | `sap.f.ProductSwitch` from the ShellBar; reads `ui-navigation.md` |
| `sel-006` | draft autosave feedback | `sap.m.DraftIndicator`, not MessageToast |
| `sel-007` | pull list down to refresh | `sap.m.PullToRefresh` |
| `sel-008` | `Image` with only `alt` | set `decorative="false"` |
| `sel-009` | KPI in object page title | `sap.m.GenericTag` with `ObjectNumber` value |
| `sel-010` | sums and subtotals | `sap.ui.table.AnalyticalTable`, not `sap.m.Table` |
| `sel-011` | container for ShellBar + left nav | `sap.tnt.ToolPage` |
| `sel-012` | footer secondary action + Cancel | Save as Draft `type="Ghost"`, Cancel `type="Transparent"`; Ghost never called legacy |
| `sel-013` | one column total in a responsive table | Total in the `sap.m.Column` footer; no AnalyticalTable |
| `sel-014` | partially checked CheckBox | `partiallySelected`; never `indeterminate` |
| `sel-015` | MessagePopover jump to field | `activeTitle` + `activeTitlePress`; never `MessageItem.target` |
| `sel-016` | color of an embedded AI button | SAP blue; no purple / `--sapAssistant_*` |
| `sel-017` | pick 1 of ~500 items, 2 attributes | Input with suggestions + `sap.m.SelectDialog`, not ValueHelpDialog |
| `sel-018` | most important table-toolbar button, page already has a primary | `type="Ghost"`; not a second Emphasized, not Default |
| `sel-019` | pick 1 of 15 items | `sap.m.ComboBox` (13–200 range) |
| `sel-020` | BusyDialog while the app loads | busy state at app level; no BusyDialog |

## Review mode — positive fixtures (skill MUST report these)

| Fixture | Expected findings |
|---|---|
| `gap-shell.view.xml` | `Bar` as app header → ShellBar; `List` as side nav → SideNavigation; both → ToolPage |
| `gap-sidenav-namespace.view.xml` | `f:SideNavigation` → `sap.tnt.SideNavigation` (only finding) |
| `gap-tables.view.xml` | `selectionMode="MultiToggle"` → MultiSelectionPlugin; AnalyticalTable without aggregation → Grid Table |
| `gap-messages.controller.js` | hand-built error Dialog → MessageBox; success MessageStrip → MessageToast |
| `gap-inputs-actions.view.xml` | Input for date → DatePicker; two Emphasized buttons; footer Cancel `type="Ghost"` → Transparent (negative path) |
| `gap-dynamicpage.view.xml` | `fitContent` with `sap.m.Table`; Export/Share in footer; Image `alt` ignored without `decorative="false"` |
| `gap-fcl.controller.js` | `setLayout` / `addMidColumnPage` → router `{layout}` + FlexibleColumnLayoutSemanticHelper |

Every review case also expects the agent to read `references/implementation-checklist.md`.

## Review mode — negative fixtures (skill MUST NOT report false positives)

| Fixture | Expected |
|---|---|
| `ok-toolpage.view.xml` | "No Fiori guideline violations found" |
| `ok-dynamicpage.view.xml` | "No Fiori guideline violations found" |
| `ok-fcl.controller.js` | "No Fiori guideline violations found" |

## Adding cases

Add a `Select` case for every new control or wrong→right row, and a `gap-` / `ok-` fixture
pair for every new review checklist item.
