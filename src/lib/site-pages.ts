import { getCollection, type CollectionEntry } from 'astro:content';
import { marked } from 'marked';
import type { PageInput } from './relations';

export interface LocalPageEntry extends PageInput {
  id: string;
  html: string;
  body: string;
  data: CollectionEntry<'pages'>['data'];
}

let localPagesCache: Promise<LocalPageEntry[]> | null = null;

function pageBody(entry: CollectionEntry<'pages'>): string {
  const body = 'body' in entry && typeof entry.body === 'string' ? entry.body : '';
  return body
    .replace(/&#123;/g, '{')
    .replace(/&#125;/g, '}')
    .trim();
}

function renderPageMarkdown(body: string): string {
  const shortcodes: string[] = [];
  const protectedBody = body.replace(
    /::(content-table|notes-feed|link-cards)\\?\{([^\n}]*)\\?\}/g,
    (_full, name: string, attrs: string) => {
      const token = `@@HOME_SHORTCODE_${shortcodes.length}@@`;
      shortcodes.push(`::${name}{${attrs}}`);
      return token;
    },
  );

  let html = marked.parse(protectedBody, { async: false });
  shortcodes.forEach((shortcode, index) => {
    const token = `@@HOME_SHORTCODE_${index}@@`;
    html = html.replace(`<p>${token}</p>`, `<p>${shortcode}</p>`).replace(token, shortcode);
  });
  return html;
}

export async function getLocalPages(): Promise<LocalPageEntry[]> {
  if (localPagesCache) return localPagesCache;

  localPagesCache = (async () => {
    const entries = await getCollection('pages');
    return entries.map((entry) => {
      const body = pageBody(entry);
      const html = entry.rendered?.html ?? renderPageMarkdown(body);
      return {
        id: entry.id,
        html,
        body,
        data: entry.data,
      };
    });
  })();

  return localPagesCache;
}

export async function getLocalPageSlugs(): Promise<Set<string>> {
  return new Set((await getLocalPages()).map((entry) => entry.id));
}

export async function getSiteRouteEntries(): Promise<LocalPageEntry[]> {
  return getLocalPages();
}

export async function getSiteRouteEntry(slug: string): Promise<LocalPageEntry | undefined> {
  const entries = await getSiteRouteEntries();
  return entries.find((entry) => entry.id === slug);
}

export async function getAllSitePageInputs(): Promise<PageInput[]> {
  return await getLocalPages();
}
