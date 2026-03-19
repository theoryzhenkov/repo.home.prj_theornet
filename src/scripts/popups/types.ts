/** Popup system types and configuration constants */

type PopupContentType = 'page' | 'section' | 'footnote';

interface PopupTarget {
  anchor: HTMLAnchorElement;
  path: string;
  hash: string | null;
  contentType: PopupContentType;
  footnoteId: string | null;
}

interface CachedDocument {
  doc: Document;
  title: string;
  cachedAt: number;
}

interface PopupContent {
  title: string;
  bodyHtml: string;
  href: string;
  contentType: PopupContentType;
}

interface PopupInstance {
  id: string;
  element: HTMLElement;
  anchor: HTMLAnchorElement;
  parentId: string | null;
  depth: number;
  timers: ReturnType<typeof setTimeout>[];
}

interface PopupPosition {
  top: number;
  left: number;
  placement: 'below' | 'above' | 'right' | 'left';
  maxHeight: number;
}

interface PopupConfig {
  spawnDelay: number;
  prefetchDelay: number;
  fadeOutDelay: number;
  fadeOutDuration: number;
  maxContentHeight: number;
  maxWidth: number;
  gap: number;
  maxDepth: number;
  mobileBreakpoint: number;
  viewportMargin: number;
}

const POPUP_CONFIG: PopupConfig = {
  spawnDelay: 750,
  prefetchDelay: 50,
  fadeOutDelay: 100,
  fadeOutDuration: 250,
  maxContentHeight: 300,
  maxWidth: 400,
  gap: 8,
  maxDepth: 2,
  mobileBreakpoint: 1024,
  viewportMargin: 12,
} as const;

export type {
  PopupContentType,
  PopupTarget,
  CachedDocument,
  PopupContent,
  PopupInstance,
  PopupPosition,
  PopupConfig,
};
export { POPUP_CONFIG };
