---
scope: L3
summary: "Link styling, icons, hover previews, and chain-popup system — reference analysis of Gwern.net's implementation and adaptation plan for Astro + MDX"
modified: 2026-03-19
reviewed: 2026-03-19
depends:
  - path: docs/L2-reading-experience
    section: "Link previews"
  - path: docs/L1-styles
    section: "Colors"
  - path: docs/L3-remark-plugins
---

# Link System

This spec documents how Gwern.net implements its link styling, icons, and popup preview system, then proposes how to adapt each feature for this site's Astro + MDX stack. The goal is to replicate the most valuable behaviors at a fraction of the complexity — Gwern's system is ~500 link-icon rules across a custom Haskell build pipeline; ours needs to work within remark/rehype and client-side TypeScript.

## 1. Link underline styles

Gwern uses three visually distinct underline treatments to communicate link behavior before the reader clicks.

### How Gwern does it

All three use a Tufte CSS-inspired technique: `background-image` with a 1px-tall `linear-gradient` positioned at the baseline, combined with `text-shadow` to create the skip-ink effect (the underline "breaks" around descenders like g, p, y). This avoids `text-decoration: underline` entirely because CSS `text-decoration-skip-ink` has inconsistent browser support and inferior typographic output.

The base underline CSS:

```css
.markdownBody a {
  background-image: linear-gradient(currentColor, currentColor);
  background-size: 1px 1px;
  background-repeat: repeat-x;
  background-position: 0% calc(100% - 0.1em);
  text-decoration: none;
}

/* text-shadow creates "gaps" around descenders */
.markdownBody a, .markdownBody a * {
  text-shadow:
    0      0.05em  var(--link-underline-background-color),
    0.05em 0.05em  var(--link-underline-background-color),
   -0.05em 0.05em  var(--link-underline-background-color),
    /* ... more offsets for full coverage */
}
```

The three styles:

| Style | Visual | CSS mechanism | Meaning |
| ----- | ------ | ------------- | ------- |
| Solid | `____` | Default `background-image: linear-gradient(solid)` | Ordinary link, no popup |
| Dotted | `....` | `background-size: 2px 1px` with 50% transparent gradient | Annotated link with metadata popup |
| Left hook | `\|_` | Extra `::before` pseudo-element drawing an L-shaped corner | Live-link with content preview popup |

The dotted underline CSS modifies the gradient to alternate color and transparent:

```css
a.has-annotation {
  background-image: linear-gradient(to right,
    var(--link-underline-gradient-line-color) 50%,
    var(--link-underline-background-color) 50%);
  background-size: 2px 1px;
}
```

The left hook adds a small vertical stroke at the left edge of the link via `::before`, creating an L-shape that signals "this link has an interactive preview."

Classes that control these styles: `.has-annotation`, `.has-annotation-partial`, `.has-indicator-hook`.

### Adaptation for our stack

We already have link previews described in L2-reading-experience. The three-tier underline system maps to our content:

| Our link type | Gwern equivalent | Underline | When |
| ------------- | ---------------- | --------- | ---- |
| Internal with preview | Live-link | Dotted | Links to pages we have metadata for (all internal pages) |
| External | Ordinary | Solid | Links to external URLs |
| Broken/draft | n/a | Dashed, muted | Links to pages with maturity=draft or missing targets |

Two styles (solid and dotted) are sufficient for us. The left-hook is clever but adds implementation complexity for a third category we don't need yet.

**Implementation approach:**

1. Use the same `background-image` gradient technique for underlines. Our current CSS in `base.css` uses `text-decoration` — replace it with the Tufte method for better descender handling.
2. Add a `.link-internal` class to internal links at build time via a rehype plugin.
3. Apply the dotted variant to `.link-internal` links via CSS.
4. External links keep the solid underline (default).

The rehype plugin classifies links by checking `href` against the site's own domain and the page collection. This replaces Gwern's Haskell/Hakyll compilation step.

### Link type differentiation via underline style

Beyond the internal/external split, link type is communicated through **underline style only** -- not color, not icons (the existing external link icon in prose.css stays as a secondary signal, but the underline is the primary encoding). This preserves the design vision's rule that accent color is reserved for interactive affordances uniformly, while adding a new information channel through a visual property that is already present.

