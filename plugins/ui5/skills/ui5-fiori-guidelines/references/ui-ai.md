# UI AI Components

## Contents
- [AI Button](#ai-button)
- [AI Acknowledgment](#ai-acknowledgment)
- [AI Writing Assistant](#ai-writing-assistant)
- [Quick Prompts](#quick-prompts)
- [Guided Prompts](#guided-prompts)
- [Regenerate](#regenerate)
- [Local AI Notice](#local-ai-notice)
- [Home Page Banner](#home-page-banner)

---

## AI Button

- **OpenUI5 / SAPUI5:** none (pattern built on `sap.m.Button` / `sap.m.MenuButton`, with `buttonMode="Split"` for the split variant)
- **Use when:** Triggering one or more AI-powered actions from a toolbar, form, or detail area.
- **Do NOT use when:** The action is not AI-powered → use a regular `sap.m.Button`.
- **Rules:**
 - Always use the sparkles icon (`sap-icon://ai`, no other icon); icon is leading only.
 - Use `type="Default"` (secondary) by default; `type="Emphasized"` only when the AI action is the primary action of the page.
 - Do not include "AI" in the button label (not "Generate with AI" — just "Generate").
 - Three variants: simple button (single action), menu button (multiple actions via dropdown), split button (main action + dropdown alternatives).
 - While generating: change button to "Stop Generating" to let users cancel at any time.
- **Gotchas:** There is no dedicated `sap.m.AIButton` class — compose with `sap.m.Button` or `sap.m.MenuButton` following the AI button pattern guidelines (sparkles icon, standard button types). Embedded AI uses SAP blue — no purple or Joule gradient; that is reserved for Joule.

---

## AI Acknowledgment

- **OpenUI5 / SAPUI5:** composed pattern — `sap.m.MessageBox` (dialog type)
- **Use when:** Onboarding a user to an application that contains AI features for the first time — especially in high-stakes scenarios (financial forecasting, contract recommendations, HR insights, customer communications).
- **Do NOT use when:** Notifying about failed/successful AI processes → use messaging patterns; sending marketing information about AI; displaying general system information.
- **Rules:**
 - Display on first launch of an AI-enabled application; re-display when significant new AI capabilities are added.
 - Use the standard disclaimer text: "Artificial Intelligence (AI) generates results based on multiple sources. Outputs may contain errors and inaccuracies. Consider reviewing all generated results and adjust as necessary."
 - Provide a "Don't show me again" checkbox to suppress future instances; always offer a way for users to retrieve the information again.
 - Footer buttons: informational-only → "Close"; with opt-out → "OK" + checkbox; acknowledgment required → "Accept" + "Dismiss" + checkbox.
 - Use clear plain language — no legal jargon.
- **Gotchas:** This is a UX pattern, not a standalone control. Low-stakes scenarios (entertainment, generic greetings) may omit the acknowledgment entirely.

---

## AI Writing Assistant

- **OpenUI5 / SAPUI5:** composed pattern
- **Use when:** Adding AI-assisted text generation, rewriting, or refinement to an input field, text area, or rich text editor.
- **Do NOT use when:** The task is not text editing; using alongside the standalone quick-prompts button/menu on the same field; pre-populated fields with confident AI recommendations; context or data is insufficient for quality results.
- **Rules:**
 - Embed the AI icon menu button within the input/textarea component — do not place it in a toolbar outside the field.
 - Always include a "Stop Generating" control visible during generation.
 - Versioning appears only when a prompt is applied to a populated field or more than one prompt is applied to the same field.
 - Standard error message: "Something went wrong while generating your content. Please try again."
 - Pair with the Local AI Notice (see below) to disclose AI involvement.
 - Only enable on fields where AI adds measurable value — coordinate with the product team on prompt count limits (cost and sustainability).
- **Gotchas:** There is no dedicated control. `Make Bulleted List` and `Adjust Length` prompts are not appropriate for single-line inputs.

---

## Quick Prompts

- **OpenUI5 / SAPUI5:** composed pattern
- **Use when:** Tasks are repetitive or common within a workflow; the system supports only a specific set of actions; consistent and predictable output is needed.
- **Do NOT use when:** User intent is unpredictable; users need free-form control over the output; used alongside the AI writing assistant on the same field; applied to multiple fields in a form (use form-level actions instead).
- **Rules:**
 - Use a single `sap.m.Button` for one quick prompt; use a `sap.m.MenuButton` for multiple.
 - Always identify quick prompts with the sparkles (AI) icon.
 - Use standard action labels: Generate, Revise, Regenerate, Fix Spelling and Grammar, Summarize, Paraphrase, Make Bulleted List, Explain Content, Rewrite Text, Change Tone, Adjust Length, Translate.
 - Ensure users can complete the task without quick prompts — AI must always be optional.
 - Primary (Emphasized) button only when the quick prompt is the sole primary action on the page.
- **Gotchas:** There is no dedicated control. During generation, primary actions should be temporarily disabled to prevent interaction with partially generated content.

---

## Guided Prompts

- **OpenUI5 / SAPUI5:** composed pattern
- **Use when:** Users need to specify parameters (language, tone, length, type) to guide AI output; users lack prompt-writing experience; consistent and controlled output is required.
- **Do NOT use when:** Users need full free-form flexibility → use custom prompts; tasks are repetitive/single-action → use quick prompts; user intent is uncertain → use custom prompts.
- **Rules:**
 - Always use an explicit confirmation action (AI button) to trigger generation — never auto-trigger on input change.
 - Always include a cancel option so users can exit without committing.
 - Standard trigger labels: "Compose Text" (initial generation), "Revise" (editing).
 - Choose input components suited to the parameter type (select for language, range slider for length) — don't default everything to dropdowns.
 - Standard error message: "Something went wrong while generating your content. Please try again."
- **Gotchas:** There is no dedicated control. This is a pattern assembled from existing components. The dialog must prevent automatic regeneration — user confirmation is always required to avoid unintended content replacement.

---

## Regenerate

- **OpenUI5 / SAPUI5:** composed pattern
- **Use when:** Re-running or refining a previously generated AI result for a specific content element.
- **Do NOT use when:** The function is not AI-powered → use a regular button.
- **Rules:**
 - Always use buttons with both icon and label — never icon-only for Regenerate.
 - Only use the sparkles icon — no alternative icons on the Regenerate button.
 - Label "Regenerate" is the default; use more descriptive wording only when the outcome is not obvious from context.
 - Warn users before overwriting existing content: "Regenerating will overwrite all fields with AI-generated content. Do you want to continue?"
 - In mixed forms, regenerate only AI-generated fields — preserve user-entered content.
 - In most cases, Regenerate replaces the Generate button in the same position once initial content exists.
- **Gotchas:** There is no dedicated control. Versioning is only supported inside the AI writing assistant experience — outside it, always show the overwrite warning dialog. Do not place Regenerate as a primary action in page footer bars.

---

## Local AI Notice

- **OpenUI5 / SAPUI5:** composed — `sap.m.Link` or `sap.m.Label` (freestyle) · **SAPUI5:** `sap.fe.macros.AINotice` building block (since 1.145; `sap.fe.macros.table.ColumnAINotice` for table columns) in SAP Fiori elements
- **Use when:** Any UI surface displays AI-generated or AI-edited content — this pattern is mandatory.
- **Do NOT use when:** Marking non-AI content; any purpose other than disclosing AI-generated content.
- **Rules:**
 - Mandatory per [EU AI Act Article 50](https://artificialintelligenceact.eu/article/50/) and SAP AI Ethics Policy — no exceptions for production UIs.
 - Standard text: "Created with AI. Verify before use." (short form for limited space: "Created with AI.")
 - Use the interactive variant (link → popover → SAP Help Portal) for high and very high impact scenarios.
 - Use the read-only label variant only when no further AI result details can be provided.
 - Limit to one AI notice label per screen; place it next to the lowest hierarchical title that contains all AI results.
 - High-impact placement: above content area (between section header and content). Low-impact: footer of the AI results area.
 - Never truncate the notice — always fully readable; use breakpoints to switch between standard and short variants.
- **Gotchas:** There is no dedicated `sap.m` control. The guideline says the notice is not available in SAP Fiori elements, but SAPUI5 1.145+ ships `sap.fe.macros.AINotice` (renders a link when `popoverContent` is set, otherwise a label) — use it in Fiori elements V4 apps on 1.145+; compose Link/Label everywhere else. Use standard link/label styling (SAP blue) — not the `--sapAssistant_*` Joule colors; see `references/theming-tokens.md`.

---

## Home Page Banner

- **OpenUI5 / SAPUI5:** `sap.f.HeroBanner` — experimental since 1.152 (wraps a Web Component); the guideline itself still calls the implementation "in progress"
- **Use when:** Any product home page that is part of SAP Business Suite — will be mandatory for S/4HANA Cloud Public Edition ERP and SuccessFactors.
- **Do NOT use when:** Not a SAP Business Suite home page context.
- **Rules:**
 - Mandatory elements: banner, personalized salutation ("Hello, \<First Name>"), background image (gradient, image, or none), background color.
 - Optional: current date (full format: "Weekday, Month DD, YYYY", above the salutation), content area, action area.
 - Banner must scroll out of view — never sticky.
 - Action area: secondary buttons only (no Emphasized/Transparent primary); show/hide per role.
 - Content area items must be enclosed in cards to ensure proper color contrast.
 - Min height 5.75rem; max recommended height 24rem.
- **Gotchas:** Implementation is still in progress upstream — do not treat this component as stable for general use. Check SAP Business Suite product team guidance before implementing. `sap.f.HeroBanner` is experimental — its API may change.
