// Reading progress bar — JS fallback for browsers without scroll-driven animations
// The .header-progress element is injected into the header if not already present.
// CSS scroll-driven animation is the primary mechanism; this script only activates
// when CSS.supports('animation-timeline', 'scroll()') returns false.

let scrollHandler: (() => void) | null = null;
let bar: HTMLElement | null = null;

function ensureProgressBar(): HTMLElement | null {
  const header = document.querySelector('.header');
  if (!header) return null;

  let el = header.querySelector<HTMLElement>('.header-progress');
  if (!el) {
    el = document.createElement('div');
    el.className = 'header-progress';
    header.appendChild(el);
  }
  return el;
}

function updateProgress() {
  if (!bar) return;
  const scrollTop = document.documentElement.scrollTop;
  const scrollHeight =
    document.documentElement.scrollHeight - window.innerHeight;
  const progress = scrollHeight > 0 ? scrollTop / scrollHeight : 0;
  bar.style.transform = `scaleX(${progress})`;
}

function init() {
  bar = ensureProgressBar();
  if (!bar) return;

  // Skip JS animation if CSS handles it natively
  if (CSS.supports('animation-timeline', 'scroll()')) return;

  scrollHandler = updateProgress;
  window.addEventListener('scroll', scrollHandler, { passive: true });
  updateProgress();

  document.addEventListener('astro:before-preparation', cleanup, {
    once: true,
  });
}

function cleanup() {
  if (scrollHandler) {
    window.removeEventListener('scroll', scrollHandler);
    scrollHandler = null;
  }
  bar = null;
}

// Lifecycle
document.addEventListener('astro:page-load', init);

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
