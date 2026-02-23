import type { SDFNode } from './types';

const TARGET_RADIUS = 1.5;
const MAX_ASPECT_RATIO = 4.0;

/**
 * Normalize the SDF tree so the resulting object fits within a sphere
 * of ~1.5 m centered at (0, y_center, 0).
 *
 * Steps:
 *  1. Estimate bounding extents from the AST.
 *  2. Shift center offsets so the composition is centered at (0, ?, 0).
 *  3. Scale parameters so the whole object fits in TARGET_RADIUS.
 *  4. Clamp aspect ratios to avoid degenerate shapes.
 *
 * This operates on the AST in-place (mutates).
 */
export function normalizeSDF(node: SDFNode): void {
  clampAspectRatios(node);

  const bounds = estimateBounds(node);
  const cx = (bounds.minX + bounds.maxX) / 2;
  const cy = (bounds.minY + bounds.maxY) / 2;
  const cz = (bounds.minZ + bounds.maxZ) / 2;

  shiftCenter(node, cx, cy, cz);

  const extentX = (bounds.maxX - bounds.minX) / 2;
  const extentY = (bounds.maxY - bounds.minY) / 2;
  const extentZ = (bounds.maxZ - bounds.minZ) / 2;
  const maxExtent = Math.max(extentX, extentY, extentZ, 0.01);

  if (maxExtent > TARGET_RADIUS) {
    const scale = TARGET_RADIUS / maxExtent;
    scaleNode(node, scale);
  }
}

interface Bounds {
  minX: number; maxX: number;
  minY: number; maxY: number;
  minZ: number; maxZ: number;
}

function estimateBounds(node: SDFNode): Bounds {
  switch (node.type) {
    case 'sphere': {
      const [cx, cy, cz] = node.center;
      const r = node.radius;
      return {
        minX: cx - r, maxX: cx + r,
        minY: cy - r, maxY: cy + r,
        minZ: cz - r, maxZ: cz + r,
      };
    }
    case 'box': {
      const [cx, cy, cz] = node.center;
      const [sx, sy, sz] = node.size;
      return {
        minX: cx - sx, maxX: cx + sx,
        minY: cy - sy, maxY: cy + sy,
        minZ: cz - sz, maxZ: cz + sz,
      };
    }
    case 'cylinder': {
      const [cx, cy, cz] = node.center;
      const r = node.radius;
      const hh = node.height / 2;
      return {
        minX: cx - r, maxX: cx + r,
        minY: cy - hh, maxY: cy + hh,
        minZ: cz - r, maxZ: cz + r,
      };
    }
    case 'torus': {
      const [cx, cy, cz] = node.center;
      const R = node.majorRadius + node.minorRadius;
      const h = node.minorRadius;
      return {
        minX: cx - R, maxX: cx + R,
        minY: cy - h, maxY: cy + h,
        minZ: cz - R, maxZ: cz + R,
      };
    }
    case 'plane':
      return { minX: -2, maxX: 2, minY: -1, maxY: 2, minZ: -2, maxZ: 2 };

    case 'combine': {
      const ba = estimateBounds(node.a);
      const bb = estimateBounds(node.b);
      if (node.op === 'intersection') {
        return {
          minX: Math.max(ba.minX, bb.minX), maxX: Math.min(ba.maxX, bb.maxX),
          minY: Math.max(ba.minY, bb.minY), maxY: Math.min(ba.maxY, bb.maxY),
          minZ: Math.max(ba.minZ, bb.minZ), maxZ: Math.min(ba.maxZ, bb.maxZ),
        };
      }
      return {
        minX: Math.min(ba.minX, bb.minX), maxX: Math.max(ba.maxX, bb.maxX),
        minY: Math.min(ba.minY, bb.minY), maxY: Math.max(ba.maxY, bb.maxY),
        minZ: Math.min(ba.minZ, bb.minZ), maxZ: Math.max(ba.maxZ, bb.maxZ),
      };
    }

    case 'twist':
    case 'bend':
    case 'repeat': {
      const cb = estimateBounds(node.child);
      const inflate = 1.3;
      return inflatedBounds(cb, inflate);
    }

    case 'displace':
    case 'fbmDisplace': {
      const cb = estimateBounds(node.child);
      const amp = node.amplitude;
      return {
        minX: cb.minX - amp, maxX: cb.maxX + amp,
        minY: cb.minY - amp, maxY: cb.maxY + amp,
        minZ: cb.minZ - amp, maxZ: cb.maxZ + amp,
      };
    }

    case 'fractalRepeat': {
      const cb = estimateBounds(node.child);
      return inflatedBounds(cb, 1.5);
    }

    case 'menger': {
      const [cx, cy, cz] = node.center;
      const s = node.size;
      return {
        minX: cx - s, maxX: cx + s,
        minY: cy - s, maxY: cy + s,
        minZ: cz - s, maxZ: cz + s,
      };
    }

    case 'sierpinski': {
      const [cx, cy, cz] = node.center;
      const r = 1.5;
      return {
        minX: cx - r, maxX: cx + r,
        minY: cy - r, maxY: cy + r,
        minZ: cz - r, maxZ: cz + r,
      };
    }

    case 'rotateY':
    case 'pulse':
    case 'slide': {
      const cb = estimateBounds(node.child);
      const inflate = 1.2;
      return inflatedBounds(cb, inflate);
    }

    case 'morph': {
      const ba = estimateBounds(node.a);
      const bb = estimateBounds(node.b);
      return {
        minX: Math.min(ba.minX, bb.minX), maxX: Math.max(ba.maxX, bb.maxX),
        minY: Math.min(ba.minY, bb.minY), maxY: Math.max(ba.maxY, bb.maxY),
        minZ: Math.min(ba.minZ, bb.minZ), maxZ: Math.max(ba.maxZ, bb.maxZ),
      };
    }
  }
}

