export interface HtmlBlock {
  type: 'html';
  html: string;
}

export interface ContentTableBlock {
  type: 'content-table';
  path?: string;
  classSlug?: string;
}

export type HomeContentBlock = HtmlBlock | ContentTableBlock;

function parseAttributes(raw: string): Record<string, string> {
  const attrs: Record<string, string> = {};
  for (const match of raw.matchAll(/([A-Za-z_][A-Za-z0-9_-]*)\s*=\s*("([^"]*)"|'([^']*)')/g)) {
    attrs[match[1]] = match[3] ?? match[4] ?? '';
  }
  return attrs;
}

function contentTableBlock(rawAttributes: string): ContentTableBlock {
  const attrs = parseAttributes(rawAttributes);
  return {
    type: 'content-table',
    ...(attrs.path ? { path: attrs.path } : {}),
    ...(attrs.classSlug ? { classSlug: attrs.classSlug } : {}),
  };
}

export function parseHomeShortcodes(html: string): HomeContentBlock[] {
  const blocks: HomeContentBlock[] = [];
  const shortcodePattern = /<p>\s*::content-table\{([^}]*)\}\s*<\/p>|::content-table\{([^}]*)\}/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = shortcodePattern.exec(html)) !== null) {
    if (match.index > lastIndex) {
      blocks.push({ type: 'html', html: html.slice(lastIndex, match.index) });
    }

    blocks.push(contentTableBlock(match[1] ?? match[2] ?? ''));
    lastIndex = shortcodePattern.lastIndex;
  }

  if (lastIndex < html.length) {
    blocks.push({ type: 'html', html: html.slice(lastIndex) });
  }

  return blocks.filter((block) => block.type !== 'html' || block.html.trim().length > 0);
}
