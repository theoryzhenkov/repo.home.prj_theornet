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
  // Collect target + all descendants by ID, then remove in a single pass
  const toRemoveIds = new Set<string>([id]);
  collectDescendantIds(id, toRemoveIds);

  // Partition: remove matching popups from the array, cleanup each
  const removed: PopupInstance[] = [];
  for (let i = popups.length - 1; i >= 0; i--) {
    if (toRemoveIds.has(popups[i].id)) {
      removed.push(popups[i]);
      popups.splice(i, 1);
    }
  }

  for (const instance of removed) {
    for (const timer of instance.timers) {
      clearTimeout(timer);
    }
    instance.timers.length = 0;
    startFadeOut(instance.element, () => {});
  }
}

function collectDescendantIds(id: string, out: Set<string>): void {
  for (const p of popups) {
    if (p.parentId === id && !out.has(p.id)) {
      out.add(p.id);
      collectDescendantIds(p.id, out);
    }
  }
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
