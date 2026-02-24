import { getCollection } from 'astro:content';

export interface RelationTarget {
  slug: string;
  label?: string;
}

export interface PageRelations {
  up: RelationTarget[];
  down: RelationTarget[];
  is: RelationTarget[];
  has: RelationTarget[];
  next?: string;
  prev?: string;
  ref: string[];
  refi: string[];
}

export interface PageInfo {
  slug: string;
  title: string;
}

export type RelationsGraph = Map<string, PageRelations>;
export type PageInfoMap = Map<string, PageInfo>;

interface RawRelations {
  up?: Record<string, string | null>;
  is?: Record<string, string | null>;
  next?: string;
  prev?: string;
}

function parseRelationMap(map?: Record<string, string | null>): RelationTarget[] {
  if (!map) return [];
  return Object.entries(map).map(([slug, label]) => ({
    slug,
    ...(label ? { label } : {}),
  }));
}

function emptyRelations(): PageRelations {
  return {
    up: [], down: [],
    is: [], has: [],
    ref: [], refi: [],
  };
}

function addUniqueTarget(arr: RelationTarget[], slug: string, label?: string): void {
  if (!arr.some(t => t.slug === slug)) {
    arr.push({ slug, ...(label ? { label } : {}) });
  }
}

function addUnique(arr: string[], value: string): void {
  if (!arr.includes(value)) arr.push(value);
}

/**
 * Convert a page slug to its URL path.
 */
function slugToPath(slug: string): string {
  return slug === 'index' ? '/' : `/${slug}`;
}

/**
 * Convert a URL path back to a page slug.
 */
function pathToSlug(path: string): string {
  if (path === '/') return 'index';
  return path.replace(/^\//, '');
}

/**
 * Extract internal link target slugs from raw MDX body.
 */
function extractLinkSlugs(body: string, sourceSlug: string, knownSlugs: Set<string>): string[] {
  const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
  const slugs: string[] = [];
  let match;

  while ((match = linkRegex.exec(body)) !== null) {
    const href = match[2];

    // Skip external links, anchors, mailto
    if (href.startsWith('http') || href.startsWith('#') || href.startsWith('mailto:')) {
      continue;
    }

    // Normalize to path
    let targetPath = href;
    if (targetPath.startsWith('./')) targetPath = targetPath.slice(1);
    if (!targetPath.startsWith('/')) targetPath = '/' + targetPath;
    if (targetPath.endsWith('/') && targetPath !== '/') targetPath = targetPath.slice(0, -1);

    const targetSlug = pathToSlug(targetPath);

    // Only include if target exists and is not self-reference
    if (knownSlugs.has(targetSlug) && targetSlug !== sourceSlug && !slugs.includes(targetSlug)) {
      slugs.push(targetSlug);
    }
  }

  return slugs;
}

/**
 * Build a relations graph from all pages with bidirectional inference.
 *
 * Inference rules:
 * - A.up includes B   -> B.down includes A
 * - A.is includes B   -> B.has includes A
 * - A.next = B        -> B.prev = A
 * - A.prev = B        -> B.next = A
 * - Markdown link A->B -> A.ref includes B, B.refi includes A
 */
export async function buildRelationsGraph(): Promise<{
  graph: RelationsGraph;
  pages: PageInfoMap;
}> {
  const allPages = await getCollection('pages');

  const graph: RelationsGraph = new Map();
  const pages: PageInfoMap = new Map();
  const knownSlugs = new Set(allPages.map(p => p.id));

  // First pass: collect explicit relations, page info, and extract links
  for (const page of allPages) {
    const slug = page.id;
    const data = page.data as { title: string } & RawRelations;

    pages.set(slug, { slug, title: data.title });

    const rel = emptyRelations();
    rel.up = parseRelationMap(data.up);
    rel.is = parseRelationMap(data.is);
    rel.next = data.next;
    rel.prev = data.prev;

    // Extract ref (references) from markdown links
    const body = page.body || '';
    rel.ref = extractLinkSlugs(body, slug, knownSlugs);

    graph.set(slug, rel);
  }

  // Second pass: infer bidirectional relations
  for (const [slug, rel] of graph) {
    // up -> down
    for (const target of rel.up) {
      const targetRel = graph.get(target.slug);
      if (targetRel) addUniqueTarget(targetRel.down, slug, target.label);
    }

    // is -> has
    for (const target of rel.is) {
      const targetRel = graph.get(target.slug);
      if (targetRel) addUniqueTarget(targetRel.has, slug, target.label);
    }

    // next -> prev
    if (rel.next) {
      const nextRel = graph.get(rel.next);
      if (nextRel && !nextRel.prev) nextRel.prev = slug;
    }

    // prev -> next
    if (rel.prev) {
      const prevRel = graph.get(rel.prev);
      if (prevRel && !prevRel.next) prevRel.next = slug;
    }

    // ref -> refi
    for (const target of rel.ref) {
      const targetRel = graph.get(target);
      if (targetRel) addUnique(targetRel.refi, slug);
    }
  }

  return { graph, pages };
}

/**
 * Get the breadcrumb trail for a page by walking up the `up` chain.
 * Returns array from root to current page.
 */
export function getBreadcrumbs(
  slug: string,
  graph: RelationsGraph,
  pages: PageInfoMap
): PageInfo[] {
  const breadcrumbs: PageInfo[] = [];
  let current: string | undefined = slug;
  const visited = new Set<string>();

  while (current && !visited.has(current)) {
    visited.add(current);
    const pageInfo = pages.get(current);
    if (pageInfo) breadcrumbs.unshift(pageInfo);

    const rel = graph.get(current);
    if (!rel) break;

    current = rel.up[0]?.slug;
  }

  return breadcrumbs;
}

/**
 * Get resolved relations for a specific page.
 */
export function getPageRelations(
  slug: string,
  graph: RelationsGraph
): PageRelations | undefined {
  return graph.get(slug);
}
