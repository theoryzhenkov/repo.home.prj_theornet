#!/usr/bin/env bun
import { spawnSync } from 'node:child_process';
import { createInterface } from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';
import {
  archivePage,
  CONTENT_ROOT,
  createPage,
  deletePage,
  listPages,
  pageExists,
  slugToContentPath,
  type NewPageInput,
} from '../src/lib/content-admin';

interface ParsedArgs {
  command?: string;
  flags: Map<string, string | boolean>;
  positionals: string[];
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));

  switch (args.command) {
    case 'new':
      await newCommand(args);
      break;
    case 'list':
      await listCommand();
      break;
    case 'edit':
      await editCommand(args);
      break;
    case 'archive':
      await archiveCommand(args);
      break;
    case 'delete':
      await deleteCommand(args);
      break;
    case 'help':
    case undefined:
      printHelp();
      break;
    default:
      throw new Error(`Unknown content command: ${args.command}`);
  }
}

async function newCommand(args: ParsedArgs): Promise<void> {
  const interactive = !args.flags.has('no-input');
  const rl = interactive ? createInterface({ input, output }) : undefined;

  try {
    const path = await getStringFlag(args, rl, 'path', 'Path relative to src/content/pages');
    const name = await getStringFlag(args, rl, 'name', 'Name');

    const input: NewPageInput = {
      path,
      name,
      today: today(),
    };

    const page = await createPage(CONTENT_ROOT, input);
    console.log(`Created ${slugToContentPath(CONTENT_ROOT, page.slug)}`);
  } finally {
    rl?.close();
  }
}

async function listCommand(): Promise<void> {
  const pages = await listPages(CONTENT_ROOT);
  for (const page of pages) {
    const bits = [page.slug, `— ${page.title}`];
    if (page.maturity) bits.push(`[${page.maturity}]`);
    if (page.description) bits.push(`— ${page.description}`);
    console.log(bits.join(' '));
  }
}

async function editCommand(args: ParsedArgs): Promise<void> {
  const slug = args.positionals[0] ?? await promptForSlug('Edit page slug');
  if (!await pageExists(CONTENT_ROOT, slug)) {
    throw new Error(`Page does not exist: ${slug}`);
  }

  const editor = process.env.EDITOR ?? process.env.VISUAL;
  if (!editor) {
    throw new Error('Set EDITOR or VISUAL to use content edit.');
  }

  const result = spawnSync(editor, [slugToContentPath(CONTENT_ROOT, slug)], { stdio: 'inherit' });
  if (result.status !== 0) {
    throw new Error(`Editor exited with status ${result.status}.`);
  }
}

async function archiveCommand(args: ParsedArgs): Promise<void> {
  const slug = args.positionals[0] ?? await promptForSlug('Archive page slug');
  const destination = await archivePage(CONTENT_ROOT, 'archive', slug, today());
  console.log(`Archived ${slug} -> ${destination}`);
}

async function deleteCommand(args: ParsedArgs): Promise<void> {
  const slug = args.positionals[0] ?? await promptForSlug('Delete page slug');
  if (!args.flags.has('force')) {
    throw new Error('Refusing to delete without --force. Use `content archive` unless you really want a hard delete.');
  }

  await deletePage(CONTENT_ROOT, slug);
  console.log(`Deleted ${slug}`);
}

async function promptForSlug(label: string): Promise<string> {
  const pages = await listPages(CONTENT_ROOT);
  for (const page of pages) {
    console.log(`${page.slug} — ${page.title}`);
  }

  const rl = createInterface({ input, output });
  try {
    const slug = (await rl.question(`${label}: `)).trim();
    if (!slug) throw new Error('Slug is required.');
    return slug;
  } finally {
    rl.close();
  }
}

async function getStringFlag(args: ParsedArgs, rl: ReturnType<typeof createInterface> | undefined, name: string, label: string): Promise<string> {
  const value = args.flags.get(name);
  if (typeof value === 'string' && value.trim()) return value.trim();
  if (!rl) throw new Error(`Missing required --${name}.`);

  const answer = (await rl.question(`${label}: `)).trim();
  if (!answer) throw new Error(`${label} is required.`);
  return answer;
}

function parseArgs(argv: string[]): ParsedArgs {
  const [command, ...rest] = argv;
  const flags = new Map<string, string | boolean>();
  const positionals: string[] = [];

  for (let index = 0; index < rest.length; index += 1) {
    const arg = rest[index];
    if (!arg.startsWith('--')) {
      positionals.push(arg);
      continue;
    }

    const [rawName, inlineValue] = arg.slice(2).split('=', 2);
    if (inlineValue !== undefined) {
      flags.set(rawName, inlineValue);
      continue;
    }

    const next = rest[index + 1];
    if (next && !next.startsWith('--')) {
      flags.set(rawName, next);
      index += 1;
    } else {
      flags.set(rawName, true);
    }
  }

  return { command, flags, positionals };
}

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

function printHelp(): void {
  console.log(`Usage: bun run scripts/content.ts <command> [options]

Commands:
  new       Create a page with blank relation metadata
  list      List content pages
  edit      Open a page in $EDITOR
  archive   Move a page to archive/deleted-pages-YYYY-MM-DD
  delete    Hard-delete a page; requires --force

Examples:
  bun run scripts/content.ts new --path small-thought --name "Small Thought"
  bun run scripts/content.ts list
  bun run scripts/content.ts edit small-thought
  bun run scripts/content.ts archive small-thought
`);
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`content: ${message}`);
  process.exit(1);
});
