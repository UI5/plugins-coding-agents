# Theming Tokens

Use SAP theme parameters (CSS custom properties), never hard-coded hex. The theme (default:
**Horizon**) resolves them, including High Contrast Black/White and dark variants. Values below are
Horizon Morning (light); do not hard-code them — reference the token.

Convention: `--sap<Category>_<Variant>` — e.g. `--sapButton_Emphasized_Background`,
`--sapField_InvalidColor`. Full set: `github.com/SAP/theming-base-content`.

## Base & brand

| Token | Value | Use |
|---|---|---|
| `--sapBrandColor` | `#0070f2` | Primary brand accent |
| `--sapHighlightColor` | `#0064d9` | Highlighted/active elements |
| `--sapBaseColor` | `#fff` | Base background |
| `--sapContent_Selected_TextColor` | `#0064d9` | Selected text |

## Semantic status colors

Map meaning → token. Don't pick colors by eye.

| Meaning | Token | Value |
|---|---|---|
| Positive / success | `--sapPositiveColor` | `#256f3a` |
| Critical / warning | `--sapCriticalColor` | `#e76500` |
| Negative / error | `--sapNegativeColor` | `#aa0808` |
| Informative | `--sapInformativeColor` | `#0070f2` |
| Neutral | `--sapNeutralColor` | `#788fa6` |

For form fields use the value-state tokens (`--sapField_InvalidColor`, `--sapField_WarningColor`,
`--sapField_SuccessColor`, `--sapField_InformationColor`) via the control's `valueState`, not manual CSS.

## Buttons & fields

| Token | Value |
|---|---|
| `--sapButton_Emphasized_Background` | `#0070f2` |
| `--sapButton_Emphasized_TextColor` | `#fff` |
| `--sapField_BorderColor` | `#556b81` |

## AI / Joule

Embedded AI (AI buttons, icons, Local AI Notice) uses **SAP blue**, not purple. Purple is reserved for the Joule assistant. Don't introduce other colors for AI.

| Use | Token | Value |
|---|---|---|
| Embedded AI buttons, icons, related UI | `--sapBrandColor` | `#0070f2` |
| AI-populated fields / AI suggestions (attention) | `--sapInformationBackground` | `#e1f4ff` |
| Joule header and Joule UI only | `--sapAccentColor5` / `--sapAssistant_Color1` | `#5d36ff` |
| Joule gradient — brand/marketing moments only (welcome screens, banners) | `--sapAssistant_BackgroundGradient` | `linear-gradient(#5d36ff, #a100c2)` |

## Typography

| Token | Value |
|---|---|
| `--sapFontFamily` | `"72", "72full", Arial, Helvetica, sans-serif` |
| `--sapFontSize` | `.875rem` (14px) |

The SAP font is **72**. Condensed density uses `72-Condensed`. Don't set a custom font family.

## Content density — three tiers

Set once at the app root; controls inherit it.

| Tier | Element height token | Value |
|---|---|---|
| Cozy (default) | `--sapElement_Height` | `2.25rem` |
| Compact | `--sapElement_Compact_Height` | `1.625rem` |
| Condensed | `--sapElement_Condensed_Height` | `1.375rem` |

- OpenUI5 / SAPUI5: add the CSS class `sapUiSizeCozy` / `sapUiSizeCompact` / `sapUiSizeCondensed` on a container (cozy is the default).
- Condensed is table-only and must sit inside a Compact container.

## Rules

- Reference tokens, never hex. A hard-coded `#aa0808` breaks in dark/HCB themes.
- Semantic color = meaning, not decoration. Error is always the negative token.
- One density per app context; don't mix cozy and compact arbitrarily.
