---
scope: L0
summary: "Content model: MDX pages, relation graph, schema"
modified: 2026-06-20
reviewed: 2026-06-20
depends:
  - path: README
dependents:
  - path: docs/L1-relations
  - path: docs/L1-routing
---

# Content System

The site has two build-time content sources:

1. Local MDX pages in `src/content/pages/`, loaded by Astro's content collections via a glob loader (`src/content.config.ts`).
2. Ghost content from `ghost.theor.net`, loaded during the static build when `GHOST_CONTENT_API_KEY` is configured.

A project-native content CLI creates, lists, edits, archives, and deletes local MDX files while preserving Git/Jujutsu as the history layer. Ghost pages/posts are edited in Ghost Admin and are treated as generated site pages at build time. File paths and Ghost slugs are storage locations only; page topology comes from metadata relations such as `is` and `part_of`.

## Page schema

Every MDX page has YAML frontmatter with required `title` and `created` fields, plus optional relation fields. The schema is defined with Zod in `src/content.config.ts` and uses `.passthrough()` to allow arbitrary extra fields.

Ghost pages/posts can carry equivalent site metadata in the Ghost `frontmatter` field. The build accepts YAML or JSON. By default, Ghost posts and Ghost pages both use their Ghost slug as a root-level home route. Ghost posts keep `part_of: blog` and `is: classes/blog-note`; Ghost pages keep `part_of: index` and `is: classes/page`. The Ghost metadata field can override the home route with `homePath`/`homeSlug`, can set an explicit `description`, and can provide normal relation keys (`part_of`, `is`, `subject`, etc.). Ghost excerpts and body text are not promoted to Home metadata.

The website relation model is a practical subset of the Obsidian PKM ontology: routes and folders are browsing affordances, while frontmatter relations carry semantic structure. New content should prefer `part_of` / `has_part` for composition over legacy `up` / `down` hierarchy fields. Collection pages should query semantic metadata (for example, `is: classes/project`) instead of deriving membership from directories.

## Relations

Pages link to each other through declared frontmatter relations and auto-extracted references. The build-time graph builder (`src/lib/relations.ts`) infers inverse relations automatically.

### Hierarchy and typing

Declared as arrays of `{ page, label? }` objects in frontmatter.

| Frontmatter key | Meaning | Inverse (inferred) |
| --------------- | ------- | ------------------- |
| `is` | "this page is an instance of..." | `has` on target |
| `subclass_of` | class taxonomy / subsumption | `superclass_of` on target |
| `part_of` | mereology / composition | `has_part` on target |
| `subject` | aboutness | `subject_of` on target |
| `creator` | authorship / creation | `creator_of` on target |
| `related` | weak symmetric association | `related` on target |
| `up` | legacy route hierarchy | `down` on target |

Breadcrumbs walk the `part_of` chain first and fall back to legacy `up` when `part_of` is absent.

### Sequential ordering

| Key | Meaning | Inverse (inferred) |
| --- | ------- | ------------------- |
| `next` | next page in sequence (string slug) | `prev` on target |
| `prev` | previous page in sequence (string slug) | `next` on target |

### Auto-extracted references

`relations.ts` parses each page's MDX body for internal markdown links and populates `ref` (references) and `refi` (referenced-by) arrays. External links, anchors, and mailto are excluded.

## Authoring commands

The `content` just module wraps `scripts/content.ts`:

```sh
just content new              # prompt for path and name, then create blank relation metadata
just content list             # list content page slugs and titles
just content edit SLUG
just content archive SLUG
just content delete SLUG
```

`new` asks for a path relative to `src/content/pages/` and a display name, then writes a blank frontmatter block with empty `part_of`, `is`, and `subject` lists for manual classification. `archive` is the preferred removal path; it moves pages under `archive/deleted-pages-YYYY-MM-DD/`. Hard deletion requires `--force`.

## Ghost integration

Ghost content is loaded by `src/lib/ghost.ts` and merged with local MDX inputs in `src/lib/site-pages.ts`. The merged page set feeds the relations graph, relation pages, popup index, and catch-all route generation. Local MDX slugs win if a Ghost page/post maps to the same home slug.

Ghost-backed pages retain their Ghost `uuid` and content type so Home can attribute page views back to Ghost traffic analytics. When `GHOST_STATS_ENDPOINT` is configured, the catch-all route fetches Ghost's public site UUID and renders Ghost's stock `ghost-stats.min.js` tracker with `tb_site_uuid`, `tb_post_uuid`, and `tb_post_type` attributes. Local MDX pages do not emit Ghost analytics.

Environment variables:

| Variable | Required | Purpose |
| --- | --- | --- |
| `GHOST_CONTENT_API_URL` | no | Content API base URL; defaults to `https://ghost.theor.net/ghost/api/content` |
| `GHOST_CONTENT_API_KEY` | for Ghost pages/posts | Public Ghost Content API key used at build time |
| `GHOST_ACTIVITYPUB_OUTBOX_URL` | no | Public ActivityPub outbox URL for the `/notes/` feed |
| `PUBLIC_FEDIVERSE_HANDLE` | no | Handle displayed in the notes feed and prefilled in Mastodon reply links; defaults to `@theoryzhenkov@ap.theor.net` |
| `PUBLIC_MASTODON_INSTANCE_URL` | no | Mastodon instance used for profile/share links in the notes feed; defaults to `https://mastodon.social` |
| `GHOST_STATS_ENDPOINT` | for Ghost analytics | Tracker endpoint used by `ghost-stats.min.js`; production uses the same-origin `/.ghost/analytics/api/v1/page_hit` path |
| `GHOST_STATS_SITE_API_URL` | no | Public Ghost Admin site endpoint used to read `site_uuid`; defaults to `https://ghost.theor.net/ghost/api/admin/site/` |
| `GHOST_STATS_SCRIPT_URL` | no | Ghost stats script URL; defaults to `https://ghost.theor.net/public/ghost-stats.min.js` |
| `GHOST_STATS_DATASOURCE` | no | Tinybird datasource name; defaults to `analytics_events` |

ActivityPub notes are not generated as individual local pages. The `/notes/` MDX page renders public Ghost ActivityPub notes as a polished microblog feed. Notes are grouped into threads when `inReplyTo` points at another fetched note, each note links to its ActivityPub object as the source of record, and reply actions open a Mastodon composer prefilled with the site's Fediverse handle and note URL.

## Key files

- `src/content.config.ts` -- local collection definition and Zod schema
- `src/lib/ghost.ts` -- Ghost Content API, Ghost frontmatter, and ActivityPub outbox integration
- `src/lib/site-pages.ts` -- merged local/Ghost page inputs
- `src/lib/content-admin.ts` -- local content authoring operations and page templates
- `scripts/content.ts` -- CLI wrapper for content operations
- `content.just` -- `just content ...` module
- `src/content/pages/` -- local MDX content
- `src/lib/relations.ts` -- relation types, link extraction, `buildGraphFromPages()`, breadcrumbs
- `src/lib/relations-graph.ts` -- Astro-dependent `buildRelationsGraph()` wrapper (memoized)
- `src/lib/slugs.ts` -- shared slug/URL utilities
- `src/lib/graph-data.ts` -- D3 graph data preparation
