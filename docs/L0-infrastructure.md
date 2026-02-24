---
scope: L0
summary: "Build pipeline, Docker packaging, deployment to Hetzner"
modified: 2026-03-14
reviewed: 2026-03-14
depends:
  - path: README
---

# Infrastructure

## Build

Astro builds static HTML to `dist/`, then Pagefind indexes it for client-side search. Bun is the package manager and script runner.

```
bun run build  =  astro build && pagefind --site dist
```

## Docker

Two-stage Dockerfile: `oven/bun:1-alpine` builds, `nginx:alpine` serves. Custom `nginx.conf` at project root configures the production server. The image exposes port 80.

## Deployment

Docker images are pushed to GHCR via CI. The host is a Hetzner server running NixOS. DNS is managed with Terraform in the separate [theor.net-infra](https://github.com/theoryzhenkov/theor.net-infra) repo. Domain registered through Porkbun.

The deploy quickstart page on the site itself (`src/content/pages/deploying-to-theor-net-infrastructure.mdx`) documents the step-by-step process for adding new services to theor.net.

## Key files

- `Dockerfile` -- multi-stage build
- `nginx.conf` -- production server config
- `justfile` -- local dev/build/docker commands
- `astro.config.ts` -- Astro configuration (static output, Tailwind, MDX)
