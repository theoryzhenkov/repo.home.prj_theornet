---
scope: L1
summary: "Route structure, static path generation, and remark plugin pipeline"
modified: 2026-06-19
reviewed: 2026-06-19
depends:
  - path: docs/L0-content
  - path: docs/L0-ui
dependents:
  - path: docs/L2-components
  - path: docs/L3-remark-plugins
---

# Routing

The site generates fully static HTML at build time (`output: 'static'` in `astro.config.ts`). Every page that will exist must be enumerable during the build; there is no server-side rendering or dynamic routing at runtime.

## Route structure

| File | URL pattern | Purpose |
|---|---|---|
| `src/pages/index.astro` | `/` | Home page. Fetches the `index` entry from the `pages` collection directly via `getEntry`. |
| `src/pages/[...slug].astro` | `/<slug>/` | Catch-all for every other local or Ghost-backed content page. Uses `getStaticPaths()` to enumerate routes. |
| `src/pages/graph.astro` | `/graph/` | Full-page interactive relations graph. No `getStaticPaths` needed (single route). |
| `src/pages/popup-index.json.ts` | `/popup-index.json` | JSON endpoint consumed by client-side code for link previews and graph popups. |

## Static path generation

`[...slug].astro` defines `getStaticPaths()` which combines local MDX pages with Ghost-backed pages/posts. Local pages come from `getCollection('pages')`; the entry with `id === 'index'` is excluded because `index.astro` handles `/`. The slug corresponds to the file path under `src/content/pages/` with the `.mdx` extension stripped -- so `src/content/pages/projects/blank.mdx` becomes the slug `projects/blank` and the URL `/projects/blank/`.

Ghost pages/posts come from `src/lib/site-pages.ts`, which wraps `src/lib/ghost.ts`. Ghost posts and pages both default to `/{ghost-slug}/`; blog membership is expressed by metadata (`is: classes/blog-note`, `part_of: blog`) rather than by a `/blog/` path prefix. Ghost `frontmatter` metadata can override the home route with `homePath` or `homeSlug`. Local MDX slugs win over Ghost-derived slugs to prevent duplicate static paths.

At runtime, nginx serves only generated static files and directories. Missing paths return 404 instead of falling back to `/`, so stale Ghost paths such as `/blog/{ghost-slug}/` do not masquerade as the homepage.

## Relations graph per page

Both `index.astro` and `[...slug].astro` follow the same data-loading pattern: call `buildRelationsGraph()` to get the full graph and page metadata map, then derive the current page's breadcrumbs via `getBreadcrumbs(slug, graph, pages)` and its direct relations via `getPageRelations(slug, graph)`. These are passed as props to the `Page` layout component.

`buildRelationsGraph()` reads the merged local/Ghost page set through `getAllSitePageInputs()`. This makes Ghost-backed pages visible to graph search, relation pages, breadcrumbs, and popup metadata whenever the Ghost Content API key is configured.

`graph.astro` also calls `buildRelationsGraph()` but transforms the result through `buildGraphData()` for the D3/canvas renderer rather than extracting per-page relations.

## popup-index.json contract

The endpoint returns a JSON object keyed by URL path. The `index` entry uses `/` as its key; all others use `/<id>`. Each value has the shape:

```typescript
{
  title: string;
  description?: string;
}
```

The response includes every merged local/Ghost page input with no filtering. It is pretty-printed with two-space indentation.

## Remark plugin pipeline

Two remark plugins are configured identically for both `markdown` and `mdx` in `astro.config.ts`, applied in this order:

1. `remarkCallout` (`@r4ai/remark-callout`) -- transforms blockquote-based callout syntax into styled callout elements.
2. `remarkTodo` (custom, `src/lib/remark-todo.ts`) -- converts `[TODO::label]` markers in text nodes into `<span class="todo-marker">` HTML.

Both plugins operate as AST visitors. `remarkCallout` transforms blockquote nodes, while `remarkTodo` visits text nodes and splices replacements in place.

## Shiki configuration

Code blocks use the `github-light` theme via Shiki, configured under `markdown.shikiConfig`. This applies to fenced code blocks in both markdown and MDX content.

## Key files

- `astro.config.ts` -- build config, plugin pipeline, Shiki theme
- `src/content.config.ts` -- collection schema, glob loader for `**/*.mdx`
- `src/pages/index.astro` -- home route
- `src/pages/[...slug].astro` -- catch-all local/Ghost content route with `getStaticPaths()`
- `src/pages/graph.astro` -- graph visualization route
- `src/pages/popup-index.json.ts` -- JSON endpoint for link previews
- `src/lib/site-pages.ts` -- merged local/Ghost page input loader
- `src/lib/ghost.ts` -- Ghost route/content helpers
- `src/lib/remark-todo.ts` -- custom TODO marker plugin
