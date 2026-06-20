import { createHmac } from 'node:crypto';
import { readdir, readFile } from 'node:fs/promises';
import { join, relative } from 'node:path';
import { dump as dumpYaml, load as loadYaml } from 'js-yaml';
import { marked } from 'marked';

const CONTENT_ROOT = 'src/content/pages';
const DEFAULT_GHOST_ADMIN_API_URL = 'https://ghost.theor.net/ghost/api/admin';

interface AstroPage {
  path: string;
  slug: string;
  ghostSlug: string;
  frontmatter: Record<string, unknown>;
  body: string;
  html: string;
  title: string;
  status: 'draft' | 'published';
  componentUsages: string[];
  warnings: string[];
}

interface GhostPage {
  id: string;
  slug: string;
  updated_at: string;
}

function arg(name: string): boolean {
  return process.argv.includes(name);
}

function valueArg(name: string): string | undefined {
  const prefix = `${name}=`;
  const found = process.argv.find((item) => item.startsWith(prefix));
  return found ? found.slice(prefix.length) : undefined;
}

async function findMdxFiles(dir: string): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true });
  const nested = await Promise.all(entries.map(async (entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return findMdxFiles(path);
    if (entry.isFile() && entry.name.endsWith('.mdx')) return [path];
    return [];
  }));
  return nested.flat().sort((a, b) => a.localeCompare(b));
}

function parseFrontmatter(raw: string): { frontmatter: Record<string, unknown>; body: string } {
  const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/);
  if (!match) return { frontmatter: {}, body: raw };
  const parsed = loadYaml(match[1]);
  if (parsed !== null && parsed !== undefined && (typeof parsed !== 'object' || Array.isArray(parsed))) {
    throw new Error('Frontmatter must parse to an object');
  }
  return {
    frontmatter: (parsed ?? {}) as Record<string, unknown>,
    body: raw.slice(match[0].length),
  };
}

function slugForPath(path: string): string {
  return relative(CONTENT_ROOT, path).replaceAll('\\', '/').replace(/\.mdx$/, '');
}

function ghostSlugFor(slug: string): string {
  return slug === 'index' ? 'home' : slug.split('/').join('-');
}

function homePathFor(slug: string): string {
  return slug === 'index' ? '/' : `/${slug}/`;
}

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

function stripMdxImports(body: string): string {
  return body
    .split(/\r?\n/)
    .filter((line) => !/^import\s/.test(line.trim()))
    .join('\n')
    .trim();
}

function replaceMdxComponents(body: string): { body: string; componentUsages: string[]; warnings: string[] } {
  const componentUsages = new Set<string>();
  const warnings: string[] = [];
  let converted = body;

  converted = converted.replace(/<([A-Z][A-Za-z0-9_.]*)(\s[^>]*)?\/>/g, (full, name: string) => {
    componentUsages.add(name);
    warnings.push(`Replaced self-closing MDX component <${name} /> with an import placeholder.`);
    return `\n\n<div data-astro-import-placeholder="${escapeHtml(name)}"><strong>Astro component placeholder:</strong> ${escapeHtml(full)}</div>\n\n`;
  });

  converted = converted.replace(/<([A-Z][A-Za-z0-9_.]*)(\s[^>]*)?>[\s\S]*?<\/\1>/g, (full, name: string) => {
    componentUsages.add(name);
    warnings.push(`Replaced MDX component <${name}>...</${name}> with an import placeholder.`);
    return `\n\n<div data-astro-import-placeholder="${escapeHtml(name)}"><strong>Astro component placeholder:</strong><pre>${escapeHtml(full)}</pre></div>\n\n`;
  });

  return { body: converted, componentUsages: [...componentUsages].sort(), warnings };
}

async function markdownToHtml(markdown: string): Promise<string> {
  return await marked.parse(markdown, { async: true, gfm: true });
}

async function loadAstroPage(path: string, status: 'draft' | 'published'): Promise<AstroPage> {
  const raw = await readFile(path, 'utf8');
  const slug = slugForPath(path);
  const ghostSlug = ghostSlugFor(slug);
  const { frontmatter, body } = parseFrontmatter(raw);
  const withoutImports = stripMdxImports(body);
  const componentResult = replaceMdxComponents(withoutImports);
  const html = await markdownToHtml(componentResult.body);
  const title = typeof frontmatter.title === 'string' && frontmatter.title.trim() ? frontmatter.title.trim() : slug;

  return {
    path,
    slug,
    ghostSlug,
    frontmatter: {
      ...frontmatter,
      homePath: homePathFor(slug),
      source: 'astro-import',
      source_path: path,
      imported_from_astro_at: new Date().toISOString(),
    },
    body,
    html,
    title,
    status,
    componentUsages: componentResult.componentUsages,
    warnings: componentResult.warnings,
  };
}

