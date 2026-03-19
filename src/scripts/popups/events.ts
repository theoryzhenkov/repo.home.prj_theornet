/** Event delegation, hover timing, mobile detection, and popup orchestration */

import type { PopupInstance } from './types';
import { POPUP_CONFIG } from './types';
import { fetchAndCache, prefetch, getCurrentPageDoc } from './cache';
import { classifyTarget, extractContent } from './extract';
import { calculatePosition } from './position';
import { createPopup, createPopin, showPopup, showPopin, startFadeOut, dismissTopPopin } from './render';
import { pushPopup, removePopup, findPopupByElement, getDepthOf, getTopPopup, clearAll } from './stack';

interface PopupIndexEntry {
  title: string;
  description?: string;
  maturity?: string;
}

type PopupIndex = Record<string, PopupIndexEntry>;

let prefetchTimer: ReturnType<typeof setTimeout> | null = null;
let spawnTimer: ReturnType<typeof setTimeout> | null = null;
let fadeTimer: ReturnType<typeof setTimeout> | null = null;
let currentHoverAnchor: HTMLAnchorElement | null = null;
let popupIndex: PopupIndex | null = null;
let popupIndexPromise: Promise<PopupIndex> | null = null;

function isMobile(): boolean {
  return window.innerWidth <= POPUP_CONFIG.mobileBreakpoint;
}

function isSidenoteVisible(footnoteId: string): boolean {
  const sidenote = document.querySelector(`.sidenote[data-footnote-id="${footnoteId}"]`);
  if (!sidenote || sidenote.hasAttribute('data-hidden')) return false;
  // Check if actually visible on screen (wide mode)
  if (window.innerWidth <= POPUP_CONFIG.mobileBreakpoint) return false;
  const rect = sidenote.getBoundingClientRect();
  return rect.width > 0 && rect.height > 0;
}

async function loadPopupIndex(): Promise<PopupIndex> {
  if (popupIndex) return popupIndex;
  if (popupIndexPromise) return popupIndexPromise;

  popupIndexPromise = fetch('/popup-index.json')
    .then((r) => r.json())
    .then((data: PopupIndex) => {
      popupIndex = data;
      return data;
    })
    .catch(() => {
      popupIndex = {};
      return {};
    });

  return popupIndexPromise;
}

function buildFallbackContent(path: string, entry: PopupIndexEntry): import('./types').PopupContent {
  const bodyHtml = entry.description
    ? `<p>${entry.description}</p>`
    : '<p class="popup-no-content">No preview available</p>';

  return {
    title: entry.title,
    bodyHtml,
    href: path,
    contentType: 'page',
  };
}

function clearTimers(): void {
  if (prefetchTimer) { clearTimeout(prefetchTimer); prefetchTimer = null; }
  if (spawnTimer) { clearTimeout(spawnTimer); spawnTimer = null; }
  if (fadeTimer) { clearTimeout(fadeTimer); fadeTimer = null; }
}

async function spawnPopup(anchor: HTMLAnchorElement, parentPopupEl: HTMLElement | null): Promise<void> {
  const target = classifyTarget(anchor);
  if (!target) return;

  // Footnote suppression: if sidenote is visible, don't spawn
  if (target.contentType === 'footnote' && target.footnoteId && isSidenoteVisible(target.footnoteId)) {
    return;
  }

  const parentDepth = getDepthOf(parentPopupEl);
  const depth = parentDepth + 1;

  // Enforce max depth
  if (depth > POPUP_CONFIG.maxDepth) return;

  let content: import('./types').PopupContent | null = null;

  try {
    if (target.contentType === 'footnote') {
      const cached = getCurrentPageDoc();
      content = extractContent(cached, target);
    } else {
      const cached = await fetchAndCache(target.path);
      content = extractContent(cached, target);
    }
  } catch {
    // Fall back to popup index
  }

  // Fallback to JSON index
  if (!content) {
    const index = await loadPopupIndex();
    const entry = index[target.path];
    if (entry) {
      content = buildFallbackContent(target.path, entry);
    }
  }

  if (!content) return;

  // Check if we're still hovering the same anchor
  if (currentHoverAnchor !== anchor) return;

  if (isMobile()) {
    const popin = createPopin(content);
    showPopin(popin);
    return;
  }

  const popupEl = createPopup(content, depth, POPUP_CONFIG);
  document.body.appendChild(popupEl);

  // Measure popup for positioning
  const popupRect = popupEl.getBoundingClientRect();
  const parentInstance = parentPopupEl ? findPopupByElement(parentPopupEl) : undefined;

  const pos = calculatePosition(
    anchor,
    popupRect.width,
    popupRect.height,
    POPUP_CONFIG,
    parentInstance?.element ?? null,
  );

  popupEl.style.position = 'fixed';
  popupEl.style.top = `${pos.top}px`;
  popupEl.style.left = `${pos.left}px`;
  popupEl.style.maxHeight = `${pos.maxHeight}px`;

  const instance: PopupInstance = {
    id: popupEl.dataset.popupId!,
    element: popupEl,
    anchor,
    parentId: parentInstance?.id ?? null,
    depth,
    timers: [],
  };

  pushPopup(instance);
  showPopup(popupEl);

  // Handle close events from the popup
  popupEl.addEventListener('popup:close', () => {
    removePopup(instance.id);
  });

  // Keep popup alive while mouse is over it
  popupEl.addEventListener('mouseenter', () => {
    if (fadeTimer) { clearTimeout(fadeTimer); fadeTimer = null; }
  });

  // Start fade when mouse leaves popup
  popupEl.addEventListener('mouseleave', (e: MouseEvent) => {
    const related = e.relatedTarget as HTMLElement | null;
    // Don't fade if moving to a child popup or the anchor
    if (related?.closest?.('.popup')) return;
    if (related === anchor || anchor.contains(related)) return;

    fadeTimer = setTimeout(() => {
      if (!popupEl.matches(':hover')) {
        removePopup(instance.id);
      }
    }, POPUP_CONFIG.fadeOutDelay);
  });
}

