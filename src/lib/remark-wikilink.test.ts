import { describe, it, expect } from 'bun:test';
import type { Root, Text, Paragraph } from 'mdast';
import remarkWikilink from './remark-wikilink';

function makeTree(text: string): Root {
  return {
    type: 'root',
    children: [{
      type: 'paragraph',
      children: [{ type: 'text', value: text }],
    }],
  };
}

function getChildren(tree: Root) {
  return (tree.children[0] as Paragraph).children;
}

function run(text: string): Root {
  const tree = makeTree(text);
  const plugin = remarkWikilink();
  plugin(tree, {} as never, () => {});
  return tree;
}

describe('remarkWikilink', () => {
  it('converts bare wiki-link to anchor', () => {
    const tree = run('See [[foo]]');
    const children = getChildren(tree);
    expect(children).toHaveLength(2);
    expect(children[0]).toEqual({ type: 'text', value: 'See ' });
    expect(children[1]).toEqual({ type: 'html', value: '<a href="/foo/">foo</a>' });
  });

  it('uses alias as display text', () => {
    const tree = run('[[foo|Bar Baz]]');
    const children = getChildren(tree);
    expect(children).toHaveLength(1);
    expect(children[0]).toEqual({ type: 'html', value: '<a href="/foo/">Bar Baz</a>' });
  });

  it('strips relation prefix from output', () => {
    const tree = run('up::[[parent]]');
    const children = getChildren(tree);
    expect(children).toHaveLength(1);
    expect(children[0]).toEqual({ type: 'html', value: '<a href="/parent/">parent</a>' });
  });

  it('handles typed wiki-link with alias', () => {
    const tree = run('ref::[[foo|see this]]');
    const children = getChildren(tree);
    expect(children[0]).toEqual({ type: 'html', value: '<a href="/foo/">see this</a>' });
  });

  it('converts index slug to root path', () => {
    const tree = run('[[index]]');
    const children = getChildren(tree);
    expect(children[0]).toEqual({ type: 'html', value: '<a href="/">index</a>' });
  });

  it('handles multiple wiki-links in one text node', () => {
    const tree = run('[[a]] and [[b]]');
    const children = getChildren(tree);
    expect(children).toHaveLength(3);
    expect(children[0]).toEqual({ type: 'html', value: '<a href="/a/">a</a>' });
    expect(children[1]).toEqual({ type: 'text', value: ' and ' });
    expect(children[2]).toEqual({ type: 'html', value: '<a href="/b/">b</a>' });
  });

  it('leaves plain text unchanged', () => {
    const tree = run('no links here');
    const children = getChildren(tree);
    expect(children).toHaveLength(1);
    expect((children[0] as Text).value).toBe('no links here');
  });

  it('preserves text before and after', () => {
    const tree = run('before [[x]] after');
    const children = getChildren(tree);
    expect(children).toHaveLength(3);
    expect(children[0]).toEqual({ type: 'text', value: 'before ' });
    expect(children[1]).toEqual({ type: 'html', value: '<a href="/x/">x</a>' });
    expect(children[2]).toEqual({ type: 'text', value: ' after' });
  });
});
