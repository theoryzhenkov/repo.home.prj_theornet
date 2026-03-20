/** Popup and popin DOM creation and lifecycle */

import type { PopupContent, PopupConfig, TilePosition } from './types';
import { POPUP_CONFIG } from './types';

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
      <div class="popup-controls">
        <button class="popup-btn popup-btn-pin" title="Pin">\u2299</button>
        <button class="popup-btn popup-btn-minimize" title="Minimize">\u2212</button>
        <button class="popup-btn popup-btn-zoom" title="Expand">\u26F6</button>
        <button class="popup-btn popup-btn-close" title="Close (Alt: all)">\u00D7</button>
      </div>
    </div>
    <div class="popup-body">${content.bodyHtml}</div>
  `;

  bindTitlebarButtons(popup);
  return popup;
}

export function createLoadingPopup(depth: number, config: PopupConfig): HTMLElement {
  const popup = document.createElement('div');
  popup.className = 'popup popup-loading-state';
  popup.dataset.popupId = crypto.randomUUID();
  popup.dataset.popupDepth = String(depth);

  popup.style.maxWidth = `${config.maxWidth}px`;

  popup.innerHTML = `
    <div class="popup-titlebar">
      <span class="popup-titlebar-link">Loading\u2026</span>
      <div class="popup-controls">
        <button class="popup-btn popup-btn-close" title="Close">\u00D7</button>
      </div>
    </div>
    <div class="popup-body">
      <div class="popup-loading"><div class="popup-spinner"></div></div>
    </div>
  `;

  bindTitlebarButtons(popup);
  return popup;
}

/** Replace loading popup body with real content, add full titlebar controls */
export function upgradeLoadingPopup(popup: HTMLElement, content: PopupContent): void {
  const titleLink = popup.querySelector('.popup-titlebar-link');
  if (titleLink) {
    const a = document.createElement('a');
    a.className = 'popup-titlebar-link';
    a.href = content.href;
    a.textContent = content.title;
    titleLink.replaceWith(a);
  }

  // Add full controls if only close exists
  const controls = popup.querySelector('.popup-controls');
  if (controls && !controls.querySelector('.popup-btn-pin')) {
    controls.innerHTML = `
      <button class="popup-btn popup-btn-pin" title="Pin">\u2299</button>
      <button class="popup-btn popup-btn-minimize" title="Minimize">\u2212</button>
      <button class="popup-btn popup-btn-zoom" title="Expand">\u26F6</button>
      <button class="popup-btn popup-btn-close" title="Close (Alt: all)">\u00D7</button>
    `;
    bindTitlebarButtons(popup);
  }

  const body = popup.querySelector('.popup-body');
  if (body) {
    body.innerHTML = content.bodyHtml;
  }

  popup.dataset.contentType = content.contentType;
  popup.classList.remove('popup-loading-state');
}

function bindTitlebarButtons(popup: HTMLElement): void {
  popup.querySelector('.popup-btn-pin')?.addEventListener('click', (e) => {
    e.stopPropagation();
    popup.dispatchEvent(new CustomEvent('popup:pin', { bubbles: true }));
  });

  popup.querySelector('.popup-btn-minimize')?.addEventListener('click', (e) => {
    e.stopPropagation();
    popup.dispatchEvent(new CustomEvent('popup:minimize', { bubbles: true }));
  });

  popup.querySelector('.popup-btn-zoom')?.addEventListener('click', (e) => {
    e.stopPropagation();
    popup.dispatchEvent(new CustomEvent('popup:zoom', { bubbles: true }));
  });

  popup.querySelector('.popup-btn-close')?.addEventListener('click', (e) => {
    e.stopPropagation();
    popup.dispatchEvent(
      new CustomEvent('popup:close', { bubbles: true, detail: { altKey: (e as MouseEvent).altKey } }),
    );
  });
}

export function createPopin(content: PopupContent): HTMLElement {
  const overlay = document.createElement('div');
  overlay.className = 'popin-overlay';
  overlay.dataset.popinId = crypto.randomUUID();

  overlay.innerHTML = `
    <div class="popin" role="dialog" aria-label="${escapeAttr(content.title)}">
      <div class="popin-titlebar">
        <a class="popin-titlebar-link" href="${escapeAttr(content.href)}">${escapeHtml(content.title)}</a>
        <button class="popin-close" aria-label="Close">&times;</button>
      </div>
      <div class="popin-body">${content.bodyHtml}</div>
    </div>
  `;

  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) dismissPopin(overlay);
  });

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
  const totalDelay = POPUP_CONFIG.fadeOutDelay + POPUP_CONFIG.fadeOutDuration;
  return setTimeout(() => {
    popup.remove();
    onDone();
  }, totalDelay);
}

export function showPopin(overlay: HTMLElement): void {
  document.body.appendChild(overlay);
  overlay.offsetHeight;
  overlay.classList.add('popin-visible');
}

function dismissPopin(overlay: HTMLElement): void {
  overlay.classList.remove('popin-visible');
  const fallback = setTimeout(() => overlay.remove(), 400);
  overlay.addEventListener('transitionend', () => {
    clearTimeout(fallback);
    overlay.remove();
  }, { once: true });
}

export function dismissTopPopin(): boolean {
  const popins = document.querySelectorAll<HTMLElement>('.popin-overlay.popin-visible');
  if (popins.length === 0) return false;
  const top = popins[popins.length - 1];
  dismissPopin(top);
  return true;
}

export function setPinned(el: HTMLElement, pinned: boolean): void {
  el.classList.toggle('popup-pinned', pinned);
}

export function setTiled(el: HTMLElement, pos: TilePosition | null): void {
  // Remove all tile classes
  el.classList.remove('popup-tiled');
  el.dataset.tilePosition = '';

  if (pos) {
    el.classList.add('popup-tiled');
    el.dataset.tilePosition = pos;
  }
}

export function setFocused(el: HTMLElement, focused: boolean): void {
  el.classList.toggle('popup-focused', focused);
}

export function escapeHtml(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function escapeAttr(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
