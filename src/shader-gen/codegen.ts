import type { SDFNode } from './types';

/**
 * Compiles an SDF AST into a GLSL `sceneSDF(vec3 p)` function body.
 *
 * The output is self-contained: includes needed helper functions
 * (sdBox, sdTorus, noise3D, fbm, etc.) and defines
 * `float sceneSDF(vec3 p)`.
 *
 * Modifier and animation functions transform `p` or `d` inline,
 * composing as pure expressions without intermediate variables.
 */
export function compileToGLSL(node: SDFNode): string {
  const helpers = new Set<string>();
  const expr = emitNode(node, 'p', helpers);

  let code = '';
  for (const h of helpers) {
    if (HELPER_FUNCTIONS[h]) {
      code += HELPER_FUNCTIONS[h] + '\n\n';
    }
  }
  code += `float sceneSDF(vec3 p) {\n  return ${expr};\n}\n`;
  return code;
}

function emitNode(node: SDFNode, pos: string, helpers: Set<string>): string {
  switch (node.type) {
    // ---------- Primitives ----------
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

    // ---------- Combiners ----------
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

    // ---------- Modifiers ----------
    case 'twist':
      helpers.add('opTwist');
      return emitNode(node.child, `opTwist(${pos}, ${f(node.angle)})`, helpers);

    case 'bend':
      helpers.add('opBend');
      return emitNode(node.child, `opBend(${pos}, ${f(node.angle)})`, helpers);

    case 'repeat':
      helpers.add('opRepeat');
      return emitNode(node.child, `opRepeat(${pos}, ${vec3(node.period)})`, helpers);

    // ---------- Noise ----------
    case 'displace':
      helpers.add('noise3D');
      return `(${emitNode(node.child, pos, helpers)} + ${f(node.amplitude)} * noise3D(${pos} * ${f(node.frequency)}))`;

    case 'fbmDisplace':
      helpers.add('noise3D');
      helpers.add('fbm');
      return `(${emitNode(node.child, pos, helpers)} + ${f(node.amplitude)} * fbm(${pos} * ${f(node.frequency)}, ${node.octaves}))`;

    // ---------- Fractals ----------
    case 'fractalRepeat': {
      helpers.add('opRepeat');
      const period = 2.0 / node.scale;
      const repeatedPos = `opRepeat(${pos}, vec3(${f(period)}))`;
      const childExpr = emitNode(node.child, repeatedPos, helpers);
      return `(${childExpr} * ${f(1.0 / node.iterations)})`;
    }

    case 'menger':
      helpers.add('sdBox');
      helpers.add('sdMenger');
      return `sdMenger(${pos} - ${vec3(node.center)}, ${f(node.size)}, ${node.iterations})`;

    case 'sierpinski':
      helpers.add('sdSierpinski');
      return `sdSierpinski(${pos} - ${vec3(node.center)}, ${f(node.scale)}, ${node.iterations})`;

    // ---------- Animations ----------
    case 'rotateY':
      helpers.add('opRotateY');
      return emitNode(node.child, `opRotateY(${pos}, uTime * ${f(node.speed)})`, helpers);

    case 'pulse': {
      const childExpr = emitNode(node.child, pos, helpers);
      return `(${childExpr} + ${f(node.amplitude)} * sin(uTime * ${f(node.frequency)} * 6.2832))`;
    }

    case 'slide': {
      const slideOffset = `${f(node.amplitude)} * sin(uTime * ${f(node.frequency)} * 6.2832)`;
      const movedPos = `(${pos} - vec3(${
        node.axis === 'x' ? slideOffset : '0.0'
      }, ${
        node.axis === 'y' ? slideOffset : '0.0'
      }, ${
        node.axis === 'z' ? slideOffset : '0.0'
      }))`;
      return emitNode(node.child, movedPos, helpers);
    }

    case 'morph': {
      const aExpr = emitNode(node.a, pos, helpers);
      const bExpr = emitNode(node.b, pos, helpers);
      return `mix(${aExpr}, ${bExpr}, 0.5 + 0.5 * sin(uTime * ${f(node.frequency)} * 6.2832))`;
    }
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

  // Simplex-inspired 3D noise (smooth, no lookup textures)
  noise3D: /* glsl */ `
vec3 _n3_perm(vec3 x) {
  return mod(((x * 34.0) + 1.0) * x, 289.0);
}

float noise3D(vec3 p) {
  vec3 a = floor(p);
  vec3 d = p - a;
  d = d * d * (3.0 - 2.0 * d);
  vec4 b = a.xxyy + vec4(0.0, 1.0, 0.0, 1.0);
  vec4 k1 = _n3_perm(b.xyxy);
  vec4 k2 = _n3_perm(k1.xyxy + b.zzww);
  vec4 c = k2 + a.zzzz;
  vec4 k3 = _n3_perm(c);
  vec4 k4 = _n3_perm(c + 1.0);
  vec4 o1 = fract(k3 * (1.0 / 41.0));
  vec4 o2 = fract(k4 * (1.0 / 41.0));
  vec4 o3 = o2 * d.z + o1 * (1.0 - d.z);
  vec2 o4 = o3.yw * d.x + o3.xz * (1.0 - d.x);
  return o4.y * d.y + o4.x * (1.0 - d.y);
}`,

  fbm: /* glsl */ `
float fbm(vec3 p, int octaves) {
  float value = 0.0;
  float amplitude = 0.5;
  float frequency = 1.0;
  for (int i = 0; i < 8; i++) {
    if (i >= octaves) break;
    value += amplitude * noise3D(p * frequency);
    frequency *= 2.0;
    amplitude *= 0.5;
  }
  return value;
}`,

  opRotateY: /* glsl */ `
vec3 opRotateY(vec3 p, float angle) {
  float c = cos(angle);
  float s = sin(angle);
  return vec3(c * p.x + s * p.z, p.y, -s * p.x + c * p.z);
}`,

  sdMenger: /* glsl */ `
float sdMenger(vec3 p, float size, int iter) {
  float d = sdBox(p, vec3(size));
  float s = size;
  for (int i = 0; i < 6; i++) {
    if (i >= iter) break;
    vec3 a = mod(p * s, 2.0) - 1.0;
    s *= 3.0;
    vec3 r = abs(1.0 - 3.0 * abs(a));
    float da = max(r.x, r.y);
    float db = max(r.y, r.z);
    float dc = max(r.z, r.x);
    float c = (min(da, min(db, dc)) - 1.0) / s;
    d = max(d, c);
  }
  return d;
}`,

  sdSierpinski: /* glsl */ `
float sdSierpinski(vec3 p, float scale, int iter) {
  float r;
  int n = 0;
  for (int i = 0; i < 8; i++) {
    if (i >= iter) break;
    if (p.x + p.y < 0.0) p.xy = -p.yx;
    if (p.x + p.z < 0.0) p.xz = -p.zx;
    if (p.y + p.z < 0.0) p.yz = -p.zy;
    p = p * scale - vec3(scale - 1.0);
    n++;
  }
  return length(p) * pow(scale, -float(n)) - 0.01;
}`,
};
