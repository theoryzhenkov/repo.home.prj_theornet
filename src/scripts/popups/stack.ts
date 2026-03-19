/** Nested popup stack management */

import type { PopupInstance } from './types';
import { startFadeOut } from './render';

const popups: PopupInstance[] = [];

export function pushPopup(instance: PopupInstance): void {
  // Despawn non-ancestor popups first
  const ancestors = getAncestorChain(instance.parentId);
  const ancestorIds = new Set(ancestors.map((p) => p.id));
  // Also keep the parent itself
  if (instance.parentId) ancestorIds.add(instance.parentId);

  // Remove all popups that are not in the ancestor chain
  const toRemove = popups.filter((p) => !ancestorIds.has(p.id));
  for (const p of toRemove) {
    removePopupInternal(p.id);
  }

  popups.push(instance);
}

export function removePopup(id: string): void {
  removePopupInternal(id);
}

function removePopupInternal(id: string): void {
  // Find and remove descendants first
  const descendants = getDescendants(id);
  for (const d of descendants) {
    cleanupPopup(d);
  }

  const idx = popups.findIndex((p) => p.id === id);
  if (idx !== -1) {
    cleanupPopup(popups[idx]);
  }
}

function cleanupPopup(instance: PopupInstance): void {
  // Clear all timers
  for (const timer of instance.timers) {
    clearTimeout(timer);
  }
  instance.timers.length = 0;

  // Fade out and remove from DOM
  startFadeOut(instance.element, () => {});

  // Remove from stack
  const idx = popups.indexOf(instance);
  if (idx !== -1) popups.splice(idx, 1);
}

function getDescendants(id: string): PopupInstance[] {
  const result: PopupInstance[] = [];
  const directChildren = popups.filter((p) => p.parentId === id);
  for (const child of directChildren) {
    result.push(child);
    result.push(...getDescendants(child.id));
  }
  return result;
}

export function getAncestorChain(id: string | null): PopupInstance[] {
  const chain: PopupInstance[] = [];
  let currentId = id;
  while (currentId) {
    const popup = popups.find((p) => p.id === currentId);
    if (!popup) break;
    chain.push(popup);
    currentId = popup.parentId;
  }
  return chain;
}

export function findPopupByElement(element: HTMLElement): PopupInstance | undefined {
  return popups.find((p) => p.element === element || p.element.contains(element));
}

export function getPopupById(id: string): PopupInstance | undefined {
  return popups.find((p) => p.id === id);
}

export function getTopPopup(): PopupInstance | undefined {
  return popups[popups.length - 1];
}

export function clearAll(): void {
  for (const p of [...popups]) {
    for (const timer of p.timers) {
      clearTimeout(timer);
    }
    p.element.remove();
  }
  popups.length = 0;
}

export function getDepthOf(popupElement: HTMLElement | null): number {
  if (!popupElement) return 0;
  const instance = popups.find((p) => p.element === popupElement || p.element.contains(popupElement));
  return instance ? instance.depth : 0;
}