| Link type | Detection | Underline style | Rationale |
| --- | --- | --- | --- |
| Internal (same site) | `href` starts with `/` and matches a known page slug | Solid underline, `1px`, `--color-accent` | Default, most trusted -- stays within the knowledge graph |
| External (general) | `href` starts with `http` and is not Wikipedia | Dashed underline, `1px`, `--color-text-subtle` | Signals departure; the muted color reduces visual pull toward exits |
| Wikipedia | `href` contains `wikipedia.org` | Dotted underline, `1px`, `--color-text-subtle` | Reference lookup; distinct from general external because Wikipedia links are "look this up" rather than "go explore this" |
| Anchor (same page) | `href` starts with `#` | No underline, teal text only | Same-page jumps do not need the "this goes somewhere" signal |

CSS implementation uses `text-decoration-style` and `text-underline-offset`, keyed off attribute selectors:

- `.prose a[href^="/"]` -- internal (solid, default)
- `.prose a[href^="http"]` -- external (dashed)
- `.prose a[href*="wikipedia.org"]` -- Wikipedia (dotted, more specific selector wins)
- `.prose a[href^="#"]` -- anchor (no underline)

Pure CSS, no JS. Four attribute selectors in `prose.css`. The link preview system already distinguishes internal from external for hover behavior, so no new detection logic is needed.

---

## 2. Link icons

Gwern appends small icons after links to indicate the destination type: a fraktur G for internal essays, a W for Wikipedia, domain logos for known sites, file-type indicators for PDFs and images.

### How Gwern does it

The system has two halves: a compile-time classifier and a CSS renderer.

**Compile-time (Haskell, `LinkIcon.hs`):** During site build, every `<a>` element is analyzed. URL patterns are matched against ~500 rules. Matching links receive two data attributes:

- `data-link-icon`: the icon identifier (an SVG filename like `"wikipedia"` or a text string like `"TLP"`)
- `data-link-icon-type`: the rendering method (`"svg"`, `"text"`, `"text,quad,mono"`, `"text,tri,sans"`, etc.)

Optional: `data-link-icon-color` for colored hover effects.

A `<span class="link-icon-hook">` is injected inside the link as an anchor point for the CSS `::after` pseudo-element.

**CSS rendering (links.css):** The CSS reads the data attributes and renders icons:

```css
/* SVG icons */
a[data-link-icon-type*='svg'] .link-icon-hook::after {
  content: "";
  background-image: var(--link-icon-url);
  background-size: var(--link-icon-size, 0.55em);
  opacity: var(--link-icon-opacity, 0.55);
}

/* Text icons (emoji, abbreviations) */
a[data-link-icon-type*='text'] .link-icon-hook::after {
  content: var(--link-icon);
  font-size: var(--link-icon-size, 0.55em);
  font-family: var(--link-icon-font);
  opacity: var(--link-icon-opacity, 0.55);
}
```

Per-icon overrides set custom properties for size, offset, and opacity — e.g., Wikipedia icons are 0.60em at 0.65 opacity, PDF icons resize responsively. The text icon types support modifiers: `tri` compresses three letters horizontally, `quad` arranges four letters in a 2x2 grid, `sans`/`mono`/`italic` control the font face.

Icon types include: SVG logos for major domains (Wikipedia, GitHub, ArXiv, etc.), Unicode characters for abstract concepts, multi-letter abbreviations for domains without logos, and directional arrows for within-page cross-references.