function base64Url(input: Buffer | string): string {
  return Buffer.from(input).toString('base64url');
}

function adminToken(adminKey: string): string {
  const [id, secret] = adminKey.split(':');
  if (!id || !secret) throw new Error('GHOST_ADMIN_API_KEY must be in id:secret format');

  const header = { alg: 'HS256', kid: id, typ: 'JWT' };
  const now = Math.floor(Date.now() / 1000);
  const payload = { iat: now, exp: now + 5 * 60, aud: '/admin/' };
  const encoded = `${base64Url(JSON.stringify(header))}.${base64Url(JSON.stringify(payload))}`;
  const signature = createHmac('sha256', Buffer.from(secret, 'hex')).update(encoded).digest('base64url');
  return `${encoded}.${signature}`;
}

async function ghostRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  const apiUrl = (process.env.GHOST_ADMIN_API_URL ?? DEFAULT_GHOST_ADMIN_API_URL).replace(/\/$/, '');
  const key = process.env.GHOST_ADMIN_API_KEY;
  if (!key) throw new Error('GHOST_ADMIN_API_KEY is required with --execute');

  const response = await fetch(`${apiUrl}${path}`, {
    ...init,
    headers: {
      Authorization: `Ghost ${adminToken(key)}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...(init.headers ?? {}),
    },
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Ghost Admin API ${path} failed: ${response.status} ${response.statusText}\n${body.slice(0, 1000)}`);
  }

  return await response.json() as T;
}

async function findGhostPage(slug: string): Promise<GhostPage | undefined> {
  const params = new URLSearchParams({ filter: `slug:${slug}`, fields: 'id,slug,updated_at', limit: '1' });
  const payload = await ghostRequest<{ pages?: GhostPage[] }>(`/pages/?${params}`);
  return payload.pages?.[0];
}

function ghostPayload(page: AstroPage, existing?: GhostPage) {
  return {
    title: page.title,
    slug: page.ghostSlug,
    status: page.status,
    html: page.html,
    frontmatter: dumpYaml(page.frontmatter, { lineWidth: 100 }),
    ...(existing ? { updated_at: existing.updated_at } : {}),
  };
}

async function upsertGhostPage(page: AstroPage): Promise<'created' | 'updated'> {
  const existing = await findGhostPage(page.ghostSlug);
  if (existing) {
    await ghostRequest(`/pages/${existing.id}/?source=html`, {
      method: 'PUT',
      body: JSON.stringify({ pages: [ghostPayload(page, existing)] }),
    });
    return 'updated';
  }

  await ghostRequest('/pages/?source=html', {
    method: 'POST',
    body: JSON.stringify({ pages: [ghostPayload(page)] }),
  });
  return 'created';
}

function printReport(pages: AstroPage[]) {
  const componentPages = pages.filter((page) => page.componentUsages.length > 0);
  console.log(JSON.stringify({
    mode: arg('--execute') ? 'execute' : 'dry-run',
    status: arg('--publish') ? 'published' : 'draft',
    count: pages.length,
    componentPageCount: componentPages.length,
    componentPages: componentPages.map((page) => ({
      slug: page.slug,
      ghostSlug: page.ghostSlug,
      components: page.componentUsages,
      warnings: page.warnings,
    })),
    pages: pages.map((page) => ({
      slug: page.slug,
      ghostSlug: page.ghostSlug,
      title: page.title,
      homePath: page.frontmatter.homePath,
      status: page.status,
      hasComponents: page.componentUsages.length > 0,
    })),
  }, null, 2));
}

async function main() {
  const status = arg('--publish') ? 'published' : 'draft';
  const only = valueArg('--only');
  const files = (await findMdxFiles(CONTENT_ROOT)).filter((path) => {
    if (!only) return true;
    return slugForPath(path) === only;
  });
  const pages = await Promise.all(files.map((path) => loadAstroPage(path, status)));

  printReport(pages);

  if (!arg('--execute')) {
    console.error('\nDry-run only. Re-run with --execute to create/update Ghost pages. Add --publish to publish instead of drafts.');
    return;
  }

  for (const page of pages) {
    const action = await upsertGhostPage(page);
    console.error(`${action}: ${page.slug} -> Ghost page slug ${page.ghostSlug}`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
