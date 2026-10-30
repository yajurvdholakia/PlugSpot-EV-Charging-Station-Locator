# DESIGN.md — VoltRoute

## Direction: "Charging Bay"

Derived from the subject: EV charging infrastructure in Gandhinagar/Ahmedabad.
The dominant color is the green-blue of a charging cable's LED indicator;
the accent is the amber of Gujarat sunlight on a highway sign.
No gradients. The signature detail is the solid status dot — the LED metaphor.

## Colors (roles, not names)

| Token | Light | Dark | Role |
|---|---|---|---|
| `--primary` | oklch(0.45 0.09 200) deep teal | oklch(0.68 0.10 200) | brand, CTAs, selected states |
| `--accent` | oklch(0.92 0.04 75) amber tint | oklch(0.30 0.05 75) | highlights, hover surfaces |
| `--background` | oklch(0.99 0.004 200) | oklch(0.18 0.008 220) | page surface |
| `--card` | white | oklch(0.22 0.01 220) | cards, dialogs |
| `--muted-foreground` | oklch(0.50 0.02 220) | oklch(0.68 0.01 200) | secondary text |

**Status colors (semantic, not brand):**
- Operational / available: green `oklch(0.55 0.14 160)` — the "LED on" green
- Maintenance: amber `oklch(0.75 0.15 75)`
- Offline: red `oklch(0.50 0.18 25)`

**Forbidden:** `bg-gradient-to-*` for brand surfaces. Solid `bg-primary` only.
The image-placeholder gradient on station cards was replaced with `bg-muted`.

## Type

- Family: Geist Sans (system stack fallback). Geist Mono for numeric data in the calculator breakdown.
- Headlines (`h1`–`h3`): `text-wrap: balance`, `tracking-tight`, `font-bold`.
- Numeric data (prices, distances, ratings, kWh): `tabular-nums` so columns align.

## Radius scale

- `--radius: 0.5rem` (8px) — the base. Sharper than the shadcn default.
- Inputs, buttons, badges: `rounded-md` (6px).
- Cards, dialogs: `rounded-lg` (8px).
- Pills / status dots: `rounded-full`.
- **Do not** use `rounded-2xl` (16px) — it was the uniform-radius tell.

## Signature detail: the status dot

A 6px solid circle that indicates state. Used in:
- Header "Now serving" pill
- Station card availability badge
- Map markers (the pin head is the dot, scaled up)
- Admin status badges

The dot replaces the icon-in-rounded-square pattern. Icons appear inline
with no background container, sized 20–24px, in `text-primary`.

## Layout

- Hero: left-aligned content + right visual stack. Not centered.
- Feature grids: 3-col on desktop, but cards have inline icons (no square containers).
- Sticky header with backdrop blur. Sticky footer (mt-auto on flex column).
- Section spacing: `py-12 sm:py-16` — one rhythm, not varied per section.

## Motion

- Page transitions: 250ms opacity fade. Acceptable.
- List items: opacity-only entrance, 200ms. No stagger delays, no y-translate.
- No hover-scale on cards. Hover = border color change to `primary/40`.
- `prefers-reduced-motion: reduce` zeroes all durations (in globals.css).

## What was removed (audit trail)

- Violet→fuchsia gradient brand (P0) → solid teal
- Glow orbs / animated gradient (P0) → solid muted surface
- Gradient text on hero "charge" (P0) → solid foreground
- Icon-in-rounded-square on feature blocks (P1) → inline icon
- `rounded-2xl` on empty-state icons (P1) → `rounded-lg` / `rounded-full`
- Gradient progress bars in calculator (P1) → solid `bg-primary`
- Dead `href="#"` footer links (P1) → removed
- "Made with Heart" footer cliché (P2) → removed
- Sparkles badge icon (P2) → dot + text

## What stays

- shadcn/ui component primitives (dialogs, dropdowns, tables) — the contract respects these.
- Framer Motion for page transitions and layout animations (opacity-only).
- Leaflet map (load-bearing functionality).
- The violet→fuchsia was the brand; the teal is the new brand. Same role, different (justified) choice.
