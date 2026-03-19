---
scope: L2
summary: "Enriched TOC design: which information layers to add beyond section headings, and how to render them in 180px"
modified: 2026-03-19
reviewed: 2026-03-19
depends:
  - path: docs/L2-reading-experience
    section: "Table of Contents"
  - path: docs/L1-design-vision
    section: "Layout"
  - path: docs/L1-styles
    section: "Colors"
dependents: []
---

# TOC Design

The current TOC is a flat list of h2/h3 headings with scroll-spy active state. This spec evaluates seven enrichment ideas, accepts three, defers one, and rejects three -- then specifies the accepted treatments in full detail.

The guiding principle: **the TOC should help you decide what to read, not just show you what exists.** Every addition must pass the 180px-width scannability test: if you have to squint or parse complex visuals, it fails.

---

## Idea evaluation

### 1. Section read time -- ACCEPT

**Verdict: Accept, high value, low complexity.**

Read time is the single highest-value enrichment for a TOC. It answers the question every reader has when scanning a long article: "how long is this section?" It lets readers budget their attention, skip heavy sections they do not need, and set expectations before scrolling in.

The information is cheap to compute (word count at build time, divided by 238 wpm), tiny to display (a few characters), and universally understood. It reinforces the site's "practical density" principle from L1-design-vision -- information that serves comprehension, not decoration.

### 2. Section read state -- ACCEPT

**Verdict: Accept, medium value, medium complexity.**

Tracking which sections the reader has scrolled through and marking them as "visited" creates a sense of progress and helps readers resume interrupted reading. On a long article, returning after a break and seeing "I already read through section 4" is genuinely useful.

This is client-side only (no persistence across sessions). The implementation piggybacks on the existing IntersectionObserver: when a heading stops being active (the reader scrolled past its section), mark it as read. This is cheap because the scroll-spy already tracks transitions.

The key constraint: the read state must not fight the active state. The active heading is the loudest signal; read headings are quieter than unread ones, not louder.

### 3. Section-level prerequisites -- REJECT

**Verdict: Reject. Wrong abstraction level.**

Prerequisite chains belong to page-level relations (which already exist in frontmatter as `next`/`prev` and `up`/`down`). Sections within a single article are written to be read in order; if a section truly requires prerequisite knowledge from another page, that is a link in the prose, not a TOC annotation.

Adding prerequisite icons to the TOC would imply the article is non-linear, which contradicts how long-form prose works. The complexity of surfacing cross-page relation data inside a per-section TOC is high for near-zero navigational value.

### 4. Nested depth visualization -- ACCEPT

**Verdict: Accept, medium value, low complexity.**

The current indentation-only treatment for h3 entries is functional but visually weak. On a TOC with many entries, the 1rem indent is easy to lose. A vertical connector line from parent h2 to its child h3 entries creates a clear visual grouping that is immediately parseable.

This is a pure CSS treatment with no runtime cost. It reinforces the structural relationship between heading levels without adding any new information -- just making existing information clearer.

### 5. Section type indicators -- DEFER

**Verdict: Defer. Interesting but requires content infrastructure that does not exist yet.**

Marking sections as "code-heavy" or "theory-heavy" or "interactive" is appealing, but there is no mechanism to detect or declare section types today. Building automatic detection (counting code blocks, detecting embedded components) is non-trivial and fragile. Manual annotation via MDX frontmatter per section is too much author burden.

Revisit if the site gains a section-level metadata system. For now, the read time implicitly signals section weight, and the prose itself signals content type through its typography (code blocks are visually distinct from prose).

### 6. Collapsed sections indicator -- REJECT

**Verdict: Reject. Edge case, not a pattern.**

`<details>` blocks are infrequent and not predictable enough to warrant a TOC signal. The TOC should reflect the article's navigational skeleton (headings), not its inline progressive disclosure. If a section happens to contain a collapsible block, the reader discovers that in context. A TOC icon for "this section has something expandable" is too vague to be actionable.

### 7. TOC as minimap -- REJECT

**Verdict: Reject. Incompatible with the 180px constraint and the scrapbook aesthetic.**

A proportional minimap requires either graphical rendering (a scaled-down page visualization) or proportional bar heights. In 180px width, a minimap becomes an unreadable smear. It also conflicts with the text-based, typographic character of the site -- the TOC should feel like an index, not a visualization.

The header already has a reading progress indicator (L1-design-vision) that serves the "where am I in the whole article" question. The TOC serves a different question: "what sections exist and which one am I in." These are complementary, not overlapping.

---

## Accepted features ranked by value/complexity

