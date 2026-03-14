---
scope: L1
summary: "CSS architecture, design tokens, and style invariants"
modified: 2026-03-15
reviewed: 2026-03-15
depends:
  - path: docs/L0-ui
dependents:
  - path: docs/L2-components
---

# Styles

## Tailwind v4 and the `@theme` block

The project uses Tailwind CSS v4, which replaces `tailwind.config.js` with a CSS-native `@theme` block. All custom design tokens live in `src/styles/global.css` inside this block. Tailwind generates utility classes from these tokens automatically, so `bg-bg-subtle` or `text-text-muted` work without extra configuration.

A separate `:root` block defines properties that are not Tailwind utilities: `--height-header`, `--color-overlay`, and `color-scheme: light only`.

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

| Token | Value | Role |
| ----- | ----- | ---- |
| `--color-bg` | `#fff` | Page background |
| `--color-bg-subtle` | `#f8f8f8` | Table headers, callout backgrounds |
| `--color-bg-muted` | `#f0f0f0` | Code blocks, inline code |
| `--color-text` | `#111` | Primary text, headings |
| `--color-text-muted` | `#444` | Secondary text, blockquotes, sidebar content |
| `--color-text-subtle` | `#666` | Tertiary text, link icons, tag metadata |
| `--color-link` | `#005` | Link text |
| `--color-link-hover` | `#00a` | Link hover state |
| `--color-link-visited` | `#551a8b` | Visited links |
| `--color-border` | `#ccc` | Borders, horizontal rules, blockquote accents |
| `--color-border-subtle` | `#e0e0e0` | Callout title separators |
| `--color-accent` | `#005` | Footnote numbers, note callouts |
| `--color-accent-hover` | `#00a` | Footnote hover |
| `--color-highlight` | `#ff9` | Text selection |
| `--color-highlight-subtle` | `#ffc` | Sidenote highlight, TODO background |
| `--color-success` | `#060` | Tip/important callouts, "finished" status |
| `--color-warning` | `#850` | Warning callouts, TODO markers, "in-progress" status |
| `--color-error` | `#900` | Error/danger callouts |
| `--color-overlay` | `rgba(0,0,0,0.3)` | Modal overlays (`:root`, not `@theme`) |

### Font stacks

| Token | Value |
| ----- | ----- |
| `--font-sans` | `system-ui, -apple-system, 'Segoe UI', sans-serif` |
| `--font-serif` | `'Georgia', 'Times New Roman', serif` |
| `--font-mono` | `'Consolas', 'Monaco', 'Liberation Mono', monospace` |

### Font sizes (non-heading)

| Token | Value | Usage |
| ----- | ----- | ----- |
| `--text-base` | 1rem (16px) | Body text |
| `--text-sm` | 0.875rem (14px) | Pre blocks, callout titles, popups, secondary text |
| `--text-xs` | 0.8rem (12.8px) | Metadata, TOC, footnotes, sidenotes |
| `--text-2xs` | 0.75rem (12px) | Panel titles, popup meta, TODO labels |

Heading sizes use raw `rem` values in `base.css`: h1 = 1.5rem, h2 = 1.25rem, h3 = 1.1rem, h4 = 1rem. These are exempt from the token invariant (see below).

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

## Graph color resolution

The relation graph (`src/scripts/graph/`) renders in SVG with D3. Edge and node colors reference CSS custom properties, but SVG needs concrete color values at render time. The bridge is `src/scripts/graph/styles.ts`:

1. `EDGE_STYLES` and `NODE_COLORS` are initialized with hex fallbacks matching the `@theme` tokens.
2. `resolveRuntimeColors()` runs once after DOM ready, calling `getComputedStyle(document.documentElement).getPropertyValue(name)` for each token.
3. This updates the style objects in place, so the graph always matches the current theme even if token values change.

The mapping: `up`/`next` edges use `--color-accent`, `is` edges use `--color-success`, `ref` edges use `--color-border`. Node fills use `--color-text-muted`, highlights use `--color-accent`, labels use `--color-text`.

## Key files

| File | Role |
| ---- | ---- |
| `src/styles/global.css` | Token definitions (`@theme`), `:root` overrides, layer imports |
| `src/styles/base.css` | Element-level defaults (`@layer base`) |
| `src/styles/components.css` | Layout grid, panels, popups, footnotes, callouts (`@layer components`) |
| `src/styles/prose.css` | Heading anchors, external link icons (`@layer components`) |
| `src/scripts/graph/styles.ts` | Runtime CSS variable resolution for SVG graph colors |
