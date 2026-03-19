---
scope: L2
summary: "Header component design: dual-role bar combining ambient reading status with site navigation"
modified: 2026-03-20
reviewed: 2026-03-20
depends:
  - path: docs/L1-design-vision
    section: "Header: ambient status bar"
  - path: docs/L0-ui
    section: "Components"
dependents:
  - path: docs/L2-components
---

# Header and Navigation

The header serves two roles: ambient reading progress and site navigation. This spec defines how both coexist in a single 44px bar without either role dominating the other. Reading context metadata (maturity, read time, dates) lives in the metadata strip below the page title, not in the header.

## Design decision: the mode-shifting bar

The header adapts its content based on page type. It does not change shape, height, or position -- only what fills its three internal zones.

**Why not a separate nav?** Adding a second bar or a sidebar nav would break the content-first density principle. A single bar that shifts emphasis keeps the interface lean. Power users get keyboard shortcuts and a command palette; casual readers get visible links. Nobody gets a wall of chrome.

**Why not a hamburger-only approach?** Hiding all navigation behind a menu icon on every page type forces an extra click for the most common navigation task (going to the index or switching sections). On listing pages where there is no reading context to display, the bar has unused space -- wasting it is worse than filling it with useful links.

## Page type classification

Two modes, determined by the page template:

| Mode | Applies to | Primary role | Secondary role |
| ---- | ---------- | ------------ | -------------- |
| **Article mode** | Any page with a content body (articles, project pages, notes) | Reading progress | Navigation |
| **Listing mode** | Index, listing pages, graph view, search results | Navigation | Site identity |

The mode is set at build time by the page layout, not computed client-side.

## Bar structure: three zones

The bar is always a flex row, `height: 44px`, sticky at top, full width. It contains three zones with fixed roles:

```
[  LEFT ZONE  |  CENTER ZONE  |  RIGHT ZONE  ]
```

All zones vertically center their content. The left and right zones have fixed minimum widths; the center zone is fluid.

### Zone widths

- **Left zone**: `min-width: 200px`, left-aligned content
- **Center zone**: `flex: 1`, centered content, overflow hidden with fade mask
- **Right zone**: `min-width: 160px`, right-aligned content

On viewports narrower than `768px`, the center zone collapses entirely. The left and right zones absorb the full width.

## Article mode layout

### Left zone: identity + nav links

Contains, in order:

1. **Site mark** -- the text "theor.net" in monospace, acting as a home link. No logo, no icon. The site mark is the only persistent brand element. Clicking it navigates to the index.
2. **Section separator** -- a thin vertical line or `/` character, monospace, dim.
3. **Nav links** -- inline text links: `index`, `projects`, `blog`, `about`. Monospace, `--text-xs` size, separated by a middot or small gap. The link matching the current section gets a subtle underline or slightly brighter text.

The nav links are deliberately small and quiet. They are present and scannable but do not compete with the reading progress bar. They read almost like a breadcrumb path rather than a primary navigation bar.

**Rationale**: Putting nav links in the left zone alongside identity grounds them as structural wayfinding, not a call to action. They occupy space that would otherwise hold only the site name, so there is no added visual cost.

### Center zone: empty

The center zone is empty on article pages, matching the listing mode layout. Reading context metadata (maturity, read time, dates, freshness) lives in the metadata strip below the page title, not in the header. This keeps the header calm and uniform across page types.

A **reading progress bar** runs along the bottom edge of the entire header as a 2px line, filling left-to-right as the user scrolls. It uses a muted accent color. This is the only ambient reading indicator in the header and the only element that spans the full bar width, cutting across all three zones.

### Right zone: actions

Contains, right-aligned:

1. **Search trigger** -- a small magnifying glass icon or the text `search` in monospace. Opens the Pagefind search overlay on click. Also responds to `Cmd+K` / `Ctrl+K`.
2. **Theme toggle** -- a sun/moon icon or the text `light`/`dark` in monospace. Toggles between light and dark themes.

These are utility actions, not navigation. They sit in the right zone to maintain the left-to-right flow: identity -> context -> actions.

## Listing mode layout

On listing/index pages, the left zone is identical to article mode — nav links stay in the same position so the reader's eye always knows where to look. The center zone is empty (no reading context to display).

### Left zone: identity + nav links (same as article mode)

Identical to article mode. Nav links do NOT move or change size between page types. Spatial consistency is more important than filling empty center space.

### Center zone: empty

