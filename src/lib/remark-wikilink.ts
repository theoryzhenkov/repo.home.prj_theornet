import type { Root, Text } from 'mdast';
import type { Plugin } from 'unified';
import { visit } from 'unist-util-visit';
import { WIKILINK_PATTERN, slugToHref } from './slugs';

const remarkWikilink: Plugin<[], Root> = () => {
  return (tree) => {
    visit(tree, 'text', (node: Text, index, parent) => {
      if (!parent || index === undefined) return;

      const matches = [...node.value.matchAll(WIKILINK_PATTERN)];
      if (matches.length === 0) return;

      const children: (Text | { type: 'html'; value: string })[] = [];
      let lastEnd = 0;

      for (const match of matches) {
        const start = match.index!;
        const slug = match[2].trim();
        const alias = match[3]?.trim();
        const href = slugToHref(slug);
        const display = alias ?? slug;

        if (start > lastEnd) {
          children.push({ type: 'text', value: node.value.slice(lastEnd, start) });
        }

        children.push({ type: 'html', value: `<a href="${href}">${display}</a>` });
        lastEnd = start + match[0].length;
      }

      if (lastEnd < node.value.length) {
        children.push({ type: 'text', value: node.value.slice(lastEnd) });
      }

      parent.children.splice(index, 1, ...children);
    });
  };
};

export default remarkWikilink;
