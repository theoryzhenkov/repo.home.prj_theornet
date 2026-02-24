import type { RelationsGraph, PageInfoMap } from './relations';

export interface GraphNode {
  id: string;
  title: string;
  connections: number;
}

export interface GraphEdge {
  source: string;
  target: string;
  type: EdgeType;
}

export type EdgeType = 'up' | 'is' | 'next' | 'ref';

export interface GraphData {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

/**
 * Build a full graph data structure (nodes + edges) from the relations graph.
 * Deduplicates symmetric edges so only one edge exists per pair.
 */
export function buildGraphData(
  graph: RelationsGraph,
  pages: PageInfoMap,
): GraphData {
  const nodes: GraphNode[] = [];
  const edges: GraphEdge[] = [];
  const seen = new Set<string>();

  for (const [slug, rel] of graph) {
    const info = pages.get(slug);
    if (!info) continue;

    const connections =
      rel.up.length + rel.down.length +
      rel.is.length + rel.has.length +
      (rel.next ? 1 : 0) + (rel.prev ? 1 : 0) +
      rel.ref.length + rel.refi.length;

    nodes.push({ id: slug, title: info.title, connections });

    // Directional: up (source is part of target)
    for (const target of rel.up) {
      edges.push({ source: slug, target: target.slug, type: 'up' });
    }

    // Directional: is (source is a target)
    for (const target of rel.is) {
      edges.push({ source: slug, target: target.slug, type: 'is' });
    }

    // Directional: next (deduplicate with prev)
    if (rel.next) {
      const key = [slug, rel.next].sort().join('::') + '::next';
      if (!seen.has(key)) {
        seen.add(key);
        edges.push({ source: slug, target: rel.next, type: 'next' });
      }
    }

    // Directional: references (source links to target)
    for (const target of rel.ref) {
      edges.push({ source: slug, target, type: 'ref' });
    }
  }

  return { nodes, edges };
}

export interface SubgraphOptions {
  /** Which relation types to include as edges. */
  relationTypes: EdgeType[];
  /** How many hops from the root to include. */
  depth: number;
}

/**
 * Build a subgraph centered on a root page, including only specified relation
 * types and traversing up to `depth` hops.
 */
export function buildSubgraphData(
  graph: RelationsGraph,
  pages: PageInfoMap,
  rootSlug: string,
  opts: SubgraphOptions,
): GraphData {
  const full = buildGraphData(graph, pages);
  const typesSet = new Set(opts.relationTypes);

  // Filter edges to only requested types
  const relevantEdges = full.edges.filter(e => typesSet.has(e.type));

  // BFS from root up to depth hops
  const includedSlugs = new Set<string>();
  let frontier = new Set<string>([rootSlug]);

  for (let d = 0; d <= opts.depth; d++) {
    for (const slug of frontier) {
      includedSlugs.add(slug);
    }
    if (d === opts.depth) break;

    const nextFrontier = new Set<string>();
    for (const slug of frontier) {
      for (const edge of relevantEdges) {
        if (edge.source === slug && !includedSlugs.has(edge.target)) {
          nextFrontier.add(edge.target);
        }
        if (edge.target === slug && !includedSlugs.has(edge.source)) {
          nextFrontier.add(edge.source);
        }
      }
    }
    frontier = nextFrontier;
  }

  return {
    nodes: full.nodes.filter(n => includedSlugs.has(n.id)),
    edges: relevantEdges.filter(
      e => includedSlugs.has(e.source) && includedSlugs.has(e.target),
    ),
  };
}