| Rank | Feature | Value | Complexity | Rationale |
| ---- | ------- | ----- | ---------- | --------- |
| 1 | Section read time | High | Low | Build-time computation, 2-3 characters per entry, universally understood |
| 2 | Nested depth lines | Medium | Low | Pure CSS, no runtime cost, immediate visual clarity gain |
| 3 | Section read state | Medium | Medium | Piggybacks on existing observer, but needs careful visual interaction with active state |

---

## Detailed design: Section read time

### Data source

Computed at build time by the TOC extraction logic. For each heading, count words in the section (from this heading to the next heading of equal or higher level). Divide by 238 words per minute (average adult reading speed for technical content, slightly below the commonly cited 250 to account for code blocks and density). Round to nearest minute, minimum "< 1".

### Display format

The read time appears on the same line as the heading text, right-aligned, in a lighter color. Format: `2m`, `< 1m`, `12m`. No "min" or "minutes" -- the `m` suffix is universally understood and saves horizontal space.

For sections under 1 minute: display `< 1m`. For sections of 1 minute or more: display the rounded number followed by `m`. No leading zero, no decimals.

### Typography

- Font: `var(--font-mono)` (Commit Mono), consistent with the TOC's monospace treatment
- Size: `var(--text-2xs)` (0.75rem / 12px) -- one step smaller than the heading text
- Color: `var(--color-text-subtle)` (`#8A857C` light / `#7A756C` dark) -- the quietest text tier
- Weight: `400` (regular) -- never bold, even when the heading is active
- The read time does not change opacity or weight when the heading becomes active. It remains a static, quiet annotation.

### Layout

Each TOC entry becomes a flex row:

```
[heading text]                    [read time]
```

- Container: `display: flex; justify-content: space-between; align-items: baseline; gap: 0.5rem;`
- Heading text: `flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;`
- Read time: `flex-shrink: 0;`

The heading text truncates with ellipsis if it cannot fit alongside the read time. This is acceptable because the TOC is a navigation aid, not a replica of the full heading. A truncated heading plus a read time is more useful than a full heading alone.

### Interaction with active state

When a TOC entry becomes active (scroll-spy), the heading text receives the full active treatment (left border, semi-bold, full opacity). The read time remains unchanged -- same color, same weight, same opacity. This contrast makes the active heading's text pop while the read time stays a quiet background signal.

---

## Detailed design: Nested depth lines

### Visual treatment

A thin vertical line connects the left edge of h3 entries to their parent h2, creating a clear visual tree. The line replaces the current indentation-only treatment with a stronger structural cue.

### Geometry

- The line is a `::before` pseudo-element on h3 entries, or more precisely, a continuous border on a grouping element.
- Implementation approach: each h2 and its subsequent h3 children are wrapped in a group. The group's left edge has a `1px solid var(--color-border-subtle)` line that runs from the first h3 to the last h3 in that group.
- h3 entries are indented `1rem` from the left, as currently specified.
- The vertical line is positioned at `0.375rem` from the left edge of the TOC entry area (centered in the indent zone between the h2's flush-left text and the h3's indented text).

### Line styling

- Width: `1px`
- Color: `var(--color-border-subtle)` (`#D5D0C7` light / `#33302D` dark)
- The line is continuous, not dashed. Dashed lines at 1px width become visually noisy.
- The line does not touch the h2 entry itself -- it starts at the top of the first h3 and ends at the bottom of the last h3 in the group.

### Interaction with active state

When an h3 entry is active, the left border of the active entry (the 2px accent-colored line from scroll-spy) replaces the connector line for that entry's vertical extent. The connector line continues above and below the active entry if there are sibling h3 entries.

When the parent h2 is active, the connector line for its children remains visible but at its normal subtle color. The h2's own active border is separate from the connector system.

### Alternative considered

Font size variation per depth (h2 at one size, h3 smaller) was considered and rejected. The TOC already uses `var(--text-xs)` (0.8rem), and reducing h3 entries further would push them below readable size. The connector line achieves the same structural clarity without sacrificing legibility.

---

## Detailed design: Section read state

### State model

Each TOC entry has three mutually exclusive visual states:

| State | Meaning | How entered |
| ----- | ------- | ----------- |
| **Unread** | Reader has not scrolled through this section | Initial state for all entries |
| **Active** | Reader is currently in this section | Scroll-spy detection (existing) |
| **Read** | Reader has scrolled past this section | When entry transitions from active to inactive (downward scroll) |

The "read" state is only set by forward scrolling. If the reader scrolls backward past a section, that section reverts to active and then to unread when scrolled past again. This prevents the entire TOC from becoming "read" after a quick scroll-to-bottom.

