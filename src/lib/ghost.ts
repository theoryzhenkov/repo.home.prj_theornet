import { load as loadYaml } from 'js-yaml';
import { pathToSlug } from './slugs';
import type { PageInput, RawRelationEntry, RawRelations } from './relations';

const DEFAULT_CONTENT_API_URL = 'https://ghost.theor.net/ghost/api/content';
const DEFAULT_OUTBOX_URL = 'https://ghost.theor.net/.ghost/activitypub/outbox/index';
const PUBLIC_AUDIENCE_VALUES = new Set([
  'as:Public',
  'Public',
  'https://www.w3.org/ns/activitystreams#Public',
]);

export type GhostHomeSource = 'ghost-page' | 'ghost-post';

export interface GhostContentItem {
  id: string;
  uuid?: string;
  title: string;
  slug: string;
  html?: string | null;
  excerpt?: string | null;
  custom_excerpt?: string | null;
  frontmatter?: string | null;
  url?: string | null;
  created_at?: string | null;
  published_at?: string | null;
  updated_at?: string | null;
}

interface GhostCollectionResponse<T> {
  posts?: T[];
  pages?: T[];
  meta?: {
    pagination?: {
      page: number;
      pages: number;
    };
  };
}

export interface GhostPageData extends RawRelations {
  title: string;
  description?: string;
  created: Date;
  modified?: Date;
  maturity?: 'stub' | 'rough' | 'developed';
  source_url?: string;
}

export interface GhostHomeEntry extends PageInput {
  id: string;
  source: GhostHomeSource;
  sourceUrl: string;
  html: string;
  data: GhostPageData;
}

export interface ActivityPubObject {
  id?: string;
  type?: string;
  content?: string;
  published?: string;
  updated?: string;
  url?: string;
  to?: string | string[];
  cc?: string | string[];
  inReplyTo?: string | null;
}

export interface ActivityPubActivity {
  id?: string;
  type?: string;
  object?: ActivityPubObject | string;
  to?: string | string[];
  cc?: string | string[];
}

interface ActivityPubCollection {
  first?: string;
  next?: string;
  orderedItems?: ActivityPubActivity[];
}

export interface GhostNote {
  id: string;
  sourceUrl: string;
  contentHtml: string;
  published: Date;
  updated?: Date;
}

let ghostEntriesCache: Promise<GhostHomeEntry[]> | null = null;
let ghostNotesCache: Promise<GhostNote[]> | null = null;

function env(name: string): string | undefined {
  const value = process.env[name];
  return value && value.trim() ? value.trim() : undefined;
}

function ghostContentApiUrl(): string {
  return env('GHOST_CONTENT_API_URL') ?? DEFAULT_CONTENT_API_URL;
}

function ghostContentApiKey(): string | undefined {
  return env('GHOST_CONTENT_API_KEY');
}

function ghostOutboxUrl(): string {
  return env('GHOST_ACTIVITYPUB_OUTBOX_URL') ?? DEFAULT_OUTBOX_URL;
}

function stripFrontmatterFence(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed.startsWith('---')) return trimmed;

  const lines = trimmed.split(/\r?\n/);
  if (lines[0].trim() !== '---') return trimmed;

  const closingIndex = lines.findIndex((line, index) => index > 0 && line.trim() === '---');
  if (closingIndex === -1) {
    return lines.slice(1).join('\n').trim();
  }

  return lines.slice(1, closingIndex).join('\n').trim();
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value));
}

export function parseGhostFrontmatter(raw?: string | null): Record<string, unknown> {
  if (!raw || !raw.trim()) return {};

  const body = stripFrontmatterFence(raw);
  if (!body) return {};

  const parsed = body.trim().startsWith('{')
    ? JSON.parse(body)
    : loadYaml(body);

  if (parsed === undefined || parsed === null) return {};
  if (!isRecord(parsed)) {
    throw new Error('Ghost frontmatter must parse to an object.');
  }

  return parsed;
}

