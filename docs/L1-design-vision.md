---
scope: L1
summary: "Aesthetic direction, visual language, and design rules for the site redesign"
modified: 2026-03-20
reviewed: 2026-03-20
depends:
  - path: docs/L0-ui
dependents:
  - path: docs/L1-styles
  - path: docs/L2-header-nav
  - path: docs/L2-info-architecture
  - path: docs/L2-reading-experience
  - path: docs/L2-embedded-content
  - path: docs/L2-information-density
---

# Design Vision

Target aesthetic for home.theor.net — a content-first personal knowledge site with typed relations, optimized for long-form reading.

## Aesthetic direction

**Scrapbook with coherent bones.** The site should feel like a collage — different content types have visually distinct treatments — but everything sits on a shared structural grid. The variety is organic, not chaotic. A patchwork that grew over time, held together by consistent typography and spatial rhythm.

**Texture over saturation.** The visual richness comes from layered texture (subtle grain, varied content framing, typographic contrast), not from saturated color palettes. Color is present but quiet — used as a secondary signal that reinforces shape, icon, and typography. Content types get barely-there background tints; relation types get muted hues in the graph; maturity indicators get the loudest color. Nothing garish, but not monochrome either.

**Practical density.** Optimized for people who read. Information-dense but structured. Nothing decorative that doesn't serve comprehension or navigation.

### Inspirations

- **Gwern.net** (primary): sidenotes, link previews, metadata transparency, progressive disclosure, content maturity indicators
- **Andy Matuschak**: evergreen notes, working-in-public feel, sliding panes concept
- **Diegetic interfaces**: conceptual mood reference — the idea that interface elements feel like artifacts within the content world, not chrome imposed on top. Applied lightly, not literally.

## Color and theme

### Palette philosophy

Warm grey-paper base with intentional color coding as a quiet secondary layer. Deep teal accent for interactive elements. Content-type background tints and relation-type graph colors provide subliminal wayfinding. Maturity indicators are the loudest chromatic element. See `docs/L1-styles.md` for full token catalog and color coding strategy.

### Dual theme

Both light and dark themes, toggled manually. Each theme is carefully designed — dark is not an inversion of light. Textures and accents adapt per theme.

- **Light theme**: off-white/warm grey backgrounds, dark text, subtle paper-like grain
- **Dark theme**: deep charcoal (not pure black), warm light text, adapted grain/texture

### Semantic color (quiet signal)

Color reinforces shape/icon/typography as a secondary layer — never the sole differentiator, but present enough for subliminal wayfinding:
- **Content-type tints**: barely-there background hue shifts (3-5%) for article, project, note, interactive pages. Felt before consciously noticed.
- **Relation-type colors**: muted hues (slate, olive, mauve, neutral) in the graph SVG only. In text, relations remain monochrome.
- **Maturity indicators**: the loudest color on the site — these carry the highest semantic value (trustworthiness signal).
- **Accent (teal)**: reserved for interactive affordances only — links, focus rings, footnote numbers. Never decorative.

See `docs/L1-styles.md` "Color coding strategy" for the full policy.

## Typography

### Type system

Two typefaces, serif + monospace, creating the core patchwork texture through their contrast.

| Role | Treatment | Usage |
| ---- | --------- | ----- |
| Prose body | Serif, regular weight | Articles, essays, descriptions — the reading experience |
| Headings | Serif, bold/heavier weight | Section headers, page titles |
| Metadata, code, relations | Monospace | Frontmatter display, code blocks, relation labels, dates, tags |
| UI chrome | Serif or mono depending on context | Navigation, buttons, controls |

Both typefaces must be **characterful and unexpected** — not Inter, Roboto, Arial, Space Grotesk, or other generic defaults.

### Scale

Gwern-inspired: moderate mathematical scale (~1.25x ratio), dense but legible. Body text at 1rem (16px). Tighter letter-spacing on headlines, looser on small text.

### Typography constraints

Rules that protect readability and visual coherence across the site:

