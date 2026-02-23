import type { SDFNode } from './types';

/**
 * Compiles an SDF AST into a GLSL `sceneSDF(vec3 p)` function body.
 *
 * The output is self-contained: includes needed helper functions
 * (sdBox, sdTorus, etc.) and defines `float sceneSDF(vec3 p)`.
 *
 * All modifier functions (twist, bend, repeat) return vec3 so they
 * compose as pure expressions without needing intermediate variables.
 */
export function compileToGLSL(node: SDFNode): string {
  const helpers = new Set<string>();
  const expr = emitNode(node, 'p', helpers);

  let code = '';
  for (const h of helpers) {
    code += HELPER_FUNCTIONS[h] + '\n\n';
  }
  code += `float sceneSDF(vec3 p) {\n  return ${expr};\n}\n`;
  return code;
}

function emitNode(node: SDFNode, pos: string, helpers: Set<string>): string {
  switch (node.type) {
    case 'sphere':
      return `length(${pos} - ${vec3(node.center)}) - ${f(node.radius)}`;

    case 'box':
      helpers.add('sdBox');
      return `sdBox(${pos} - ${vec3(node.center)}, ${vec3(node.size)})`;

    case 'cylinder':
      helpers.add('sdCylinder');
      return `sdCylinder(${pos} - ${vec3(node.center)}, ${f(node.radius)}, ${f(node.height)})`;

    case 'torus':
      helpers.add('sdTorus');
      return `sdTorus(${pos} - ${vec3(node.center)}, vec2(${f(node.majorRadius)}, ${f(node.minorRadius)}))`;

    case 'plane':
      return `dot(${pos}, ${vec3(node.normal)}) + ${f(node.offset)}`;

    case 'combine': {
      const a = emitNode(node.a, pos, helpers);
      const b = emitNode(node.b, pos, helpers);
      switch (node.op) {
        case 'union':
          return `min(${a}, ${b})`;
        case 'intersection':
          return `max(${a}, ${b})`;
        case 'subtraction':
          return `max(${a}, -(${b}))`;
        case 'smoothUnion':
          helpers.add('smin');
          return `smin(${a}, ${b}, ${f(node.smoothK ?? 0.3)})`;
      }
      break;
    }

    case 'twist':
      helpers.add('opTwist');
      return emitNode(node.child, `opTwist(${pos}, ${f(node.angle)})`, helpers);

    case 'bend':
      helpers.add('opBend');
      return emitNode(node.child, `opBend(${pos}, ${f(node.angle)})`, helpers);

    case 'repeat':
      helpers.add('opRepeat');
      return emitNode(node.child, `opRepeat(${pos}, ${vec3(node.period)})`, helpers);
  }

  return '1.0';
}

function f(n: number): string {
  const s = n.toFixed(4);
  return s.includes('.') ? s : s + '.0';
}

function vec3(v: [number, number, number] | number[]): string {
  return `vec3(${f(v[0]!)}, ${f(v[1]!)}, ${f(v[2]!)})`;
}

const HELPER_FUNCTIONS: Record<string, string> = {
  sdBox: /* glsl */ `
float sdBox(vec3 p, vec3 b) {
  vec3 q = abs(p) - b;
  return length(max(q, 0.0)) + min(max(q.x, max(q.y, q.z)), 0.0);
}`,

  sdCylinder: /* glsl */ `
float sdCylinder(vec3 p, float r, float h) {
  vec2 d = abs(vec2(length(p.xz), p.y)) - vec2(r, h * 0.5);
  return min(max(d.x, d.y), 0.0) + length(max(d, 0.0));
}`,

  sdTorus: /* glsl */ `
float sdTorus(vec3 p, vec2 t) {
  vec2 q = vec2(length(p.xz) - t.x, p.y);
  return length(q) - t.y;
}`,

  smin: /* glsl */ `
float smin(float a, float b, float k) {
  float h = clamp(0.5 + 0.5 * (b - a) / k, 0.0, 1.0);
  return mix(b, a, h) - k * h * (1.0 - h);
}`,

  opTwist: /* glsl */ `
vec3 opTwist(vec3 p, float k) {
  float c = cos(k * p.y);
  float s = sin(k * p.y);
  mat2 m = mat2(c, -s, s, c);
  return vec3(m * p.xz, p.y);
}`,

  opBend: /* glsl */ `
vec3 opBend(vec3 p, float k) {
  float c = cos(k * p.x);
  float s = sin(k * p.x);
  mat2 m = mat2(c, -s, s, c);
  return vec3(p.x, m * p.yz);
}`,

  opRepeat: /* glsl */ `
vec3 opRepeat(vec3 p, vec3 period) {
  return mod(p + 0.5 * period, period) - 0.5 * period;
}`,
};
