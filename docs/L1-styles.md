---
scope: L1
summary: "CSS architecture, design tokens, and style invariants"
modified: 2026-03-20
reviewed: 2026-03-20
depends:
  - path: docs/L0-ui
  - path: docs/L1-design-vision
dependents:
  - path: docs/L2-components
  - path: docs/L2-information-density
  - path: docs/L2-embedded-content
  - path: docs/L2-reading-experience
  - path: docs/L3-link-system
---

# Styles

## Tailwind v4 and the `@theme` block

The project uses Tailwind CSS v4, which replaces `tailwind.config.js` with a CSS-native `@theme` block. All custom design tokens live in `src/styles/global.css` inside this block. Tailwind generates utility classes from these tokens automatically, so `bg-bg-subtle` or `text-text-muted` work without extra configuration.

A separate `:root` block defines properties that are not Tailwind utilities: `--height-header`, `--color-overlay`, and `color-scheme`. Both light and dark themes are supported via a manual toggle; each theme is carefully designed (dark is not an inversion of light).

## CSS layer order

`global.css` imports Tailwind first, declares `@theme`, then imports three files in order:

| Layer | File | Purpose |
| ----- | ---- | ------- |
| `base` | `base.css` | Element defaults: typography, links, lists, tables, selection highlight |
| `components` | `components.css` | Layout grid, aside panels, popups, footnotes, callouts, TODO markers |
| `components` | `prose.css` | Heading anchor links, external link icons (also in `@layer components`) |

The layer cascade means component styles always override base styles. Both `components.css` and `prose.css` declare `@layer components`, so their specificity is equal and source order determines winners.

## Token catalog

### Colors

Warm-neutral base with intentional color coding. The palette is scholarly and textured — anchored by warm paper tones with a slight grey undertone to prevent blandness, then enriched by a deep ink accent and muted semantic colors. Color signals meaning: content types, relation types, and maturity states each have subtle, consistent color associations.

#### Light theme (default)

**Base surfaces:**

| Token | Value | Role |
| ----- | ----- | ---- |
| `--color-bg` | `#EFECE6` | Page background — warm grey-paper, less yellow than pure beige |
| `--color-bg-subtle` | `#E6E2DB` | Table headers, callout backgrounds, relations block |
| `--color-bg-muted` | `#DCD8D0` | Code blocks, inline code |
| `--color-text` | `#22211E` | Primary text, headings (near-black, warm) |
| `--color-text-muted` | `#555249` | Secondary text, blockquotes, sidebar content |
| `--color-text-subtle` | `#8A857C` | Tertiary text, metadata, TOC, footnote markers |

**Accent and interactive:**

| Token | Value | Role |
| ----- | ----- | ---- |
| `--color-accent` | `#2B5F5A` | Primary accent — deep teal-green, scholarly ink tone |
| `--color-accent-hover` | `#1D4440` | Accent hover/pressed state |
| `--color-accent-muted` | `#3D7A74` | Lighter accent for less prominent affordances |
| `--color-link` | `#2B5F5A` | Link text (same as accent — links are the primary interactive element) |
| `--color-link-hover` | `#1D4440` | Link hover state |

**Borders and surfaces:**

| Token | Value | Role |
| ----- | ----- | ---- |
| `--color-border` | `#C7C1B7` | Borders, horizontal rules, blockquote accents |
| `--color-border-subtle` | `#D5D0C7` | Callout title separators, table row dividers |
| `--color-highlight` | `#D9E4D9` | Text selection (tinted toward accent) |
| `--color-highlight-subtle` | `#E8EDE5` | Sidenote highlight, TODO background |

**Status and maturity:**

| Token | Value | Role |
| ----- | ----- | ---- |
| `--color-status-draft` | `#B38A2D` | Draft/in-progress maturity indicator (warm amber) |
| `--color-status-stable` | `#4D7A4D` | Stable maturity indicator (muted green) |
| `--color-status-evergreen` | `#2B6B6B` | Evergreen maturity indicator (deep teal) |
| `--color-error` | `#8B3A3A` | Error/danger callouts (warm red) |

