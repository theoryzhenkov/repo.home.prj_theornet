import { describe, it, expect } from 'bun:test';
import {
  parseRelationMap,
  addUniqueTarget,
  addUnique,
  extractLinks,
  buildGraphFromPages,
  getBreadcrumbs,
  getPageRelations,
  type PageInput,
  type RelationTarget,
} from './relations';

// -- Helpers --

function makePage(id: string, overrides: Partial<PageInput> = {}): PageInput {
  return {
    id,
    data: { title: id, ...overrides.data } as PageInput['data'],
    body: overrides.body ?? '',
  };
}

const KNOWN = new Set(['alpha', 'beta', 'gamma', 'index']);

// -- parseRelationMap --

describe('parseRelationMap', () => {
  it('returns empty array for undefined', () => {
    expect(parseRelationMap(undefined)).toEqual([]);
  });

  it('parses entries with null labels', () => {
    expect(parseRelationMap({ foo: null })).toEqual([{ slug: 'foo' }]);
  });

  it('parses entries with string labels', () => {
    expect(parseRelationMap({ foo: 'bar' })).toEqual([{ slug: 'foo', label: 'bar' }]);
  });
});

// -- addUniqueTarget / addUnique --

describe('addUniqueTarget', () => {
  it('adds to empty array', () => {
    const arr: RelationTarget[] = [];
    addUniqueTarget(arr, 'x');
    expect(arr).toEqual([{ slug: 'x' }]);
  });

  it('deduplicates by slug', () => {
    const arr: RelationTarget[] = [{ slug: 'x' }];
    addUniqueTarget(arr, 'x', 'label');
    expect(arr).toHaveLength(1);
  });
});

describe('addUnique', () => {
  it('adds to empty array', () => {
    const arr: string[] = [];
    addUnique(arr, 'a');
    expect(arr).toEqual(['a']);
  });

  it('deduplicates', () => {
    const arr = ['a'];
    addUnique(arr, 'a');
    expect(arr).toEqual(['a']);
  });
});

// -- extractLinks --

describe('extractLinks', () => {
  it('extracts markdown links to known pages', () => {
    const result = extractLinks('[go](/beta)', 'alpha', KNOWN);
    expect(result.ref).toEqual(['beta']);
  });

  it('normalizes relative markdown links', () => {
    const result = extractLinks('[go](./beta)', 'alpha', KNOWN);
    expect(result.ref).toEqual(['beta']);
  });

  it('ignores external links', () => {
    const result = extractLinks('[ext](https://example.com)', 'alpha', KNOWN);
    expect(result.ref).toEqual([]);
  });

  it('ignores anchor links', () => {
    const result = extractLinks('[s](#section)', 'alpha', KNOWN);
    expect(result.ref).toEqual([]);
  });

  it('ignores mailto links', () => {
    const result = extractLinks('[e](mailto:a@b.c)', 'alpha', KNOWN);
    expect(result.ref).toEqual([]);
  });

  it('ignores self-references', () => {
    const result = extractLinks('[self](/alpha)', 'alpha', KNOWN);
    expect(result.ref).toEqual([]);
  });

  it('ignores unknown slugs', () => {
    const result = extractLinks('[x](/unknown)', 'alpha', KNOWN);
    expect(result.ref).toEqual([]);
  });

  it('deduplicates markdown links', () => {
    const result = extractLinks('[a](/beta) [b](/beta)', 'alpha', KNOWN);
    expect(result.ref).toEqual(['beta']);
  });

  it('extracts bare wiki-links as ref', () => {
    const result = extractLinks('See [[beta]]', 'alpha', KNOWN);
    expect(result.ref).toEqual(['beta']);
  });

  it('extracts wiki-link with alias as ref (slug only)', () => {
    const result = extractLinks('See [[beta|display]]', 'alpha', KNOWN);
    expect(result.ref).toEqual(['beta']);
  });

  it('treats ref:: wiki-link as plain ref', () => {
    const result = extractLinks('ref::[[beta]]', 'alpha', KNOWN);
    expect(result.ref).toEqual(['beta']);
    expect(result.typed).toEqual([]);
  });

  it('routes typed wiki-links to typed array', () => {
    const result = extractLinks('up::[[beta]]', 'alpha', KNOWN);
    expect(result.ref).toEqual([]);
    expect(result.typed).toEqual([{ relation: 'up', slug: 'beta' }]);
  });

  it('handles mixed markdown and wiki-links', () => {
    const result = extractLinks('[a](/beta) and [[gamma]]', 'alpha', KNOWN);
    expect(result.ref).toContain('beta');
    expect(result.ref).toContain('gamma');
  });

  it('deduplicates across markdown and wiki-links', () => {
    const result = extractLinks('[a](/beta) [[beta]]', 'alpha', KNOWN);
    expect(result.ref).toEqual(['beta']);
  });

  it('ignores wiki-links to unknown slugs', () => {
    const result = extractLinks('[[unknown]]', 'alpha', KNOWN);
    expect(result.ref).toEqual([]);
  });

  it('ignores wiki-link self-references', () => {
    const result = extractLinks('[[alpha]]', 'alpha', KNOWN);
    expect(result.ref).toEqual([]);
  });
});

