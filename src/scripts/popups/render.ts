/** Popup and popin DOM creation and lifecycle */

import type { PopupContent, PopupConfig } from './types';

let popinCounter = 0;

export function createPopup(
  content: PopupContent,
  depth: number,
  config: PopupConfig,
): HTMLElement {
  const popup = document.createElement('div');
  popup.className = 'popup';
  popup.dataset.popupId = crypto.randomUUID();
  popup.dataset.popupDepth = String(depth);
  popup.dataset.contentType = content.contentType;

  popup.style.maxWidth = content.contentType === 'footnote'
    ? '280px'
    : `${config.maxWidth}px`;

  popup.innerHTML = `
    <div class="popup-titlebar">
      <a class="popup-titlebar-link" href="${escapeAttr(content.href)}">${escapeHtml(content.title)}</a>
      <button class="popup-close" aria-label="Close popup">&times;</button>
    </div>
    <div class="popup-body">${content.bodyHtml}</div>
  `;

  // Close button handler
  popup.querySelector('.popup-close')?.addEventListener('click', (e) => {
    e.stopPropagation();
    popup.dispatchEvent(new CustomEvent('popup:close', { bubbles: true }));
  });

  return popup;
}

export function createPopin(content: PopupContent): HTMLElement {
  const id = `popin-${++popinCounter}`;

  const overlay = document.createElement('div');
  overlay.className = 'popin-overlay';
  overlay.dataset.popinId = id;

  overlay.innerHTML = `
    <div class="popin" role="dialog" aria-label="${escapeAttr(content.title)}">
      <div class="popin-titlebar">
        <a class="popin-titlebar-link" href="${escapeAttr(content.href)}">${escapeHtml(content.title)}</a>
        <button class="popin-close" aria-label="Close">&times;</button>
      </div>
      <div class="popin-body">${content.bodyHtml}</div>
    </div>
  `;

  // Close on overlay click (outside popin)
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) {
      dismissPopin(overlay);
    }
  });

  // Close button
  overlay.querySelector('.popin-close')?.addEventListener('click', () => {
    dismissPopin(overlay);
  });

  return overlay;
}

export function showPopup(popup: HTMLElement): void {
  popup.classList.add('popup-visible');
}

export function startFadeOut(popup: HTMLElement, onDone: () => void): ReturnType<typeof setTimeout> {
  popup.classList.remove('popup-visible');
  popup.classList.add('popup-fading');
  return setTimeout(() => {
    popup.remove();
    onDone();
  }, 350); // fadeOutDelay (100) + fadeOutDuration (250)
}

export function showPopin(overlay: HTMLElement): void {
  document.body.appendChild(overlay);
  // Force reflow for transition
  overlay.offsetHeight;
  overlay.classList.add('popin-visible');
}

function dismissPopin(overlay: HTMLElement): void {
  overlay.classList.remove('popin-visible');
  overlay.addEventListener('transitionend', () => overlay.remove(), { once: true });
  // Fallback removal if transitionend doesn't fire
  setTimeout(() => overlay.remove(), 400);
}

export function dismissTopPopin(): boolean {
  const popins = document.querySelectorAll<HTMLElement>('.popin-overlay.popin-visible');
  if (popins.length === 0) return false;
  const top = popins[popins.length - 1];
  dismissPopin(top);
  return true;
}

function escapeHtml(str: string): string {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function escapeAttr(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
