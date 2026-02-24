---
scope: root
summary: "Entry point for the home.theor.net project"
modified: 2026-03-14
reviewed: 2026-03-14
dependents:
  - path: docs/L0-content
  - path: docs/L0-infrastructure
  - path: docs/L0-ui
---

# home.theor.net

Theo Ryzhenkov's personal website. Static site built with Astro 5, served from Hetzner via Docker + nginx.

Pages are MDX files interconnected through an RCC-8 topological relation system and auto-extracted markdown links. The site uses Pagefind for search and D3 for a graph visualization of page relations.

## Navigation

| Spec | Scope | What it covers |
| ---- | ----- | -------------- |
| [docs/L0-content](docs/L0-content.md) | L0 | Content model, MDX pages, RCC-8 relations |
| [docs/L0-infrastructure](docs/L0-infrastructure.md) | L0 | Build pipeline, Docker, deployment to Hetzner |
| [docs/L0-ui](docs/L0-ui.md) | L0 | Components, layout, design system (DSRD) |

## Quick reference

```sh
just dev        # local dev server on :4321
just build      # build to dist/
just docker-run # build & serve via Docker on :8080
```

Stack: Astro 5, MDX, Tailwind 4, D3, Pagefind, Bun.
