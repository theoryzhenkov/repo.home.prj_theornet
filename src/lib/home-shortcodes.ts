export interface HtmlBlock {
  type: 'html';
  html: string;
}

export interface ContentTableBlock {
  type: 'content-table';
  path?: string;
  classSlug?: string;
}

export interface NotesFeedBlock {
  type: 'notes-feed';
}

export interface LinkCardsBlock {
  type: 'link-cards';
  links: { kind: string; href: string }[];
}

export type HomeContentBlock = HtmlBlock | ContentTableBlock | NotesFeedBlock | LinkCardsBlock;

function decodeHtmlEntities(value: string): string {
  return value
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');
}

function parseAttributes(raw: string): Record<string, string> {
  const attrs: Record<string, string> = {};
  for (const match of decodeHtmlEntities(raw).matchAll(/([A-Za-z_][A-Za-z0-9_-]*)\s*=\s*("([^"]*)"|'([^']*)')/g)) {
    attrs[match[1]] = match[3] ?? match[4] ?? '';
  }
  return attrs;
}

function blockFor(name: string, rawAttributes: string): Exclude<HomeContentBlock, HtmlBlock> {
  const attrs = parseAttributes(rawAttributes);
  if (name === 'content-table') {
    return {
      type: 'content-table',
      ...(attrs.path ? { path: attrs.path } : {}),
      ...(attrs.classSlug ? { classSlug: attrs.classSlug } : {}),
    };
  }
  if (name === 'notes-feed') {
    return { type: 'notes-feed' };
  }

  return {
    type: 'link-cards',
    links: Object.entries(attrs).map(([kind, href]) => ({ kind, href })),
  };
}

export function parseHomeShortcodes(html: string): HomeContentBlock[] {
  const blocks: HomeContentBlock[] = [];
  const shortcodePattern = /<p>\s*::(content-table|notes-feed|link-cards)\\?\{([\s\S]*?)\\?\}\s*<\/p>|::(content-table|notes-feed|link-cards)\\?\{([\s\S]*?)\\?\}/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = shortcodePattern.exec(html)) !== null) {
    if (match.index > lastIndex) {
      blocks.push({ type: 'html', html: html.slice(lastIndex, match.index) });
    }

    blocks.push(blockFor(match[1] ?? match[3], match[2] ?? match[4] ?? ''));
    lastIndex = shortcodePattern.lastIndex;
  }

  if (lastIndex < html.length) {
    blocks.push({ type: 'html', html: html.slice(lastIndex) });
  }

  return blocks.filter((block) => block.type !== 'html' || block.html.trim().length > 0);
}