export function handleMouseOver(event: MouseEvent): void {
  const target = event.target;
  if (!(target instanceof Element)) return;

  const anchor = target.closest('a') as HTMLAnchorElement | null;
  if (!anchor) return;

  // Check if this anchor is inside a popup
  const parentPopupEl = anchor.closest('.popup') as HTMLElement | null;

  // If anchor is inside a popup, links at maxDepth should navigate normally
  if (parentPopupEl) {
    const depth = getDepthOf(parentPopupEl);
    if (depth >= POPUP_CONFIG.maxDepth) return;
  }

  // Skip if we're already showing/hovering for this anchor
  if (currentHoverAnchor === anchor) return;

  // Cancel any pending operations
  clearTimers();
  currentHoverAnchor = anchor;

  const classified = classifyTarget(anchor);
  if (!classified) {
    currentHoverAnchor = null;
    return;
  }

  if (isMobile()) return; // Mobile uses click, not hover

  // Start prefetch after short delay
  if (classified.contentType !== 'footnote') {
    prefetchTimer = setTimeout(() => {
      prefetch(classified.path);
    }, POPUP_CONFIG.prefetchDelay);
  }

  // Start spawn timer
  spawnTimer = setTimeout(() => {
    spawnPopup(anchor, parentPopupEl);
  }, POPUP_CONFIG.spawnDelay);
}

export function handleMouseOut(event: MouseEvent): void {
  const target = event.target;
  if (!(target instanceof Element)) return;

  const anchor = target.closest('a') as HTMLAnchorElement | null;
  if (!anchor) return;

  // Check if moving to a popup
  const relatedTarget = event.relatedTarget as HTMLElement | null;
  if (relatedTarget?.closest?.('.popup')) return;

  clearTimers();
  currentHoverAnchor = null;

  // Start fade timer for all non-hovered popups
  const topPopup = getTopPopup();
  if (topPopup && !topPopup.element.matches(':hover')) {
    fadeTimer = setTimeout(() => {
      // Double-check hover state before removing
      if (!topPopup.element.matches(':hover') && currentHoverAnchor !== topPopup.anchor) {
        removePopup(topPopup.id);
      }
    }, POPUP_CONFIG.fadeOutDelay);
  }
}

export function handlePopupMouseLeave(event: MouseEvent): void {
  const popup = (event.currentTarget as HTMLElement).closest('.popup') as HTMLElement | null;
  if (!popup) return;

  const relatedTarget = event.relatedTarget as HTMLElement | null;

  // Check if moving to a child popup or back to the anchor
  if (relatedTarget?.closest?.('.popup')) return;

  const instance = findPopupByElement(popup);
  if (!instance) return;

  // Check if moving back to the anchor
  if (relatedTarget === instance.anchor || instance.anchor.contains(relatedTarget)) return;

  fadeTimer = setTimeout(() => {
    if (!popup.matches(':hover')) {
      removePopup(instance.id);
    }
  }, POPUP_CONFIG.fadeOutDelay);
}

export function handleClick(event: MouseEvent): void {
  if (!isMobile()) return;

  const target = event.target;
  if (!(target instanceof Element)) return;

  const anchor = target.closest('a') as HTMLAnchorElement | null;
  if (!anchor) return;

  const classified = classifyTarget(anchor);
  if (!classified) return;

  // Prevent navigation, show popin instead
  event.preventDefault();
  spawnPopup(anchor, null);
}

/** Handle mouseover on links inside popups (popups are outside <article>) */
export function handlePopupInternalMouseOver(event: MouseEvent): void {
  const target = event.target;
  if (!(target instanceof Element)) return;

  // Only handle events inside a popup
  const popup = target.closest('.popup');
  if (!popup) return;

  handleMouseOver(event);
}

export function handleKeydown(event: KeyboardEvent): void {
  if (event.key !== 'Escape') return;

  // Try to dismiss popin first
  if (dismissTopPopin()) {
    event.preventDefault();
    return;
  }

  // Then try to dismiss top popup
  const topPopup = getTopPopup();
  if (topPopup) {
    removePopup(topPopup.id);
    event.preventDefault();
  }
}

export function resetState(): void {
  clearTimers();
  currentHoverAnchor = null;
  clearAll();
}
