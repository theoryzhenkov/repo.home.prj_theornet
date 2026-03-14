import { describe, it, expect } from 'bun:test';
import { slugToHref, pathToSlug, WIKILINK_PATTERN } from './slugs';

describe('slugToHref', () => {
  it('converts index slug to root path', () => {
    expect(slugToHref('index')).toBe('/');
  });

  it('converts regular slug to path with trailing slash', () => {
    expect(slugToHref('about')).toBe('/about/');
  });

  it('converts nested slug to nested path', () => {
    expect(slugToHref('projects/foo')).toBe('/projects/foo/');
  });
});

describe('pathToSlug', () => {
  it('converts root path to index', () => {
    expect(pathToSlug('/')).toBe('index');
  });

  it('strips leading slash', () => {
    expect(pathToSlug('/about')).toBe('about');
  });

  it('strips trailing slash', () => {
    expect(pathToSlug('/about/')).toBe('about');
  });

  it('handles nested paths', () => {
    expect(pathToSlug('/projects/foo')).toBe('projects/foo');
  });
});

describe('WIKILINK_PATTERN', () => {
  function matchAll(input: string) {
    return [...input.matchAll(new RegExp(WIKILINK_PATTERN.source, WIKILINK_PATTERN.flags))];
  }

  it('matches bare wiki-link', () => {
    const m = matchAll('[[foo]]');
    expect(m).toHaveLength(1);
    expect(m[0][1]).toBeUndefined(); // no relation
    expect(m[0][2]).toBe('foo');     // slug
    expect(m[0][3]).toBeUndefined(); // no alias
  });

  it('matches wiki-link with alias', () => {
    const m = matchAll('[[foo|Bar Baz]]');
    expect(m).toHaveLength(1);
    expect(m[0][2]).toBe('foo');
    expect(m[0][3]).toBe('Bar Baz');
  });

  it('matches typed wiki-link', () => {
    const m = matchAll('up::[[parent]]');
    expect(m).toHaveLength(1);
    expect(m[0][1]).toBe('up');
    expect(m[0][2]).toBe('parent');
  });

  it('matches multiple wiki-links in one string', () => {
    const m = matchAll('See [[a]] and ref::[[b|link]]');
    expect(m).toHaveLength(2);
    expect(m[0][2]).toBe('a');
    expect(m[1][1]).toBe('ref');
    expect(m[1][2]).toBe('b');
    expect(m[1][3]).toBe('link');
  });
});
