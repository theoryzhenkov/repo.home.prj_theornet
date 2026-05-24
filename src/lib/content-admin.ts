import { mkdir, readdir, readFile, rename, rm, stat, writeFile } from 'node:fs/promises';
import { dirname, join, relative } from 'node:path';

export const CONTENT_ROOT = 'src/content/pages';

export interface RelationEntry {
  page: string;
  label?: string;
}

export interface NewPageInput {
  path: string;
  name: string;
  today: string;
}

export interface RenderedPage {
  slug: string;
  content: string;
}

export interface PageSummary {
  slug: string;
  title: string;
  description?: string;
  maturity?: string;
  created?: string;
  path: string;
}

export function slugifyTitle(title: string): string {
  return title
    .trim()
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9/]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^[-/]+|[-/]+$/g, '');
}

export function normalizePagePath(path: string): string {
  const trimmedPath = path.trim().replaceAll('\\', '/').replace(/\.mdx$/, '');
  if (trimmedPath.startsWith('/')) {
    throw new Error('Path must be relative to the pages directory.');
  }
  if (trimmedPath.split('/').includes('..')) {
    throw new Error('Path cannot contain parent directory segments.');
  }

  const cleanPath = slugifyTitle(trimmedPath);
  if (!cleanPath) {
    throw new Error('Path cannot be empty.');
  }

  return cleanPath;
}

export function slugToContentPath(contentRoot: string, slug: string): string {
  return join(contentRoot, `${slug}.mdx`);
}

export function pathToSlug(contentRoot: string, path: string): string {
  const rel = relative(contentRoot, path).replaceAll('\\', '/');
  return rel.replace(/\.mdx$/, '');
}

export function renderNewPage(input: NewPageInput): RenderedPage {
  const slug = normalizePagePath(input.path);
  const lines = [
    '---',
    `title: ${yamlScalar(input.name)}`,
    'description: ""',
    `created: ${input.today}`,
    'part_of: []',
    'is: []',
    'subject: []',
    '---',
    '',
  ];

  return { slug, content: `${lines.join('\n')}\n` };
}

export async function createPage(contentRoot: string, input: NewPageInput): Promise<RenderedPage> {
  const page = renderNewPage(input);
  const path = slugToContentPath(contentRoot, page.slug);

  if (await exists(path)) {
    throw new Error(`Page already exists: ${page.slug}`);
  }

  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, page.content, 'utf8');
  return page;
}

export async function listPages(contentRoot: string): Promise<PageSummary[]> {
  const paths = await findMdxFiles(contentRoot);
  const pages = await Promise.all(paths.map(async (path) => {
    const content = await readFile(path, 'utf8');
    const frontmatter = parseFrontmatter(content);
    return {
      slug: pathToSlug(contentRoot, path),
      title: frontmatter.title ?? pathToSlug(contentRoot, path),
      description: frontmatter.description,
      maturity: frontmatter.maturity,
      created: frontmatter.created,
      path,
    } satisfies PageSummary;
  }));

  return pages.sort((a, b) => a.slug.localeCompare(b.slug));
}

export async function archivePage(contentRoot: string, archiveRoot: string, slug: string, today: string): Promise<string> {
  const source = slugToContentPath(contentRoot, slug);
  if (!await exists(source)) {
    throw new Error(`Page does not exist: ${slug}`);
  }

  const destination = join(archiveRoot, `deleted-pages-${today}`, `${slug}.mdx`);
  if (await exists(destination)) {
    throw new Error(`Archive destination already exists: ${destination}`);
  }

  await mkdir(dirname(destination), { recursive: true });
  await rename(source, destination);
  return destination;
}

export async function deletePage(contentRoot: string, slug: string): Promise<void> {
  const source = slugToContentPath(contentRoot, slug);
  if (!await exists(source)) {
    throw new Error(`Page does not exist: ${slug}`);
  }

  await rm(source);
}

export async function pageExists(contentRoot: string, slug: string): Promise<boolean> {
  return exists(slugToContentPath(contentRoot, slug));
}

async function findMdxFiles(dir: string): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true });
  const paths = await Promise.all(entries.map(async (entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return findMdxFiles(path);
    if (entry.isFile() && entry.name.endsWith('.mdx')) return [path];
    return [];
  }));

  return paths.flat();
}

async function exists(path: string): Promise<boolean> {
  try {
    await stat(path);
    return true;
  } catch (error) {
    if (error && typeof error === 'object' && 'code' in error && error.code === 'ENOENT') {
      return false;
    }
    throw error;
  }
}

function yamlScalar(value: string): string {
  return JSON.stringify(value);
}

function parseFrontmatter(content: string): Record<string, string> {
  const match = content.match(/^---\n([\s\S]*?)\n---/);
  if (!match) return {};

  const result: Record<string, string> = {};
  for (const line of match[1].split('\n')) {
    const scalar = line.match(/^([a-zA-Z_][a-zA-Z0-9_]*):\s*(.*)$/);
    if (!scalar) continue;

    const [, key, rawValue] = scalar;
    const value = rawValue.trim();
    if (value.startsWith('"') && value.endsWith('"')) {
      try {
        result[key] = JSON.parse(value) as string;
        continue;
      } catch {
        // Fall through to raw value. This is a display helper, not a YAML parser.
      }
    }
    result[key] = value;
  }

  return result;
}
