# UI Display Components

## Contents
- [Avatar](#avatar)
- [Avatar Group](#avatar-group)
- [Progress Indicator](#progress-indicator)
- [Busy Indicator](#busy-indicator)
- [Illustrated Message](#illustrated-message)
- [Carousel](#carousel)
- [Tag / status chip](#tag--status-chip)
- [Generic Tag](#generic-tag)
- [Expandable Text](#expandable-text)
- [Image](#image)
- [Draft Indicator](#draft-indicator)
- [Rating Indicator](#rating-indicator)
- [Token / Tokenizer](#token--tokenizer)

`sap.m.Text`, `sap.m.Title`, and `sap.m.Label` have no entries of their own: use Text for body text, Title for headings (including table and section titles — not Label), and pair every input with a Label.

---

## Avatar

- **OpenUI5 / SAPUI5:** `sap.m.Avatar`
- **Use when:** Representing a person (photo/initials/placeholder), a product, or a business object visually in a list, card, or header.
- **Do NOT use when:** Displaying a sequence of images → use `sap.m.Carousel`; triggering an action on an icon → use `sap.m.Button` with an icon.
- **Rules:**
  - Circle shape for people; square shape for products/business objects.
  - Use predefined sizes (XS/S/M/L/XL) — no ad-hoc pixel sizes.
  - Interactive avatars require both a tooltip and accessible name.
  - Decorative-only avatars: set decorative mode so they are ignored by assistive technology.
  - Avoid badges on avatars smaller than size S.
- **Gotchas:** An avatar becomes interactive only when a `press` handler is attached; `active` just shows the pressed state. `backgroundColor` defaults to `Accent6`, not a random color — set `Accent1`–`Accent10`, `Random`, or `Placeholder` explicitly when you need a specific look.

---

## Avatar Group

- **OpenUI5 / SAPUI5:** `sap.f.AvatarGroup`
- **Use when:** Showing 2+ people or entities that share something (team, project, assignment).
- **Do NOT use when:** Displaying a single avatar, a gallery of unrelated images (use `sap.m.Carousel`), or non-avatar visual content.
- **Rules:**
  - Always display horizontally; minimum 2 avatars.
  - `groupType="Group"` (default) — overlapping, one click target; use for large groups or when identity of individuals is secondary.
  - `groupType="Individual"` — side-by-side, per-avatar click; use for small teams where users need to access individual profiles.
  - Always provide an accessible name on the group.
  - Overflow popover must show at minimum a full list of overflowed avatars; for >100 overflow navigate to a dedicated page.
- **Gotchas:** Square-shaped child avatars create visual inconsistency because the built-in overflow button is always a circle — use circle avatars inside `sap.f.AvatarGroup`.

---

## Progress Indicator

- **OpenUI5 / SAPUI5:** `sap.m.ProgressIndicator`
- **Use when:** Showing an object's current status as a level of completion — a "meter" or micro chart (budget consumed, profile completeness) — or comparing a few such values at a glance.
- **Do NOT use when:** Giving feedback on a running or ongoing operation (upload, save, processing) → `sap.m.BusyIndicator`; progress is unknown or can't be measured → `sap.m.BusyIndicator`; conveying status without a numeric value → use `sap.m.ObjectStatus`.
- **Rules:**
  - Set `percentValue` (0–100); values >100 are clamped to 100.
  - Use `state` (`Success`, `Warning`, `Error`, `Information`, `None`) to convey meaning semantically, not just visually.
  - Use `displayValue` to override the label text when showing something other than the raw percentage (e.g., "120 of 200 hours").
  - Hide the display value only when the percentage is visually obvious from the surrounding context.
  - Set `displayAnimation="false"` — the guideline says not to use the animation, but it defaults to `true`.
- **Gotchas:** Size is controlled via CSS `width`/`height` — there are no predefined size props beyond the control API.

---

## Busy Indicator

- **OpenUI5 / SAPUI5:** `sap.m.BusyIndicator`
- **Use when:** An operation is in progress and duration is unknown; only part of the UI is affected and the user can still interact with the rest.
- **Do NOT use when:** The operation takes less than 1 second (avoid flicker); users must not use the shell either, for example during a long-running process whose result they need before continuing → use `sap.m.BusyDialog` (blocks the entire screen, including the shell bar) or a modal `sap.m.Dialog` with busy state; loading an app or page → set `busy` at app level (for example on `sap.m.App` or `sap.f.FlexibleColumnLayout`), never `sap.m.BusyDialog`; multiple concurrent operations → show one indicator, not several.
- **Rules:**
  - Set the control's `busy` state on the affected container, or place a `BusyIndicator` inside the area being loaded.
  - Use `busyIndicatorDelay` (default 1000ms) to prevent flicker on fast operations.
  - Add busy text when the operation type is non-obvious.
- **Gotchas:** Do not show multiple busy indicators for the same operation. The Busy Dialog page allows a busy dialog for page-to-page navigation, but Busy Handling forbids it for app or page loading because it also blocks the shell bar (Sign Out, Search) — follow Busy Handling. After the metadata loads, unblock areas step by step with separate busy states (for example list and detail).

---

## Illustrated Message

- **OpenUI5 / SAPUI5:** `sap.m.IllustratedMessage`
- **Use when:** Showing an empty state, no-data state, error state, or success state — anywhere plain text would leave the user without visual guidance.
- **Do NOT use when:** The state needs only a one-line message with no illustration → use `sap.m.MessageStrip`. Never substitute plain `sap.m.Text` or `sap.m.Label` for empty states.
- **Rules:**
  - Always place inside a container (`sap.f.Card`, `sap.m.Dialog`, page content area) — the component does not size itself.
  - Set `illustrationType` explicitly for the correct context (e.g., `sapIllus-NoData`, `sapIllus-UnableToLoad`, `sapIllus-UnableToUpload`). Several older types are deprecated since 1.135/1.136 — e.g. `ErrorScreen` → `UnableToUpload`, `Connection` → `UnableToLoad`, `EmptyList` → `NoEntries`.
  - Provide `title` and `description` when context-specific wording is needed.
- **Gotchas:** `illustrationSize` defaults to `Auto` (adapts to the container). Fixed sizes are `Base`, `ExtraSmall`, `Small`, `Medium`, `Large`; the old `Dot`, `Spot`, `Dialog`, `Scene` are deprecated since 1.135 (→ `ExtraSmall`, `Small`, `Medium`, `Large`). Do not use a large illustration inside a table cell.

---

## Carousel

- **OpenUI5 / SAPUI5:** `sap.m.Carousel`
- **Use when:** Users browse a set of items by paging/swiping back and forth — image galleries, sequential display, or several items shown side by side.
- **Do NOT use when:** All items need to be visible at the same time → use a grid/list layout; the items are very similar and paging adds no value; displaying a single static image → use `sap.m.Image`.
- **Rules:**
  - Place navigation arrows either in the content area (appear on hover) or beside the page indicator — pick one; do not show both.
  - On touch devices, users page by swiping or by tapping the arrow buttons, which are always visible there (tap is the accessible alternative to swipe). On non-touch devices, `arrowsPlacement` decides where the arrows go.
  - Let the page indicator follow the default: dots for fewer than 9 pages, numeric ("2 of 4") for 9 or more. Only override with reason.
  - Keep width/height at 100% (default) so the content area adapts to available space.
  - Set `loop` only when wrap-around from last to first page is expected behavior.
- **Gotchas:** Arrow direction and looping automatically flip in RTL; do not hardcode direction. The page indicator wraps to multiple lines if too long to fit.

---

## Tag / status chip

- **OpenUI5 / SAPUI5:** `sap.m.ObjectStatus` (compact semantic status in lists/tables/forms) — API-based, no SAPUI5 Tag guideline page (the class is covered by Object Display Components)
- **Use when:** Showing complementary information about an object — status, category, quantity, or condition — in a compact form, with optional icon and/or text.
- **Do NOT use when:** Representing entered values in an input → use tokens on `sap.m.MultiInput` / `sap.m.MultiComboBox`; showing a count on a button → use a button badge; the label is a single letter or number → tags have a minimum width and are not meant for that; a KPI or situation in a page header → use [Generic Tag](#generic-tag).
- **Rules:**
  - Keep text short — tags are complementary, not primary content.
  - Use semantic value states to color-code state; use custom colors only when no semantic meaning applies.
  - Icon-only designs: use exactly one icon.
  - Do not overuse tags on a page — too many dilute their attention-directing purpose.
- **Gotchas:** The `ObjectStatus` active state is for progressive disclosure (e.g. opening a popover with more detail) — do not make a tag interactive for other actions.

---

## Generic Tag

- **OpenUI5 / SAPUI5:** `sap.m.GenericTag`
- **Use when:** Surfacing an app-specific, essential KPI or situation about the object in a page header — typically in the title area of `sap.f.DynamicPage` or `sap.uxap.ObjectPageLayout`, or in a toolbar (e.g. "Delivery delayed", "Budget 82%").
- **Do NOT use when:** Showing a plain status in a table cell, list item, or form → use `sap.m.ObjectStatus`; representing entered values → use tokens; showing a number on its own without a status meaning → use `sap.m.ObjectNumber`.
- **Rules:**
  - `text` is required and short — it renders on one line and truncates automatically.
  - Set `status` (`sap.ui.core.ValueState`) for the semantic color of the status bar and icon; use `design="StatusIconHidden"` only when the color alone is clear from context.
  - The `value` aggregation accepts only `sap.m.ObjectNumber` — put the number and unit there, not into `text`.
  - Use `press` only to open a popover (or similar) with details about the KPI or situation — progressive disclosure, not a general action.
  - Set `valueState="Error"` when the value could not be determined; the control then shows a warning icon instead of the value.
  - Provide `ariaLabelledBy` when the text alone does not explain what the tag measures.
- **Gotchas:** Inside an `OverflowToolbar` the Generic Tag can move to the overflow area like other toolbar content — keep the most important tags first. The error state overrides the `value` aggregation; do not clear the value to signal an error.

---

## Expandable Text

- **OpenUI5 / SAPUI5:** `sap.m.ExpandableText`
- **Use when:** Long text or descriptions must fit a responsive table, list, or form without dominating the layout — show a truncated preview with a "Show More" link that expands inline or in a popover.
- **Do NOT use when:** The text sits in a grid/tree/analytical table or Gantt chart → not supported there; a short, meaningful alternative exists → use that instead; the content is critical → use a short description that fits the available space rather than hiding it behind a link.
- **Rules:**
  - Tune the truncation length to the use case (default: 100 characters).
  - Choose the display mode deliberately: inline expansion, or a popover for longer content.
  - If using popover mode, size the popover to the text length so it neither overflows nor leaves large empty space.
  - In tables, set minimal padding so expanded rows do not gain extra whitespace.
- **Gotchas:** On size S (phones) popover mode covers the full screen instead of floating. The "Show More" link becomes "Show Less" when expanded; both flip to the reading-direction end (right for LTR, left for RTL) automatically — do not hardcode link position.

---

## Image

- **OpenUI5 / SAPUI5:** `sap.m.Image`
- **Use when:** Displaying a picture, illustration, or logo that is content in its own right — product photos, attachments preview, diagrams.
- **Do NOT use when:** Showing a person or object thumbnail → use `sap.m.Avatar`; showing a UI icon → use `sap.ui.core.Icon` with an `sap-icon://` URI; showing several images to page through → use `sap.m.Carousel`; showing an empty or error state → use `sap.m.IllustratedMessage`.
- **Rules:**
  - Meaningful images: set `decorative="false"` **and** a descriptive `alt`. Purely decorative images keep the default `decorative="true"`.
  - Set only `width` or only `height` to keep the aspect ratio; setting both can distort the image.
  - `mode="Background"` requires both `width` and `height`, otherwise the image renders with zero size.
  - Set `densityAware="true"` only when `@1.5` / `@2` image variants really exist on the server — otherwise it causes extra failing requests.
  - Use `lazyLoading="true"` for images below the fold or in long lists.
  - For "click to enlarge", use the `detailBox` aggregation (`sap.m.LightBox`) instead of a custom dialog; set `ariaHasPopup` only when a `press` handler opens something.
- **Gotchas:** `decorative` defaults to `true`, so an `alt` text alone is **ignored** — screen readers skip the image until `decorative="false"` is set. The `tap` event is deprecated; use `press`.

---

## Draft Indicator

- **OpenUI5 / SAPUI5:** `sap.m.DraftIndicator` — API-based, no guideline page (only Draft Handling mentions it)
- **Use when:** An object in edit mode is saved automatically as a draft and users need feedback that the draft is being saved ("Saving draft...") and was saved ("Draft saved").
- **Do NOT use when:** The app has no draft handling — confirm explicit saves with `sap.m.MessageToast`; the app is built with Fiori elements — the draft indicator is handled by the framework; showing the editing status of an object (Draft, Locked, Unsaved) → use `sap.m.ObjectMarker`; its lifecycle status → `sap.m.ObjectStatus`.
- **Rules:**
  - Place it in the footer toolbar of the object page / dynamic page in edit mode, to the left of the finalizing actions.
  - Call `showDraftSaving()` when the draft request starts, `showDraftSaved()` when it succeeds, and `clearDraftState()` when leaving edit mode.
  - Keep the default `minDisplayTime` (1500 ms) so the state does not flicker on fast saves.
  - On save failure, clear the indicator and show the error through the message handling (`MessagePopover` / `MessageBox`) — the indicator has no error state.
- **Gotchas:** State changes are queued and each is shown for at least `minDisplayTime`, so a quick Saving → Saved sequence still shows both texts. The texts are provided and translated by the control — do not set custom texts.

---

## Rating Indicator

- **OpenUI5 / SAPUI5:** `sap.m.RatingIndicator`
- **Use when:** Collecting or displaying a star-based rating — product reviews, quality assessments, feedback forms. Also suitable for displaying averaged ratings (e.g. 3.5 stars).
- **Do NOT use when:** Showing an object's completion level → use `sap.m.ProgressIndicator`; entering a numeric value with precise increments → use `sap.m.StepInput`; collecting binary feedback → use `sap.m.CheckBox` or `sap.m.Switch`.
- **Rules:**
  - Keep `maxValue` between 5 (default) and 7.
  - Use `displayOnly="true"` in review-mode forms — it removes the control from the tab chain.
  - Use `editable="false"` when the control should stay focusable but not changeable (e.g. for screen-reader users).
  - `visualMode="Half"` (default) displays half-star averages; users still cannot select half values interactively.
  - Listen to `change` (fires on the final selection) for form submission; do not rely on `liveChange`, which fires continuously while dragging.
  - Do not use the smallest icon size for editable indicators — it is too small as a touch target.
- **Gotchas:** The default state is **editable** — always set `editable="false"` or `displayOnly="true"` explicitly for display-only use. The two are distinct: `displayOnly` removes the control from the tab chain; `editable="false"` keeps focus but blocks changes.

---

## Token / Tokenizer

- **OpenUI5 / SAPUI5:** `sap.m.Token` / `sap.m.Tokenizer`
- **Use when:** Visualizing selected values as dismissible chips. `sap.m.Tokenizer` can be used standalone as a display or form control; `sap.m.Token` is used only inside `sap.m.Tokenizer` or `sap.m.MultiInput`.
- **Do NOT use when:** You need a standalone status tag or badge → use `sap.m.ObjectStatus` or `sap.m.GenericTag`; you need a non-dismissible label → use `sap.m.Label`; users type the values → use `sap.m.MultiInput` / `sap.m.MultiComboBox`, which manage tokens for you.
- **Rules:**
  - Always set both `key` (identifier) and `text` (display label) on `sap.m.Token` — the key is needed for deletion and restore logic.
  - Listen to the Tokenizer's `tokenDelete` event and remove or destroy the token yourself — the Tokenizer does **not** remove tokens after the event fires.
  - Do not use the deprecated `tokenChange` / `tokenUpdate` events on `sap.m.Tokenizer`; use `tokenDelete`.
  - In review-mode forms, set `displayOnly="true"` on the Tokenizer — it implies non-editable and hides the delete icons.
- **Gotchas:** In `renderMode="Narrow"` (default), overflowing tokens collapse into an "N more" indicator that opens a `ResponsivePopover` — this is expected behavior, not a bug.
