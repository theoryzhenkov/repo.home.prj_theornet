---
scope: L0
summary: "UI components, layout system, and DSRD design tokens"
modified: 2026-03-15
reviewed: 2026-03-15
depends:
  - path: README
dependents:
  - path: src/content/pages/theor-net-dsrd
  - path: docs/L1-styles
  - path: docs/L1-scripts
  - path: docs/L1-routing
---

# UI and Design

## Design philosophy

Minimalist, text-first, information-dense. No shadows, sharp edges, small gaps, fast transitions (under 150ms). System UI fonts. The full design system is captured in the DSRD page on the site itself (`src/content/pages/theor-net-dsrd.mdx`), which includes a standalone reference HTML file. Note: the DSRD reference HTML is a point-in-time snapshot and may lag behind the actual styles in `src/styles/global.css`, which is the source of truth.

Inspirations: Paul Graham, Dan Luu, Gwern, Joe Carlsmith.

## Font-size scale

All non-heading font sizes use tokens defined in `@theme` (`src/styles/global.css`). Do not introduce new raw `rem` values for font-size; use a token instead.

| Token | Value | Usage |
| ----- | ----- | ----- |
| `--text-base` | 1rem (16px) | Body text, search input |
| `--text-sm` | 0.875rem (14px) | Nav links, pre blocks, callout titles, secondary text |
| `--text-xs` | 0.8rem (12.8px) | Metadata, breadcrumbs, TOC, footnotes, filters |
| `--text-2xs` | 0.75rem (12px) | Panel titles, badges, keyboard shortcuts |

Relative `em` units are used for elements that should scale with their parent context (inline `code` at 0.9em, heading link icons at 0.8em, footnote superscripts at 0.85em). These are intentionally not tokenized.

## Layout

Three-column grid (`page-grid`): left sidebar, content area (max `70ch`), right sidebar. Collapses to single column below 1024px. Sticky header with site logo and nav links.

The page template lives in `src/layouts/page/Page.astro`, rendered by the catch-all route `src/pages/[...slug].astro`.

## Components

| Component | Purpose |
| --------- | ------- |
| `Header.astro` | Sticky nav bar |
| `Breadcrumb.astro` | Hierarchy path |
| `TOC.astro` | Table of contents with scroll spy (`toc-scrollspy.ts`) |
| `TopRelations.astro` / `BottomRelations.astro` | Display page relations |
| `RelationsGraph.astro` | D3 force-directed graph of all pages |
| `Search.astro` | Pagefind search integration |
| `Footnote.astro` / `Footnotes.astro` | Inline footnotes with popup behavior (`footnotes.ts`) |
| `ContentTable.astro` | Renders page listings |
| `Metadata.astro` | Page metadata display |
| `Head.astro` | HTML head with meta tags |

## Client-side scripts

- `src/scripts/popups.ts` -- hover popups (uses `/popup-index.json` endpoint)
- `src/scripts/footnotes.ts` -- footnote interaction
- `src/scripts/toc-scrollspy.ts` -- highlights current section in TOC
- `src/scripts/graph/` -- D3 graph rendering and styling