No content. The empty space is intentional — it signals "this is not an article" and keeps the header calm.

### Right zone: actions (same)

Identical to article mode -- search trigger and theme toggle.

### Why nav links don't move

The eye should always know where to look. Moving nav links between zones depending on page type creates cognitive overhead — the user has to re-scan the header on every page transition. A fixed layout is faster to use even if it leaves the center zone empty on listing pages.

## Navigation destinations

Four links, always in this order:

| Label | Destination | Scope |
| ----- | ----------- | ----- |
| `index` | `/` | Full page listing, the main table-of-contents for the site |
| `projects` | `/projects` | Project listing |
| `blog` | `/blog` | Blog/article listing (if/when separated from index) |
| `about` | `/me` | About/contact page |

Labels are lowercase, monospace, matching the metadata aesthetic. If a destination does not yet exist (e.g. `/blog` is not yet a separate listing), the link can be omitted or point to a filtered view of the index.

## Mobile behavior (< 768px)

The center zone collapses. The bar becomes:

```
[  LEFT: site mark  |  RIGHT: nav trigger + search + theme  ]
```

- **Site mark** remains in the left zone as a home link.
- **Nav trigger** is added to the right zone: a small hamburger icon (three horizontal lines, monospace-weight) or the word `nav` in `--text-xs`. Tapping it opens a **dropdown panel** below the header containing:
  - The four nav links, stacked vertically, larger touch targets (44px height each).
  - On article pages: no additional metadata is shown in the dropdown. Reading context lives in the metadata strip below the title.
- **Reading progress bar** still runs along the bottom 2px of the header on article pages.

The dropdown panel slides down with a fast CSS transition (120ms). It closes on outside tap, escape key, or navigation.

**No horizontal scrolling of nav links on mobile.** The links are in a dropdown, not crammed into a tiny row.

## Keyboard navigation

- `Tab` moves through interactive elements in the header: site mark, each nav link, search trigger, theme toggle.
- `Cmd+K` / `Ctrl+K` opens search from anywhere on the page (not just when focused on the header).
- `Escape` closes any open dropdown or search overlay.
- Nav links are standard `<a>` elements, fully accessible without JavaScript.

## Visual treatment

### Typography

All header text is monospace (the metadata/chrome typeface from the design vision). No serif in the header. This reinforces the ambient-status-bar feeling -- the header is system chrome, not content.

### Color and contrast

- Background: the same surface color as the page, not a distinct band. The header is distinguished from content by its fixed position and the thin border or shadow at its bottom edge, not by a different background color.
- Text: secondary text color (`--text-2xs`-appropriate muted tone). Nav links brighten on hover.
- Active nav link: slightly brighter text + thin underline.
- Progress bar: muted accent color, 2px, no glow or gradient.

### Texture

A faint 1px bottom border separates the header from content, slightly more visible than the page grid lines. No drop shadow on desktop. On mobile, a subtle shadow (1-2px, very low opacity) can appear when the dropdown is open, to separate the panel from content below.

## Interaction states

| Element | Hover | Active/Current | Focus |
| ------- | ----- | -------------- | ----- |
| Site mark | Brighten text | n/a | Outline ring |
| Nav link | Brighten text | Underline + brighter text | Outline ring |
| Search trigger | Brighten icon/text | n/a | Outline ring |
| Theme toggle | Brighten icon/text | n/a | Outline ring |
| Mobile nav trigger | Brighten | Panel open | Outline ring |

All hover transitions: `120ms ease`. No elaborate animations.

## Assertions

| ID | Sev. | Assertion |
| -- | ---- | --------- |
| bar-height | MUST | Header bar is exactly 44px tall in both modes |
| three-zones | MUST | Header contains left, center, and right zones as flex children |
| article-center-empty | MUST | Article-mode center zone is empty; reading context lives in the metadata strip below the title |
| listing-center-empty | MUST | Listing-mode center zone is empty; nav links stay in the left zone on all page types |
| progress-bar | MUST | Article pages show a 2px reading progress bar at the header bottom edge |
| nav-always-reachable | MUST | All four nav destinations are reachable within one click/tap on every page |
| mobile-collapse | MUST | Center zone collapses below 768px; nav moves to dropdown |
| keyboard-accessible | MUST | All header interactive elements are reachable via Tab and operable via Enter |
| no-decorative-animation | SHOULD | Header contains no decorative animation; only functional transitions under 150ms |
| monospace-only | SHOULD | All header text uses the monospace typeface, not serif |
