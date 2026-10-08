---
name: Munshi
description: A chief of staff for a small business. A quiet working screen with one mark beside the line that matters.
colors:
  chalk: "#F6F7FB"
  surface: "#FFFFFF"
  wash: "#ECEEF6"
  rule: "#D9DCE8"
  rule-strong: "#8187A3"
  ink: "#151A2D"
  ink-2: "#4A5068"
  ink-3: "#646A82"
  neel-deep: "#1B2559"
  neel: "#3246C8"
  neel-hover: "#2838A8"
  neel-soft: "#EAECFC"
  rail-active: "#2A3676"
  rail-text-2: "#B9C0E6"
  rail-active-text: "#FFFFFF"
  haldi: "#B67D0A"
  haldi-ink: "#8A5A00"
  haldi-soft: "#FDF1D6"
  debit: "#B4231A"
  debit-soft: "#FBE6E3"
  credit: "#1F7A4D"
  credit-soft: "#E1F2E8"
  on-fill: "#FFFFFF"
  chalk-dark: "#0F1220"
  surface-dark: "#161A2C"
  wash-dark: "#1D2238"
  rule-dark: "#2A3050"
  rule-strong-dark: "#6B7294"
  ink-dark: "#E8EAF4"
  ink-2-dark: "#A9AEC6"
  ink-3-dark: "#898FA8"
  neel-deep-dark: "#0B0E1A"
  neel-dark: "#8C9BFF"
  neel-hover-dark: "#A3AFFF"
  neel-soft-dark: "#1E2550"
  rail-active-dark: "#1D2238"
  rail-text-2-dark: "#A9AEC6"
  rail-active-text-dark: "#E8EAF4"
  haldi-dark: "#F5B83D"
  haldi-ink-dark: "#F5B83D"
  haldi-soft-dark: "#3A2C0C"
  debit-dark: "#FF8A80"
  debit-soft-dark: "#3A1512"
  credit-dark: "#6FD3A0"
  credit-soft-dark: "#10301F"
  on-fill-dark: "#0F1220"
typography:
  page-title:
    fontFamily: "Anek Latin, Geist, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1.75rem"
    fontWeight: 600
    lineHeight: 1.2
    letterSpacing: "-0.02em"
  briefing:
    fontFamily: "Anek Latin, Geist, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1.375rem"
    fontWeight: 400
    lineHeight: 1.45
    letterSpacing: "-0.01em"
  section:
    fontFamily: "Anek Latin, Geist, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1.125rem"
    fontWeight: 600
    lineHeight: 1.4
    letterSpacing: "-0.01em"
  body:
    fontFamily: "Anek Latin, Geist, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.6
    letterSpacing: "normal"
  ui:
    fontFamily: "Anek Latin, Geist, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.45
    letterSpacing: "normal"
  label:
    fontFamily: "Anek Latin, Geist, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.8125rem"
    fontWeight: 500
    lineHeight: 1.4
    letterSpacing: "normal"
  caption:
    fontFamily: "Anek Latin, Geist, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 400
    lineHeight: 1.35
    letterSpacing: "normal"
rounded:
  control: "8px"
  surface: "12px"
  pill: "9999px"
spacing:
  "1": "4px"
  "2": "8px"
  "3": "12px"
  "4": "16px"
  "6": "24px"
  "8": "32px"
  "12": "48px"
  "16": "64px"
components:
  button-primary:
    backgroundColor: "{colors.neel}"
    textColor: "{colors.on-fill}"
    typography: "{typography.ui}"
    rounded: "{rounded.control}"
    padding: "0 14px"
    height: "36px"
  button-primary-hover:
    backgroundColor: "{colors.neel-hover}"
  button-secondary:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.control}"
    padding: "0 14px"
    height: "36px"
  button-secondary-hover:
    backgroundColor: "{colors.wash}"
  button-ghost:
    textColor: "{colors.ink-2}"
    rounded: "{rounded.control}"
    padding: "0 10px"
    height: "36px"
  button-destructive:
    backgroundColor: "{colors.debit}"
    textColor: "{colors.on-fill}"
    rounded: "{rounded.control}"
    height: "36px"
  input:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    typography: "{typography.ui}"
    rounded: "{rounded.control}"
    padding: "0 12px"
    height: "36px"
  chip:
    backgroundColor: "{colors.wash}"
    textColor: "{colors.ink-2}"
    typography: "{typography.caption}"
    rounded: "{rounded.pill}"
    padding: "0 8px"
    height: "24px"
  chip-critical:
    backgroundColor: "{colors.debit-soft}"
    textColor: "{colors.debit}"
  chip-warn:
    backgroundColor: "{colors.haldi-soft}"
    textColor: "{colors.haldi-ink}"
  chip-good:
    backgroundColor: "{colors.credit-soft}"
    textColor: "{colors.credit}"
  panel:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.surface}"
    padding: "24px"
  table-header:
    textColor: "{colors.ink-2}"
    typography: "{typography.label}"
    height: "36px"
    padding: "0 16px"
  table-row:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    typography: "{typography.ui}"
    padding: "12px 16px"
  table-row-hover:
    backgroundColor: "{colors.wash}"
  table-row-selected:
    backgroundColor: "{colors.neel-soft}"
  rail:
    backgroundColor: "{colors.neel-deep}"
    textColor: "{colors.rail-text-2}"
    width: "232px"
    padding: "12px"
  rail-item-active:
    backgroundColor: "{colors.rail-active}"
    textColor: "{colors.rail-active-text}"
    rounded: "{rounded.control}"
    height: "36px"
  sheet:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    width: "480px"
    padding: "24px"
  popover:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.surface}"
    padding: "4px"
  tooltip:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.chalk}"
    typography: "{typography.caption}"
    rounded: "{rounded.control}"
    padding: "4px 8px"
  onset-tick:
    backgroundColor: "{colors.haldi}"
    width: "2px"
  onset-strip:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    height: "56px"
---

# Design System: Munshi

This file is the design contract. Tokens in the frontmatter are normative. If the browser proves something here wrong, change this file and the code together.

## Overview

**Creative North Star: "One mark in the margin."**

A munshi does not decorate the ledger. He keeps it plainly and puts one mark beside the line that matters. Munshi the product does the same: a quiet, dense, standard working screen, and exactly one mark colour that only ever means "look here, this is when it changed".

