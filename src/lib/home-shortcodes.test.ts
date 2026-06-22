import { describe, expect, it } from 'bun:test';
import { parseHomeShortcodes } from './home-shortcodes';

describe('parseHomeShortcodes', () => {
  it('parses content table shortcode wrapped in a paragraph', () => {
    expect(parseHomeShortcodes('<p>Intro.</p><p>::content-table{path="blog" classSlug="classes/blog-note"}</p><p>Outro.</p>')).toEqual([
      { type: 'html', html: '<p>Intro.</p>' },
      { type: 'content-table', path: 'blog', classSlug: 'classes/blog-note' },
      { type: 'html', html: '<p>Outro.</p>' },
    ]);
  });

  it('parses bare content table shortcode', () => {
    expect(parseHomeShortcodes('::content-table{classSlug="classes/project"}')).toEqual([
      { type: 'content-table', classSlug: 'classes/project' },
    ]);
  });

  it('parses MDX-escaped shortcode braces', () => {
    expect(parseHomeShortcodes('::content-table\\{classSlug="classes/project"\\}')).toEqual([
      { type: 'content-table', classSlug: 'classes/project' },
    ]);
  });

  it('parses notes feed and link card shortcodes', () => {
    expect(parseHomeShortcodes('::notes-feed{}\n::link-cards{github="https://github.com/x" chrome="https://chrome.example"}')).toEqual([
      { type: 'notes-feed' },
      { type: 'link-cards', links: [
        { kind: 'github', href: 'https://github.com/x' },
        { kind: 'chrome', href: 'https://chrome.example' },
      ] },
    ]);
  });
});
