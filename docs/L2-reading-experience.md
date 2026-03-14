---
scope: L2
summary: "Reading experience mechanics: TOC scroll-spy, sidenote alignment, link previews, and their interplay in the three-column layout"
modified: 2026-03-19
reviewed: 2026-03-19
depends:
  - path: docs/L1-design-vision
dependents:
  - path: docs/L3-footnotes-layout
---

# Reading Experience

This spec defines the three interactive reading systems -- table of contents, sidenotes, and link previews -- and how they coexist within the three-column layout described in L1-design-vision.

## Layout context

The page uses a three-zone structure:

| Zone | Width | Contents |
| ---- | ----- | -------- |
| Left margin | ~200px, fixed | TOC navigation |
| Center column | max 65-70ch | Prose, headings, inline elements |
| Right margin | ~250px | Sidenotes, link preview popups |

The left and right margins collapse below the `1024px` breakpoint. Everything described below assumes wide viewport unless the mobile fallback section says otherwise.

---

## Table of Contents

The TOC lives in the left margin as a sticky `<nav>`. It lists `h2` and `h3` headings extracted at build time.

### Sticky behavior

The TOC is `position: sticky` with `top: var(--header-height, 3rem)`. It stays pinned below the header and scrolls with the page. If the TOC is taller than the viewport minus the header, the TOC itself becomes internally scrollable (`overflow-y: auto; max-height: calc(100vh - var(--header-height) - 2rem)`). The scrollbar is hidden by default and appears only when the TOC is hovered or focused within.

### Nesting depth

- `h2` entries are flush left within the TOC container.
- `h3` entries are indented `1rem` from the left edge, using `padding-left` keyed off the `data-depth` attribute.
- Only `h2` and `h3` are shown. Deeper headings are excluded -- they add noise without aiding navigation.

### Active state (scroll spy)

A single heading is marked active at any time -- the heading whose section the reader is currently inside.

**Detection algorithm.** An `IntersectionObserver` watches all heading elements within `.prose`. The active heading is the last heading whose top edge has crossed above the viewport's upper quarter (`rootMargin: '-25% 0px -75% 0px'`). This means a heading becomes active once the reader has scrolled roughly a quarter of the viewport past it, which aligns with natural reading position.

When no heading has been crossed (the reader is above the first section), no TOC entry is active. When the reader is below the last heading, that heading stays active.

**Visual treatment.** The active TOC entry receives three simultaneous signals:

1. **Left border.** A 2px solid line in the page's accent color (`var(--color-accent)`) appears on the left edge of the entry, using `border-left`. Inactive entries have a 2px transparent border to prevent layout shift.
2. **Text weight shift.** The active entry uses `font-weight: 600` (semi-bold). Inactive entries use `font-weight: 400`. To prevent layout shift from weight changes, the TOC uses a monospace font (consistent with L1-design-vision's rule that navigation chrome uses monospace) where glyph widths are uniform across weights.
3. **Opacity.** The active entry is `opacity: 1`. Inactive entries are `opacity: 0.5`. This creates a dimming effect that draws the eye to the active section without hiding the surrounding structure.

The transition between states uses `transition: opacity 150ms ease, border-color 150ms ease, font-weight 0ms`. Font weight changes are instant (no transition) to avoid rendering artifacts.

**Click behavior.** Clicking a TOC entry scrolls the corresponding heading into view with `scroll-behavior: smooth` and `scroll-margin-top` equal to the header height plus `1rem` of breathing room.

### Mobile fallback

Below `1024px`, the TOC is hidden entirely. The header's reading progress indicator (described in L1-design-vision) serves as the only scroll position feedback on narrow viewports. The TOC is not placed in a hamburger menu or collapsible drawer -- it adds too little value on small screens to justify the interaction cost.

---

## Sidenotes

Sidenotes appear in the right margin, vertically aligned with their reference marks in the prose. They are the primary annotation mechanism, replacing traditional bottom-of-page footnotes.

### Vertical sync algorithm

The goal: sidenote N appears at the same vertical position as its `<sup>` reference in the prose. When two sidenotes would overlap, the lower one is pushed down just enough to clear the upper one.

**Positioning pass** (runs in `layoutSidenotes()`):

```
let prevBottom = 0
const SIDENOTE_GAP = 8  // px between stacked sidenotes

for each sidenote in DOM order:
    ref = document.getElementById(`fnref-${sidenote.dataset.footnoteId}`)
    desiredTop = ref ? ref.offsetTop : prevBottom
    actualTop = max(desiredTop, prevBottom)
    sidenote.style.top = actualTop + "px"
    prevBottom = actualTop + sidenote.offsetHeight + SIDENOTE_GAP
```

Sidenotes use `position: absolute` within the `.prose` container (which is `position: relative`). They are offset into the right margin via `left: calc(100% + 3rem)`.

**When to run.** The positioning pass runs on:
- Initial page load (`DOMContentLoaded` and `astro:page-load`)
- Window resize (debounced at 100ms), but only when still in wide mode
- After any content expansion that changes prose height (accordion open, details toggle)

### Collision resolution

When multiple footnotes cluster in the prose (e.g., three references within the same paragraph), sidenotes stack vertically with `SIDENOTE_GAP` (8px) between them. The first sidenote lands at its reference position; subsequent ones are pushed below the previous sidenote's bottom edge.

**Visual drift indicator.** When a sidenote has been pushed more than `4rem` below its reference mark, a thin connecting line is drawn between the reference and the sidenote. This is implemented as a `::before` pseudo-element on the sidenote: a 1px line in `var(--color-border)` extending from the sidenote's top edge upward toward the reference. The line uses `position: absolute; width: 1px; background: var(--color-border)`. Its height is calculated as `actualTop - desiredTop` and set via a CSS custom property (`--drift-px`) applied by the layout engine. The line only renders when `--drift-px` exceeds `64` (4rem at 16px base).

This addresses the known edge case from L3-footnotes-layout: "a page with many tightly-packed footnotes will have visible vertical drift between references and their sidenotes."

**Prose padding compensation.** If the last sidenote's bottom edge exceeds the prose container's scroll height, the engine adds `paddingBottom` to `.prose` so the container grows to accommodate the overflow. When it does not overflow, any previously added padding is cleared.

### Sidenote appearance

Each sidenote is styled as follows:

- **Width.** Fixed at `var(--sidenote-width, 220px)`. The right margin zone accommodates this plus `3rem` of gutter from the prose edge.
- **Typography.** Serif body font at `0.8rem` (smaller than body text), with `line-height: 1.4`. This creates a clear hierarchy: sidenotes are subordinate to the main prose.
- **Number label.** The sidenote's number (rendered via CSS counter `sidenote-counter`) appears as the first inline element, in semi-bold weight, matching the superscript reference in the prose.
- **Background.** None. Sidenotes sit directly on the page background with no card, border, or shadow. They are part of the page surface, not floating above it. This follows L1-design-vision's principle of "texture over color" -- the typographic scale difference is sufficient to distinguish sidenotes from prose.
- **Highlight on click.** When the reader clicks a footnote reference number, the corresponding sidenote receives a `sidenote-highlight` class that applies `background-color: var(--color-highlight)` with a `1.5s` fade-out transition. This provides a brief flash to draw the eye.

### Mobile fallback (narrow viewports)

Below `1024px`, sidenotes are hidden via `display: none`. Their content is cloned into an ordered list in the `#footnotes` section at the bottom of the page. Each list item receives the sidenote's content and a back-link to the reference.

The footnotes section header reads "Footnotes" and uses the same `aside-panel` styling as other bottom-of-page sections. It only appears when footnotes exist (`data-empty` toggled by JS).

In narrow mode, clicking a footnote reference number performs standard anchor navigation to `#fn-{id}` in the footer list.

---

## Link previews

Internal links show a hover preview popup revealing the linked page's title, excerpt, and relation type. This supports L1-design-vision's goal of progressive disclosure -- the reader can peek at linked content without navigating away.

### Trigger behavior

- **Trigger.** `mouseenter` on any internal link (`a[href^="/"]` within `.prose`). The preview appears after a `300ms` delay. If the cursor leaves the link before the delay elapses, no preview appears. This prevents flicker during casual mouse movement.
- **Dismissal.** The preview disappears on `mouseleave` from both the link and the preview popup itself, with a `200ms` grace period. The reader can move the cursor from the link into the preview without it closing. Pressing `Escape` also dismisses the preview immediately.
- **Touch devices.** No hover previews on touch. Internal links behave as standard navigation. Previews are a desktop enhancement, not a required feature.
- **Keyboard.** `focus` on an internal link triggers the preview after the same `300ms` delay. `blur` dismisses it.

### Content

The preview popup contains, in order:

1. **Page title.** Serif, semi-bold, at `0.9rem`. Truncated to two lines with `text-overflow: ellipsis` if longer.
2. **Relation type badge** (if the linked page has a typed relation to the current page). Displayed as a monospace label in small caps at `0.7rem`: e.g., `UP`, `CHILD`, `REF`. This tells the reader the structural relationship, not just the destination. The badge appears inline after the title, separated by a `0.5rem` gap.
3. **Excerpt.** The first 120 characters of the linked page's description (from frontmatter), rendered as body text at `0.8rem`, `opacity: 0.7`. If no description exists, this line is omitted.
4. **Maturity indicator.** A small label showing the page's maturity level (Draft, In-progress, Stable, Evergreen) at `0.7rem` in monospace. This helps the reader gauge whether the linked content is polished or rough before clicking.

### Appearance

- **Container.** A rectangular popup with `1px solid var(--color-border)`, `border-radius: 2px`, and a subtle `box-shadow: 0 2px 8px rgba(0,0,0,0.08)` (light theme) or `box-shadow: 0 2px 8px rgba(0,0,0,0.3)` (dark theme). Background is the page surface color (`var(--color-surface)`).
- **Padding.** `0.75rem 1rem`.
- **Max width.** `320px`. Content wraps naturally within.
- **No arrow or caret.** The popup is a clean rectangle. Arrows add visual noise and complicate positioning logic for minimal benefit.

### Positioning

The preview is placed using the following algorithm:

1. **Default position.** Below the link, horizontally centered on the link's midpoint.
2. **Viewport collision.** If the popup would extend below the viewport bottom, flip it above the link. If it would extend past the right viewport edge, shift it left until it fits with `8px` of margin. Same logic for the left edge.
3. **Right margin awareness.** On wide viewports, if the link is in the main prose column and the right margin has space (no sidenote at the same vertical position), the preview may be placed in the right margin instead, aligned to the link's vertical position. This reuses the margin space naturally and avoids obscuring prose content. The popup checks whether any `.sidenote` element overlaps its intended vertical range before choosing this placement.
4. **Gap.** `4px` between the link and the popup edge.

The popup is appended to `#popup-container` (a fixed-position container at the root of the page layout) to avoid clipping by overflow-hidden ancestors.

### Animation

The preview fades in with `opacity: 0 -> 1` and shifts vertically by `4px` over `100ms` (`ease-out`). Dismissal is instant (no fade-out) to avoid stale previews lingering during fast navigation.

---

## Three-column interaction rules

The three systems -- TOC, sidenotes, and link previews -- share the page's horizontal space. These rules prevent conflicts:

### Spatial allocation

| Zone | Primary occupant | Secondary occupant |
| ---- | ---------------- | ------------------ |
| Left margin | TOC | None |
| Center column | Prose | Link preview popups (when margin is occupied) |
| Right margin | Sidenotes | Link preview popups (when no sidenote conflict) |

The left margin is exclusively for the TOC. Nothing else is placed there.

The right margin is primarily for sidenotes. Link previews may use the right margin only when no sidenote occupies the same vertical band (within a tolerance of `2rem` above and below the popup's intended bounds).

### Z-index layering

| Element | z-index |
| ------- | ------- |
| Prose content | auto (0) |
| Sidenotes | 1 |
| Link preview popup | 10 |
| TOC | 1 |
| Header | 100 |

Link previews always render above sidenotes. If a preview appears in the right margin at the same position as a sidenote (which the positioning algorithm tries to avoid), the preview wins visually.

### Scroll coordination

- Scrolling the page updates the TOC active state via the intersection observer.
- Scrolling does NOT reposition sidenotes. Sidenotes are absolutely positioned within `.prose` and scroll with it naturally.
- Scrolling dismisses any open link preview. The scroll listener calls the dismissal function with no grace period.

### Performance constraints

- The TOC intersection observer is passive and does not cause layout thrashing.
- Sidenote positioning reads `offsetTop` and `offsetHeight`, which trigger layout. This runs once on load and on debounced resize only -- never during scroll.
- Link preview popup positioning reads `getBoundingClientRect()` once when the popup is triggered. No continuous measurement.
- All transitions are CSS-only (opacity, transform, background-color). No JS animation loops.

---

## Assertions

| ID | Sev. | Assertion |
| -- | ---- | --------- |
| toc-sticky | MUST | TOC remains visible during scroll on viewports wider than 1024px |
| toc-active-single | MUST | Exactly zero or one TOC entry is marked active at any time |
| toc-active-visual | MUST | Active TOC entry has left border, semi-bold weight, and full opacity |
| toc-no-shift | SHOULD | TOC active state change causes no layout shift in the TOC itself |
| toc-hidden-narrow | MUST | TOC is hidden below 1024px |
| sidenote-sync | MUST | Each sidenote's top position equals its reference's offsetTop or the bottom of the previous sidenote, whichever is greater |
| sidenote-gap | MUST | Stacked sidenotes have at least 8px gap between them |
| sidenote-no-overlap | MUST | No two sidenotes overlap vertically |
| sidenote-drift-line | SHOULD | Sidenotes pushed more than 4rem from their reference show a connecting line |
| sidenote-narrow-clone | MUST | Below 1024px, sidenote content appears in the footer footnotes list |
| preview-delay | MUST | Link preview appears only after 300ms hover, not before |
| preview-grace | MUST | Moving cursor from link to preview within 200ms keeps preview open |
| preview-no-clip | MUST | Link preview popup never extends outside the viewport |
| preview-dismiss-scroll | MUST | Scrolling dismisses any open link preview |
| preview-no-touch | MUST | Link previews do not trigger on touch devices |
| preview-relation | SHOULD | Preview shows the relation type when a typed relation exists |
| layout-z-order | MUST | Link preview renders above sidenotes when they overlap |
| layout-no-scroll-jank | SHOULD | Scroll handler performs no layout reads or writes |

## Key files

- `src/scripts/toc-scrollspy.ts` -- TOC active state via IntersectionObserver
- `src/scripts/footnotes.ts` -- sidenote positioning engine, mode switching
- `src/scripts/popups.ts` -- link preview trigger, positioning, dismissal
- `src/components/TOC.astro` -- TOC markup and structure
- `src/components/Footnote.astro` -- per-footnote HTML pair (sup + sidenote span)
- `src/components/Footnotes.astro` -- narrow-mode footer container
- `src/layouts/page/Page.astro` -- three-column grid assembly, `#popup-container`
- `src/styles/components.css` -- sidenote CSS, TOC styling, popup styling