This is an Operate surface (impeccable's term): the founder came to find out what to do before lunch, so the screen is first a working product of its category. The munshi's world lends four things and only these: the type, the palette, the density, and one signature move (the OnsetTrail). It does not supply the layout, the navigation or the controls. Those are the standard shadcn and web ones a person already knows. No ledger-paper costume, no ruled lines as decoration, no faux stamps.

Light is the primary theme, chosen from the use scene and not from the category: a founder reading a morning briefing in daylight on a laptop or phone, and a projector on demo day. The dark theme is specified explicitly below, not inverted.

**Key characteristics:**
- Briefing-led, not metric-led. Sentences with figures in them lead each screen; no giant number with a small label.
- Tables and rows, not cards. Elevation is rare and declared once.
- One sans family for everything, with tabular figures for every number.
- A committed shell colour (the neel rail) so the product has a body, plus one mark colour used almost nowhere.
- Every figure is a link to the records behind it.

## Colors

Facts are written in ink, Munshi's hand is neel, the mark is haldi, and losses are in red ink. Neel (indigo) and haldi (turmeric) are India's two historic dyes; blue-black is the permanent ink of record books; the turmeric mark is what goes on the first page of a new account book.

### Primary
- **Neel** (#3246C8, dark #8C9BFF): Munshi's hand. Primary actions, links, selection, the focus ring, the connector in the OnsetTrail, and any series Munshi proposes (a scenario, "if collected"). Never used for plain facts.
- **Neel deep** (#1B2559, dark #0B0E1A): the shell. The left rail and the phone tab bar. Text on it is rail-text-2 (#B9C0E6, dark #A9AEC6) at rest. The active and hovered item sits on rail-active (#2A3676, dark #1D2238) with rail-active-text (#FFFFFF, dark #E8EAF4). The rail text colours are their own tokens because `on-fill` flips to near-black in dark and would vanish on the rail.
- **Neel hover** (#2838A8, dark #A3AFFF): hover step for neel fills.
- **Neel soft** (#EAECFC, dark #1E2550): selected and expanded rows, tinted backgrounds, text selection.

### Secondary
- **Haldi** (#B67D0A, dark #F5B83D): the mark. Onset ticks, the single "look here" of a view, and the icon of the warn level. Fill and stroke only, never body text.
- **Haldi ink** (#8A5A00, dark #F5B83D): the text-safe haldi, for onset date labels and warn labels.
- **Haldi soft** (#FDF1D6, dark #3A2C0C): warn chip background.

### Tertiary
- **Debit** (#B4231A, dark #FF8A80) and **debit soft** (#FBE6E3, dark #3A1512): negative money and the critical level. The ledger convention of red ink for a loss.
- **Credit** (#1F7A4D, dark #6FD3A0) and **credit soft** (#E1F2E8, dark #10301F): positive money and resolved items.

### Neutral
- **Chalk** (#F6F7FB, dark #0F1220): page ground. White washed with a breath of neel. Cool, never cream.
- **Surface** (#FFFFFF, dark #161A2C): panels, tables, the sheet.
- **Wash** (#ECEEF6, dark #1D2238): the second neutral. Toolbars, recessed areas, row hover, skeletons. In dark it is also the tone floating layers step up to.
- **Rule** (#D9DCE8, dark #2A3050): dividers and panel borders. Decorative separation only.
- **Rule strong** (#8187A3, dark #6B7294): anything that must be seen to operate: input and control borders, slider tracks, dotted reference lines, scrollbar thumbs. Holds 3:1.
- **Ink** (#151A2D, dark #E8EAF4): text and factual data series. Blue-black, not a warm or tinted near-black.
- **Ink 2** (#4A5068, dark #A9AEC6): secondary text, table headers.
- **Ink 3** (#646A82, dark #898FA8): captions, placeholders, previous-period series lines. Not below 12px.

### Named Rules
**The One Mark Rule.** Haldi appears only on onset ticks, on the single "look here" of a view, and on the warn level. Outside onset ticks and warn icons, a view holds at most one haldi element. If two things on a screen are haldi for any other reason, one is wrong.

**The Red Ink Rule.** Debit red is for negative money and critical state only. Never decoration, never a brand accent, never a hover colour.

**The Ink Is Blue-Black Rule.** There is no grey text. Secondary text is the ink hue at lower contrast (ink-2, ink-3). On a tinted surface, secondary text is tinted from that surface's hue: haldi-ink on haldi-soft, debit on debit-soft, credit on credit-soft.

**The Fact And Hand Rule.** In any chart, what happened is ink (ink for the current period, ink-3 for the previous one). What Munshi proposes or connects is neel. Do not colour a factual series neel to make it look lively.

### Contrast, verified
Computed with the WCAG 2.x formula for every pair that occurs. Body text needs 4.5:1; large text, controls, focus rings and meaningful graphics need 3:1. The lowest ratio per group is shown, so every other ground in the group is higher.

| Foreground | On | Light | Dark | Needs |
|---|---|---|---|---|
| ink | chalk, surface, wash, neel-soft | 14.70 | 12.19 | 4.5 |
| ink-2 | chalk, surface, wash, neel-soft | 6.78 | 6.66 | 4.5 |
| ink-3 | chalk, surface, wash, neel-soft | 4.56 | 4.57 | 4.5 |
| neel (links, text) | chalk, surface, wash, neel-soft | 6.29 | 5.74 | 4.5 |
| on-fill | neel, neel-hover | 7.38 | 7.31 | 4.5 |
| on-fill | debit, credit (button fills) | 5.32 | 8.16 | 4.5 |
| rail-text-2 | neel-deep, rail-active | 6.22 | 7.14 | 4.5 |
| rail-active-text (active and hover) | neel-deep, rail-active | 11.12 | 13.08 | 4.5 |
| haldi-ink | surface, chalk, wash, haldi-soft | 5.12 | 7.64 | 4.5 |
| debit | surface, chalk, wash, neel-soft, debit-soft | 5.48 | 6.41 | 4.5 |
| credit | surface, chalk, wash, neel-soft, credit-soft | 4.53 | 7.85 | 4.5 |
| ink | haldi-soft, debit-soft, credit-soft | 14.40 | 11.33 | 4.5 |
| haldi (tick, icon) | surface, chalk, wash, neel-soft | 3.02 | 8.22 | 3 |
| rule-strong (control border) | surface, chalk, wash | 3.06 | 3.33 | 3 |
| neel (focus ring) | surface, chalk | 6.89 | 6.77 | 3 |
| focus ring on the rail | neel-deep | 14.43 (white) | 7.55 (neel) | 3 |

Three values moved from the first draft to pass: haldi was #F2A60D (2.05:1 as a 2px tick on white, and it would wash out on a projector), ink-3 was #656B83, and neel-soft was #E6E9FB (credit text and the haldi tick failed on a selected row). Light-theme credit on neel-soft (4.53) and haldi on neel-soft (3.02) are the tightest pairs; do not darken neel-soft or lighten either colour without re-running the check.

### Wiring to shadcn
Define the tokens as CSS variables on `:root`, the dark set under `.dark`, and map shadcn's variables to them so generated components inherit the system:

| shadcn variable | Token |
|---|---|
| `--background` / `--foreground` | chalk / ink |
| `--card`, `--popover` (+ `-foreground`) | surface / ink |
| `--primary` / `--primary-foreground` | neel / on-fill |
| `--secondary`, `--muted`, `--accent` | wash |
| `--muted-foreground` | ink-2 |
| `--accent-foreground`, `--secondary-foreground` | ink |
| `--destructive` | debit |
| `--border` | rule |
| `--input` | rule-strong |
| `--ring` | neel |
| `--sidebar` / `--sidebar-foreground` | neel-deep / rail-text-2 |
| `--sidebar-accent` / `--sidebar-accent-foreground` | rail-active / rail-active-text |
| `--sidebar-ring` | on-fill in light, neel in dark |
| `--radius` | 8px |

## Typography

**Family:** Anek Latin (Ek Type, drawn in India), with Geist as the fallback, then the system sans.
**Display font:** none. **Mono font:** none, except inside literal code blocks.

**Character:** one contemporary grotesque carries headings, buttons, labels, body and data. Its sibling scripts (Anek Devanagari, Tamil, Bangla and seven more) share the same design, so a Hindi interface later will match.

Verified against the font file: Anek Latin has a `tnum` feature that sets all ten digits to one advance width, variable `wght` 100 to 800 and `wdth` 75 to 125 (Google Fonts serves both axes), the rupee sign, real ellipsis, curly quotes and the minus sign U+2212. Two things to respect:

- **The rupee sign is in the `latin-ext` subset.** Load both subsets or the rupee sign silently falls back to a system font:
  `Anek_Latin({ subsets: ['latin', 'latin-ext'], axes: ['wdth'], display: 'swap', variable: '--font-sans' })` from `next/font/google`. Confirm the `axes` option name against the installed `next/font` types.
- **It has no arrow or check glyphs.** Direction and status marks are lucide icons, never Unicode characters.

Hanken Grotesk was considered as the fallback and rejected: it has no rupee sign. Geist has both `tnum` and the rupee sign. Phase 0 check, once: render `1111` and `8888` in a right-aligned column with `tabular-nums`; the two must be the same width. If the rendered face disappoints at 13px on a low-density display, switch the whole system to Geist and change nothing else.

### Hierarchy
Fixed rem scale (not fluid), ratio about 1.15 to 1.2. Weights used: 400, 500, 600. Widths used: 87, 100, 110, set with `font-stretch`.

- **Page title** (600, 28px, 1.2, width 110, tracking -0.02em): the one `h1` per page.
- **Briefing** (400 with figures at 600, 22px, 1.45, width 105): Munshi's lead item on Today and the conclusion on Why. Max 34rem wide.
- **Section** (600, 18px, 1.4): `h2` headings.
- **Body** (400, 16px, 1.6): reading prose, narrative paragraphs, message drafts. Measure 65 to 75ch.
- **UI** (400, or 500 for buttons and money in tables, 14px, 1.45): the default for chrome, table cells, inputs, navigation.
- **Label** (500, 13px, 1.4, width 87): table column headers, field labels, metric names in the OnsetTrail. Sentence case, no extra tracking, never capitals.
- **Caption** (400, 12px, 1.35): timestamps, axis labels, helper text. The smallest size in the system.

Nothing is larger than 28px. The giant number with a small label under it is refused.

### Named Rules
**The Tabular Rule.** Money, counts, percentages, dates in columns and any number that can change use `font-variant-numeric: tabular-nums` in the same family, right-aligned in tables. Set it once on `body` and never switch it off.

**The No Costume Rule.** No monospace for small labels or data. No second family for emphasis; emphasis is weight in the same family. Headings use `text-wrap: balance`, prose uses `text-wrap: pretty`.

## Layout

**Shell.** A left rail 232px wide in neel-deep, a 56px top bar, and the content area on chalk.
- Rail items: Today, Why, What if, Horizon, Vault. Each is a 36px row with a 16px lucide icon and a UI-role label at 500. Source status sits at the bottom of the rail as a plain sentence ("Synced 4 minutes ago").
- Top bar: business name, the global ask field (opened with Cmd+K), avatar.
- Under 1100px the rail collapses to a 64px icon rail with tooltips. Under 720px it becomes a 56px bottom tab bar in neel-deep, padded with `env(safe-area-inset-bottom)`.

**Content.** Max width 1120px. Gutters 16px on a phone, 32px on desktop. Today uses a main column plus a 320px right column with a 32px gap; every two-column layout stacks under 900px, main column first. Breakpoints are structural (720, 900, 1100), never fluid type.

**Rhythm.** Spacing scale 4, 8, 12, 16, 24, 32, 48, 64. Tight inside a group (4 to 8), generous between groups (24 to 48), and always more space above a heading than below it (32 above, 12 below for a section heading).

**Density.** Medium-high. Findings, sources, records, outcomes and strategies are tables with real columns. Lists are rows divided by a 1px rule. A card is used only when a thing genuinely floats or stands alone; a grid of identical cards is never the page structure.

**Tables.** Header row 36px in the label role, ink-2, with a 1px rule beneath. Rows are at least 52px, cells padded 12px by 16px, divided by a 1px rule. Numeric columns are right-aligned and tabular. Row hover is wash (fine pointers only). An expanded or selected row is neel-soft and carries `aria-expanded`. Under 720px a table becomes stacked rows: the first line holds the primary cell, the second holds the supporting cells left and the amount right.

**Overflow.** Text containers truncate or wrap by decision, flex children get `min-w-0`, and no screen scrolls horizontally at 390px. Test every money cell with `₹12,34,56,789`.

## Elevation & Depth

Flat by default. Elevation is declared once: a surface has a 1px rule border or a shadow, never both. In-flow panels and tables take the border. Only floating layers (sheet, popover, menu, toast) take a shadow, and they take no border.

### Shadow Vocabulary
- **Float** (`box-shadow: 0 8px 24px -8px rgb(21 26 45 / .18), 0 2px 6px -2px rgb(21 26 45 / .10)`): popovers, menus, toasts.
- **Sheet** (`box-shadow: -16px 0 40px -16px rgb(21 26 45 / .22)`): the Act sheet.
- **Scrim** (`rgb(21 26 45 / .32)`, no blur): behind the sheet.

Shadows carry an offset and a soft blur and are tinted to the ink hue, never pure black on light. In dark, shadows barely read, so floating layers also step up one tone to wash and use `rgb(0 0 0 / .5)`.

### Named Rules
**The Flat Ledger Rule.** Nothing in the page flow casts a shadow. Hover never adds one. If a row needs to stand out, it changes ground (wash, neel-soft), not height.

## Shapes

One radius scale, followed everywhere: **controls 8px** (buttons, inputs, menu items, rail items, tooltips), **surfaces 12px** (panels, tables, popovers, message bubbles), **full pill** only for small chips and status. The sheet is square against the viewport edge.

Borders are 1px. Dashed borders have one meaning in the whole system: unverified. There are no coloured left or right border stripes, no gradient text, no glass or blur effects, and no nested cards. Icons are lucide (it ships with shadcn), 16px at stroke 1.5, 14px inside 13px text; one family, never mixed, never emoji or Unicode standing in for an icon.

## Components

### Buttons
- **Shape:** 8px radius, 36px tall (28px small in table rows, 40px in the approval bar), UI role at 500.
- **Primary:** neel fill, on-fill text. Hover neel-hover. One primary per view.
- **Secondary:** surface fill, 1px rule-strong border, ink text. Hover wash.
- **Ghost:** no fill, ink-2 text. Hover wash with ink text.
- **Destructive:** debit fill, on-fill text, only for irreversible actions ("Cancel subscription"), always behind a confirmation.
- **States:** focus-visible shows the ring; active is `scale(0.97)`; disabled is wash fill with ink-3 text and no pointer events; loading keeps the button's width, swaps the leading icon for a 14px spinner and changes the label to the action in progress ("Sending 7…").
- **Labels** name exactly what happens and keep that name through the flow.

### Chips
- **Style:** 24px pill, caption role at 500, wash ground with ink-2 text. Evidence chips lead with a 12px source icon ("7 leads").
- **Status variants:** critical (debit-soft, debit), warn (haldi-soft, haldi-ink), good (credit-soft, credit), unverified (transparent, 1px dashed rule-strong, ink-2).
- **Selected filter:** neel-soft ground, neel text.

### Severity
Never colour alone, never a side stripe. A text label plus an icon in the Finding column: Critical (`octagon-alert`, debit label), High (`triangle-alert` in haldi, haldi-ink label), Medium (`circle-dot`, ink-2 label), Info (`info`, ink-3 label).

### Money and Delta
- **Money** renders through `Intl.NumberFormat('en-IN')`, tabular, with a non-breaking space before the unit word. Every money figure that came from records is a link to its evidence.
- **Delta** shows a direction icon (`arrow-up-right` or `arrow-down-right`, 14px), a sign and the value: "+12%", "−14%" with the real minus sign U+2212. Colour comes from `goodWhen: 'up' | 'down'`, so a falling cost reads credit. Zero change is ink-2 with no icon.

### Inputs / Fields
- **Style:** 36px, surface fill, 1px rule-strong border, 8px radius, UI role. The label sits above in the label role, ink-2. Placeholders are ink-3, show an example and end with an ellipsis. No placeholder as label.
- **Focus:** border becomes neel plus the focus ring.
- **Error:** border debit, with an icon and a message below in debit that names the problem and the fix.
- **Disabled:** wash fill, ink-3 text.
- **Slider:** 4px track in rule-strong, filled portion neel, 16px surface thumb with a 2px neel border. The base value is a 2px ink-3 notch under the track captioned "Now". The readout is tabular UI at 500. Values update instantly as the thumb moves.
- **Switch:** 36 by 20px, rule-strong when off, neel when on.

### Panels and tables
- **Panel:** surface, 12px radius, 1px rule border, 24px padding (16px on a phone), no shadow.
- **Table:** as specified in Layout. Group header rows ("Needs you") are UI at 600 on chalk with the count beside them in ink-2.

### Navigation
- **Rail:** neel-deep. Items are rail-text-2 at rest, rail-active-text on rail-active on hover and when current (with `aria-current="page"`). The focus ring on the rail is white in light and neel in dark. No animation on route change.
- **Tab bar (phone):** five items, icon over a 12px label, same colours.
- **Ask field:** an input in the top bar. Cmd+K focuses it instantly, with no animation. When it is focused and empty, a popover lists the suggested questions (the same list as the Today right column, each with a question id); choosing one opens Why with that question (`/ask?q=<questionId>`). Typing free text and pressing Enter opens Why with the text.

### Sheet, popover, tooltip, toast
- **Sheet:** right side, 480px (full width under 720px), surface, sheet shadow, scrim behind. A 56px header with the title in the section role and a close icon button labelled "Close". The body scrolls with `overscroll-behavior: contain`. Focus is trapped and Esc closes it.
- **Popover and menu:** surface, 12px radius, 4px padding, float shadow. Items are 32px with an 8px radius. They open from the trigger's side (`transform-origin` set from the trigger).
- **Tooltip:** ink ground, chalk text, caption role. 400ms delay for the first, instant for neighbours while one is open.
- **Toast:** bottom right (above the tab bar on a phone), surface with float shadow, `aria-live="polite"`.

### Evidence records
Evidence renders as the record itself, not a summary of it. A message is a bubble (wash for inbound, neel-soft for outbound, 12px radius) with sender and time in the caption role above it. An invoice, order or bill is one table row with its number, party, date, amount and a status chip. An event is a `flag` icon, a sentence and a date. Every record ends with an "Open in Vault" link.

### Browser surfaces
The parts nobody draws still carry the design. Set them once in `globals.css`:
- Text selection: neel-soft ground, ink text.
- Caret: neel.
- Scrollbar: `scrollbar-color: rule-strong transparent; scrollbar-width: thin` (standard properties only, no custom-drawn scrollbars).
- Focus ring: 2px neel, 2px offset, `:focus-visible` only. Never remove an outline without this replacement.
- Links in prose: neel, 1px underline, `text-underline-offset: 0.2em`.
- `color-scheme: light dark` on `html`, and a `theme-color` meta matching chalk in each theme.

### OnsetTrail (signature component)
The answer to "why did revenue fall?" is not a box-and-arrow diagram. It is a stack of metric strips on one shared time axis, with a mark at the day each one changed. The marks step rightward down the page, so the reader sees cause come before effect.

**Structure.** A `figure` inside a panel. One strip per metric, ordered from the earliest cause at the top to the asked-about metric at the bottom, in three groups:
1. The primary path, in onset order (for example ad spend, then sessions).
2. The group headed "Also contributing", introduced by that plain label in the label role, ink-2 (for example landing conversion). It is drawn only when the walk has a branch.
3. The shared effect, where both paths meet: the rejoin node and everything after it (for example D2C orders, then D2C revenue). The asked-about metric is last, with its name at 600.

The demo trail is five strips: ad spend, sessions | landing conversion | D2C orders, D2C revenue. Strip names are the metric labels from `METRICS`. Group order wins over strict onset order: the marks step rightward within the primary path, and the "Also contributing" group may sit later in time than the first strip of the shared effect (landing conversion changed on 28 Sep, D2C orders on 27 Sep).

**Axis.** 28 days: the previous 14 and the last 14. A 1px rule vertical line marks the boundary, captioned "Previous 14 days" and "Last 14 days" in the caption role at the top. Date ticks every 7 days along the bottom, caption role, ink-3. A 24px events lane above the first strip holds event flags.

**A strip** is a three-column grid: name 168px, plot 1fr (at least 280px), change 80px. It is 56px tall with a 36px plot and 8px between strips. No rule between strips.
- Series: the previous 14 days as a 1px ink-3 line, the last 14 as a 1.5px ink line. Each strip scales to its own range with 10 percent padding; strips show shape and timing, and the change column gives the size.
- Reference: the previous-window mean as a 1px dotted rule-strong line across the plot.
- Onset tick: a 2px haldi vertical line the full height of the plot at the day the metric changed, with the date ("26 Sep") above it in the caption role, haldi-ink. The label flips to the left of the tick within 48px of the right edge.
- Change: a Delta in the right column, tabular, coloured by the metric's `goodWhen` in `METRICS`.
- Connector: a 1px neel path that leaves the bottom of one tick, runs along the gap between strips and enters the top of the next tick, with 4px corner radii. Both groups' connectors enter the first shared-effect strip.
- Event flags: a caption chip with a 12px `flag` icon ("Campaign paused", "Theme updated") in the events lane at its date, with a 1px ink-3 leader down to the strip it explains.

**Interaction.** Each strip is a `button` with a label such as "Sessions, down 6 percent, changed on 26 September. Show evidence." Hover (fine pointers) is wash; pressed and selected are neel-soft; focus-visible shows the ring. Selecting a strip opens a popover anchored to it with up to five records and "Open in Vault". On a phone the evidence opens in a bottom sheet.

**States.**
- Loading: skeleton strips, a name bar and a flat wash line each.
- Drawing: the one authored moment, specified under Motion.
- Unverified: a strip with no evidence draws its series dashed (4 3), replaces the filled tick with a 2px dashed haldi outline, and carries an "Unverified" chip. It is never hidden and never styled as fact.
- Empty: "Nothing moved more than 3 percent in the last 14 days." with the suggested questions beneath.
- Error: inline, with what failed and "Try again".

**Phone (under 720px).** The metric name and the change move to one line above the plot, the plot takes the full width, and the strip block is 72px. Nothing else changes.

**Accessibility.** The SVG is `aria-hidden`. A `figcaption` states the finding in one sentence, and a visually hidden table lists metric, onset date and change for assistive technology.

**Echoes.** The same grammar appears in two other places and nowhere else:
- Each finding row on Today has a 96 by 20px strip in the Since column: a 1px ink line of the finding's `series` (28 daily points ending at the window end, extended up to 90 points so the onset falls inside the strip). A 2px haldi onset tick is drawn only when the finding has an onset, followed by the date as text. Forward-looking findings (cash crunch, stockout risk, renewal due) have no onset: they draw the projection series with no tick and read "in 12 days" instead of a date. A finding with no usable series shows the text only ("Unused for 84 days"). A strip always carries a real series; it is never decoration.
- The Horizon runway uses the same axis style, and its haldi tick marks the day cash crosses the buffer.

## Do's and Don'ts

### Do:
- **Do** lead every screen with a sentence that contains the figure, in the briefing role at 22px, and make the figure a link to its records.
- **Do** put ranked or comparable things in a table with right-aligned tabular numbers.
- **Do** keep haldi to onset ticks, one "look here" per view and the warn icon.
- **Do** encode severity and direction twice: a label or icon, and then a colour.
- **Do** give every interactive component its default, hover, focus-visible, active, disabled, loading and error state before calling it done.
- **Do** keep radii at 8px for controls and 12px for surfaces, and elevation at a border or a shadow, never both.
- **Do** draw the previous period in ink-3 and the current in ink, and keep neel for what Munshi proposes or connects.
- **Do** load `latin` and `latin-ext` so the rupee sign renders in the family.
- **Do** mark an unverified claim with a dashed treatment and the word "Unverified".

### Don't:
- **Don't** use a cream or warm paper ground. The ground is chalk #F6F7FB.
- **Don't** add a display serif (Fraunces, Instrument Serif or any other) or a second family for emphasis.
- **Don't** use near-black with one acid accent, or tinted near-black standing in for ink.
- **Don't** build a broadsheet: hairline rules as decoration, zero radius, newspaper columns.
- **Don't** chop a page into identical rounded cards with the same grey shadow, or nest a card in a card.
- **Don't** build the hero-metric block: a giant number, a small label, supporting stats and an accent.
- **Don't** put a coloured border stripe on the left or right of a row, card or callout.
- **Don't** use gradient text, glass, backdrop blur, purple glows or gradient washes.
- **Don't** put an all-capitals eyebrow label above a heading, or join meta facts with middle-dot separators.
- **Don't** set small labels or data in monospace.
- **Don't** draw a decorative sparkline. A strip must carry a real series and its onset mark.
- **Don't** use progress rings or gauges. Risk is a labelled three-step scale.
- **Don't** number things (01, 02, 03) unless they are a real sequence. The Act plan and "What I checked" are; sections are not.
- **Don't** reach for a modal. Rows expand in place; only the Act sheet earns protected focus.
- **Don't** restyle standard controls for flavour. Buttons, tabs, inputs, selects and tables look like themselves.

## Screens

Each screen is written as what leads, then the regions in reading order, then its states. The shell is constant.

### Today (`/`)
**Leads with the briefing, not a metric.**
1. A dated sentence in the body role, ink-2: "Thursday, 8 October. 11 things found overnight, worth about ₹4 lakh."
2. Munshi's lead item: two or three sentences in the briefing role, first person, with figures inline at 600 as links to their evidence. The lead item's figure reads "about ₹1.1 lakh" (the quotes behind it total ₹1.84 lakh, shown in the evidence). Primary button "Review 7 drafts", secondary "See the threads", which expands the lead item in place to show the seven WhatsApp threads (no drawer).
3. The findings table. Columns: Finding (severity label and icon, then the title), Since (onset strip and date), Worth (rupees, right-aligned, tabular), Action (one small button, always visible on touch, visible on hover and focus with a fine pointer). Group header rows: "Needs you", "Worth knowing", "Handled". A row expands in place to show the explanation and its evidence records.
4. Right column on desktop, three components in order: `CashLine` (a 30-day cash line, 320 by 96px, the Horizon grammar with the buffer threshold and crossing tick), `UpcomingOutflows` (the next three outflows as three rows), then `SuggestedQuestions` (ghost buttons with the full question as the label, the same list the Cmd+K ask field shows).

States: loading shows the sentence and table as skeletons; empty reads "Nothing needs you today." with when Munshi last checked and an "Ask a question" button, and the cash line still shows; after an approval the table re-ranks and the handled row moves to "Handled".

### Why (`/ask`)
**Leads with the question.**
1. Composer: a labelled, auto-growing text field with an example placeholder ending in an ellipsis, and an icon button labelled "Ask". The footer shows "Demo answers" when the displayed answer's mode is scripted (the `x-munshi-mode` response header is `scripted`), including a fallback to a recorded script after a live error.
2. Suggested questions as ghost buttons.
3. One activity status line while tools run.
4. The OnsetTrail.
5. Narrative: the conclusion in the briefing role, then supporting paragraphs in the body role at 65 to 75ch, with a link into What if when a lever is relevant.
6. "What I checked" (an ordered list, collapsed) and "Evidence (14)" (collapsed).

States: no history shows the suggestions only; an unanswerable question in demo mode says so plainly and offers the suggestions.

### What if (`/whatif`)
**Leads with the levers.**
1. Left, 360px: five labelled sliders with tabular readouts and the base value marked, preset buttons ("Raise prices", "Push marketing", "Hire"), and a "Reset" ghost button.
2. Right: the outcomes as a comparison table. Rows come from `Outcome`: Revenue, Customers, Churn, Profit, Cash runway (in days). Columns Base (ink-2), Scenario (ink at 500), Change (Delta). Values update instantly while a slider moves.
3. "What the model noticed": the engine's notes as a plain list.
4. Risk: a labelled three-step scale (Low, Medium, High) with the current step filled (credit, haldi, debit) and named in text.
5. "Find best strategy" opens the scan panel in place: a counter ("1,800 scenarios checked"), a 320 by 200px scatter with x = risk score and y = profit, plotting every scenario in `optimize().all` as 3px ink-3 dots and the Pareto front as neel dots joined by a 1px neel line, then the top three as table rows (strategy as a sentence such as "Price +5%, ad spend +75%, hire 1, stock +20%, reply within 12 hours", profit, risk, "Apply"). The best scenario's dot carries a 2px haldi ring, the one mark of this view.

### Horizon (`/horizon`)
**Leads with the runway.**
1. A sentence: when cash dips under the buffer and by how much.
2. The runway chart: a 1.5px ink line of projected cash over 30 days, the buffer as a 1px dashed rule-strong threshold labelled with its amount, the below-buffer stretch filled debit-soft, a haldi tick on the day of crossing, and outflows pinned as 6px ink dots with a leader and label ("GST, 20 Oct, ₹1,90,000").
3. A switch, "Assume overdue invoices are collected". When on, a neel line (Munshi's scenario) appears beside the ink line.
4. Upcoming, as a table grouped by week with source chips.

### Vault (`/vault`)
**Leads with the sources.** A sources table (name, status, last sync, records), then a records table with a kind filter and search, then the metric graph as a static diagram whose nodes open their series. Every evidence link anywhere in the product lands here on the exact record. An empty search reads "No records match “saffron”." with "Clear search".

### Act (sheet over the current page)
A sheet, not a route and not a modal dialog, because approval needs protected focus.
1. Plan: an ordered list of what will happen. Numbering is right here; it is a real sequence.
2. Drafts: one editable block per recipient with initials, channel icon, the message in the body role and a "Rewrite" ghost button.
3. Approval bar, pinned to the bottom: a summary sentence ("7 messages on WhatsApp. Expected about ₹1.1 lakh over 14 days.") and the primary button "Approve and send 7". The label "Not sent yet" stays visible until it is pressed.
4. Done: shown inside the sheet after approval (no new route, the sheet stays open): the effects as a list with `check` icons in credit, the expected impact and its basis, and "I'll check back on Friday." The toast fires on completion, and the presenter then closes the sheet (Close or Esc), with Today already re-ranked behind it.

The action keeps one name through the flow, taken from `labels(n)`: review "Review 7 drafts", approve "Approve and send 7", working "Sending 7…" (the button's loading state), done "7 follow-ups sent" (the toast and the activity entry).

## Agent and data states

Every surface implements these. Force each one once before a phase is called done.

| State | How it looks |
|---|---|
| Loading | Skeletons in wash, shaped like the content they replace (rows, strips, sentences). A slow opacity pulse. No centred spinner. |
| Empty | One sentence on what is true, one on what to do, and a button. No illustration, no apology. |
| Error | Inline where the content would be: what happened, what still works, and the way forward. "Could not load orders from Shopify. The last successful sync was 4 hours ago." with "Try again". Never vague. |
| Streaming text | Text appears as it arrives with a 6px neel dot after the last word; the dot goes when the answer ends. No typewriter effect. The region is `aria-live="polite"` and announces on completion. |
| Tool running | One status line above the result: a 14px spinner and a sentence with a verb, "Comparing the last 14 days with the 14 before…". The line replaces itself; it never stacks into a log. |
| Awaiting approval | The approval bar with "Not sent yet". Drafts stay editable. Nothing leaves until the button is pressed. |
| Executing | The primary button in its loading state ("Sending 7…"); other controls in the sheet are disabled. |
| Executed | A `check` in credit per effect, the expected impact with its basis, and "I'll check back on Friday." |
| Failed | Inline on the item that failed: a debit icon, "Not sent to Saffron Stories. WhatsApp did not respond." and "Try again". The summary counts honestly: "6 of 7 sent". |
| Unverified | A 1px dashed rule-strong border, an "Unverified" chip, figures in ink-2 and not linked. Tooltip: "No record backs this yet." |
| Resolved | The row sits under "Handled" in ink-2 with a `check` in credit and "Handled 2 minutes ago". Still expandable. |
| Demo answers | Shown on the composer footer and the Act sheet header when the displayed answer's mode is scripted (the `x-munshi-mode` header, which includes a fallback to a script after a live error). The app never passes a scripted answer off as live. |
| Source status | A sentence at the foot of the rail: "Synced 4 minutes ago", "Freshdesk is still syncing", or "Shopify needs reconnecting" with a debit icon. |

## Motion

From the `emil-design-eng` skill, trimmed by impeccable's Operate mode (no orchestrated page loads) and by `frontend-design` (a fade and rise on every section reads as generated). The mood is a professional ledger: crisp, fast, no bounce.

### Easing and duration tokens
```css
--ease-out: cubic-bezier(0.23, 1, 0.32, 1);      /* entering, feedback, anything answering the user */
--ease-in-out: cubic-bezier(0.77, 0, 0.175, 1);  /* things already on screen that move or morph */
--ease-drawer: cubic-bezier(0.32, 0.72, 0, 1);   /* the Act sheet */
--dur-press: 140ms;  --dur-pop: 160ms;  --dur-sheet-in: 320ms;  --dur-sheet-out: 200ms;
--dur-rerank: 260ms; --dur-morph: 400ms;
```
Plain `ease` is for hover and colour changes only. `ease-in` is banned. `linear` is for constant motion only (the scan counter, spinners).

### Should it animate at all?
| How often it is seen | Decision | In Munshi |
|---|---|---|
| 100 or more times a day | Never | Cmd+K, Esc, any keyboard action, route and tab changes, slider-driven values, expanding a row |
| Tens of times a day | Colour only | Row hover, button hover, chip hover (120ms `ease`) |
| Occasionally | Standard, under 300ms (the sheet enters in 320ms) | Sheet, popover, menu, tooltip, toast |
| Rarely, and it explains something | May be longer | The OnsetTrail draw, the re-rank after an approval, the runway morph, the scan |

Every animation must answer "why does this move?" with feedback, state change, spatial consistency or explanation. There is no page-enter animation and no stagger on lists.

### The one authored moment: the OnsetTrail draw
Plays once, when an investigation's result arrives. A past investigation opens already drawn.
1. Strips reveal from top to bottom. Stagger is `min(240ms, 1200ms / strip count)`, so the whole draw stays under about 1.4s.
2. Within a strip: the series line draws left to right with `clip-path: inset(0 100% 0 0)` to `inset(0)` over 180ms `--ease-out`; then the onset tick fades in with `scaleY(0.6)` to `1` from its base over 120ms and its date label fades in; then the connector to the next strip draws with `stroke-dashoffset` over 120ms.
3. The "Also contributing" group starts when the primary path has finished.
Built with CSS transitions or the Web Animations API, not a `requestAnimationFrame` loop.

### Functional motion
| Motion | Spec |
|---|---|
| Press | `scale(0.97)` over 140ms `--ease-out` on buttons, chips, rail items and icon buttons. Full-width rows and strips step their ground to neel-soft and do not scale. |
| Act sheet | Enter `translateX(100%)` to `0` in 320ms `--ease-drawer`; exit in 200ms `--ease-out`. Exit is faster than enter. Scrim opacity 200ms `ease`. |
| Popover, menu | Opacity plus `scale(0.97)` to `1` in 160ms `--ease-out`, from the trigger's `transform-origin`. Never from `scale(0)`. |
| Tooltip | 125ms; instant for neighbours while one is open. |
| Toast | Slides from the bottom right and leaves the same way, 240ms `ease`, as a CSS transition so stacked toasts retarget. |
| Today re-rank | After an approval, rows move to their new places in 260ms `--ease-in-out`; the resolved row crossfades with `filter: blur(2px)` and opacity 0.7 at the midpoint. |
| Runway morph | The scenario line's path interpolates in 400ms `--ease-in-out` when the switch flips; the debit-soft tint fades in 200ms. |
| Scan counter | Counts at a constant rate for about 1.2s, `linear`. Dots appear by opacity in batches. |
| Skeleton | Opacity 1 to 0.55 and back over 1.6s. |
| Spinner | 600ms per turn, `linear`. A fast spinner reads as a fast app. |

### Implementation rules
- Animate only `transform` and `opacity`, plus `clip-path`, `stroke-dashoffset`, the SVG path `d` and the blur named above. Never `height`, `width`, `padding` or `margin`.
- Name exact properties: `transition: transform 160ms var(--ease-out), opacity 160ms var(--ease-out)`. Never `transition: all`.
- Use transitions, not keyframes, for anything that can be triggered again quickly, so it retargets.
- Use CSS or the Web Animations API for predetermined motion. Use the `motion` package only for the re-rank and the path morph, and pass a full `transform` string (not `x` or `y`) so it stays on the compositor.
- Gate hover effects with `@media (hover: hover) and (pointer: fine)`.
- Under `prefers-reduced-motion: reduce`, keep opacity and colour transitions and remove movement: the trail appears drawn with a 150ms fade, the sheet fades, the re-rank and morph snap, the skeleton is still.
- Review each animation once at one tenth speed in DevTools before the phase is done.

### Review checklist
| Found | Fix |
|---|---|
| `transition: all` | Name the properties |
| An entrance from `scale(0)` | `scale(0.97)` with opacity |
| `ease-in`, or a built-in curve on a named motion | Use the tokens |
| Animation on Cmd+K or any keyboard action | Remove it |
| `transform-origin: center` on a popover or menu | Set it from the trigger |
| A hover animation with no media query | Gate it |
| Keyframes on something triggered repeatedly | Use a transition |
| `motion` with `x` or `y` props | Use a full `transform` string |
| Enter and exit at the same speed | Make exit faster |
| A page-enter fade or a staggered list | Remove it |
| A pressable control with no `:active` feedback | Add `scale(0.97)` |
| A duration over 300ms on ordinary UI | Bring it to 150 to 250ms |

## Copy

Words are part of the interface. They follow the same restraint as colour.

- **Sentence case everywhere**: headings, buttons, labels, table headers. This overrides the Title Case rule in the Vercel guidelines.
- **Two voices.** Munshi's briefings and drafts speak in the first person: "I drafted replies to all seven." "I'll check back on Friday." Interface chrome (buttons, labels, errors, empty states) is impersonal and names the action exactly: "Approve and send 7", not "Submit" or "Continue". This is the one place the Vercel "avoid first person" rule is set aside.
- **Punctuation.** No em dash or en dash in any interface string; use a full stop, a comma or a hyphen. No middle-dot separators between facts; write a sentence or use separate elements. No all-capitals labels. No label built as a word, a dash and a fragment. No arrow on the end of a link or button. No exclamation marks. A real ellipsis character, curly quotes, and a non-breaking space between a number and its unit and inside key pairs such as Cmd K.
- **Vocabulary.** Never "AI-powered", "seamless", "insights" or "smart". Say what the thing does. No emoji in chrome. A customer's own emoji inside a quoted WhatsApp message is content and stays.
- **Numbers.** Numerals for counts ("7 leads"). Money through `Intl.NumberFormat('en-IN')`: "₹1,84,000" in tables and records, "₹1.84 lakh" in prose, "₹1.84L" only where space is tight. Never more precision than the engine has. Dates through `Intl.DateTimeFormat('en-IN', { timeZone: 'Asia/Kolkata' })`, rendered so server and client agree.
- **Titles of findings** contain their number and read as a plain fact: "7 wholesale leads have had no reply in 2 days".
- **Errors** name what happened and the way out. They do not apologise and are never vague. **Empty states** say what is true and what to do next.
- **Audit before shipping:** re-read every visible string. Rewrite anything that is cute, vague or grammatically loose into a plain functional sentence.

## Skill precedence

The design skills are installed in `.agents/skills/` and symlinked from `.claude/skills/`. They overlap and sometimes disagree. This is the order.

| Skill | Role here |
|---|---|
| `impeccable` (Operate mode, plus `reference/craft-floor.md`) | Governs every app screen. Read `craft-floor.md` before any UI edit. Use `critique`, `polish` and `audit` per screen. Do not run its init or new-work interview or its image-comp flow for the app; the direction is already set in this file. |
| `frontend-design` | Process (plan, check against its list of defaults, build, critique) and interface copy. |
| `emil-design-eng` | Motion and interaction detail. |
| `design-taste-frontend` | By its own description it is for landing pages and portfolios, not dashboards. Use it only for a pitch or landing page, or as a cross-check of banned defaults. Its dials do not drive product screens. |
| `web-design-guidelines` (Vercel) | The finish-gate review. Fetch the current rules from `https://raw.githubusercontent.com/vercel-labs/web-interface-guidelines/main/command.md`. |

Settled conflicts:
- **Icons are lucide**, 16px at stroke 1.5, because it ships with shadcn and one family beats a better family mixed in. `design-taste-frontend` discourages it; that does not apply here.
- **Sentence case**, over the Vercel guideline's Title Case.
- **First person** is allowed in Munshi's briefings and drafts only.
- `anti-ui-slop`, if it is present on the machine, is redundant with impeccable. Do not load both.
- Where a skill and this file disagree, this file wins. Where this file is silent, impeccable's Operate guidance decides.

## Finish gate

Bounded, as impeccable prescribes: build the screen fully, inspect once with desktop 1440 and phone 390 together (plus 1024), fix everything that round shows in one batch, confirm with at most one more round, then stop polishing.

Checks, in one pass:
1. **Contrast.** Body text at least 4.5:1; large text, control borders, focus rings and meaningful graphics at least 3:1. Re-run the check whenever a colour token changes:
   ```js
   // scripts/check-contrast.mjs
   const lin = c => (c /= 255) <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
   const lum = h => { const n = parseInt(h.slice(1), 16);
     return 0.2126 * lin(n >> 16 & 255) + 0.7152 * lin(n >> 8 & 255) + 0.0722 * lin(n & 255); };
   export const contrast = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p);
     return (x + 0.05) / (y + 0.05); };
   ```
2. **Layout.** No horizontal scroll at 390px. `₹12,34,56,789` does not clip or wrap in any money cell. Headings do not leave a single orphaned word.
3. **Themes.** Dark is composed, not inverted: check the rail, floating layers, the trail and every soft tint.
4. **Motion.** `prefers-reduced-motion` honoured; the Motion checklist above passes.
5. **Keyboard.** Cmd+K, Esc, tab order, the sheet's focus trap, a visible focus ring on every control including the rail.
6. **States.** Each row of the states table forced once and seen.
7. **Type.** The rupee sign renders in Anek Latin, not a fallback. Digits align in every numeric column.
8. **One mark.** Count the haldi on each view. Outside onset ticks and warn icons there is at most one.
9. **Copy.** The audit under Copy, including a search of the source for em dashes, en dashes and middle dots in interface strings.
10. **Guidelines.** The Vercel Web Interface Guidelines review on the changed files, with the two overrides above.