Wait -- that revert behavior is wrong. If someone scrolled through a section, they read it regardless of whether they later scroll up. The simpler model: once a section has been active for at least 2 seconds cumulative, it is marked as read when it loses active status. The 2-second threshold prevents drive-by scrolling from marking sections as read. This state is sticky -- once read, always read (within the session).

### Visual treatment

| State | Opacity | Weight | Left border | Read time color |
| ----- | ------- | ------ | ----------- | --------------- |
| Unread | `0.5` | `400` | `2px transparent` | `var(--color-text-subtle)` |
| Active | `1.0` | `600` | `2px var(--color-accent)` | `var(--color-text-subtle)` |
| Read | `0.35` | `400` | `2px transparent` | `var(--color-text-subtle)` at `0.35` opacity |

The read state is dimmer than unread. This is intentional: read sections fade into the background, making unread sections stand out as "what is left to read." The effect is subtle -- `0.35` vs `0.5` opacity -- but creates a noticeable gradient from "done" to "upcoming" to "current."

### Data attribute

```html
<a class="toc-entry" data-state="unread" data-depth="2" href="#section-id">
  <span class="toc-text">Section Title</span>
  <span class="toc-time">3m</span>
</a>
```

`data-state` takes values `unread`, `active`, or `read`. CSS targets these:

```css
.toc-entry[data-state="unread"] { opacity: 0.5; }
.toc-entry[data-state="active"] { opacity: 1; font-weight: 600; border-left-color: var(--color-accent); }
.toc-entry[data-state="read"]   { opacity: 0.35; }
```

### Timer implementation

The scroll-spy observer already identifies the active heading. The read-state logic wraps this:

1. When a heading becomes active, start a timer (2000ms).
2. If the heading is still active when the timer fires, set `readSections.add(headingId)`.
3. When a heading loses active status, if it is in `readSections`, set `data-state="read"`. Otherwise, set `data-state="unread"`.

The `readSections` set persists for the page session (in-memory, not localStorage). Navigating away clears it. This is intentional -- read state is a within-session reading aid, not a persistent tracking system.

### Transition

State changes use `transition: opacity 150ms ease`. The transition from active (full opacity) to read (low opacity) creates a gentle fade that feels like the section is "settling" into the background.

---

## Entry anatomy (combined)

With all three features applied, a single TOC entry looks like:

```
 | Background           3m
 |   Gwern influence    < 1m
 |   Prior art          2m
   Implementation       5m
   Results              4m      <-- active: bold, full opacity, accent border
   Discussion           7m
   Conclusion           1m      <-- read: dimmed
```

- "Background" is an h2 with three h3 children connected by a vertical line.
- "Implementation" through "Conclusion" are h2 entries at flush left.
- "Results" is the active entry (semi-bold, full opacity, accent left border).
- "Conclusion" has been read (dimmer than the unread entries above "Results").
- Read times are right-aligned in subtle monospace.

---

## Assertions

| ID | Sev. | Assertion |
| -- | ---- | --------- |
| toc-readtime-present | MUST | Every TOC entry displays a read time annotation |
| toc-readtime-format | MUST | Read times use the format `Nm` or `< 1m`, never "minutes" or decimals |
| toc-readtime-stable | MUST | Read time does not change opacity or weight when the entry becomes active |
| toc-readtime-truncate | SHOULD | Heading text truncates with ellipsis before the read time is hidden |
| toc-depth-line | MUST | h3 entries under a shared h2 parent are connected by a vertical line |
| toc-depth-line-color | MUST | The connector line uses `var(--color-border-subtle)` |
| toc-depth-line-active | SHOULD | The active entry's accent border visually replaces the connector for that entry's extent |
| toc-readstate-three | MUST | Each TOC entry is in exactly one of three states: unread, active, or read |
| toc-readstate-threshold | MUST | A section is only marked read after being active for at least 2 cumulative seconds |
| toc-readstate-dim | MUST | Read entries have lower opacity (0.35) than unread entries (0.5) |
| toc-readstate-sticky | MUST | Once marked read, an entry stays read for the page session |
| toc-readstate-no-persist | MUST | Read state is not persisted to localStorage or any storage; it resets on navigation |
| toc-width-fit | MUST | All TOC content fits within the ~200px left margin without horizontal overflow |

## Key files

- `src/components/TOC.astro` -- TOC markup, read time rendering, data attributes
- `src/scripts/toc-scrollspy.ts` -- scroll-spy observer, read state timer logic
- `src/styles/components.css` -- TOC entry styles, connector lines, state-based opacity
