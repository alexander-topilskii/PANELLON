import { describe, it, expect } from 'vitest';
import { normalizeSDF } from './normalize';
import type { SDFNode } from './types';

describe('normalizeSDF', () => {
  it('centers a sphere that is off-center', () => {
    const node: SDFNode = { type: 'sphere', radius: 0.5, center: [3, 3, 3] };
    normalizeSDF(node);
    expect(node.center[0]).toBeCloseTo(0, 1);
    expect(node.center[1]).toBeCloseTo(0, 1);
    expect(node.center[2]).toBeCloseTo(0, 1);
  });

  it('scales down a large box to fit within target radius', () => {
    const node: SDFNode = { type: 'box', size: [5, 5, 5], center: [0, 0, 0] };
    normalizeSDF(node);
    const maxDim = Math.max(node.size[0], node.size[1], node.size[2]);
    expect(maxDim).toBeLessThanOrEqual(1.6);
  });

  it('does not scale up a small object', () => {
    const node: SDFNode = { type: 'sphere', radius: 0.3, center: [0, 0, 0] };
    normalizeSDF(node);
    expect(node.radius).toBeCloseTo(0.3, 2);
  });

  it('clamps extreme aspect ratio on box', () => {
    const node: SDFNode = { type: 'box', size: [0.01, 5, 0.01], center: [0, 0, 0] };
    normalizeSDF(node);
    const minDim = Math.min(node.size[0], node.size[2]);
    const maxDim = Math.max(node.size[0], node.size[1], node.size[2]);
    expect(maxDim / minDim).toBeLessThanOrEqual(5);
  });

  it('normalizes a combine node', () => {
    const node: SDFNode = {
      type: 'combine',
      op: 'union',
      a: { type: 'sphere', radius: 0.5, center: [5, 0, 0] },
      b: { type: 'sphere', radius: 0.5, center: [-5, 0, 0] },
    };
    normalizeSDF(node);
    const a = node.a as { center: number[] };
    const b = node.b as { center: number[] };
    const spread = Math.abs(a.center[0]!) + Math.abs(b.center[0]!);
    expect(spread).toBeLessThanOrEqual(4);
  });
});
