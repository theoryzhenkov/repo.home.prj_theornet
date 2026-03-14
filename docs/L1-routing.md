---
scope: L1
summary: "Route structure, static path generation, and remark plugin pipeline"
modified: 2026-03-15
reviewed: 2026-03-15
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
| `src/pages/[...slug].astro` | `/<slug>/` | Catch-all for every other content page. Uses `getStaticPaths()` to enumerate routes. |
| `src/pages/graph.astro` | `/graph/` | Full-page interactive relations graph. No `getStaticPaths` needed (single route). |
| `src/pages/popup-index.json.ts` | `/popup-index.json` | JSON endpoint consumed by client-side code for link previews and graph popups. |

## Static path generation

`[...slug].astro` defines `getStaticPaths()` which calls `getCollection('pages')`, filters out the entry with `id === 'index'` (handled by `index.astro` instead), and maps each remaining entry to `{ params: { slug: page.id } }`. The slug corresponds to the file path under `src/content/pages/` with the `.mdx` extension stripped -- so `src/content/pages/projects/blank.mdx` becomes the slug `projects/blank` and the URL `/projects/blank/`.

The `index` entry is excluded because Astro would otherwise generate it at both `/` (from `index.astro`) and `/index/` (from the catch-all), producing a conflict.

## Relations graph per page

Both `index.astro` and `[...slug].astro` follow the same data-loading pattern: call `buildRelationsGraph()` to get the full graph and page metadata map, then derive the current page's breadcrumbs via `getBreadcrumbs(slug, graph, pages)` and its direct relations via `getPageRelations(slug, graph)`. These are passed as props to the `Page` layout component.

`graph.astro` also calls `buildRelationsGraph()` but transforms the result through `buildGraphData()` for the D3/canvas renderer rather than extracting per-page relations.

## popup-index.json contract

The endpoint returns a JSON object keyed by URL path. The `index` entry uses `/` as its key; all others use `/<id>`. Each value has the shape:

```typescript
{
  title: string;
  description?: string;
}
```

The response includes every entry in the `pages` collection with no filtering. It is pretty-printed with two-space indentation.

## Remark plugin pipeline

Three remark plugins are configured identically for both `markdown` and `mdx` in `astro.config.ts`, applied in this order:

1. `remarkCallout` (`@r4ai/remark-callout`) -- transforms blockquote-based callout syntax into styled callout elements.
2. `remarkTodo` (custom, `src/lib/remark-todo.ts`) -- converts `[TODO::label]` markers in text nodes into `<span class="todo-marker">` HTML.
3. `remarkWikilink` (custom, `src/lib/remark-wikilink.ts`) -- converts `[[slug]]` and `[[slug|alias]]` wikilink syntax into `<a>` tags. Also supports a `type::[[slug]]` prefix form, though the type is currently unused in the output HTML.

All three plugins operate as AST visitors over text nodes. The two custom plugins (`remarkTodo`, `remarkWikilink`) splice text nodes into mixed text/HTML children in place, which means they are order-sensitive -- running one before the other would consume the text node, so both must handle non-overlapping patterns.

## Shiki configuration

Code blocks use the `github-light` theme via Shiki, configured under `markdown.shikiConfig`. This applies to fenced code blocks in both markdown and MDX content.

## Key files

- `astro.config.ts` -- build config, plugin pipeline, Shiki theme
- `src/content.config.ts` -- collection schema, glob loader for `**/*.mdx`
- `src/pages/index.astro` -- home route
- `src/pages/[...slug].astro` -- catch-all content route with `getStaticPaths()`
- `src/pages/graph.astro` -- graph visualization route
- `src/pages/popup-index.json.ts` -- JSON endpoint for link previews
- `src/lib/remark-todo.ts` -- custom TODO marker plugin
- `src/lib/remark-wikilink.ts` -- custom wikilink plugin