function inflatedBounds(b: Bounds, factor: number): Bounds {
  return {
    minX: b.minX * factor, maxX: b.maxX * factor,
    minY: b.minY * factor, maxY: b.maxY * factor,
    minZ: b.minZ * factor, maxZ: b.maxZ * factor,
  };
}

function shiftCenter(node: SDFNode, dx: number, dy: number, dz: number): void {
  if ('center' in node && Array.isArray(node.center)) {
    node.center[0] -= dx;
    node.center[1] -= dy;
    node.center[2] -= dz;
  }
  if ('a' in node && 'b' in node) {
    shiftCenter(node.a as SDFNode, dx, dy, dz);
    shiftCenter(node.b as SDFNode, dx, dy, dz);
  }
  if ('child' in node) {
    shiftCenter(node.child as SDFNode, dx, dy, dz);
  }
}

function scaleNode(node: SDFNode, s: number): void {
  switch (node.type) {
    case 'sphere':
      node.radius *= s;
      node.center[0] *= s;
      node.center[1] *= s;
      node.center[2] *= s;
      break;
    case 'box':
      node.size[0] *= s;
      node.size[1] *= s;
      node.size[2] *= s;
      node.center[0] *= s;
      node.center[1] *= s;
      node.center[2] *= s;
      break;
    case 'cylinder':
      node.radius *= s;
      node.height *= s;
      node.center[0] *= s;
      node.center[1] *= s;
      node.center[2] *= s;
      break;
    case 'torus':
      node.majorRadius *= s;
      node.minorRadius *= s;
      node.center[0] *= s;
      node.center[1] *= s;
      node.center[2] *= s;
      break;
    case 'plane':
      node.offset *= s;
      break;
    case 'combine':
      scaleNode(node.a, s);
      scaleNode(node.b, s);
      break;
    case 'twist':
    case 'bend':
      scaleNode(node.child, s);
      break;
    case 'repeat':
      node.period[0] *= s;
      node.period[1] *= s;
      node.period[2] *= s;
      scaleNode(node.child, s);
      break;
    case 'displace':
      node.amplitude *= s;
      scaleNode(node.child, s);
      break;
    case 'fbmDisplace':
      node.amplitude *= s;
      scaleNode(node.child, s);
      break;
    case 'fractalRepeat':
      node.scale *= s;
      scaleNode(node.child, s);
      break;
    case 'menger':
      node.size *= s;
      node.center[0] *= s;
      node.center[1] *= s;
      node.center[2] *= s;
      break;
    case 'sierpinski':
      node.center[0] *= s;
      node.center[1] *= s;
      node.center[2] *= s;
      break;
    case 'rotateY':
    case 'pulse':
    case 'slide':
      scaleNode(node.child, s);
      break;
    case 'morph':
      scaleNode(node.a, s);
      scaleNode(node.b, s);
      break;
  }
}

function clampAspectRatios(node: SDFNode): void {
  if (node.type === 'box') {
    const [sx, sy, sz] = node.size;
    const minDim = Math.min(sx, sy, sz);
    const maxDim = Math.max(sx, sy, sz);
    if (maxDim / Math.max(minDim, 0.01) > MAX_ASPECT_RATIO) {
      const target = maxDim / MAX_ASPECT_RATIO;
      if (sx === minDim) node.size[0] = target;
      if (sy === minDim) node.size[1] = target;
      if (sz === minDim) node.size[2] = target;
    }
  }
  if (node.type === 'cylinder') {
    const aspect = node.height / Math.max(node.radius * 2, 0.01);
    if (aspect > MAX_ASPECT_RATIO) {
      node.radius = node.height / (MAX_ASPECT_RATIO * 2);
    }
    if (1 / aspect > MAX_ASPECT_RATIO) {
      node.height = node.radius * 2 * MAX_ASPECT_RATIO;
    }
  }
  if ('a' in node && 'b' in node) {
    clampAspectRatios(node.a as SDFNode);
    clampAspectRatios(node.b as SDFNode);
  }
  if ('child' in node) {
    clampAspectRatios(node.child as SDFNode);
  }
}
