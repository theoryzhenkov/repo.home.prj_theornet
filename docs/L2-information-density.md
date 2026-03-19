---
scope: L2
summary: "Opportunities to increase relevant information density: section navigation, graph focus, color signals, and hidden metadata exposure"
modified: 2026-03-19
reviewed: 2026-03-19
depends:
  - path: docs/L1-design-vision
  - path: docs/L2-info-architecture
  - path: docs/L1-relations
  - path: docs/L2-reading-experience
  - path: docs/L1-styles
---

# Information Density

Opportunities to expose hidden context, add navigational affordances, and use color/shape more effectively across the site. Each proposal is evaluated for value/complexity ratio and ranked accordingly.

The guiding principle from L1-design-vision: **practical density** -- optimized for people who read. Every addition must earn its pixels by aiding comprehension or navigation. Anything that adds visual noise without proportional information value is rejected.

## Ranking summary

Ideas ordered by value-to-complexity ratio (best first):

| Rank | Idea | Value | Complexity | Verdict |
| ---- | ---- | ----- | ---------- | ------- |
| 1 | Graph focus button | High | Low | **Do it** |
| 2 | Backlink count in metadata strip | High | Low | **Do it** |
| 3 | Link type differentiation | High | Low | **Do it** |
| 4 | Connection count in metadata strip | Medium | Low | **Do it** |
| 5 | Freshness signal (beyond raw date) | Medium | Low | **Do it** |
| 6 | Section-level prev/next | Medium | High | **Defer -- design carefully** |
| 7 | Section depth color indicators | Low | Low | **Reject** |
| 8 | Reading progress by section | Low | Medium | **Reject** |
| 9 | Word count per section | Low | Low | **Reject** |
| 10 | Section-level edit dates | Low | High | **Reject** |
| 11 | Section maturity gradient | Low | High | **Reject** |

---

## 1. Graph focus button

### Problem

The site has a D3 relation graph at `/graph`. Currently there is no way to jump from an article page to see that page highlighted in the graph. The graph exists but is disconnected from the reading flow.

### Solution

Add a "graph" affordance to the metadata strip that links to `/graph?focus={slug}`. This is a single link, not a button -- it sits inline with the other metadata, not floating or in the header.

### Placement

Append to the context line (row 1 of the metadata strip), after the dates:

```
stable · 4 min · created 2025-06-12 · updated 2026-01-15 · graph
```

The word `graph` is a teal link (`--color-accent`) in Commit Mono at `--text-xs`, matching the rest of the context line. It links to `/graph?focus={current-slug}`. No icon, no button chrome -- just a text link in the metadata row. It reads as "this page exists in a graph, click to see where."

### Why not the header?

The header is persistent scroll chrome. A per-page affordance like "view in graph" belongs in the metadata strip where other per-page context lives. Putting it in the header would mean it competes with site-wide navigation during reading.

### Why not a floating button?

Floating buttons violate the design vision's "minimal and functional" motion principle. They add a z-layer, require positioning logic, and suggest urgency that this feature does not warrant. A quiet inline link in the metadata strip is sufficient.

### Graph page behavior

The `/graph` page receives `?focus=slug` as a query parameter. On load, the graph should:
1. Center the viewport on the focused node
2. Highlight the focused node with `--color-accent` fill and a slightly larger radius
3. Dim non-adjacent nodes to `opacity: 0.3` for 2 seconds, then fade back to full opacity
4. The focus effect is temporary orientation, not a permanent filter

### Complexity

Low. One link in the metadata strip template. One query parameter handler in the graph page script. The graph already supports node highlighting via click -- this reuses that mechanism on page load.

---

## 2. Backlink count in metadata strip

### Problem

Backlinks display at the page bottom (per L2-info-architecture), but the reader has no signal of *how connected* this page is until they scroll to the end. A page with 15 backlinks is qualitatively different from a page with 1 -- it is a hub, a heavily-referenced concept. That structural importance is invisible during initial orientation.

### Solution

Add an inline backlink count to the context line:

```
stable · 4 min · created 2025-06-12 · 7 backlinks · graph
```

