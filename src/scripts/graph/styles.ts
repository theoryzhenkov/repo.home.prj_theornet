import type { EdgeType } from '@/lib/graph-data';

export interface EdgeStyle {
  color: string;
  width: number;
  dasharray: string;
  directed: boolean;
  label: string;
  shortLabel: string;
}

/**
 * Visual style for each relation type.
 * Color is the only categorical encoding.
 * Width encodes structural weight, so hierarchy reads stronger than references.
 */
export const EDGE_STYLES: Record<EdgeType, EdgeStyle> = {
  up: {
    color: 'var(--color-rel-hierarchy)',
    width: 1.45,
    dasharray: '',
    directed: true,
    label: 'Up / Down — hierarchy',
    shortLabel: 'up',
  },
  is: {
    color: 'var(--color-rel-type)',
    width: 1.3,
    dasharray: '',
    directed: true,
    label: 'Is / Has — classification',
    shortLabel: 'is',
  },
  next: {
    color: 'var(--color-rel-sequence)',
    width: 1.15,
    dasharray: '',
    directed: true,
    label: 'Next / Prev — sequential',
    shortLabel: 'next',
  },
  ref: {
    color: 'var(--color-rel-reference)',
    width: 0.95,
    dasharray: '',
    directed: true,
    label: 'Ref — reference link',
    shortLabel: 'ref',
  },
};

export const NODE_COLORS = {
  fill: 'var(--color-text-muted)',
  fillHighlight: 'var(--color-accent)',
  stroke: 'var(--color-border)',
  strokeHighlight: 'var(--color-accent)',
  labelFill: 'var(--color-text)',
  labelStroke: 'var(--color-bg)',
  labelWeight: 500,
  fontFamily: 'var(--font-mono)',
};