function stringValue(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

function dateValue(value: unknown): Date | undefined {
  const raw = value instanceof Date ? value.toISOString() : stringValue(value);
  if (!raw) return undefined;

  const date = new Date(raw);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

function maturityValue(value: unknown): 'stub' | 'rough' | 'developed' | undefined {
  return value === 'stub' || value === 'rough' || value === 'developed' ? value : undefined;
}

function slugFromPath(value: unknown): string | undefined {
  const raw = stringValue(value);
  if (!raw) return undefined;
  return pathToSlug(raw.startsWith('/') ? raw : `/${raw}`);
}

function relationEntry(value: unknown): RawRelationEntry | undefined {
  if (typeof value === 'string' && value.trim()) {
    return { page: value.trim() };
  }

  if (!isRecord(value)) return undefined;

  const page = stringValue(value.page);
  if (!page) return undefined;

  const label = stringValue(value.label);
  return { page, ...(label ? { label } : {}) };
}

function relationList(value: unknown): RawRelationEntry[] | undefined {
  if (value === undefined || value === null) return undefined;

  const values = Array.isArray(value) ? value : [value];
  const entries = values.flatMap((item) => {
    const entry = relationEntry(item);
    return entry ? [entry] : [];
  });

  return entries.length > 0 ? entries : undefined;
}

function rawRelationsFromFrontmatter(frontmatter: Record<string, unknown>): RawRelations {
  const relations: RawRelations = {};
  for (const key of [
    'up', 'down', 'is', 'has', 'subclass_of', 'superclass_of',
    'part_of', 'has_part', 'subject', 'subject_of', 'creator', 'creator_of', 'related',
  ] as const) {
    const list = relationList(frontmatter[key]);
    if (list) relations[key] = list;
  }

  const next = stringValue(frontmatter.next);
  const prev = stringValue(frontmatter.prev);
  if (next) relations.next = next;
  if (prev) relations.prev = prev;

  const ref = Array.isArray(frontmatter.ref)
    ? frontmatter.ref.filter((item): item is string => typeof item === 'string')
    : undefined;
  const refi = Array.isArray(frontmatter.refi)
    ? frontmatter.refi.filter((item): item is string => typeof item === 'string')
    : undefined;
  if (ref?.length) relations.ref = ref;
  if (refi?.length) relations.refi = refi;

  return relations;
}

function stripHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

function fallbackDate(item: GhostContentItem): Date {
  const raw = item.published_at ?? item.created_at ?? item.updated_at;
  const date = raw ? new Date(raw) : new Date();
  return Number.isNaN(date.getTime()) ? new Date() : date;
}

function defaultRelationsFor(source: GhostHomeSource): RawRelations {
  if (source === 'ghost-post') {
    return {
      part_of: [{ page: 'blog' }],
      is: [{ page: 'classes/blog-note' }],
    };
  }

  return {
    part_of: [{ page: 'index' }],
    is: [{ page: 'classes/page' }],
  };
}

export function ghostContentToHomeEntry(item: GhostContentItem, source: GhostHomeSource): GhostHomeEntry {
  const frontmatter = parseGhostFrontmatter(item.frontmatter);
  const defaultRelations = defaultRelationsFor(source);
  const frontmatterRelations = rawRelationsFromFrontmatter(frontmatter);
  const html = item.html ?? '';
  const slug = slugFromPath(frontmatter.homePath)
    ?? slugFromPath(frontmatter.home_path)
    ?? slugFromPath(frontmatter.homeSlug)
    ?? slugFromPath(frontmatter.home_slug)
    ?? (source === 'ghost-post' ? `blog/${item.slug}` : item.slug);

  const title = stringValue(frontmatter.title) ?? item.title;
  const description = stringValue(frontmatter.description)
    ?? item.custom_excerpt
    ?? item.excerpt
    ?? undefined;
  const created = dateValue(frontmatter.created) ?? fallbackDate(item);
  const modified = dateValue(frontmatter.modified)
    ?? dateValue(frontmatter.updated)
    ?? (item.updated_at ? new Date(item.updated_at) : undefined);

  return {
    id: slug,
    source,
    sourceUrl: item.url ?? `https://ghost.theor.net/${item.slug}/`,
    html,
    body: stripHtml(html),
    data: {
      ...defaultRelations,
      ...frontmatterRelations,
      title,
      ...(description ? { description } : {}),
      created,
      ...(modified && !Number.isNaN(modified.getTime()) ? { modified } : {}),
      ...(maturityValue(frontmatter.maturity) ? { maturity: maturityValue(frontmatter.maturity) } : {}),
      source_url: item.url ?? undefined,
    },
  };
}

async function fetchGhostCollection(resource: 'posts' | 'pages'): Promise<GhostContentItem[]> {
  const key = ghostContentApiKey();
  if (!key) return [];

  const items: GhostContentItem[] = [];
  let page = 1;
  let pageCount = 1;

  do {
    const url = new URL(`${ghostContentApiUrl().replace(/\/$/, '')}/${resource}/`);
    url.searchParams.set('key', key);
    url.searchParams.set('formats', 'html');
    url.searchParams.set('include', 'tags,authors');
    url.searchParams.set('limit', '100');
    url.searchParams.set('page', String(page));
    url.searchParams.set('order', resource === 'posts' ? 'published_at desc' : 'title asc');

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Ghost Content API ${resource} request failed: ${response.status} ${response.statusText}`);
    }

    const payload = await response.json() as GhostCollectionResponse<GhostContentItem>;
    const pageItems = payload[resource] ?? [];
    items.push(...pageItems);

    pageCount = payload.meta?.pagination?.pages ?? page;
    page += 1;
  } while (page <= pageCount);

  return items;
}

export async function getGhostHomeEntries(): Promise<GhostHomeEntry[]> {
  if (ghostEntriesCache) return ghostEntriesCache;

  ghostEntriesCache = (async () => {
    const [posts, pages] = await Promise.all([
      fetchGhostCollection('posts'),
      fetchGhostCollection('pages'),
    ]);

    return [
      ...pages.map((page) => ghostContentToHomeEntry(page, 'ghost-page')),
      ...posts.map((post) => ghostContentToHomeEntry(post, 'ghost-post')),
    ];
  })();

  return ghostEntriesCache;
}

export function filterGhostEntriesForLocalSlugs(entries: GhostHomeEntry[], localSlugs: Set<string>): GhostHomeEntry[] {
  return entries.filter((entry) => !localSlugs.has(entry.id));
}

async function fetchActivityPubJson(url: string): Promise<ActivityPubCollection> {
  const response = await fetch(url, {
    headers: {
      Accept: 'application/activity+json, application/ld+json, application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`Ghost ActivityPub outbox request failed: ${response.status} ${response.statusText}`);
  }

  return await response.json() as ActivityPubCollection;
}

function audienceIncludesPublic(value: string | string[] | undefined): boolean {
  if (!value) return false;
  const values = Array.isArray(value) ? value : [value];
  return values.some((item) => PUBLIC_AUDIENCE_VALUES.has(item));
}

export function activityPubActivitiesToNotes(activities: ActivityPubActivity[]): GhostNote[] {
  return activities.flatMap((activity) => {
    if (activity.type !== 'Create' || !activity.object || typeof activity.object === 'string') return [];

    const object = activity.object;
    if (object.type !== 'Note' || !object.id || !object.content || !object.published) return [];

    const isPublic = audienceIncludesPublic(object.to) || audienceIncludesPublic(activity.to);
    if (!isPublic) return [];

    const published = new Date(object.published);
    if (Number.isNaN(published.getTime())) return [];

    const updated = object.updated ? new Date(object.updated) : undefined;

    return [{
      id: object.id,
      sourceUrl: object.url ?? object.id,
      contentHtml: object.content,
      published,
      ...(updated && !Number.isNaN(updated.getTime()) ? { updated } : {}),
    }];
  }).sort((a, b) => b.published.getTime() - a.published.getTime());
}

export async function getGhostNotes(): Promise<GhostNote[]> {
  if (ghostNotesCache) return ghostNotesCache;

  ghostNotesCache = (async () => {
    const collection = await fetchActivityPubJson(ghostOutboxUrl());
    const firstPageUrl = collection.first ?? ghostOutboxUrl();
    const seen = new Set<string>();
    const activities: ActivityPubActivity[] = [];
    let nextUrl: string | undefined = firstPageUrl;

    while (nextUrl && !seen.has(nextUrl)) {
      seen.add(nextUrl);
      const page = await fetchActivityPubJson(nextUrl);
      if (Array.isArray(page.orderedItems)) {
        activities.push(...page.orderedItems);
      }
      nextUrl = page.next;
    }

    return activityPubActivitiesToNotes(activities);
  })();

  return ghostNotesCache;
}

function slugifyHeading(text: string): string {
  const slug = stripHtml(text)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
  return slug || 'section';
}

export function addHeadingIds(html: string): string {
  const counts = new Map<string, number>();

  return html.replace(/<h([2-3])([^>]*)>([\s\S]*?)<\/h\1>/gi, (full, depth: string, attrs: string, content: string) => {
    if (/\sid=("[^"]+"|'[^']+'|[^\s>]+)/i.test(attrs)) return full;

    const base = slugifyHeading(content);
    const count = counts.get(base) ?? 0;
    counts.set(base, count + 1);
    const id = count === 0 ? base : `${base}-${count + 1}`;

    return `<h${depth}${attrs} id="${id}">${content}</h${depth}>`;
  });
}

export function extractHtmlHeadings(html: string): { depth: number; slug: string; text: string; wordCount?: number }[] {
  const withIds = addHeadingIds(html);
  const headings: { depth: number; slug: string; text: string; position: number }[] = [];
  const regex = /<h([2-3])([^>]*)id="([^"]+)"[^>]*>([\s\S]*?)<\/h\1>/gi;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(withIds)) !== null) {
    headings.push({
      depth: Number(match[1]),
      slug: match[3],
      text: stripHtml(match[4]),
      position: match.index,
    });
  }

  return headings.map((heading, index) => {
    let end = withIds.length;
    for (let i = index + 1; i < headings.length; i += 1) {
      if (headings[i].depth <= heading.depth) {
        end = headings[i].position;
        break;
      }
    }

    const sectionText = stripHtml(withIds.slice(heading.position, end));
    const wordCount = sectionText ? sectionText.split(/\s+/).length : 0;
    return {
      depth: heading.depth,
      slug: heading.slug,
      text: heading.text,
      wordCount,
    };
  });
}

export function estimateHtmlReadTimeMinutes(html: string): number {
  const text = stripHtml(html);
  const words = text ? text.split(/\s+/).length : 0;
  return Math.max(1, Math.round(words / 238));
}
