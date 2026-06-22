import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { dump as dumpYaml } from 'js-yaml';
import { getGhostHomeEntries, type GhostHomeEntry } from '../src/lib/ghost';

const CONTENT_ROOT = new URL('../src/content/pages/', import.meta.url);

function isoDate(value: Date | undefined): string | undefined {
  if (!value) return undefined;
  return value.toISOString().slice(0, 10);
}

function frontmatterFor(entry: GhostHomeEntry): Record<string, unknown> {
  const { data } = entry;
  return {
    ...data,
    created: isoDate(data.created),
    ...(data.modified ? { modified: isoDate(data.modified) } : {}),
    source: entry.source,
    source_id: entry.id,
    source_url: entry.sourceUrl,
  };
}

function filePathForSlug(slug: string): string {
  const normalized = slug === '' ? 'index' : slug.replace(/^\/+|\/+$/g, '');
  return join(CONTENT_ROOT.pathname, `${normalized}.mdx`);
}

const MDX_VOID_TAGS = [
  'area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta',
  'param', 'source', 'track', 'wbr',
];

function normalizeHtmlForMdx(html: string): string {
  let normalized = html;
  for (const tag of MDX_VOID_TAGS) {
    const pattern = new RegExp(`<${tag}\\b([^>]*?)(?<!/)>(?!</${tag}>)`, 'gi');
    normalized = normalized.replace(pattern, (_match, attrs: string) => `<${tag}${attrs} />`);
  }
  return normalized
    .replace(/\{/g, '&#123;')
    .replace(/\}/g, '&#125;');
}

function mdxFor(entry: GhostHomeEntry): string {
  const yaml = dumpYaml(frontmatterFor(entry), {
    lineWidth: 100,
    noRefs: true,
    sortKeys: false,
  }).trimEnd();

  return `---\n${yaml}\n---\n\n${normalizeHtmlForMdx(entry.html).trim()}\n`;
}

async function main(): Promise<void> {
  const entries = await getGhostHomeEntries();
  if (entries.length === 0) {
    throw new Error('Ghost export returned no pages/posts. Is GHOST_CONTENT_API_KEY set?');
  }

  for (const entry of entries.sort((a, b) => a.id.localeCompare(b.id))) {
    const path = filePathForSlug(entry.id);
    await mkdir(dirname(path), { recursive: true });
    await writeFile(path, mdxFor(entry));
    console.error(`wrote ${entry.id} -> ${path}`);
  }

  console.error(`exported ${entries.length} Ghost pages/posts to MDX`);
}

await main();
