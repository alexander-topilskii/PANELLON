/**
 * AST types for the SDF grammar.
 *
 * Every node produces a `float sceneSDF(vec3 p)` expression
 * when compiled to GLSL.
 *
 * See docs/SHADER_PIPELINE.md §3 — Node Families.
 */

// ---------- Primitives ----------

export interface SphereNode {
  type: 'sphere';
  radius: number;
  center: [number, number, number];
}

export interface BoxNode {
  type: 'box';
  size: [number, number, number];
  center: [number, number, number];
}

export interface CylinderNode {
  type: 'cylinder';
  radius: number;
  height: number;
  center: [number, number, number];
}

export interface TorusNode {
  type: 'torus';
  majorRadius: number;
  minorRadius: number;
  center: [number, number, number];
}

export interface PlaneNode {
  type: 'plane';
  normal: [number, number, number];
  offset: number;
}

export type PrimitiveNode = SphereNode | BoxNode | CylinderNode | TorusNode | PlaneNode;

// ---------- Combiners ----------

export interface CombineNode {
  type: 'combine';
  op: 'union' | 'intersection' | 'subtraction' | 'smoothUnion';
  smoothK?: number;
  a: SDFNode;
  b: SDFNode;
}

// ---------- Modifiers ----------

export interface TwistNode {
  type: 'twist';
  angle: number;
  child: SDFNode;
}

export interface BendNode {
  type: 'bend';
  angle: number;
  child: SDFNode;
}

export interface RepeatNode {
  type: 'repeat';
  period: [number, number, number];
  child: SDFNode;
}

export type ModifierNode = TwistNode | BendNode | RepeatNode;

// ---------- Union ----------

export type SDFNode = PrimitiveNode | CombineNode | ModifierNode;

// ---------- Floor tier ----------

export interface TierConfig {
  minDepth: number;
  maxDepth: number;
  primitives: PrimitiveNode['type'][];
  combiners: CombineNode['op'][];
  modifiers: ModifierNode['type'][];
  maxNodes: number;
}

export function getTierConfig(floor: number): TierConfig {
  if (floor <= 20) {
    return {
      minDepth: 1,
      maxDepth: 2,
      primitives: ['sphere', 'box', 'cylinder'],
      combiners: ['union'],
      modifiers: [],
      maxNodes: 3,
    };
  }
  if (floor <= 50) {
    return {
      minDepth: 2,
      maxDepth: 3,
      primitives: ['sphere', 'box', 'cylinder', 'torus', 'plane'],
      combiners: ['union', 'intersection', 'smoothUnion'],
      modifiers: ['twist'],
      maxNodes: 6,
    };
  }
  if (floor <= 150) {
    return {
      minDepth: 3,
      maxDepth: 4,
      primitives: ['sphere', 'box', 'cylinder', 'torus', 'plane'],
      combiners: ['union', 'intersection', 'subtraction', 'smoothUnion'],
      modifiers: ['twist', 'bend', 'repeat'],
      maxNodes: 10,
    };
  }
  return {
    minDepth: 4,
    maxDepth: 8,
    primitives: ['sphere', 'box', 'cylinder', 'torus', 'plane'],
    combiners: ['union', 'intersection', 'subtraction', 'smoothUnion'],
    modifiers: ['twist', 'bend', 'repeat'],
    maxNodes: 16,
  };
}
