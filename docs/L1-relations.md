---
scope: L1
summary: "Relations system interfaces, inference rules, and graph-building contracts"
modified: 2026-03-19
reviewed: 2026-03-19
depends:
  - path: docs/L0-content
dependents:
  - path: docs/L2-graph-viz
  - path: docs/L2-information-density
  - path: docs/L2-info-architecture
---

# Relations System

The relations system connects pages into a typed, bidirectional graph at build time. Pages declare relations in frontmatter; the graph builder infers inverses, extracts inline references from MDX bodies, and exposes the result as two maps consumed by breadcrumbs, navigation, and graph visualization.

## PageRelations interface

Each page in the graph has a `PageRelations` record with these fields:

| Field | Type | Meaning |
|-------|------|---------|
| `up` | `RelationTarget[]` | Containment parents -- "this page lives under X" |
| `down` | `RelationTarget[]` | Containment children (inferred from others' `up`) |
| `is` | `RelationTarget[]` | Type/category -- "this page is an instance of X" |
| `has` | `RelationTarget[]` | Instances (inferred from others' `is`) |
| `next` | `string \| undefined` | Next page in a sequence |
| `prev` | `string \| undefined` | Previous page in a sequence |
| `ref` | `string[]` | Outgoing references -- links this page makes to other pages |
| `refi` | `string[]` | Incoming references -- other pages that link to this one |

A `RelationTarget` carries a `slug` and an optional `label` (display text override). The `next`/`prev` and `ref`/`refi` fields use bare slug strings because they never need labels.

## Frontmatter schema

Relations are declared in page frontmatter. The `up` and `is` fields use `Record<string, string | null>` where each key is a target slug and the value is either a display label or `null`. The `next` and `prev` fields are plain strings (single slug each). The `ref` and `refi` fields are string arrays, though `ref` is rarely declared manually since it is populated automatically from link extraction.

```yaml
up:
  projects: "Projects"    # slug: label
  index: null              # slug: no custom label
is:
  projects/concept: null
next: projects/other-thing
```

All relation fields are optional. The Zod schema in `content.config.ts` uses `.passthrough()`, so extra frontmatter keys are preserved but not validated.

## Inference rules

`buildRelationsGraph()` populates inverse relations automatically during its second pass. Each rule fires once per declared relation, and duplicates are skipped.

| Declared | Inferred on target | Notes |
|----------|--------------------|-------|
| A declares `up: {B: label}` | B gets `down` entry pointing to A | Label propagates to the inverse |
| A declares `is: {B: label}` | B gets `has` entry pointing to A | Label propagates to the inverse |
| A declares `next: B` | B gets `prev = A` | Only if B has no `prev` already set |
| A declares `prev: B` | B gets `next = A` | Only if B has no `next` already set |
| A has `ref` containing B | B gets `refi` containing A | Symmetric: explicit `refi` also infers `ref` on the target |

The `next`/`prev` inference is asymmetric: explicit declarations win. If B already has a `prev` value (from its own frontmatter or an earlier inference pass), A's `next: B` will not overwrite it.

## buildGraphFromPages() / buildRelationsGraph()

The graph-building logic is split into two layers:

- `buildGraphFromPages(pages)` in `relations.ts` -- pure function that takes page data and returns the graph. Fully testable without Astro imports.
- `buildRelationsGraph()` in `relations-graph.ts` -- thin async wrapper that calls `getCollection('pages')` and delegates to `buildGraphFromPages`. Memoized so the graph is computed once per build, not per page.

**Output**: Returns `{ graph: RelationsGraph, pages: PageInfoMap }` where `RelationsGraph` is `Map<string, PageRelations>` and `PageInfoMap` is `Map<string, PageInfo>` (slug + title pairs).

The function executes in two passes. The first pass iterates every page, parsing frontmatter relations, extracting links from the MDX body, and building each page's initial `PageRelations`. The second pass walks the graph and fires the inference rules above, adding inverse entries to target pages.

Link extraction happens during the first pass. The `extractLinkSlugs` function scans the raw MDX body for markdown links (`[text](href)`). The extracted slugs populate the page's `ref` array, merged with any explicitly declared `ref` values from frontmatter.

## Link extraction rules

Markdown links are included when they point to a known page slug. The following are excluded:

- URLs starting with `http` (external links)
- Fragment-only links starting with `#`
- `mailto:` links
- Links pointing to the source page itself (self-references)
- Links whose resolved slug does not match any page in the collection

Relative paths are normalized: leading `./` is stripped, a leading `/` is ensured, and trailing slashes are removed. The resulting path is converted to a slug via `pathToSlug` (from `slugs.ts`).

## getBreadcrumbs() contract

**Input**: A page slug, the `RelationsGraph`, and the `PageInfoMap`.

**Output**: An array of `PageInfo` objects ordered from root to the current page.

The function walks the `up` chain by always following `up[0]` (the first declared parent). It prepends each ancestor to the result array. A visited set prevents infinite loops if the `up` chain contains cycles. The walk stops when a page has no `up` entries or the current slug has already been visited.

## buildGraphData() and buildSubgraphData()

`buildGraphData()` converts the full `RelationsGraph` into a flat `{ nodes, edges }` structure for visualization. Each node carries a `connections` count (sum of all relation arrays). Edges use four types: `up`, `is`, `next`, `ref`. Inverse relations (`down`, `has`, `prev`, `refi`) are not emitted as separate edges -- they are represented by the forward edge. The `next`/`prev` pair is deduplicated using a sorted key so only one edge appears per pair.

`buildSubgraphData()` builds on `buildGraphData()` to extract a neighborhood around a root page. It accepts a `SubgraphOptions` with `relationTypes` (which edge types to traverse) and `depth` (maximum BFS hops from root). The BFS traverses edges bidirectionally -- if a page is connected as either source or target of a matching edge, it is reachable. The result contains only nodes within the BFS frontier and edges whose both endpoints are included.

## Key files

- `src/lib/relations.ts` -- `PageRelations` interface, `buildGraphFromPages()`, `getBreadcrumbs()`, `extractLinkSlugs()`
- `src/lib/relations-graph.ts` -- `buildRelationsGraph()` (Astro wrapper, memoized)
- `src/lib/slugs.ts` -- `slugToHref()`, `pathToSlug()`
- `src/lib/graph-data.ts` -- `GraphData` interfaces, `buildGraphData()`, `buildSubgraphData()`
- `src/content.config.ts` -- Zod schema defining the frontmatter relation fields
