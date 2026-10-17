# UI Display Components

## Contents
- [Avatar](#avatar)
- [Avatar Group](#avatar-group)
- [Progress Indicator](#progress-indicator)
- [Busy Indicator](#busy-indicator)
- [Illustrated Message](#illustrated-message)

---

## Avatar

- **SAPUI5:** `sap.m.Avatar`  **Web Component:** `ui5-avatar` (`@ui5/webcomponents`)
- **Use when:** Representing a person (photo/initials/placeholder), a product, or a business object visually in a list, card, or header.
- **Do NOT use when:** Displaying a sequence of images → use `sap.m.Carousel`; triggering an action on an icon → use `sap.m.Button` with an icon.
- **Rules:**
  - Circle shape for people; square shape for products/business objects.
  - Use predefined sizes (XS/S/M/L/XL) — no ad-hoc pixel sizes.
  - Interactive avatars (`mode="Interactive"`) require both a tooltip and `accessible-name`.
  - Decorative-only avatars: set `mode="Decorative"` (renders `aria-hidden="true"`).
  - Avoid badges on avatars smaller than size S.
- **Gotchas:** The legacy `interactive` boolean property overrides `mode`; prefer `mode="Interactive"` in new code. `colorScheme="Auto"` resolves to Accent6, not a random color — use `"Accent1"`–`"Accent10"` or `"Placeholder"` explicitly when you need a specific look.

---

## Avatar Group

- **SAPUI5:** `sap.f.AvatarGroup`  **Web Component:** `ui5-avatar-group` (`@ui5/webcomponents`)
- **Use when:** Showing 2+ people or entities that share something (team, project, assignment).
- **Do NOT use when:** Displaying a single avatar, a gallery of unrelated images (use `sap.m.Carousel`), or non-avatar visual content.
- **Rules:**
  - Always display horizontally; minimum 2 avatars.
  - `type="Group"` (default) — overlapping, one click target; use for large groups or when identity of individuals is secondary.
  - `type="Individual"` — side-by-side, per-avatar click; use for small teams where users need to access individual profiles.
  - Always provide an `accessible-name` or `accessible-name-ref` on the group.
  - Overflow popover must show at minimum a full list of overflowed avatars; for >100 overflow navigate to a dedicated page.
- **Gotchas:** Square-shaped child avatars create visual inconsistency because the built-in overflow button is always a circle — use circle avatars inside `ui5-avatar-group`.

---

## Progress Indicator

- **SAPUI5:** `sap.m.ProgressIndicator`  **Web Component:** `ui5-progress-indicator` (`@ui5/webcomponents`)
- **Use when:** Showing the percentage completion of a process (upload, wizard step, task) where the exact value is known.
- **Do NOT use when:** The process duration is unknown → use `ui5-busy-indicator`; conveying status without a numeric value → use a status indicator or `ObjectStatus`.
- **Rules:**
  - Set `value` (0–100); values >100 are clamped to 100.
  - Use `value-state` (`Positive`, `Critical`, `Negative`, `Information`, `None`) to convey meaning semantically, not just visually.
  - Use `display-value` to override the label text when showing something other than the raw percentage (e.g., "3 of 10 files").
  - Set `hide-value` only when the percentage is visually obvious from the surrounding context.
- **Gotchas:** Size is controlled entirely via CSS `width`/`height` — there are no predefined size props. The component has no slots; it is a pure display element.

---

## Busy Indicator

- **SAPUI5:** `sap.m.BusyIndicator`  **Web Component:** `ui5-busy-indicator` (`@ui5/webcomponents`)
- **Use when:** An operation is in progress and duration is unknown; only part of the UI is affected and the user can still interact with the rest.
- **Do NOT use when:** The operation takes less than 1 second (avoid flicker); you need to block the entire screen → use a `sap.m.Dialog` with `busyIndicatorDelay`; multiple concurrent operations → show one indicator, not several.
- **Rules:**
  - Wrap the affected element as a child: `<ui5-busy-indicator active>...</ui5-busy-indicator>`.
  - Set `active` to toggle visibility — the indicator is hidden by default.
  - Use `delay` (default 1000ms) to prevent flicker on fast operations.
  - Wrap block-level elements with `display: block` on the busy indicator itself (it is `inline-block` by default).
  - Add `text` to inform users of what is loading when the operation type is non-obvious.
- **Gotchas:** Do not show multiple `ui5-busy-indicator` instances simultaneously. The `active` property is the toggle — do not mount/unmount the element to show/hide it.

---

## Illustrated Message

- **SAPUI5:** `sap.m.IllustratedMessage`  **Web Component:** `ui5-illustrated-message` (`@ui5/webcomponents-fiori`)
- **Use when:** Showing an empty state, no-data state, error state, or success state — anywhere plain text would leave the user without visual guidance.
- **Do NOT use when:** The state needs only a one-line message with no illustration → use `sap.m.MessageStrip`. Never substitute plain `sap.m.Text` or `sap.m.Label` for empty states.
- **Rules:**
  - Always place inside a container (`ui5-card`, `ui5-dialog`, page content area) — the component does not size itself.
  - Import the specific illustration you need beyond the default: `import "@ui5/webcomponents-fiori/dist/illustrations/NoData.js"`.
  - Default illustration is `BeforeSearch`; set `name` explicitly for the correct context (e.g., `"NoData"`, `"UnableToUpload"`, `"ErrorScreen"`).
  - TNT illustration set uses the `tnt/` prefix: `name="tnt/Success"` + separate import.
  - Provide `title-text` and `subtitle-text` (or the matching slots) to override the built-in i18n defaults when context-specific wording is needed.
- **Gotchas:** `design="Auto"` (default) adapts the illustration size to available space — override with `"Spot"`, `"Dialog"`, `"Scene"` etc. only when you need a specific breakpoint variant. The component lives in `@ui5/webcomponents-fiori`, not `@ui5/webcomponents` — wrong package = import failure.