The count is a teal link that scrolls to the backlinks section at the bottom of the page. If backlink count is 0, the segment is omitted entirely (matching the backlinks section's own "hidden when zero" rule from L2-info-architecture).

### Why this matters

The backlink count is a **prominence signal**. A page with many inbound references is a hub in the knowledge graph. Surfacing this in the metadata strip tells the reader "this concept is load-bearing" before they start reading. It sets expectations about the page's role in the broader structure.

### Display rules

| Count | Display |
| --- | --- |
| 0 | Omitted |
| 1 | `1 backlink` (singular) |
| 2+ | `N backlinks` (plural) |

The count links to `#backlinks-heading` on the same page. Clicking it scrolls smoothly to the backlinks section.

### Complexity

Low. The backlink count is already computed during `buildRelationsGraph()` -- it is `refi.length`. Displaying it in the context line requires passing one number to the metadata strip template.

---

## 3. Link type differentiation

### Problem

All links within prose look identical -- teal text with underline. But internal links, external links, and Wikipedia links serve fundamentally different purposes. An internal link keeps the reader within the knowledge graph. An external link sends them away. A Wikipedia link is a reference lookup. The reader cannot distinguish these without hovering or reading the URL.

### Solution

Differentiate links via **underline style only** -- not color, not icons (the existing external link icon in prose.css can stay as a secondary signal, but the underline is the primary encoding). This preserves the design vision's rule that accent color is reserved for interactive affordances uniformly, while adding a new information channel through a visual property that is already present (the underline).

### Underline treatments

| Link type | Detection | Underline style | Rationale |
| --- | --- | --- | --- |
| Internal (same site) | `href` starts with `/` and matches a known page slug | Solid underline, `1px`, `--color-accent` | Default, most trusted -- stays within the knowledge graph |
| External (general) | `href` starts with `http` and is not Wikipedia | Dashed underline, `1px`, `--color-text-subtle` | Signals departure; the muted color reduces visual pull toward exits |
| Wikipedia | `href` contains `wikipedia.org` | Dotted underline, `1px`, `--color-text-subtle` | Reference lookup; distinct from general external because Wikipedia links are "look this up" rather than "go explore this" |
| Anchor (same page) | `href` starts with `#` | No underline, teal text only | Same-page jumps do not need the "this goes somewhere" signal |

### Implementation

Use `text-decoration-style` and `text-underline-offset` in CSS, keyed off attribute selectors:

- `.prose a[href^="/"]` -- internal (solid, default)
- `.prose a[href^="http"]` -- external (dashed)
- `.prose a[href*="wikipedia.org"]` -- Wikipedia (dotted, more specific selector wins)
- `.prose a[href^="#"]` -- anchor (no underline)

### Why not color differentiation?

L1-styles explicitly states: "Accent is functional, not decorative. The teal accent appears only on interactive elements." Making external links a different color would either (a) use a second accent color, fragmenting the palette, or (b) dim external links in a way that makes them look disabled. Underline style is the right channel -- it is already present, adds no new color, and is perceptible without being loud.

### Complexity

Low. Pure CSS, no JS. Four attribute selectors in `prose.css`. The link preview system (L2-reading-experience) already distinguishes internal from external for hover behavior, so no new detection logic is needed.

---

## 4. Connection count in metadata strip

### Problem

The backlink count (proposal #2) shows inbound references. But a page's overall "connectedness" in the graph -- the total number of typed relations (up, down, is, has, next, prev, ref, refi) -- is a different and complementary signal. A page might have few backlinks but many children (`down`) or many instances (`has`), making it a structural node in the hierarchy.

### Solution

Do **not** add a separate connection count. Instead, the graph focus link (proposal #1) implicitly communicates connectedness: clicking "graph" reveals the node's neighborhood. Adding a raw number like "12 connections" to the context line would be noise -- the reader cannot act on it without seeing the graph, and the number alone does not distinguish "12 children" from "12 random references."

However, the graph page itself should display a tooltip or sidebar showing the connection breakdown when a node is focused. This keeps the density in the right place: the metadata strip gives you the link; the graph page gives you the detail.

### Revised verdict

Do not add a count to the metadata strip. Instead, enhance the graph focus view to show a connection breakdown panel when `?focus=slug` is active. This is lower priority than proposals 1-3.

---

## 5. Freshness signal

### Problem

The context line shows `created` and `updated` dates. But dates require mental arithmetic to assess freshness -- "2024-08-15" means nothing until the reader computes "that was 19 months ago." Maturity (draft/stable/evergreen) is qualitative but does not capture temporal freshness. A stable page last updated 2 years ago and a stable page updated yesterday are materially different.

### Solution

Add a **relative time indicator** next to the updated date when the page is older than 6 months:

```
stable · 4 min · created 2025-06-12 · updated 2025-08-15 (7mo ago) · 3 backlinks · graph
```

### Rules

| Last updated | Display |
| --- | --- |
| < 30 days | No indicator (implicitly fresh) |
| 30 days -- 6 months | No indicator (moderate, not worth calling out) |
| 6 months -- 2 years | `(Nmo ago)` in `--color-text-subtle` |
| > 2 years | `(N yr ago)` in `--color-status-draft` (amber) -- the strongest staleness signal |

The amber color for > 2 years is justified: L1-styles says status colors are "the loudest color on the site" and carry "the highest semantic value (trustworthiness signal)." A page untouched for over 2 years is a trust concern, equivalent to a draft in terms of reader confidence calibration.

### Why not a color gradient on the date itself?

Coloring the date text would violate the context line's monochrome-except-maturity rule (L2-info-architecture assertion `maturity-color`). The parenthetical relative time is additive information, not a recoloring of existing information. The amber for > 2 years is an exception granted by semantic precedent: it is a staleness/trust signal, same category as maturity.

### Complexity

Low. Pure build-time computation: `Date.now() - modified` mapped to a display string. No client-side JS needed.

---

## 6. Section-level prev/next relations

### Problem

The existing `prev`/`next` relations operate at the page level: "after this page, read that page." But long articles have internal sections (h2/h3) that could link to sections in other pages. A reader finishing the "Motivation" section of page A might benefit from knowing that page B's "Background" section provides prerequisite context, or that page C's "Results" section is the natural continuation.

### Proposed mechanism

Allow optional `prev` and `next` annotations at the section level within MDX content, using a custom MDX component:

```mdx
## Motivation

<SectionNav prev="other-page#background" next="results-page#findings" />

Content of the Motivation section...
```

The `<SectionNav>` component renders as a compact inline block at the start of the section, below the heading:

```
< Background (Other Page)  |  Findings (Results Page) >
```

Styled identically to the prev/next row in the metadata strip: Commit Mono, `--text-xs`, `--color-text-subtle`, with teal link text for the page titles. The arrows and pipe are decorative separators. If only `prev` or only `next` is set, the missing side is simply absent.

### Why a component, not frontmatter?

Frontmatter cannot express per-section metadata without inventing a complex nested schema (e.g., a map of heading anchors to relation objects). An inline MDX component is simpler: it lives next to the heading it applies to, is self-documenting, and requires no schema changes to `content.config.ts`.

### Display location

Immediately below the section heading, before the section's prose content. Not in the margin (margins are for TOC and sidenotes), not as a tooltip (too hidden). It should be visible but subordinate -- small monospace text that the reader can ignore if they are reading linearly but can follow if they need context.

### Concerns

**High authoring burden.** Every section-level link must be manually maintained. Unlike page-level `prev`/`next` which the graph builder can validate, section-level links are free-form strings that can rot silently. A link to `other-page#background` breaks if that heading is renamed.

**Low expected usage.** In practice, most articles are self-contained. The sections that truly need cross-page prerequisite links are rare -- perhaps 10-15% of sections across the site. Designing a system for a minority use case risks over-engineering.

**Visual clutter risk.** Adding a navigation row below every h2/h3 that has section-level links creates visual noise in the reading flow. The reader's eye must now parse: heading, section nav, then content -- three elements per section instead of two.

### Verdict

**Defer.** The idea is sound in principle but the value/complexity ratio is poor today. Revisit when the site has enough long-form content that cross-page section linking becomes a recurring need rather than a theoretical one. If implemented, start with a small pilot: add `<SectionNav>` to 3-5 sections and evaluate whether readers actually follow the links before committing to the pattern site-wide.

### If implemented later

- The `<SectionNav>` component should validate that target pages exist at build time (using the existing `buildGraphFromPages()` page map) but cannot validate heading anchors without parsing the target page's MDX, which is expensive. Accept that heading-level links may break and add a build-time warning (not error) for unresolvable anchors.
- Do not add section-level relations to the graph visualization. The graph is page-level. Mixing granularities would make it unreadable.

---

## 7. Section depth color indicators (REJECTED)

### Proposal

Use a left-margin color strip to indicate heading depth: h2 sections get one color, h3 another, h4 a third. This would provide a peripheral visual signal of document structure.

### Why reject

The TOC already provides this information. It lives in the left margin, shows h2 and h3 with indentation and active-state highlighting, and is visible throughout reading. A colored left border on sections would duplicate the TOC's structural signal while adding visual noise to the prose column.

Furthermore, L1-styles is explicit: "Where color does NOT appear: Borders and rules -- Neutral borders maintain the structural grid; colored borders would fragment it." Section depth borders are exactly the fragmentation this rule prohibits.

The information is real but already surfaced through a better channel (the TOC). Adding a redundant color encoding violates practical density.

---

## 8. Reading progress by section (REJECTED)

### Proposal

Track which sections the reader has scrolled past and provide a visual indicator (e.g., a checkmark in the TOC, a faded treatment on passed sections).

### Why reject

The header already has a reading progress bar (L1-design-vision). Adding per-section progress tracking would require client-side state management (which sections have been "visited"), persistence decisions (does progress survive navigation?), and visual complexity in the TOC (active state is already three signals: border, weight, opacity -- adding a "visited" state creates a fourth).

The reading progress bar answers "how far am I?" without section granularity, which is sufficient for a knowledge site. Per-section progress tracking belongs in learning management systems with required reading, not in a personal knowledge site where readers jump in and out freely.

---

## 9. Word count per section (REJECTED)

### Proposal

Show word count for each h2 section, either in the TOC or as a small label below headings.

### Why reject

The page-level read time in the context line already gives the reader a time budget. Section-level word counts would clutter the TOC (which is already dense with heading text, indentation, and active-state styling) and add sub-heading labels that interrupt the reading flow.

Word count is a weak signal for sections. A 200-word section might be denser and more important than a 600-word one. Length does not predict value at the section level the way it does at the page level (where read time helps the reader decide whether to commit).

---

## 10. Section-level edit dates (REJECTED)

### Proposal

Track and display the last edit date for each section within a page, not just the page as a whole.

### Why reject

This requires either (a) git-level tracking of line-range changes mapped to heading boundaries, which is fragile and expensive at build time, or (b) manual per-section date maintenance in the MDX content, which is an unsustainable authoring burden.

The page-level `modified` date is the right granularity. If a section is stale, the entire page should be reviewed -- partial staleness within a page suggests the page should be split, not annotated with per-section dates.

---

## 11. Section maturity gradient (REJECTED)

### Proposal

Allow different maturity levels within a single page -- some sections marked "draft" while others are "stable."

### Why reject

Maturity is a page-level concept because readers trust the page as a unit. If section 3 is a draft but sections 1, 2, and 4 are stable, the reader's trust in the page as a whole drops to "draft." The weakest section determines perceived quality.

The correct response to uneven section maturity is to split the draft material into its own page (linked via `ref` or `next`) and let it mature independently. The relations system already supports this pattern. Per-section maturity would add UI complexity, authoring burden, and a false sense of granularity that undermines the page-level trust contract.

---

## Revised context line format

Incorporating proposals 1, 2, and 5, the context line becomes:

```
{maturity} · {read_time} · created {date} · updated {date} [{relative}] · {backlinks} · graph
```

Example with all segments:

```
stable · 4 min · created 2025-06-12 · updated 2025-08-15 (7mo ago) · 3 backlinks · graph
```

Example for a fresh page with no backlinks:

```
in-progress · 8 min · created 2026-03-01
```

(No updated segment because created == modified. No relative time because < 30 days. No backlinks because count is 0. No graph link -- actually, the graph link should always be present since every page is a node in the graph.)

Revised: the graph link appears on every page. The backlinks count appears only when > 0. The relative time appears only when > 6 months.

```
in-progress · 8 min · created 2026-03-01 · graph
```

### Segment ordering rationale

Left to right, from most decision-relevant to most supplementary:
1. **Maturity** -- trust signal, sets reader expectations
2. **Read time** -- commitment signal
3. **Created** -- factual origin
4. **Updated + relative** -- freshness signal
5. **Backlinks** -- prominence signal
6. **Graph** -- exploration affordance (furthest right because it is a navigation escape, not a reading aid)

---

## Assertions

| ID | Sev. | Assertion |
| --- | --- | --- |
| graph-focus-link | MUST | The metadata strip context line includes a "graph" link pointing to `/graph?focus={slug}` |
| graph-focus-behavior | MUST | The graph page centers on and highlights the node specified by `?focus=slug` on load |
| backlink-count-strip | MUST | The context line shows `N backlinks` (linked to `#backlinks-heading`) when backlink count > 0 |
| backlink-count-hidden | MUST | The backlink count segment is omitted when count is 0 |
| link-type-underline | MUST | Internal, external, and Wikipedia links have distinct underline styles (solid, dashed, dotted respectively) |
| link-type-no-color | MUST | Link type differentiation uses underline style only, not text color |
| freshness-relative | SHOULD | Pages not updated in > 6 months show a relative time indicator in the context line |
| freshness-amber | SHOULD | Pages not updated in > 2 years use `--color-status-draft` (amber) for the relative time text |
| no-section-depth-color | MUST NOT | Section depth is not indicated via colored left borders or margin strips |
| context-line-order | SHOULD | Context line segments appear in order: maturity, read time, created, updated, backlinks, graph |

## Key files

- `src/components/Metadata.astro` -- context line rendering, graph link, backlink count display
- `src/styles/prose.css` -- link type underline differentiation selectors
- `src/scripts/graph/renderer.ts` -- `?focus=slug` query parameter handling, node centering
- `src/lib/relations.ts` -- backlink count derivation from `refi.length`
