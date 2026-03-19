/** Popup system orchestrator — Astro lifecycle integration */

import { handleMouseOver, handleMouseOut, handleClick, handleKeydown, handlePopupInternalMouseOver, resetState } from './events';
import { clearCache } from './cache';

let bound = false;

function init(): void {
  if (bound) cleanup();

  const article = document.querySelector('article');
  if (!article) return;

  // Mouse events for desktop hover popups — on article for page links
  article.addEventListener('mouseover', handleMouseOver as EventListener);
  article.addEventListener('mouseout', handleMouseOut as EventListener);

  // Also listen on document for links inside popups (which are outside article)
  document.addEventListener('mouseover', handlePopupInternalMouseOver as EventListener);

  // Click events for mobile popins
  article.addEventListener('click', handleClick as EventListener);

  // Escape key to dismiss
  document.addEventListener('keydown', handleKeydown);

  // Register cleanup for Astro navigation
  document.addEventListener('astro:before-preparation', cleanup, { once: true });

  bound = true;
}

function cleanup(): void {
  const article = document.querySelector('article');
  if (article) {
    article.removeEventListener('mouseover', handleMouseOver as EventListener);
    article.removeEventListener('mouseout', handleMouseOut as EventListener);
    article.removeEventListener('click', handleClick as EventListener);
  }

  document.removeEventListener('mouseover', handlePopupInternalMouseOver as EventListener);

  document.removeEventListener('keydown', handleKeydown);
  resetState();
  clearCache();
  bound = false;
}

// Astro SPA lifecycle
document.addEventListener('astro:page-load', init);

// Non-SPA fallback
if (document.readyState === 'complete') {
  init();
} else {
  document.addEventListener('DOMContentLoaded', init);
}