**Content type tints** (background tints for type-coded elements — see Color coding strategy below):

| Token | Value | Role |
| ----- | ----- | ---- |
| `--color-type-article` | `#E8E4DD` | Long-form articles — warm neutral (no hue shift, the default) |
| `--color-type-project` | `#E2E6E5` | Projects — cool grey-green hint |
| `--color-type-note` | `#E8E5DE` | Short notes/TIL — slightly warmer, yellowed |
| `--color-type-interactive` | `#E3E3E8` | Interactive pages — cool blue-grey hint |

**Relation type colors** (used in graph edges and relation labels):

| Token | Value | Role |
| ----- | ----- | ---- |
| `--color-rel-hierarchy` | `#5A6E78` | `up`/`down` — cool slate, structural |
| `--color-rel-sequence` | `#6B7A5A` | `next`/`prev` — muted olive, directional |
| `--color-rel-type` | `#7A5A6B` | `is`/`has` — muted mauve, categorical |
| `--color-rel-reference` | `#8A857C` | `ref`/`refi` — text-subtle, the default/lightest |

**Header (ambient status bar):**

| Token | Value | Role |
| ----- | ----- | ---- |
| `--color-header-bg` | `#22211E` | Status bar background |
| `--color-header-text` | `#C7C1B7` | Status bar text |
| `--color-header-accent` | `#5AADA5` | Status bar site name, progress bar (bright teal) |

**Overlay:**

| Token | Value | Role |
| ----- | ----- | ---- |
| `--color-overlay` | `rgba(0,0,0,0.3)` | Modal overlays (`:root`, not `@theme`) |

#### Dark theme

Deep charcoal backgrounds (not pure black), warm light text. The accent shifts to a brighter teal for adequate contrast. Content-type tints and relation colors are adjusted for dark backgrounds.

**Base surfaces:**

| Token | Value | Role |
| ----- | ----- | ---- |
| `--color-bg` | `#1A1918` | Page background — warm charcoal |
| `--color-bg-subtle` | `#242220` | Table headers, callout backgrounds, relations block |
| `--color-bg-muted` | `#2E2B28` | Code blocks, inline code |
| `--color-text` | `#E0DDD6` | Primary text (warm off-white) |
| `--color-text-muted` | `#A8A39A` | Secondary text, blockquotes, sidebar content |
| `--color-text-subtle` | `#7A756C` | Tertiary text, metadata, TOC, footnote markers |

**Accent and interactive:**

| Token | Value | Role |
| ----- | ----- | ---- |
| `--color-accent` | `#5AADA5` | Primary accent — brighter teal for dark contrast |
| `--color-accent-hover` | `#7AC4BD` | Accent hover state |
| `--color-accent-muted` | `#4A9A93` | Less prominent affordances |
| `--color-link` | `#5AADA5` | Link text |
| `--color-link-hover` | `#7AC4BD` | Link hover state |

**Borders and surfaces:**

| Token | Value | Role |
| ----- | ----- | ---- |
| `--color-border` | `#3D3A36` | Borders, rules |
| `--color-border-subtle` | `#33302D` | Subtle dividers |
| `--color-highlight` | `#263B38` | Text selection |
| `--color-highlight-subtle` | `#1F2E2C` | Sidenote highlight |

**Status and maturity:**

| Token | Value | Role |
| ----- | ----- | ---- |
| `--color-status-draft` | `#D4A843` | Draft/in-progress (brighter amber for dark bg) |
| `--color-status-stable` | `#6B9E6B` | Stable (brighter green) |
| `--color-status-evergreen` | `#4A9E9E` | Evergreen (brighter teal) |
| `--color-error` | `#C25A5A` | Error/danger (brighter red) |

**Content type tints:**

| Token | Value | Role |
| ----- | ----- | ---- |
| `--color-type-article` | `#242220` | Articles — neutral (same as bg-subtle) |
| `--color-type-project` | `#202625` | Projects — cool green hint |
| `--color-type-note` | `#252320` | Notes — warm hint |
| `--color-type-interactive` | `#202024` | Interactive — cool blue hint |

