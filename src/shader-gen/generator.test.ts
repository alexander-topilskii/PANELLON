import { describe, it, expect } from 'vitest';
import { generateSDF } from './generator';
import { compileToGLSL } from './codegen';
import type { SDFNode } from './types';

describe('generateSDF', () => {
  it('produces deterministic output for same roomId and floor', () => {
    const a = generateSDF(12345, 10);
    const b = generateSDF(12345, 10);
    expect(a).toEqual(b);
  });

  it('produces different output for different roomIds', () => {
    const a = generateSDF(100, 10);
    const b = generateSDF(200, 10);
    expect(a).not.toEqual(b);
  });

  it('returns a primitive node for low floors', () => {
    const node = generateSDF(42, 8);
    expect(['sphere', 'box', 'cylinder', 'combine', 'twist', 'bend', 'repeat']).toContain(node.type);
  });

  it('does not crash on high floors', () => {
    const node = generateSDF(42, 500);
    expect(node).toBeDefined();
  });
});

describe('compileToGLSL', () => {
  it('compiles a sphere node', () => {
    const node: SDFNode = { type: 'sphere', radius: 0.5, center: [0, 0, 0] };
    const code = compileToGLSL(node);
    expect(code).toContain('float sceneSDF(vec3 p)');
    expect(code).toContain('length');
  });

  it('compiles a box node with helper', () => {
    const node: SDFNode = { type: 'box', size: [1, 1, 1], center: [0, 0, 0] };
    const code = compileToGLSL(node);
    expect(code).toContain('sdBox');
    expect(code).toContain('float sceneSDF');
  });

  it('compiles a combine node', () => {
    const node: SDFNode = {
      type: 'combine',
      op: 'union',
      a: { type: 'sphere', radius: 0.5, center: [0, 0, 0] },
      b: { type: 'box', size: [0.5, 0.5, 0.5], center: [1, 0, 0] },
    };
    const code = compileToGLSL(node);
    expect(code).toContain('min(');
    expect(code).toContain('sdBox');
  });

  it('compiles a twist modifier', () => {
    const node: SDFNode = {
      type: 'twist',
      angle: 1.5,
      child: { type: 'sphere', radius: 0.5, center: [0, 0, 0] },
    };
    const code = compileToGLSL(node);
    expect(code).toContain('opTwist');
  });

  it('full pipeline: generateSDF → compileToGLSL produces valid GLSL structure', () => {
    const ast = generateSDF(77777, 15);
    const code = compileToGLSL(ast);
    expect(code).toContain('float sceneSDF(vec3 p)');
    expect(code).toContain('return');
  });

  it('compiles smoothUnion with smin helper', () => {
    const node: SDFNode = {
      type: 'combine',
      op: 'smoothUnion',
      smoothK: 0.3,
      a: { type: 'sphere', radius: 0.5, center: [0, 0, 0] },
      b: { type: 'sphere', radius: 0.3, center: [0.5, 0, 0] },
    };
    const code = compileToGLSL(node);
    expect(code).toContain('smin');
  });
});
