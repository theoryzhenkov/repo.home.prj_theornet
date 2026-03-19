---
scope: L2
summary: "Metadata model, spatial layout rules, and information density strategy for page chrome"
modified: 2026-03-19
reviewed: 2026-03-19
depends:
  - path: docs/L1-design-vision
  - path: docs/L1-relations
dependents:
  - path: docs/L2-components
  - path: docs/L2-information-density
---

# Information Architecture

How metadata is modeled, where it appears on the page, and how the current scattered layout consolidates into a dense, single-pass-readable header block.

## The problem

Three separate zones currently display page metadata between the title and prose content: breadcrumbs, a metadata row (dates, type, word count), and a relations block. Each occupies its own vertical band with its own visual treatment, spreading thin information across significant vertical space. The reader scans past three distinct regions before reaching content. The header bar adds a fourth zone with its own ambient metadata (read time, maturity). Meanwhile, `is:` relations and the header's "type" label duplicate each other with no clear authority.

## Metadata model

### Canonical fields

Every page has these metadata fields. There is no separate "type" field -- the `is:` relation IS the type system. The header's former "article" / "project" label was a display artifact of the first `is:` target. This spec makes that relationship explicit and kills the redundancy.

| Field | Source | Required | Semantics |
| --- | --- | --- | --- |
| `title` | frontmatter | yes | Display name |
| `created` | frontmatter | yes | First publication date |
| `modified` | frontmatter | no | Last substantive edit |
| `maturity` | frontmatter | no | Draft / In-progress / Stable / Evergreen |
| `up` | frontmatter | no | Containment parents (hierarchy) |
| `is` | frontmatter | no | Type/category classification |
| `down` | inferred | -- | Children (from others' `up`) |
| `has` | inferred | -- | Instances (from others' `is`) |
| `next` / `prev` | frontmatter | no | Sequence links |
| `ref` / `refi` | extracted + inferred | -- | Outbound / inbound references |
| `description` | frontmatter | no | Subtitle or summary line |
| `links` | frontmatter | no | External URLs |

### `is:` subsumes type

The "type" display (article, project, note, etc.) derives from the first `is:` target. Pages with no `is:` relation have no type label -- they are untyped, which is fine. There is no `type` frontmatter field. The `is:` relation is richer than a flat enum because a page can be an instance of another page, inheriting context.

Rationale: a flat `type` field duplicates what `is:` already expresses but loses the graph connectivity. A page that `is: research-project` links directly to the "research-project" concept page, which can have its own description, children (`has:`), and relations. A flat enum cannot do this.

### Maturity vs. dates

Maturity is a qualitative signal (how confident/complete is this?). Dates are factual timestamps. Both display but serve different purposes. Maturity is prominent because it sets reader expectations. Dates are secondary -- useful for context but not decision-making for most readers.

## Spatial layout: the metadata strip

All page chrome between the title and prose body consolidates into a single dense region called the **metadata strip**. It replaces the current three-zone layout (breadcrumb row, relations block, metadata row) with a unified block that reads top-to-bottom in one visual pass.

### Structure

```
[Breadcrumb path]
[Title (h1)]
[Description]
[Metadata strip]
[Prose content]
```

The metadata strip itself is a compact monospace block with no extra spacing between its rows. Every row uses the same typographic treatment: `--text-xs`, monospace, muted text color. This creates a single visual "panel" rather than scattered chrome.

### Metadata strip contents (in order)

```
stable · 4 min · created 2025-06-12 · updated 2026-01-15
is: research-project    down: sub-experiment-a, sub-experiment-b
```

Row 1 is the **context line**: maturity badge, estimated read time, dates. All on one line, separated by `·` (middle dot). The type label is NOT repeated here — it already appears in the `is:` relation row, and duplicating it wastes space. This is the "ambient status" the design vision calls for, pulled down from the header into the content zone where it has immediate context.

Row 2+ are **relation rows**: only shown when non-empty. Each row is `label: link, link, link`. Relation types appear in this fixed order: `up`, `is`, `has`, `down`, `prev`/`next`, `ref`, `refi`. Multiple relation types can share a row when space allows -- specifically, `up` and `is` combine onto one line since both are typically short.

### Why not the header?

The design vision describes the header as an "ambient status bar." That concept is sound, but the header is persistent chrome visible on scroll. Putting per-page metadata there means it competes for attention during reading. The metadata strip places context exactly where the reader needs it: at the point of commitment, between title and content. The header retains: site identity, navigation, search, and reading progress bar. It does not duplicate per-page metadata.

### Why not margins?

The right margin is reserved for sidenotes (Tufte-style). The left margin holds the TOC. Cramming metadata into margins would compete with these higher-value uses. Metadata is read once at the top; sidenotes and TOC are referenced throughout reading. The margins serve the ongoing reading experience; the metadata strip serves the initial orientation.

## Relation display rules

### Inline vs. block

Relations display inline within the metadata strip, not as a separate component with its own heading or border. They are metadata, styled identically to dates and maturity -- monospace, small, muted.

### Ordering

Fixed display order prevents cognitive load from layout variation across pages:

1. `up` -- where am I in the hierarchy?
2. `is` -- what kind of thing is this?
3. `has` -- what instances does this contain? (only on concept/category pages)
4. `down` -- what children live under this? (only on parent pages)
5. `prev` / `next` -- sequence navigation (displayed as `< Prev Title | Next Title >`)
6. `ref` -- outbound references (often omitted since they appear as inline links in prose)
7. `refi` -- inbound references / backlinks

### Suppression rules

Not every relation type earns screen space on every page.

| Relation | Show when |
| --- | --- |
| `up` | Always, if non-empty (critical for orientation) |
| `is` | Always, if non-empty (displayed as type label in context line AND as relation row) |
| `has` | Only on concept/category pages (pages that other pages point to via `is:`) |
| `down` | Only when > 0 children exist |
| `prev` / `next` | Always, if set (sequence navigation is high value) |
| `ref` | Suppress in the strip. Outbound refs are visible as links within prose. Showing them again in metadata is redundant. |
| `refi` | Show as a "Backlinks" section at the page bottom, NOT in the metadata strip. Backlinks are reference material, not orientation metadata. |

This means a typical article page shows: context line + `up` + `is` (combined row). Two lines of metadata. Dense.

### Prev/Next display

Sequence links (`prev`/`next`) display as a compact navigation row at the bottom of the metadata strip, formatted as directional links: `< Previous Title  |  Next Title >`. They also appear at the bottom of the page content (after prose, before backlinks) as a repeated navigation affordance, since readers who finish an article in a sequence need forward/back without scrolling up.

## Context line specification

The context line is the first row of the metadata strip. It packs the most decision-relevant metadata into a single scannable line.

### Format

```
{maturity} · {read_time} · created {date} [· updated {date}]
```

Each segment:
- **maturity**: One of `draft`, `in-progress`, `stable`, `evergreen`. Styled with a subtle status indicator (the only semantic color use, per design vision). Omitted if not set in frontmatter.
- **read_time**: `N min` estimated from word count (~250 wpm). Omitted for pages under 2 minutes.
- **created**: Always shown. Format: `YYYY-MM-DD` (ISO, matching the monospace/technical aesthetic; not "Mar 15, 2026" which mixes serif-friendly formatting into a monospace context).
- **updated**: Shown only if `modified` differs from `created` by more than 24 hours. Same format.

### Why ISO dates?

The site's aesthetic is textured, technical, information-dense. ISO dates (`2026-03-19`) are scannable in monospace, sort lexicographically, and match the utilitarian character. Localized dates ("Mar 19, 2026") belong in friendlier contexts. This is a research notebook, not a blog.

## Index / listing pages

Listing pages (e.g., `/projects/`) use the ContentTable component. The metadata model informs column selection.

### Default columns

| Column | Source | Rationale |
| --- | --- | --- |
| Title | `title` | Primary identifier, linked |
| Type | first `is:` target | Enables scanning by kind |
| Maturity | `maturity` | Lets readers filter by completeness |
| Created | `created` | Chronological orientation |
| Updated | `modified` | Freshness signal |

Read time is omitted from listings (not useful for scanning decisions). Description is omitted to keep rows compact -- the title should be self-explanatory. If it is not, the title needs rewriting.

### Sort and filter

Default sort: `modified` descending (freshest first). The "Type" and "Maturity" columns are filterable via dropdown. This replaces tag-based filtering -- `is:` relations ARE the taxonomy.

## Information density recommendations

### Vertical budget

The metadata strip should occupy no more than 3-4 lines of monospace text for a typical article. Currently, breadcrumbs + metadata row + relations block often span 8-12 lines with spacing. Target: 50% vertical reduction.

### Consolidation moves

1. **Kill the separate Metadata component.** Merge its content (dates) into the context line of the metadata strip.
2. **Kill the separate relation heading.** Relations are rows in the strip, not a titled section.
3. **Merge breadcrumbs and `up:` display.** The breadcrumb path is derived from the `up` chain. Showing both is redundant. Keep breadcrumbs as the navigation element above the title. Remove `up:` from the metadata strip ONLY IF the breadcrumb is visible. When breadcrumbs are hidden (0 or 1 ancestors), show `up:` in the strip.
4. **Move backlinks to page bottom.** They are reference material, not orientation. The reader does not need to see "5 pages link here" before deciding to read.
5. **Move the graph visualization to the bottom.** The per-page relation graph is supplementary, not primary navigation. Position it near backlinks, after the prose content.

### What stays in the header

The header bar retains only persistent, scroll-visible information:

- Site identity (logo/name)
- Primary navigation links
- Search trigger
- Reading progress bar (the one piece of ambient metadata that benefits from persistence)
- Theme toggle

Everything else moves to the metadata strip or page bottom.

## Backlinks section

Backlinks (`refi` relations) are displayed as a dedicated section at the bottom of every page, after the prose content and prev/next navigation, before the relation graph. Inspired by Gwern.net, each backlink shows not just the linking page's title but the **text snippet** where the link appears -- the surrounding context that explains *why* the link was made. This transforms backlinks from a flat list of titles into a meaningful reading trail.

### Why snippets matter

A bare title ("Training Dynamics Overview") tells the reader *what* links here but not *why*. The snippet reveals intent: did the author cite this page as evidence, mention it in passing, or build an argument on it? This distinction is the difference between a bibliography and a research tool. The reader can decide whether to follow a backlink without navigating away -- progressive disclosure applied to the link graph.

### Visual structure

Each backlink entry is a self-contained card-like block with three elements stacked vertically:

```
[Title (linked, serif)]  [type label (mono, small)]
> Snippet paragraph with the surrounding context where
> the link appeared. The linked phrase is highlighted
> within the snippet text.                    [view in context ->]
```

**Title row.** The backlinking page's title, rendered as a teal link in Literata (serif) at `--text-sm` (14px), with the page's type label inline to the right in Commit Mono at `--text-2xs` (12px), muted (`--color-text-subtle`). The title row uses horizontal layout with baseline alignment and an 8px gap between title and type.

**Snippet blockquote.** The paragraph (or sentence cluster) from the backlinking page that contains the link to the current page. Styled as a blockquote with:

- Left border: 2px solid `--color-border` (not accent -- accent is reserved for interactive elements, and the border here is structural, not clickable)
- Padding-left: 12px (from the border to text)
- Font: Literata at `--text-xs` (12.8px), `--color-text-muted`, `line-height: 1.55`
- The linked phrase within the snippet (the anchor text that originally pointed to this page) is rendered in `--color-accent` with no underline, distinguishing it from the surrounding context
- Max height: 4 lines (~5.2em at the given font size and line-height). Snippets longer than 4 lines are truncated with a CSS `line-clamp` and trailing ellipsis. This prevents a single verbose backlink from dominating the section.

**"View in context" link.** Optional, displayed below the snippet aligned to the right. Rendered in Commit Mono at `--text-2xs`, `--color-accent`. Links to the backlinking page with a fragment anchor that scrolls to the paragraph containing the link. Only shown when the build system can generate a stable fragment identifier for the source paragraph (i.e., the paragraph has a heading ancestor that produces an anchor). Omitted silently when no anchor is available.

### Snippet extraction rules

At build time, the backlinks system extracts context for each inbound reference:

1. **Source unit.** The snippet is the full paragraph (`<p>`) element that contains the link. If the link is inside a list item, the list item text is used instead. If inside a heading, the heading plus the first paragraph of its section.
2. **Length limit.** Snippets are capped at 280 characters (approximately two sentences). If the source paragraph exceeds this, extract a window centered on the link: take text starting ~40 characters before the anchor text and ending ~240 characters after, trimming to word boundaries and adding ellipsis (`...`) at the truncation points.
3. **Markup stripping.** The snippet is plain text with one exception: the original anchor text (the phrase that linked to this page) retains its accent color styling. All other links, formatting (bold, italic, code), and footnote references are stripped. The snippet is a reading aid, not a formatted excerpt.
4. **Fallback.** If snippet extraction fails (e.g., the link is in frontmatter, or the source page uses a non-standard content structure), fall back to the backlinking page's `description` field. If that is also absent, show the title-only format (no snippet block).

### Section header and count

The section header reads `BACKLINKS` in Commit Mono at `--text-2xs`, `font-weight: 600`, `letter-spacing: 1.5px`, `--color-text-subtle` -- matching the existing label style used for other aside-panel headers. A count badge follows inline: `(3)` in the same typographic treatment. This gives the reader a quick signal of backlink density without requiring them to scan the full list.

### Spacing and separation

- The backlinks section is separated from the preceding content by a 1px top border in `--color-border-subtle` with `padding-top: 24px` -- matching the current prototype.
- Gap between the section header and the first backlink entry: 12px.
- Gap between individual backlink entries: 16px. Each entry is visually self-contained but grouped tightly enough to scan as a list.
- Internal gap within each entry: 6px between the title row and the snippet blockquote; 4px between the snippet and the "view in context" link.

### Overflow handling (progressive disclosure)

The backlinks count determines display strategy:

| Count | Behavior |
| --- | --- |
| 0 | Section hidden entirely. No "BACKLINKS" header, no empty state. |
| 1--5 | All entries expanded with snippets visible. No collapse needed -- 5 entries with 4-line snippets occupy roughly 400px, which is acceptable for end-of-page reference material. |
| 6--20 | First 5 entries expanded. Remaining entries collapsed behind a `Show N more backlinks` toggle (Commit Mono, `--text-xs`, `--color-accent`). Clicking expands all remaining entries inline with no animation. The toggle text changes to `Show fewer` after expansion. |
| 20+ | First 5 entries expanded. A toggle shows `Show all N backlinks`. Additionally, the expanded entries beyond 5 are rendered without snippets (title + type only) to reduce vertical cost. The reader who wants snippet context for entry #17 can click through to the backlinking page. |

### Mobile behavior (below 1024px)

On narrow viewports:

- The backlinks section remains at the page bottom (same position).
- Snippet blockquotes are preserved but capped at 3 lines instead of 4 (`line-clamp: 3`).
- The "view in context" link is hidden -- on mobile, the reader will tap the title to navigate, and fragment-scrolling is less reliable on small screens.
- The overflow threshold drops: first 3 entries expanded (not 5), with `Show N more` for the rest.
- Padding and gaps tighten slightly: entry gap reduces to 12px, section top padding to 16px.

### Accessibility

- Each backlink entry is a `<li>` within a `<ul>` inside a `<section aria-labelledby="backlinks-heading">`.
- The section header is an `<h2>` (visually styled small, but semantically correct for page outline).
- Snippet blockquotes use `<blockquote cite="URL">` with the `cite` attribute pointing to the backlinking page.
- The "view in context" link has `aria-label="View this reference in context on [Page Title]"` for screen readers.
- The expand/collapse toggle uses `aria-expanded` and controls the hidden entries via `aria-controls`.

### Key files

- `src/components/Backlinks.astro` -- backlink section markup, snippet rendering
- `src/lib/backlinks.ts` -- snippet extraction, truncation, fragment anchor resolution
- `src/styles/components.css` -- `.backlink-entry`, `.backlink-snippet` styles

## Assertions

| ID | Sev. | Assertion |
| --- | --- | --- |
| no-type-field | MUST | No `type` frontmatter field exists; type derives from the first `is:` target |
| single-strip | MUST | All pre-content metadata renders as a single contiguous block (metadata strip), not multiple spaced zones |
| context-line | MUST | The context line contains type, maturity, read time, and dates on one row |
| iso-dates | MUST | Dates render in ISO 8601 format (`YYYY-MM-DD`) in the metadata strip |
| ref-suppressed | MUST | Outbound `ref` relations do not appear in the metadata strip |
| backlinks-bottom | MUST | `refi` (backlinks) display at page bottom, not in the metadata strip |
| strip-budget | SHOULD | Metadata strip occupies 4 or fewer lines for a typical article page |
| breadcrumb-up-dedup | SHOULD | `up:` relation row is suppressed when breadcrumbs are visible |
| maturity-color | SHOULD | Maturity indicator is the only element in the strip using semantic color |
| listing-type-col | SHOULD | Index/listing tables include a "Type" column derived from `is:` |
| backlinks-snippet | MUST | Each backlink entry displays a text snippet from the backlinking page showing the surrounding context of the link |
| backlinks-snippet-cap | MUST | Snippets are capped at 4 lines (3 on mobile) via `line-clamp` |
| backlinks-snippet-extraction | MUST | Snippet source is the paragraph or list item containing the link, truncated to 280 characters centered on the anchor text |
| backlinks-hidden-zero | MUST | Backlinks section is entirely hidden when no backlinks exist (no empty state) |
| backlinks-overflow | MUST | More than 5 backlinks collapse behind a "Show N more" toggle (3 on mobile) |
| backlinks-anchor-highlight | SHOULD | The original anchor text within the snippet is styled in `--color-accent` to identify the linked phrase |
| backlinks-context-link | SHOULD | Each snippet includes a "view in context" link with a fragment anchor to the source paragraph |
| backlinks-accessible | MUST | Backlinks section uses `<section>`, `<ul>`, `<blockquote cite>`, and `aria-expanded` for progressive disclosure |
