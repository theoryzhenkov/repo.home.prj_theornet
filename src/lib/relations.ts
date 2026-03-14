import { pathToSlug } from './slugs';

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

export interface RawRelationEntry {
  page: string;
  label?: string;
}

export interface RawRelations {
  up?: RawRelationEntry[];
  is?: RawRelationEntry[];
  next?: string;
  prev?: string;
  ref?: string[];
  refi?: string[];
}

export function parseRelationList(list?: RawRelationEntry[]): RelationTarget[] {
  if (!list) return [];
  return list.map(({ page, label }) => ({
    slug: page,
    ...(label ? { label } : {}),
  }));
}

export function emptyRelations(): PageRelations {
  return {
    up: [], down: [],
    is: [], has: [],
    ref: [], refi: [],
  };
}

export function addUniqueTarget(arr: RelationTarget[], slug: string, label?: string): void {
  if (!arr.some(t => t.slug === slug)) {
    arr.push({ slug, ...(label ? { label } : {}) });
  }
}

export function addUnique(arr: string[], value: string): void {
  if (!arr.includes(value)) arr.push(value);
}

/**
 * Extract internal link target slugs from raw MDX body.
 * Scans for markdown links `[text](href)` and returns slugs of known internal pages.
 */
export function extractLinkSlugs(body: string, sourceSlug: string, knownSlugs: Set<string>): string[] {
  const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
  const slugs: string[] = [];
  let match;

  while ((match = linkRegex.exec(body)) !== null) {
    const href = match[2];
    if (href.startsWith('http') || href.startsWith('#') || href.startsWith('mailto:')) continue;

    let targetPath = href;
    if (targetPath.startsWith('./')) targetPath = targetPath.slice(1);
    if (!targetPath.startsWith('/')) targetPath = '/' + targetPath;
    if (targetPath.endsWith('/') && targetPath !== '/') targetPath = targetPath.slice(0, -1);

    const targetSlug = pathToSlug(targetPath);
    if (knownSlugs.has(targetSlug) && targetSlug !== sourceSlug && !slugs.includes(targetSlug)) {
      slugs.push(targetSlug);
    }
  }

  return slugs;
}

/** Page-like input for buildGraphFromPages, decoupled from Astro's collection type. */
export interface PageInput {
  id: string;
  data: { title: string } & RawRelations;
  body?: string;
}

/**
 * Build a relations graph from page data with bidirectional inference.
 * Pure function — no Astro imports, fully testable.
 *
 * Inference rules:
 * - A.up includes B   -> B.down includes A
 * - A.is includes B   -> B.has includes A
 * - A.next = B        -> B.prev = A
 * - A.prev = B        -> B.next = A
 * - Markdown link A->B -> A.ref includes B, B.refi includes A
 * - A.refi = B (explicit) -> B.ref includes A
 */
export function buildGraphFromPages(allPages: PageInput[]): {
  graph: RelationsGraph;
  pages: PageInfoMap;
} {
  const graph: RelationsGraph = new Map();
  const pages: PageInfoMap = new Map();
  const knownSlugs = new Set(allPages.map(p => p.id));

  // First pass: collect explicit relations, page info, and extract links
  for (const page of allPages) {
    const slug = page.id;
    const data = page.data;

    pages.set(slug, { slug, title: data.title });

    const rel = emptyRelations();
    rel.up = parseRelationList(data.up);
    rel.is = parseRelationList(data.is);
    rel.next = data.next;
    rel.prev = data.prev;

    // Extract refs from markdown links
    const body = page.body || '';
    rel.ref = extractLinkSlugs(body, slug, knownSlugs);

    // Merge frontmatter ref with auto-extracted refs
    if (data.ref) {
      for (const r of data.ref) {
        if (knownSlugs.has(r) && r !== slug) addUnique(rel.ref, r);
      }
    }

    // Frontmatter refi
    if (data.refi) {
      for (const r of data.refi) {
        if (knownSlugs.has(r) && r !== slug) addUnique(rel.refi, r);
      }
    }

    graph.set(slug, rel);
  }

  // Second pass: infer bidirectional relations
  for (const [slug, rel] of graph) {
    for (const target of rel.up) {
      const targetRel = graph.get(target.slug);
      if (targetRel) addUniqueTarget(targetRel.down, slug, target.label);
    }

    for (const target of rel.is) {
      const targetRel = graph.get(target.slug);
      if (targetRel) addUniqueTarget(targetRel.has, slug, target.label);
    }

    if (rel.next) {
      const nextRel = graph.get(rel.next);
      if (nextRel && !nextRel.prev) nextRel.prev = slug;
    }

    if (rel.prev) {
      const prevRel = graph.get(rel.prev);
      if (prevRel && !prevRel.next) prevRel.next = slug;
    }

    for (const target of rel.ref) {
      const targetRel = graph.get(target);
      if (targetRel) addUnique(targetRel.refi, slug);
    }

    for (const target of rel.refi) {
      const targetRel = graph.get(target);
      if (targetRel) addUnique(targetRel.ref, slug);
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
