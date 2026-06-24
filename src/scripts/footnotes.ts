// Footnote layout engine
// Wide (>1024px): absolute-position .sidenote elements in the right margin of .prose
// Narrow (<=1024px): clone sidenote content into the #footnotes footer list
export {};

const BREAKPOINT = 1024;
const SIDENOTE_GAP = 8; // px between stacked sidenotes
const RESIZE_DEBOUNCE = 100; // ms
const HIGHLIGHT_DURATION = 1500; // ms

function isWide(): boolean {
  return window.innerWidth > BREAKPOINT;
}

// ── Wide mode: position sidenotes alongside their reference ──

// Bottom of the right-margin metadata panel, expressed in .prose coordinates.
// The panel lives outside .prose (positioned against the reading column), so we
// measure via rects rather than offsetTop. Returns 0 when the panel is not in
// margin mode (narrow viewports) or sits entirely above the prose.
function metadataReservedBottom(prose: HTMLElement): number {
  const meta = document.querySelector<HTMLElement>('.metadata-strip');
  if (!meta || getComputedStyle(meta).position !== 'absolute') return 0;
  const bottom = meta.getBoundingClientRect().bottom - prose.getBoundingClientRect().top;
  return Math.max(0, bottom);
}

function layoutSidenotes() {
  const prose = document.querySelector('.prose') as HTMLElement | null;
  if (!prose) return;

  // Measure the column without any prior overflow padding so the reflow is
  // idempotent across repeated layouts.
  prose.style.paddingBottom = '';

  const sidenotes = prose.querySelectorAll<HTMLElement>('.sidenote');
  const metaBottom = metadataReservedBottom(prose);

  // Seed the stack with the metadata panel's band: any sidenote that would land
  // within it is pushed below, never overlapping.
  let prevBottom = metaBottom > 0 ? metaBottom + SIDENOTE_GAP : 0;

  sidenotes.forEach((note) => {
    const id = note.dataset.footnoteId;
    const ref = id ? document.getElementById(`fnref-${id}`) : null;

    // Desired top = ref's offsetTop relative to .prose
    let top = ref ? ref.offsetTop : prevBottom;

    // Push down if overlapping the previous sidenote (or the metadata panel)
    if (top < prevBottom) {
      top = prevBottom;
    }

    note.style.top = `${top}px`;
    prevBottom = top + note.offsetHeight + SIDENOTE_GAP;
  });

  // Extend .prose so the tallest of the last sidenote or the metadata panel is
  // covered by the reading surface on short pages.
  const needed = Math.max(prevBottom, metaBottom);
  const proseHeight = prose.scrollHeight;
  if (needed > proseHeight) {
    prose.style.paddingBottom = `${needed - proseHeight + SIDENOTE_GAP}px`;
  }
}

// ── Narrow mode: populate the #footnotes footer ──

function populateFootnotesList() {
  const section = document.getElementById('footnotes');
  const list = section?.querySelector('.aside-panel-list') as
    | HTMLOListElement
    | null;
  if (!section || !list) return;

  const sidenotes = document.querySelectorAll<HTMLElement>(
    '.sidenote[data-footnote-id]',
  );
  if (sidenotes.length === 0) {
    section.dataset.empty = 'true';
    return;
  }

  list.innerHTML = '';

  sidenotes.forEach((note) => {
    const id = note.dataset.footnoteId;
    const li = document.createElement('li');
    li.id = `fn-narrow-${id}`;
    li.className = 'footnote-item';

    // Clone all content including the .footnote-number link
    Array.from(note.childNodes).forEach((child) => {
      li.appendChild(child.cloneNode(true));
    });

    list.appendChild(li);
  });

  section.dataset.empty = 'false';
}

// ── Click handler: highlight sidenote on ref click ──

let highlightTimers: ReturnType<typeof setTimeout>[] = [];

function attachClickHandlers() {
  document
    .querySelectorAll<HTMLElement>('.footnote-ref .footnote-number')
    .forEach((link) => {
      link.addEventListener('click', (e) => {
        if (!isWide()) return; // on narrow, let default anchor behavior work

        e.preventDefault();
        const href = link.getAttribute('href');
        if (!href) return;

        const sidenote = document.querySelector<HTMLElement>(href);
        if (!sidenote) return;

        // Scroll into view if off-screen
        sidenote.scrollIntoView({ behavior: 'smooth', block: 'nearest' });

        // Highlight pulse (1.5s background color fade via CSS transition)
        sidenote.classList.add('sidenote-highlight');
        const timer = setTimeout(
          () => sidenote.classList.remove('sidenote-highlight'),
          HIGHLIGHT_DURATION,
        );
        highlightTimers.push(timer);
      });
    });
}

// ── Orchestration ──

let lastWide: boolean | null = null;

function layout() {
  const wide = isWide();
  const prose = document.querySelector('.prose') as HTMLElement | null;

  if (wide) {
    // Clean up narrow-mode artefacts
    const section = document.getElementById('footnotes');
    if (section) section.dataset.empty = 'true';

    layoutSidenotes();
  } else {
    // Clean up wide-mode inline styles
    if (prose) prose.style.paddingBottom = '';
    document.querySelectorAll<HTMLElement>('.sidenote').forEach((n) => {
      n.style.top = '';
    });

    populateFootnotesList();
  }

  lastWide = wide;
}

let resizeTimer: ReturnType<typeof setTimeout> | null = null;

function onResize() {
  if (resizeTimer) clearTimeout(resizeTimer);
  resizeTimer = setTimeout(() => {
    const wide = isWide();
    if (wide !== lastWide) {
      layout();
    } else if (wide) {
      // Relayout sidenotes on resize within wide mode (content reflow)
      layoutSidenotes();
    }
  }, RESIZE_DEBOUNCE);
}

function init() {
  lastWide = null;
  highlightTimers = [];
  layout();
  attachClickHandlers();
  window.addEventListener('resize', onResize, { passive: true });

  // Re-register cleanup for this navigation cycle
  document.addEventListener('astro:before-preparation', cleanup, {
    once: true,
  });
}

function cleanup() {
  window.removeEventListener('resize', onResize);
  if (resizeTimer) clearTimeout(resizeTimer);
  resizeTimer = null;
  highlightTimers.forEach(clearTimeout);
  highlightTimers = [];
}

// ── Lifecycle ──

document.addEventListener('astro:page-load', init);

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