**Relation type colors:**

| Token | Value | Role |
| ----- | ----- | ---- |
| `--color-rel-hierarchy` | `#7A95A2` | `up`/`down` — lighter slate |
| `--color-rel-sequence` | `#8FA27A` | `next`/`prev` — lighter olive |
| `--color-rel-type` | `#A27A8F` | `is`/`has` — lighter mauve |
| `--color-rel-reference` | `#7A756C` | `ref`/`refi` — text-subtle |

**Header:**

| Token | Value | Role |
| ----- | ----- | ---- |
| `--color-header-bg` | `#141312` | Status bar background |
| `--color-header-text` | `#A8A39A` | Status bar text |
| `--color-header-accent` | `#5AADA5` | Status bar accent (same bright teal) |

**Overlay:**

| Token | Value | Role |
| ----- | ----- | ---- |
| `--color-overlay` | `rgba(0,0,0,0.5)` | Modal overlays (stronger for dark theme) |

#### Color coding strategy

The earlier approach of "no color coding" produced a monotonous result. The revised strategy uses color as a **quiet signal** — never the primary differentiator, always paired with shape/icon/typography, but present enough to create subliminal wayfinding.

**Principles:**

1. **Color reinforces, never replaces.** Content types are still differentiated by icon and typography treatment. Color tints are a secondary layer that builds pattern recognition over time.
2. **Tints, not blocks.** Content-type color appears as a subtle background shift (3-5% hue variation from the base), not as colored badges or borders. The reader should feel the difference before consciously noticing it.
3. **Relations use color in the graph only.** In text (relation labels, breadcrumbs), relations are monochrome. In the SVG graph, edges are colored by relation type to make structure visually parseable at a glance. Dash pattern remains as a redundant encoding for accessibility.
4. **Status colors are the loudest.** Maturity indicators (draft/stable/evergreen) use the most saturated colors on the site because they are the highest-value semantic signal — they tell the reader how much to trust what they are reading.
5. **Accent is functional, not decorative.** The teal accent appears only on interactive elements (links, buttons, focus rings, footnote numbers). It never appears as background fill or decorative stripe.

**Where color appears:**

| Context | Color treatment |
| ------- | --------------- |
| Page background | Content-type tint on the main bg token (subtle) |
| Graph edges | `--color-rel-*` tokens, one hue per relation family |
| Graph nodes | `--color-type-*` tints as node fill |
| Maturity badges | `--color-status-*` as text color on the badge |
| Links and affordances | `--color-accent` for all interactive text |
| Highlights and selections | `--color-highlight` tinted toward accent |
| Error states | `--color-error` on text and border |

**Where color does NOT appear:**

| Context | Reason |
| ------- | ------ |
| Relation labels in text | Typography (weight, style) carries the semantic load |
| Content-type badges/icons | Icon shape is the differentiator; coloring them would be redundant and noisy |
| Borders and rules | Neutral borders maintain the structural grid; colored borders would fragment it |
| Headings | Headings are always `--color-text`; coloring them would fight the reading flow |

#### Color principles (summary)

- **Accent is deep teal** (`#2B5F5A` light / `#5AADA5` dark), not generic SaaS blue and not the previous earthy brown — teal reads as scholarly and calm without being bland.
- **Base is warm grey-paper** (`#EFECE6`), not pure beige — the slight grey undertone prevents the monotonous parchment effect.
- **Content-type tints are barely there** — 3-5% hue shift from base, building subliminal pattern recognition.
- **Relation colors are distinct but muted** — slate, olive, mauve, and neutral form a natural four-way split that is parseable in the graph without being garish.
- **Dark theme is independently designed**, not an inversion — accent brightens, tints darken, status colors gain saturation.

### Font stacks

Typography is the primary source of patchwork texture: serif for prose, monospace for metadata/code/relations. Exactly two typefaces — no substitutes, no third font.

