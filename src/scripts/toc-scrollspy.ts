// Multi-select visibility-based scroll spy for TOC
// Supports both old (.toc-link) and new (.toc-entry) selectors
function initScrollSpy() {
  const tocLinks = document.querySelectorAll('.toc-entry, .toc-link');
  if (tocLinks.length === 0) return;

  const headings: HTMLElement[] = [];
  tocLinks.forEach((link) => {
    const href = link.getAttribute('href');
    if (!href) return;
    const heading = document.querySelector(href);
    if (heading instanceof HTMLElement) {
      headings.push(heading);
    }
  });

  if (headings.length === 0) return;

  let activeIds: string[] = [headings[0].id];
  // Track which sections have been scrolled past for read state
  const readIds = new Set<string>();

  function updateActiveLinks() {
    tocLinks.forEach((link) => {
      link.classList.remove('active');
      const href = link.getAttribute('href');
      if (!href) return;
      const id = href.slice(1);

      // Update data-state for enriched TOC
      if (link.hasAttribute('data-state')) {
        if (activeIds.includes(id)) {
          link.setAttribute('data-state', 'active');
        } else if (readIds.has(id)) {
          link.setAttribute('data-state', 'read');
        } else {
          link.setAttribute('data-state', 'unread');
        }
      }

      if (activeIds.includes(id)) {
        link.classList.add('active');
      }
    });
  }

  function calculateActiveHeadings(): string[] {
    const rootFontSize = parseFloat(getComputedStyle(document.documentElement).fontSize) || 18;
    const headerHeight = 5 * rootFontSize; // Account for sticky header
    const viewportTop = headerHeight;
    const viewportBottom = window.innerHeight;
    const viewportHeight = viewportBottom - viewportTop;

    // Get actual content end for last section bounds
    const articleBody = document.querySelector('.prose');
    const contentBottom = articleBody
      ? articleBody.getBoundingClientRect().bottom
      : document.documentElement.scrollHeight;

    const result: string[] = [];

    for (let i = 0; i < headings.length; i++) {
      const headingTop = headings[i].getBoundingClientRect().top;

      // Section spans from this heading to the next (or content end for last)
      const sectionTop = headingTop;
      const sectionBottom = i < headings.length - 1
        ? headings[i + 1].getBoundingClientRect().top
        : contentBottom;

      const sectionHeight = sectionBottom - sectionTop;
      if (sectionHeight <= 0) continue;

      // Calculate visible portion (clamped to viewport)
      const visibleTop = Math.max(sectionTop, viewportTop);
      const visibleBottom = Math.min(sectionBottom, viewportBottom);
      const visibleHeight = Math.max(0, visibleBottom - visibleTop);

      // Hybrid approach: check both metrics
      const viewportCoverage = visibleHeight / viewportHeight;
      const sectionVisibility = visibleHeight / sectionHeight;

      // Active if section dominates viewport OR is almost fully visible
      if (viewportCoverage >= 0.4 || sectionVisibility >= 0.9) {
        result.push(headings[i].id);
      }

      // Mark as read if heading has scrolled past the top
      if (headingTop < viewportTop) {
        readIds.add(headings[i].id);
      }
    }

    // Fallback: if nothing qualifies, select the first heading
    if (result.length === 0) {
      result.push(headings[0].id);
    }

    return result;
  }

  // Throttled scroll handler for continuous updates
  let ticking = false;
  function onScroll() {
    if (!ticking) {
      requestAnimationFrame(() => {
        activeIds = calculateActiveHeadings();
        updateActiveLinks();
        ticking = false;
      });
      ticking = true;
    }
  }

  window.addEventListener('scroll', onScroll, { passive: true });

  // Initial update
  activeIds = calculateActiveHeadings();
  updateActiveLinks();

  // Cleanup on page unload (for view transitions)
  document.addEventListener('astro:before-preparation', () => {
    window.removeEventListener('scroll', onScroll);
  }, { once: true });
}

// Run on page load (both initial and client-side navigation)
document.addEventListener('astro:page-load', initScrollSpy);

// Also run immediately if DOM is already loaded (for initial page load without view transitions)
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initScrollSpy);
} else {
  initScrollSpy();
}
