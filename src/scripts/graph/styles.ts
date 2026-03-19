import type { EdgeType } from '@/lib/graph-data';

export interface EdgeStyle {
  color: string;
  width: number;
  dasharray: string;
  directed: boolean;
  label: string;
}

/**
 * Visual style for each relation type.
 * Colors reference the site's CSS custom properties at runtime via
 * getComputedStyle, but we keep hex fallbacks for the SVG markers
 * which need concrete values.
 */
export const EDGE_STYLES: Record<EdgeType, EdgeStyle> = {
  up: {
    color: '#000055',   // --color-accent
    width: 2,
    dasharray: '',
    directed: true,
    label: 'Up / Down — hierarchy',
  },
  is: {
    color: '#006600',   // --color-success
    width: 1.5,
    dasharray: '6 3',
    directed: true,
    label: 'Is / Has — classification',
  },
  next: {
    color: '#000055',
    width: 1,
    dasharray: '2 4',
    directed: true,
    label: 'Next / Prev — sequential',
  },
  ref: {
    color: '#aaaaaa',
    width: 0.75,
    dasharray: '1 3',
    directed: true,
    label: 'Ref — reference link',
  },
};

/** Read a CSS custom property value from :root, with fallback. */
export function cssVar(name: string, fallback: string): string {
  if (typeof document === 'undefined') return fallback;
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim() || fallback;
}

/** Runtime-resolved node/label colors. Populated by resolveRuntimeColors(). */
export const NODE_COLORS = {
  fill: '#444',
  fillHighlight: '#000055',
  stroke: '#999',
  strokeHighlight: '#000055',
  labelFill: '#111',
  fontFamily: 'system-ui, sans-serif',
};

/**
 * Resolve runtime CSS variable colors. Call once on the client after DOM ready.
 */
export function resolveRuntimeColors(): void {
  EDGE_STYLES.up.color = cssVar('--color-accent', '#000055');
  EDGE_STYLES.is.color = cssVar('--color-success', '#006600');
  EDGE_STYLES.next.color = cssVar('--color-accent', '#000055');
  EDGE_STYLES.ref.color = cssVar('--color-border', '#cccccc');

  NODE_COLORS.fill = cssVar('--color-text-muted', '#444');
  NODE_COLORS.fillHighlight = cssVar('--color-accent', '#000055');
  NODE_COLORS.stroke = cssVar('--color-border', '#999');
  NODE_COLORS.strokeHighlight = cssVar('--color-accent', '#000055');
  NODE_COLORS.labelFill = cssVar('--color-text', '#111');
  NODE_COLORS.fontFamily = cssVar('--font-mono', 'Consolas, monospace');
}
