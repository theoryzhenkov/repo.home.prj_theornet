---
scope: root
summary: "Entry point for the home.theor.net project"
modified: 2026-03-15
reviewed: 2026-03-15
dependents:
  - path: docs/L0-content
  - path: docs/L0-infrastructure
  - path: docs/L0-ui
---

# home.theor.net

Theo Ryzhenkov's personal website. Static site built with Astro 5, served from Hetzner via Docker + nginx.

Pages are MDX files interconnected through a relation system (`up/down`, `is/has`, `next/prev` for explicit relations; `ref/refi` for auto-extracted links). The site uses Pagefind for search and D3 for a graph visualization of page relations.

## Navigation

| Spec | Scope | What it covers |
| ---- | ----- | -------------- |
| [docs/L0-content](docs/L0-content.md) | L0 | Content model, MDX pages, page relations |
| [docs/L0-infrastructure](docs/L0-infrastructure.md) | L0 | Build pipeline, Docker, deployment to Hetzner |
| [docs/L0-ui](docs/L0-ui.md) | L0 | Components, layout, design system (DSRD) |
| [docs/L1-design-vision](docs/L1-design-vision.md) | L1 | Aesthetic direction, visual language, design rules for redesign |
| [docs/L1-relations](docs/L1-relations.md) | L1 | Relations graph API, inference rules, breadcrumbs |
| [docs/L1-routing](docs/L1-routing.md) | L1 | Static generation, routes, remark pipeline |
| [docs/L1-styles](docs/L1-styles.md) | L1 | CSS tokens, Tailwind v4 theme, layer order |
| [docs/L1-scripts](docs/L1-scripts.md) | L1 | Client-side scripts: footnotes, TOC, popups, graph |
| [docs/L2-header-nav](docs/L2-header-nav.md) | L2 | Header mode-shifting bar, navigation zones, mobile behavior |
| [docs/L2-info-architecture](docs/L2-info-architecture.md) | L2 | Metadata model, consolidated strip, type/relation dedup |
| [docs/L2-reading-experience](docs/L2-reading-experience.md) | L2 | TOC scroll spy, sidenote sync, link previews |
| [docs/L2-components](docs/L2-components.md) | L2 | Astro component catalog, props, data flow |
| [docs/L2-graph-viz](docs/L2-graph-viz.md) | L2 | D3 graph visualization, force simulation, interaction |
| [docs/L3-footnotes-layout](docs/L3-footnotes-layout.md) | L3 | Footnotes positioning algorithm, wide/narrow modes |
| [docs/L3-remark-plugins](docs/L3-remark-plugins.md) | L3 | remarkTodo, remarkCallout |

## Quick reference

```sh
just dev        # local dev server on :4321
just build      # build to dist/
just docker-run # build & serve via Docker on :8080
```

Stack: Astro 5, MDX, Tailwind 4, D3, Pagefind, Bun.
