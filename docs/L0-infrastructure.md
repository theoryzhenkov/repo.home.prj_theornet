---
scope: L0
summary: "Build pipeline, Docker packaging, deployment to Hetzner"
modified: 2026-06-19
reviewed: 2026-06-19
depends:
  - path: README
---

# Infrastructure

## Build

Astro builds static HTML to `dist/`, then Pagefind indexes it for client-side search. Bun is the package manager and script runner. Ghost pages/posts are fetched at build time when the Ghost Content API key is present.

```
bun run build  =  astro build && pagefind --site dist
```

## Docker

Two-stage Dockerfile: `oven/bun:1-alpine` builds, `nginx:alpine` serves. Custom `nginx.conf` at project root configures the production server. The image exposes port 80.

## Deployment

Docker images are pushed to GHCR via CI. The workflow runs on pushes to `main`, can be triggered manually with `workflow_dispatch`, and also accepts a future `repository_dispatch` event of type `ghost-content-changed` for Ghost-driven rebuilds. Each workflow run passes a cache-bust build argument so Docker does not reuse an old `bun run build` layer when only remote Ghost content changed. The host is a Hetzner server running NixOS. DNS is managed with Terraform in the separate [theor.net-infra](https://github.com/theoryzhenkov/theor.net-infra) repo. Domain registered through Porkbun.

GitHub Actions configuration:

| Name | Kind | Purpose |
| --- | --- | --- |
| `GHOST_CONTENT_API_KEY` | secret | Content API key passed as Docker build arg so Ghost posts/pages render into the static site |
| `GHOST_ADMIN_API_KEY` | secret | Reserved for future Ghost webhook-management actions; not used by the build |
| `GHOST_CONTENT_API_URL` | variable | Optional override for the Ghost Content API base URL |
| `GHOST_ACTIVITYPUB_OUTBOX_URL` | variable | Optional override for the ActivityPub outbox used by `/notes/` |

Ghost cannot call GitHub Actions directly as a webhook receiver because GitHub dispatch APIs require authenticated requests and Ghost webhooks cannot add the required GitHub authorization header. A small relay service can later verify Ghost's webhook signature and call GitHub's `repository_dispatch` API with `event_type: ghost-content-changed`.

The deploy quickstart page on the site itself (`src/content/pages/deploying-to-theor-net-infrastructure.mdx`) documents the step-by-step process for adding new services to theor.net.

## Key files

- `Dockerfile` -- multi-stage build
- `nginx.conf` -- production server config
- `justfile` -- local dev/build/docker commands
- `astro.config.ts` -- Astro configuration (static output, Tailwind, MDX)