| Token | Value | Role |
| ----- | ----- | ---- |
| `--font-serif` | `'Literata', 'Georgia', serif` | Prose body, headings, article titles, backlinks |
| `--font-mono` | `'Commit Mono', 'Consolas', monospace` | Metadata, dates, relation labels, breadcrumbs, code, tags, status bar, navigation, TOC |

**Single-mono-font rule.** Every monospace context — code blocks, metadata chrome, navigation, breadcrumbs, TOC labels, relation labels, table headers — uses `--font-mono` (Commit Mono). No secondary monospace font (IBM Plex Mono, JetBrains Mono, etc.) should appear anywhere. The two-font system (Literata + Commit Mono) is the design; mixing in a third typeface fragments the visual identity.

**Serif rationale — Literata.** Designed by TypeTogether for long-form reading (originally commissioned for Google Play Books). Its triangular, wedge-shaped serifs give it a distinctive silhouette that is immediately recognizable but never distracting. It has true optical sizes (text and display cuts), excellent italic forms, and was specifically optimized for sustained reading on screens — exactly the use case here. Compared to Source Serif 4, Literata has more personality in its letter shapes (look at the lowercase `g`, the `a`, the italic `f`) while maintaining equal or better readability at body sizes. It is a variable font on Google Fonts, so weight tuning is precise. Less common on the indie web than Source Serif 4 or Vollkorn.

**Monospace rationale — Commit Mono.** Designed by Eigil Nikolajsen specifically for code and technical content. It is a neutral monospace with a distinctive feature: balanced spacing that gives every glyph equal visual weight, making dense metadata and code blocks feel calm rather than jittery. Compared to IBM Plex Mono, it is less corporate, more handcrafted. Compared to JetBrains Mono, it is less common and more restrained (no ligatures by default, which suits metadata labels where ligatures can confuse). Its slightly rounded terminals pair well with Literata's wedge serifs — the contrast between them is strong enough to create the patchwork texture without clashing.

