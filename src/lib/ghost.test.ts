import { describe, expect, it } from 'bun:test';
import {
  activityPubActivitiesToNotes,
  activityPubReplyChainToNotes,
  addHeadingIds,
  extractHtmlHeadings,
  ghostContentToHomeEntry,
  parseGhostFrontmatter,
} from './ghost';

describe('parseGhostFrontmatter', () => {
  it('parses fenced YAML metadata', () => {
    expect(parseGhostFrontmatter('---\nkind: profile\nhomePath: /about\nfeatured: true\n---')).toEqual({
      kind: 'profile',
      homePath: '/about',
      featured: true,
    });
  });

  it('parses JSON metadata', () => {
    expect(parseGhostFrontmatter('{"homePath":"/about","maturity":"rough"}')).toEqual({
      homePath: '/about',
      maturity: 'rough',
    });
  });
});

describe('ghostContentToHomeEntry', () => {
  it('maps Ghost posts to root routes by default while preserving blog relations', () => {
    const entry = ghostContentToHomeEntry({
      id: 'post-1',
      uuid: 'post-uuid-1',
      title: 'A post',
      slug: 'a-post',
      html: '<p>Hello.</p>',
      published_at: '2026-06-01T00:00:00.000Z',
      url: 'https://ghost.theor.net/a-post/',
    }, 'ghost-post');

    expect(entry.id).toBe('a-post');
    expect(entry.data.part_of).toEqual([{ page: 'blog' }]);
    expect(entry.data.is).toEqual([{ page: 'classes/blog-note' }]);
    expect(entry.data.description).toBeUndefined();
    expect(entry.data.created.toISOString()).toBe('2026-06-01T00:00:00.000Z');
  });

  it('uses explicit frontmatter descriptions without inferring from Ghost excerpts', () => {
    const withoutDescription = ghostContentToHomeEntry({
      id: 'post-1',
      title: 'A post',
      slug: 'a-post',
      html: '<p>The body should not become metadata.</p>',
      excerpt: 'Ghost generated excerpt should be ignored.',
      custom_excerpt: 'Ghost custom excerpt should also be ignored.',
      published_at: '2026-06-01T00:00:00.000Z',
    }, 'ghost-post');

    const withDescription = ghostContentToHomeEntry({
      id: 'post-2',
      title: 'A post with metadata',
      slug: 'a-post-with-metadata',
      html: '<p>The body should not become metadata.</p>',
      excerpt: 'Ghost generated excerpt should be ignored.',
      frontmatter: 'description: Explicit metadata description.',
      published_at: '2026-06-01T00:00:00.000Z',
    }, 'ghost-post');

    expect(withoutDescription.data.description).toBeUndefined();
    expect(withDescription.data.description).toBe('Explicit metadata description.');
  });

  it('lets frontmatter override the home route and relations', () => {
    const entry = ghostContentToHomeEntry({
      id: 'page-1',
      uuid: 'page-uuid-1',
      title: 'Ghost About',
      slug: 'about-me',
      html: '<p>Hello.</p>',
      published_at: '2026-06-01T00:00:00.000Z',
      frontmatter: '---\nhomePath: /about\nmaturity: developed\npart_of:\n  - page: index\nsubject:\n  - page: concepts/software\n---',
    }, 'ghost-page');

    expect(entry.id).toBe('about');
    expect(entry.data.maturity).toBe('developed');
    expect(entry.data.part_of).toEqual([{ page: 'index' }]);
    expect(entry.data.subject).toEqual([{ page: 'concepts/software' }]);
  });
});

describe('activityPubActivitiesToNotes', () => {
  it('extracts public note objects from Create activities', () => {
    const notes = activityPubActivitiesToNotes([{
      type: 'Create',
      to: 'as:Public',
      object: {
        id: 'https://ghost.theor.net/.ghost/activitypub/note/1',
        type: 'Note',
        content: '<p>Hello Fediverse.</p>',
        published: '2026-06-18T20:58:08.673Z',
      },
    }]);

    expect(notes).toHaveLength(1);
    expect(notes[0].sourceUrl).toBe('https://ghost.theor.net/.ghost/activitypub/note/1');
    expect(notes[0].contentHtml).toBe('<p>Hello Fediverse.</p>');
  });

  it('preserves reply links for threaded notes', () => {
    const notes = activityPubActivitiesToNotes([{
      type: 'Create',
      to: 'as:Public',
      object: {
        id: 'https://ghost.theor.net/.ghost/activitypub/note/2',
        type: 'Note',
        content: '<p>Reply.</p>',
        published: '2026-06-18T21:00:08.673Z',
        inReplyTo: 'https://ghost.theor.net/.ghost/activitypub/note/1',
      },
    }]);

    expect(notes[0].inReplyTo).toBe('https://ghost.theor.net/.ghost/activitypub/note/1');
  });

  it('ignores non-public notes', () => {
    const notes = activityPubActivitiesToNotes([{
      type: 'Create',
      to: 'https://ghost.theor.net/.ghost/activitypub/followers/index',
      object: {
        id: 'https://ghost.theor.net/.ghost/activitypub/note/1',
        type: 'Note',
        content: '<p>Hello followers.</p>',
        published: '2026-06-18T20:58:08.673Z',
      },
    }]);

    expect(notes).toEqual([]);
  });

  it('maps public Ghost reply chains into notes with reconstructed parent links', () => {
    const notes = activityPubReplyChainToNotes({
      ancestors: { chain: [] },
      post: {
        id: 'https://ghost.theor.net/.ghost/activitypub/note/root',
        type: 0,
        content: '<p>Root.</p>',
        url: 'https://ghost.theor.net/.ghost/activitypub/note/root',
        publishedAt: '2026-06-18T20:58:08.673Z',
      },
      children: [{
        post: {
          id: 'https://ghost.theor.net/.ghost/activitypub/note/reply-1',
          type: 0,
          content: '<p>Reply 1.</p>',
          url: 'https://ghost.theor.net/.ghost/activitypub/note/reply-1',
          publishedAt: '2026-06-18T21:00:08.673Z',
        },
        chain: [{
          id: 'https://ghost.theor.net/.ghost/activitypub/note/reply-2',
          type: 0,
          content: '<p>Reply 2.</p>',
          url: 'https://ghost.theor.net/.ghost/activitypub/note/reply-2',
          publishedAt: '2026-06-18T21:01:08.673Z',
        }],
      }],
    });

    expect(notes.map((note) => note.id)).toEqual([
      'https://ghost.theor.net/.ghost/activitypub/note/root',
      'https://ghost.theor.net/.ghost/activitypub/note/reply-1',
      'https://ghost.theor.net/.ghost/activitypub/note/reply-2',
    ]);
    expect(notes[0].inReplyTo).toBeUndefined();
    expect(notes[1].inReplyTo).toBe(notes[0].id);
    expect(notes[2].inReplyTo).toBe(notes[1].id);
  });
});

describe('HTML heading helpers', () => {
  it('adds stable ids to h2 and h3 headings', () => {
    expect(addHeadingIds('<h2>First heading</h2><h2>First heading</h2>')).toBe(
      '<h2 id="first-heading">First heading</h2><h2 id="first-heading-2">First heading</h2>',
    );
  });

  it('extracts h2 and h3 headings with word counts', () => {
    expect(extractHtmlHeadings('<h2 id="a">Alpha</h2><p>one two three</p><h3>Beta</h3><p>four</p>')).toEqual([
      { depth: 2, slug: 'a', text: 'Alpha', wordCount: 6 },
      { depth: 3, slug: 'beta', text: 'Beta', wordCount: 2 },
    ]);
  });
});