**Design principle (Gwern's own words):** "If it is not obvious to us what a link-icon should be, then that means having one is wrong." Icons chosen emphasize simplicity and familiarity over comprehensive coverage.

### Adaptation for our stack

Our site has far fewer link categories than Gwern's. A minimal icon set covers our actual needs:

| Icon | Target | Rendering | Priority |
| ---- | ------ | --------- | -------- |
| `↗` | External links | Text `::after` | Phase 1 |
| Page maturity dot | Internal links (color-coded) | CSS `::before` with `var(--color-status-*)` | Phase 1 |
| `W` | Wikipedia | Text `::after` | Phase 2 |
| GitHub mark | GitHub repos | SVG `::after` | Phase 2 |
| `📄` or PDF glyph | PDF links | Text `::after` | Phase 2 |

**Implementation approach:**

Phase 1 uses a rehype plugin that runs during the Astro build. For each `<a>`:

1. Check if `href` is external (doesn't start with `/` and isn't the site domain). If so, add `data-link-icon="external"` and `data-link-icon-type="text"`.
2. Check if `href` is internal. If so, resolve the target page's maturity from the content collection and add `data-link-maturity="draft|stable|evergreen"`.
3. Inject a `<span class="link-icon-hook"></span>` inside the link for CSS targeting.

Phase 2 adds domain-specific icons via URL pattern matching in the same plugin. Keep the rule list under 20 entries — we don't need 500.

CSS renders icons identically to Gwern's approach: `::after` pseudo-element on `.link-icon-hook`, sized with CSS custom properties, at reduced opacity to avoid visual noise.

```css
/* External link arrow */
a[data-link-icon="external"] .link-icon-hook::after {
  content: "↗";
  font-size: 0.6em;
  opacity: 0.5;
  margin-left: 0.15em;
  vertical-align: super;
}
```

---

## 3. Hover previews (popups)

Gwern's popup system is the site's signature UX feature. Hovering any annotated link spawns a rich preview containing the target page's title, author, date, tags, abstract, and images.

### How Gwern does it

The system has three layers: an annotation database, a popup framework, and an extract content resolver.

**Annotation database.** At compile time (Hakyll), every link is looked up in a hashmap of `(URL, {title, author, date, DOI, tags, abstract, ...})`. Annotations come from multiple sources: hand-written, auto-extracted from ArXiv/BioRxiv/Crossref/PubMed, or scraped from Wikipedia. When a match exists, the annotation metadata is inlined into the page HTML as data on or near the link element.

For links without annotation metadata, the system falls back to fetching `SHA1(URL)` from a server folder where pre-captured screenshots of archived pages are stored.

**Popup framework (`popups.js` by Said Achmiz, MIT license).** This is the desktop popup renderer:

- DOM structure: `div.popup.popframe` > `div.popframe-scroll-view` > `div.popframe-content-view` > shadow DOM root with `div.popframe-body.shadow-body`. The shadow DOM isolates popup content styles from the page.
- Spawn trigger: `mouseenter` with a `750ms` delay. If the cursor leaves before the delay, no popup.
- Positioning algorithm: tries to place the popup to the right of the link first (`targetRect.right + breathingRoom + popupWidth <= viewportWidth`), then left, then below, then above. Breathing room is 12px horizontal, 8px vertical.
- Fade-out: 100ms delay then 250ms CSS opacity transition.
- Shadow DOM: popup content is injected into a shadow root with `all: initial` reset, preventing style conflicts between popup content and the host page.

**Popup controls (title bar):**

| Control | Behavior |
| ------- | -------- |
| Close (X) | Remove popup. Alt+click closes all popups. |
| Pin | Convert from hover-ephemeral to persistent. Pinned popups survive mouse movement. `position: fixed`. |
| Zoom (4-way arrow) | Cycle through 9 positions: four corners, four edges, full-screen. Submenu for direct selection. |
| Minimize | Collapse popup to an icon in a bar at screen bottom. |
| Drag (title bar) | Reposition popup freely. |
| Resize (edges) | Click-drag popup edges to resize. |

**Z-index management:** `updatePopupsZOrder()` assigns sequential z-indexes to all spawned popups. The focused popup always gets the highest value. Minimized popups are sorted separately.

**Content resolver (`extracts.js`).** This layer decides what content to show for a given link type. It maintains a `targetTypeDefinitions` array where each entry has a predicate function (does this link match?) and a fill function (what content to inject). Content types include: page annotations, section transclusions, code previews (syntax-highlighted), PDF page renders, YouTube embeds, footnotes/sidenotes, and locally-mirrored web pages.

Content preparation involves style injection from the host document, dynamic layout activation via `startDynamicLayoutInContainer()`, and transclude triggers for embedded content.

**Mobile behavior (`popins.js`).** On mobile/narrow viewports, Gwern uses "popins" instead of popups — full-width panels that slide in from the bottom, stacking vertically. The popin system maintains a LIFO stack; the Escape key removes the top popin. Popins don't use hover (touch targets trigger on tap). The same `extracts.js` content resolver feeds both popups and popins.

### How our existing preview system compares

L2-reading-experience already specifies a simpler popup system:
- 300ms delay (vs Gwern's 750ms)
- Content: page title, relation type badge, 120-char excerpt, maturity indicator
- Positioning: below link, then flip above, with right-margin awareness
- No shadow DOM, no title bar controls, no pinning
- Internal links only

### Adaptation plan

Keep our existing lightweight preview as Phase 1. Add Gwern-inspired enhancements incrementally:

**Phase 1 (current spec, no change):** Simple popup with title, excerpt, relation badge, maturity. Positioned below or in right margin. Dismissed on mouseleave or scroll. Already specified in L2-reading-experience.

**Phase 2 — Richer content and external previews:**
- Add page tags and date to the preview content.
- For external links to known sources (Wikipedia, GitHub), fetch and cache preview data at build time. Store as a JSON manifest (`/preview-data.json`) loaded lazily on first hover.
- Build-time data pipeline: a remark/rehype plugin or Astro integration that, during build, fetches OpenGraph/meta tags from external URLs and writes a static JSON file. Rate-limited, cached between builds.

**Phase 3 — Popup controls and pinning:**
- Add a minimal title bar: page title as a clickable link, close button, pin button.
- Pinned popups get `position: fixed` and stay on screen during scroll.
- No minimize, no zoom positions, no resize — these add significant JS complexity for marginal value on a personal site.
- Shadow DOM for style isolation if popup content includes transcluded page fragments.

**Phase 4 — aspirational (evaluate after Phase 3):**
- PDF preview via `<iframe>` with `#page=N` fragment.
- External page preview via locally cached/archived snapshots.

---

## 4. Chain previews (recursive popups)

Hovering a link inside a popup spawns another popup, creating a chain. This is Gwern's most distinctive interaction pattern.

### How Gwern does it

Popups are fully recursive. "A popup is a fully functional page, and can do anything a regular page can." Each popup contains rendered HTML with active links. Hovering those links triggers the same popup logic.

Technical details:

- Each popup maintains a `popupStack` array tracking its ancestor chain. This prevents infinite recursion (you can't re-open a popup that's already in your ancestor chain).
- Nested popups prefer side-positioning (`offToTheSide = true` when spawned from within another popup) — they tile horizontally rather than stacking vertically. This creates the characteristic left-to-right reading flow.
- When a new popup spawns, all non-pinned popups outside its ancestor stack are automatically despawned. This keeps the screen manageable — you're always looking at one "thread" of popups.
- Z-index increases with each level; `bringPopupToFront()` re-sorts on focus.
- There is no hard depth limit. The system can theoretically chain indefinitely. In practice, viewport width limits how many side-by-side popups fit.

The notification system (`GW.notificationCenter.fireEvent()`) coordinates lifecycle events across the popup tree: `popinDidInject`, `popinWillDespawn`, etc. This decouples the popup framework from the content resolver.

### Adaptation plan

Chain previews are the highest-complexity, highest-delight feature. The implementation cost is significant because every popup must contain fully functional link handling.

**Phase 1 (skip):** No chain previews. Popups contain rendered text but links inside popups navigate normally (no nested popups).

**Phase 2 (one level deep):** Links inside a popup can spawn one nested popup, positioned to the side. The nested popup's links navigate normally. This covers the 90% use case (peek at a reference's reference) without recursive complexity.

Implementation: when injecting popup content, run the same link-classification and event-binding logic on the popup's DOM subtree. Track depth with a `data-popup-depth` attribute; stop spawning at depth 2.

**Phase 3 (full recursion, aspirational):** Remove the depth limit. Add ancestor-chain tracking to prevent cycles. Add the despawn-outside-stack behavior. This requires the popup system to be fully modular — the content resolver, event binding, and positioning logic must all work identically regardless of which DOM context they run in. Shadow DOM becomes important here to prevent style conflicts between nested popup levels.

Realistically, Phase 2 (one level of nesting) covers nearly all practical reading flows. Full recursion is a fun technical challenge but low marginal value.

---

## 5. Technical implementation plan

### Build-time pipeline (rehype plugin)

A single rehype plugin (`rehype-link-classify.ts`) runs during the Astro build and handles all link classification:

```typescript
// Pseudocode for the rehype plugin
function rehypeLinkClassify(options: { siteUrl: string, pages: PageCollection }) {
  return (tree: HastTree) => {
    visit(tree, 'element', (node) => {
      if (node.tagName !== 'a') return;
      const href = node.properties.href;

      if (isInternal(href, options.siteUrl)) {
        // Add internal link class and resolve page metadata
        const page = options.pages.find(href);
        node.properties.className = [...(node.properties.className || []), 'link-internal'];
        if (page) {
          node.properties['data-link-maturity'] = page.data.maturity;
          node.properties['data-page-title'] = page.data.title;
          node.properties['data-page-description'] = page.data.description?.slice(0, 120);
        }
      } else {
        // External link
        node.properties.className = [...(node.properties.className || []), 'link-external'];
        node.properties['data-link-icon'] = classifyExternalIcon(href);
        // Inject icon hook span
        node.children.push({ type: 'element', tagName: 'span',
          properties: { className: ['link-icon-hook'] }, children: [] });
      }
    });
  };
}
```

This replaces what Gwern does in `LinkIcon.hs` — same concept, different language, far fewer rules.

### Client-side popup system

The popup TypeScript (`src/scripts/popups.ts`) needs these capabilities:

1. **Hover detection** with configurable delay (300ms).
2. **Content assembly** — read data attributes from the link, build popup DOM.
3. **Positioning** — below-link default, flip above if needed, right-margin if space available.
4. **Dismissal** — mouseleave with grace period, Escape key, scroll.
5. **Optional pinning** (Phase 3) — toggle `position: fixed`, add close button.
6. **Optional nesting** (Phase 2+) — re-bind hover handlers inside popup content.

No framework dependency. Vanilla TypeScript, compiled by Astro's build. ~200-300 lines for Phase 1, growing to ~500 for Phase 3.

### Data flow

```
Build time:
  MDX content
    → remark plugins (callout, todo)
    → rehype-link-classify (adds data attrs, icon hooks, link classes)
    → HTML output with enriched links

Optional build step:
  External URLs → OpenGraph fetch → /preview-data.json

Runtime:
  Mouse hover on link
    → read data-* attributes from link element
    → (if external + preview-data.json loaded) merge external metadata
    → build popup DOM
    → position and show
    → bind events (dismiss, pin, nested hover)
```

### CSS additions

New rules needed in `base.css` or `prose.css`:

1. Replace `text-decoration: underline` on links with Tufte gradient underlines.
2. Dotted variant for `.link-internal`.
3. `::after` rules for link icons keyed on `data-link-icon`.
4. Popup container styles (already partially specified in L2-reading-experience).

### What we skip entirely

- Gwern's annotation database with hundreds of hand-written entries and auto-extraction from academic APIs. We have frontmatter metadata and that's enough.
- The 500-rule link-icon classifier. We need ~15 rules.
- PDF page rendering in popups. Complex, niche value.
- Local archiving of external pages. Gwern mirrors pages to prevent linkrot; we accept the risk.
- The full window-management system (minimize, zoom positions, resize). Our popups are lightweight overlays, not mini-windows.
- Hyphenation and advanced typography in popups. Not worth the JS weight.

---

## Phase summary

| Phase | Features | Effort | Value |
| ----- | -------- | ------ | ----- |
| 1 | Tufte underlines, internal/external link classes, external arrow icon, basic hover preview | Medium | High — covers the core reading experience |
| 2 | Domain-specific icons (5-10 rules), richer preview content, one-level chain preview | Medium | Medium — polish and depth |
| 3 | Pin/close controls, build-time external metadata fetch, shadow DOM isolation | High | Medium — power-user features |
| 4 | Full recursive chains, PDF preview, page archiving | Very high | Low — diminishing returns for a personal site |

## Key files

- `src/lib/rehype-link-classify.ts` — build-time link classification plugin (to be created)
- `src/scripts/popups.ts` — client-side popup system (exists per L2-reading-experience, to be extended)
- `src/styles/base.css` — link underline styles
- `src/styles/prose.css` — link icon CSS rules
- `astro.config.ts` — rehype plugin registration