**Loading strategy:** Literata is a variable font on Google Fonts — load via Google Fonts API at weights 400 (body) and 700 (headings) with `font-display: swap`, subset to `latin` and `latin-ext`. Commit Mono is not on Google Fonts; self-host it from [commitmono.com](https://commitmono.com/) (SIL Open Font License 1.1). Load at weight 400 only, `font-display: swap`. Self-hosting one font is a reasonable trade-off for a typeface this distinctive — it adds ~20KB for a single weight of a monospace font.

Sans-serif (`--font-sans`) is no longer a primary typeface. If needed for UI chrome, fall back to the serif or mono stack depending on context. The serif-to-mono contrast is a core design element, not incidental.

### Font sizes (non-heading)

| Token | Value | Usage |
| ----- | ----- | ----- |
| `--text-base` | 1rem (16px) | Body text, list items, blockquotes |
| `--text-sm` | 0.875rem (14px) | Pre blocks, callout titles, popups, secondary text |
| `--text-xs` | 0.8125rem (13px) | Metadata, TOC items, footnotes, sidenotes |
| `--text-2xs` | 0.75rem (12px) | Panel titles, popup meta, TODO labels, TOC sub-items |
| `--text-3xs` | 0.6875rem (11px) | Navigation, breadcrumbs, table headers, TOC labels, time markers |

Heading sizes use raw `rem` values in `base.css`: h1 = 1.5rem, h2 = 1.25rem, h3 = 1.1rem, h4 = 1rem. These are exempt from the token invariant (see below).

**Minimum font size: 11px (0.6875rem).** No text on the site may be smaller than `--text-3xs`. This floor exists because text below 11px is unreadable for many users, fails accessibility spirit, and renders inconsistently across displays. Every use of `--text-3xs` should be justified — it is reserved for tertiary chrome (nav links, breadcrumbs, uppercase labels with letter-spacing) where the monospace letterforms and contextual cues aid legibility.

**Whole-pixel sizes.** Font size tokens should resolve to whole pixel values at the default root size (16px) to avoid sub-pixel rendering inconsistencies across browsers and display densities.

### Line heights

| Token | Value | Usage |
| ----- | ----- | ---- |
| `--leading-none` | 1 | -- |
| `--leading-tight` | 1.2 | Headings |
| `--leading-snug` | 1.35 | -- |
| `--leading-normal` | 1.45 | Body text (`html`) |
| `--leading-relaxed` | 1.5 | -- |

### Layout widths

| Token | Value | Purpose |
| ----- | ----- | ------- |
| `--width-content` | 70ch | Main content column max-width |
| `--width-sidebar` | 12rem | Aside margin sidebar width |
| `--width-page` | 85rem | Overall page max-width |
| `--height-header` | 2.5rem | Sticky header height (`:root`, used for scroll-padding) |

### Border radii

| Token | Value |
| ----- | ----- |
| `--radius-sm` | 2px |
| `--radius-md` | 3px |
| `--radius-lg` | 4px |
| `--radius-full` | 9999px |

### Transitions

| Token | Value |
| ----- | ----- |
| `--ease-out` | `ease-out` |
| `--transition-duration-fast` | 50ms |
| `--transition-duration-normal` | 100ms |
| `--transition-duration-medium` | 150ms |

## Font-size token invariant

All non-heading `font-size` declarations must use a `--text-*` token. No raw `rem` values for font-size outside headings. Relative `em` units are allowed for elements that scale with their parent (inline `code` at 0.9em, heading link icons at 0.8em, footnote superscripts at 0.85em).

This rule keeps the type scale predictable and auditable from a single location in `@theme`.

## Responsive breakpoints

Two breakpoints control layout behavior:

| Breakpoint | Condition | Effect |
| ---------- | --------- | ------ |
| 1024px | `width <= 1024px` | Grid collapses to single column; aside sidebars become inline; sidenotes hidden; sticky positioning removed |
| 640px | `width <= 640px` | Tighter inline padding (`spacing.2` instead of `spacing.4`) |

Both are declared as nested `@media` rules inside `.page-grid` in `components.css`. No shared breakpoint tokens exist; the values are inlined.

## Texture and grain

The scrapbook aesthetic comes from layered subtle textures, not bold visual effects:

- Subtle paper-like noise/grain on page backgrounds (CSS `background-image` with SVG noise or a tiny repeating texture)
- Varied content framing: relations block uses a surface-tinted background, sidenotes use a left border, backlinks use a top border separator
- Typographic contrast between serif prose and mono metadata creates visual variety within each page

These textures should be barely noticeable but add warmth. Different textures for light vs dark themes.

## Graph color resolution

The relation graph (`src/scripts/graph/`) renders in SVG with D3. Edge and node colors reference CSS custom properties, but SVG needs concrete color values at render time. The bridge is `src/scripts/graph/styles.ts`:

1. `EDGE_STYLES` and `NODE_COLORS` are initialized with hex fallbacks matching the `@theme` tokens.
2. `resolveRuntimeColors()` runs once after DOM ready, calling `getComputedStyle(document.documentElement).getPropertyValue(name)` for each token.
3. This updates the style objects in place, so the graph always matches the current theme even if token values change.

Edge types are distinguished by **both color and dash pattern** — color provides fast visual grouping, dash pattern provides a redundant encoding for accessibility. Each relation family uses its `--color-rel-*` token (hierarchy = slate, sequence = olive, type = mauve, reference = neutral). Node fills use the `--color-type-*` tint for the page's content type, highlights use `--color-accent`, labels use `--color-text`. See the Color coding strategy in the Colors section above.

## Key files

| File | Role |
| ---- | ---- |
| `src/styles/global.css` | Token definitions (`@theme`), `:root` overrides, layer imports |
| `src/styles/base.css` | Element-level defaults (`@layer base`) |
| `src/styles/components.css` | Layout grid, panels, popups, footnotes, callouts (`@layer components`) |
| `src/styles/prose.css` | Heading anchors, external link icons (`@layer components`) |
| `src/scripts/graph/styles.ts` | Runtime CSS variable resolution for SVG graph colors |