// -- buildGraphFromPages --

describe('buildGraphFromPages', () => {
  it('infers down from up', () => {
    const { graph } = buildGraphFromPages([
      makePage('child', { data: { title: 'Child', up: { parent: null } } }),
      makePage('parent'),
    ]);
    expect(graph.get('parent')!.down.map(t => t.slug)).toContain('child');
  });

  it('infers has from is', () => {
    const { graph } = buildGraphFromPages([
      makePage('item', { data: { title: 'Item', is: { category: null } } }),
      makePage('category'),
    ]);
    expect(graph.get('category')!.has.map(t => t.slug)).toContain('item');
  });

  it('infers prev from next', () => {
    const { graph } = buildGraphFromPages([
      makePage('a', { data: { title: 'A', next: 'b' } }),
      makePage('b'),
    ]);
    expect(graph.get('b')!.prev).toBe('a');
  });

  it('infers next from prev', () => {
    const { graph } = buildGraphFromPages([
      makePage('a'),
      makePage('b', { data: { title: 'B', prev: 'a' } }),
    ]);
    expect(graph.get('a')!.next).toBe('b');
  });

  it('infers refi from ref (markdown link)', () => {
    const { graph } = buildGraphFromPages([
      makePage('a', { body: '[link](/b)' }),
      makePage('b'),
    ]);
    expect(graph.get('a')!.ref).toContain('b');
    expect(graph.get('b')!.refi).toContain('a');
  });

  it('infers ref from frontmatter refi', () => {
    const { graph } = buildGraphFromPages([
      makePage('a', { data: { title: 'A', refi: ['b'] } }),
      makePage('b'),
    ]);
    expect(graph.get('a')!.refi).toContain('b');
    expect(graph.get('b')!.ref).toContain('a');
  });

  it('merges frontmatter ref with auto-extracted refs', () => {
    const { graph } = buildGraphFromPages([
      makePage('a', { data: { title: 'A', ref: ['c'] }, body: '[link](/b)' }),
      makePage('b'),
      makePage('c'),
    ]);
    expect(graph.get('a')!.ref).toContain('b');
    expect(graph.get('a')!.ref).toContain('c');
  });

  it('routes up:: wiki-links to up relation', () => {
    const { graph } = buildGraphFromPages([
      makePage('child', { body: 'up::[[parent]]' }),
      makePage('parent'),
    ]);
    expect(graph.get('child')!.up.map(t => t.slug)).toContain('parent');
    expect(graph.get('parent')!.down.map(t => t.slug)).toContain('child');
  });

  it('routes is:: wiki-links to is relation', () => {
    const { graph } = buildGraphFromPages([
      makePage('item', { body: 'is::[[category]]' }),
      makePage('category'),
    ]);
    expect(graph.get('item')!.is.map(t => t.slug)).toContain('category');
    expect(graph.get('category')!.has.map(t => t.slug)).toContain('item');
  });

  it('builds page info map', () => {
    const { pages } = buildGraphFromPages([
      makePage('foo', { data: { title: 'Foo Page' } }),
    ]);
    expect(pages.get('foo')).toEqual({ slug: 'foo', title: 'Foo Page' });
  });
});

// -- getBreadcrumbs --

describe('getBreadcrumbs', () => {
  it('returns linear chain from root to current', () => {
    const { graph, pages } = buildGraphFromPages([
      makePage('root'),
      makePage('mid', { data: { title: 'Mid', up: { root: null } } }),
      makePage('leaf', { data: { title: 'Leaf', up: { mid: null } } }),
    ]);
    const crumbs = getBreadcrumbs('leaf', graph, pages);
    expect(crumbs.map(c => c.slug)).toEqual(['root', 'mid', 'leaf']);
  });

  it('handles cycle without infinite loop', () => {
    const { graph, pages } = buildGraphFromPages([
      makePage('a', { data: { title: 'A', up: { b: null } } }),
      makePage('b', { data: { title: 'B', up: { a: null } } }),
    ]);
    const crumbs = getBreadcrumbs('a', graph, pages);
    expect(crumbs.length).toBeLessThanOrEqual(2);
  });

  it('returns single entry for root page', () => {
    const { graph, pages } = buildGraphFromPages([makePage('root')]);
    const crumbs = getBreadcrumbs('root', graph, pages);
    expect(crumbs).toEqual([{ slug: 'root', title: 'root' }]);
  });

  it('returns empty for unknown slug', () => {
    const { graph, pages } = buildGraphFromPages([makePage('a')]);
    expect(getBreadcrumbs('unknown', graph, pages)).toEqual([]);
  });
});

// -- getPageRelations --

describe('getPageRelations', () => {
  it('returns relations for existing page', () => {
    const { graph } = buildGraphFromPages([makePage('a')]);
    expect(getPageRelations('a', graph)).toBeDefined();
  });

  it('returns undefined for missing page', () => {
    const { graph } = buildGraphFromPages([makePage('a')]);
    expect(getPageRelations('missing', graph)).toBeUndefined();
  });
});
