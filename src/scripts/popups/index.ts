/** Popup system orchestrator — Astro lifecycle integration */

import { handleMouseOver, handleMouseOut, handleClick, handleKeydown, handlePopupInternalMouseOver, resetState } from './events';
import { clearCache } from './cache';

let boundArticle: HTMLElement | null = null;

function init(): void {
  if (boundArticle) cleanup();

  const article = document.querySelector('article');
  if (!article) return;

  boundArticle = article as HTMLElement;

  // Mouse events for desktop hover popups — on article for page links
  boundArticle.addEventListener('mouseover', handleMouseOver as EventListener);
  boundArticle.addEventListener('mouseout', handleMouseOut as EventListener);

  // Also listen on document for links inside popups (which are outside article)
  document.addEventListener('mouseover', handlePopupInternalMouseOver as EventListener);

  // Click events for mobile popins
  boundArticle.addEventListener('click', handleClick as EventListener);

  // Escape key to dismiss
  document.addEventListener('keydown', handleKeydown);

  // Register cleanup for Astro navigation
  document.addEventListener('astro:before-preparation', cleanup, { once: true });
}

function cleanup(): void {
  if (boundArticle) {
    boundArticle.removeEventListener('mouseover', handleMouseOver as EventListener);
    boundArticle.removeEventListener('mouseout', handleMouseOut as EventListener);
    boundArticle.removeEventListener('click', handleClick as EventListener);
    boundArticle = null;
  }

  document.removeEventListener('mouseover', handlePopupInternalMouseOver as EventListener);
  document.removeEventListener('keydown', handleKeydown);
  resetState();
  clearCache();
}

// Astro SPA lifecycle
document.addEventListener('astro:page-load', init);

// Non-SPA fallback
if (document.readyState === 'complete') {
  init();
} else {
  document.addEventListener('DOMContentLoaded', init);
}
