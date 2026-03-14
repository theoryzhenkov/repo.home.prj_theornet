/**
 * Shared slug/URL utilities. Single source of truth for slug ↔ href conversion.
 */

/** Convert a page slug to its URL href (with trailing slash). */
export function slugToHref(slug: string): string {
  return slug === 'index' ? '/' : `/${slug}/`;
}

/** Convert a URL path to a page slug. */
export function pathToSlug(path: string): string {
  if (path === '/') return 'index';
  return path.replace(/^\//, '').replace(/\/$/, '');
}

/**
 * Wiki-link pattern: optional `relation::` prefix, slug, optional `|alias`.
 * Groups: [1] relation (optional), [2] slug, [3] alias (optional).
 */
export const WIKILINK_PATTERN = /(?:(\w+)::)?\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g;
