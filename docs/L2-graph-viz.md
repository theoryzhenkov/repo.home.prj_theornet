---
scope: L2
summary: "Graph visualization: data pipeline, D3 force renderer, interaction model"
modified: 2026-03-19
reviewed: 2026-03-19
depends:
  - path: docs/L1-relations
  - path: docs/L1-scripts
---

# Graph visualization

The site renders interactive force-directed graphs of page relations using D3. Two contexts exist: a full-site graph page (`/graph`) and per-page subgraph components embedded in content.

## Data pipeline

```
buildRelationsGraph()          (server, relations.ts)
        |
        v
buildGraphData() / buildSubgraphData()   (server, graph-data.ts)
        |
        v
JSON serialized into HTML       (<script type="application/json"> or data-graph attribute)
        |
        v
Client JS parses JSON, calls createGraph()   (browser, renderer.ts)
        |
        v
D3 force simulation + SVG rendering
```

**Full graph** (`graph.astro`): calls `buildRelationsGraph()` then `buildGraphData()`, serializes the result into a hidden `<script type="application/json" id="graph-data">` element. Client-side init parses this and passes it to `createGraph()`.

**Subgraph** (`RelationsGraph.astro`): receives `graph`, `pages`, and `rootSlug` as Astro props, calls `buildSubgraphData()` server-side, serializes the result into a `data-graph` attribute on the container div.

## Types

### GraphNode

| Field | Type | Description |
|-------|------|-------------|
| `id` | `string` | Page slug |
| `title` | `string` | Display title |
| `connections` | `number` | Sum of all relation counts (up, down, is, has, next, prev, ref, refi) |

### GraphEdge

| Field | Type | Description |
|-------|------|-------------|
| `source` | `string` | Source page slug |
| `target` | `string` | Target page slug |
| `type` | `EdgeType` | One of `'up' | 'is' | 'next' | 'ref'` |

### EdgeType

Union: `'up' | 'is' | 'next' | 'ref'`. Maps 1:1 to relation semantics defined in the relations system.

## Subgraph extraction

`buildSubgraphData(graph, pages, rootSlug, opts)` produces a neighborhood graph:

1. Builds the full graph via `buildGraphData()`.
2. Filters edges to only the requested `relationTypes`.
3. Runs BFS from `rootSlug` up to `opts.depth` hops, traversing edges bidirectionally (both source and target neighbors count).
4. Returns nodes and edges where both endpoints are in the BFS-visited set.

Default props in `RelationsGraph.astro`: all four edge types, depth 1.

## Edge deduplication

`buildGraphData()` stores directional edges (up, is, ref) once per declaration -- the source page declares the relation, producing one edge. For symmetric pairs (next/prev), it deduplicates using a sorted slug-pair key: `[slug, rel.next].sort().join('::') + '::next'`. This prevents the same sequential link from appearing twice when both sides declare the relationship.

## D3 force simulation

### Parameters

| Force | Parameter | Value |
|-------|-----------|-------|
| `link` | distance | 80 |
| `charge` | strength | -200 (repulsive) |
| `center` | position | (0, 0) for initial; (width/2, height/2) after resize |
| `collide` | radius | `nodeRadius(connections) + 8` |

### Node radius formula

```
nodeRadius(connections) = clamp(4, 4 + sqrt(connections) * 2.5, 16)
```

Nodes with more connections appear larger, bounded between 4px and 16px.

## SVG rendering

The renderer appends an SVG to the container with `width`/`height` at 100% and a `viewBox` matching the container's client dimensions.

**Structure:**
- `<defs>`: arrow markers for directed edge types (viewBox `0 -4 8 8`, refX 12)
- `<g>` root group (receives zoom transform)
  - `<g class="graph-edges">`: `<line>` elements per visible edge
  - `<g class="graph-nodes">`: `<g>` per node containing a `<circle>` and a `<text>` label

**Labels** are positioned at `x = nodeRadius + 4`, `y = 4`, 11px, using the site's sans-serif font. Pointer events are disabled on labels so clicks pass through to the node circle.

**Arrow markers** are only created for edge types where `style.directed` is true (currently all four types).

## Edge styles

Per the design vision, edge types are distinguished by **dash pattern and width**, not color. All edges share a single base color (`--color-text-subtle`) so the graph reads as a cohesive neutral structure. Type is communicated through line style:

| Type | Color (CSS var) | Width | Dash pattern | Directed | Legend label |
|------|-----------------|-------|--------------|----------|-------------|
| `up` | `--color-text-subtle` | 2 | solid | yes | Up / Down -- hierarchy |
| `is` | `--color-text-subtle` | 1.5 | `6 3` | yes | Is / Has -- classification |
| `next` | `--color-text-subtle` | 1 | `2 4` | yes | Next / Prev -- sequential |
| `ref` | `--color-text-subtle` | 0.75 | `1 3` | yes | Ref -- reference link |

This follows the minimal semantic color principle: shape and line style differentiate, not color.

### Runtime color resolution

`EDGE_STYLES` and `NODE_COLORS` are initialized with hex fallbacks. On first render, `resolveRuntimeColors()` reads CSS custom properties via `getComputedStyle(document.documentElement)` and overwrites the color values in-place. The `cssVar(name, fallback)` helper returns the fallback when running server-side (`typeof document === 'undefined'`).

## Interaction model

### Zoom and pan

Enabled by default on the full graph page, disabled on embedded subgraphs. Scale range: 0.15x to 5x. Initial transform centers the content with 0.9x scale. The zoom transform is applied to the root `<g>` element.

### Drag

Enabled in both contexts. On drag start, the node's position is fixed (`fx`/`fy`) and `alphaTarget` is raised to 0.3 to reheat the simulation. On drag end, the fixed position is released and `alphaTarget` returns to 0, letting the simulation cool.

### Hover highlight

On `mouseenter`, the renderer collects all nodes connected to the hovered node via any edge. Connected nodes stay at full opacity; all others fade to 0.15. Edges involving the hovered node go to 0.8 opacity; others fade to 0.05. On `mouseleave`, everything resets (nodes to 1, edges to 0.6).

### Tooltip

A `div` positioned absolutely within the container, styled with site CSS variables. Shows the node title, follows the cursor with a 12px right / 8px up offset. Appears/disappears via opacity with a 50ms ease-out transition.

### Click

Default behavior navigates to the page: slug `'index'` maps to `'/'`, others to `'/{slug}/'`. The `onNodeClick` callback is configurable via `GraphConfig`.

## setVisibleTypes() filtering

`graph.astro` renders a legend panel with checkboxes for each edge type. On change, it collects the checked types into a `Set<EdgeType>` and calls `instance.setVisibleTypes(types)`. This triggers `rebuildEdges()`, which re-joins the edge data (filtered by `visibleTypes`), re-applies styles, and restarts the simulation at alpha 0.1.

The legend panel is collapsible via a toggle button. It is positioned absolutely in the top-left corner of the graph container.

## Key files

| File | Role |
|------|------|
| `src/lib/graph-data.ts` | `GraphNode`, `GraphEdge`, `EdgeType` types; `buildGraphData()` and `buildSubgraphData()` |
| `src/scripts/graph/renderer.ts` | `createGraph()` D3 renderer, `GraphConfig`, `GraphInstance` |
| `src/scripts/graph/styles.ts` | `EDGE_STYLES`, `NODE_COLORS`, `cssVar()`, `resolveRuntimeColors()` |
| `src/components/RelationsGraph.astro` | Embeddable subgraph component |
| `src/pages/graph.astro` | Full-site graph page with legend/filter panel |