1. **Two fonts only.** Literata (serif) and Commit Mono (monospace). No third typeface. Every text element uses one of these two — the serif/mono contrast is the design's core texture. Using a second monospace (e.g. IBM Plex Mono) or adding a sans-serif fragments the identity.
2. **11px absolute floor.** No text smaller than 0.6875rem (11px). Text below this is unreadable for many users and renders inconsistently. The 11px size is reserved for tertiary monospace chrome (nav, breadcrumbs, uppercase labels).
3. **Body-adjacent text matches body.** List items, blockquote prose, and other content that reads as part of the prose flow must use the same size and line-height as body text (16px / 1.45–1.65). Subtle size drops (e.g. 15px for lists) create invisible inconsistency.
4. **Whole-pixel token values.** Font size tokens resolve to whole pixels at the default 16px root to avoid sub-pixel rendering variance.
5. **Token-only sizing.** All non-heading font sizes use `--text-*` tokens from `L1-styles`. No raw values outside headings. See the font-size token invariant in `L1-styles`.

## Layout

### Reading column

Narrow content column (max ~65-70ch) with generous margins. Tufte-style: the margins are functional space for sidenotes, not empty decoration.

### Three-zone structure

1. **Left margin**: navigation context, table of contents
2. **Center column**: content (prose, headings, inline interactives)
3. **Right margin**: sidenotes, margin notes, relation hints

Collapses to single column on narrow viewports, with sidenotes inlining into the flow.

## Header: ambient status bar

The header is a key design opportunity. Rather than a standard nav bar with links, it functions as an **ambient status bar** that communicates reading context:

### Information surfaced

- Reading progress (subtle progress indicator)
- Estimated read time
- Date published / last modified
- Content freshness/staleness indicator
- Entry maturity level (draft / in-progress / stable / evergreen)

### Behavior

- Compact and unobtrusive during reading
- Contains site identity and essential navigation
- The innovative quality comes from showing WHERE you are and WHAT you're reading, not just links to elsewhere
- Design details TBD — this is the area for creative exploration

## Content features

### Sidenotes (Tufte-style)

Margin notes appear alongside the referenced text in the right margin. On mobile, they collapse inline (expandable). Sidenotes are first-class citizens, not hidden footnotes.

### Link previews

Hover previews of linked pages — both internal and external. Shows title, excerpt, and relation type for internal links.

### Progressive disclosure

- Collapsible sections for detailed content
- Expandable details blocks
- Content reveals depth on demand — the "iceberg model"

### Content maturity

Each entry displays a visible maturity/confidence indicator:

| Level | Meaning |
| ----- | ------- |
| Draft | Early, incomplete, may change substantially |
| In-progress | Being actively developed, core ideas present |
| Stable | Reasonably complete, unlikely to change much |
| Evergreen | Maintained over time, regularly reviewed |

### Backlinks

Every entry shows its backlinks — other entries that reference it. First-class, not hidden.

## Content types

All four types share the structural grid but have distinct visual framing (the scrapbook variety):

| Type | Character |
| ---- | --------- |
| Long-form articles | Dense prose, full sidenote support, prominent metadata header |
| Projects / portfolio | Status-oriented, links to related writing, possibly visual |
| Short notes / TIL | Compact, quick to scan, accumulate over time |
| Interactive pages | Hybrid: some interactives inline within prose, some full-page takeover |

Differentiation via typography, framing, and metadata density — not color.

## Index / listing pages

**Dense table/list format.** Compact rows with title, date, type, tags, maturity. Scannable, power-reader oriented. Like a bibliography or file manager. Not cards, not a grid.

## Relations

### Frontmatter schema

Typed relations specified in page frontmatter:

| Relation | Inverse | Semantics |
| -------- | ------- | --------- |
| `up` | `down` | Hierarchical parent/child |
| `next` | `prev` | Sequential ordering |
| `is` | `has` | Type/instance relationship |
| `ref` | `refi` | Reference / back-reference (auto-extracted from links) |

### Display

- **Prominent header block**: each entry shows date, type, status, tags, and typed relations clearly at the top
- **Supplementary graph**: visible per-page relation graph, but not the primary navigation method
- **Backlinks section**: at the bottom or in margin, showing all incoming references

## Motion and interaction

**Minimal and functional.** Only animate what aids comprehension:

- Page transitions (fast, crisp)
- Expanding/collapsing sections
- Hover states for interactive elements
- No decorative animation, no ambient motion, no scroll-triggered effects

All transitions under 150ms. Performance over flourish.

## Audience

Designed for **both** technical peers and broad curious readers equally. Dense enough for power readers, clear enough that anyone can read an article without feeling lost. No required onboarding to the site's structure.
