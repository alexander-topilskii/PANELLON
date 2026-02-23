import { mulberry32 } from '@/shared/hash';
import type { SDFNode, PrimitiveNode, TierConfig } from './types';
import { getTierConfig } from './types';

/**
 * Generates a deterministic SDF AST from a Room_ID hash.
 *
 * Phase 4.3: single primitive (depth 1).
 * Phase 4.4+: combiners, modifiers, deeper trees.
 */
export function generateSDF(roomId: number, floor: number): SDFNode {
  const rng = mulberry32(roomId);
  const tier = getTierConfig(floor);
  const depth = tier.minDepth + Math.floor(rng() * (tier.maxDepth - tier.minDepth + 1));

  return buildNode(rng, tier, depth);
}

function buildNode(rng: () => number, tier: TierConfig, depth: number): SDFNode {
  if (depth <= 1 || tier.combiners.length === 0) {
    return buildPrimitive(rng, tier);
  }

  // At deeper levels, choose between combiner and modifier
  const hasMods = tier.modifiers.length > 0 && depth >= 2;
  const roll = rng();

  if (roll < 0.6) {
    // Combiner: two children
    const op = pick(tier.combiners, rng);
    const a = buildNode(rng, tier, depth - 1);
    const b = buildNode(rng, tier, depth - 1);
    return {
      type: 'combine',
      op,
      smoothK: op === 'smoothUnion' ? 0.2 + rng() * 0.6 : undefined,
      a,
      b,
    };
  }

  if (hasMods && roll < 0.85) {
    const modType = pick(tier.modifiers, rng);
    const child = buildNode(rng, tier, depth - 1);
    return buildModifier(rng, modType, child);
  }

  return buildPrimitive(rng, tier);
}

function buildPrimitive(rng: () => number, tier: TierConfig): PrimitiveNode {
  const pType = pick(tier.primitives, rng);

  switch (pType) {
    case 'sphere':
      return {
        type: 'sphere',
        radius: clamp(rng() * 1.9 + 0.1, 0.1, 2.0),
        center: randomCenter(rng),
      };
    case 'box':
      return {
        type: 'box',
        size: [
          clamp(rng() * 1.9 + 0.1, 0.1, 2.0),
          clamp(rng() * 1.9 + 0.1, 0.1, 2.0),
          clamp(rng() * 1.9 + 0.1, 0.1, 2.0),
        ],
        center: randomCenter(rng),
      };
    case 'cylinder':
      return {
        type: 'cylinder',
        radius: clamp(rng() * 1.4 + 0.1, 0.1, 1.5),
        height: clamp(rng() * 2.3 + 0.2, 0.2, 2.5),
        center: randomCenter(rng),
      };
    case 'torus':
      return {
        type: 'torus',
        majorRadius: clamp(rng() * 0.8 + 0.2, 0.2, 1.0),
        minorRadius: clamp(rng() * 0.45 + 0.05, 0.05, 0.5),
        center: randomCenter(rng),
      };
    case 'plane':
      return {
        type: 'plane',
        normal: normalizeVec(rng() - 0.5, rng() - 0.5, rng() - 0.5),
        offset: clamp((rng() - 0.5) * 2, -1, 1),
      };
  }
}

function buildModifier(
  rng: () => number,
  modType: string,
  child: SDFNode,
): SDFNode {
  switch (modType) {
    case 'twist':
      return {
        type: 'twist',
        angle: clamp((rng() - 0.5) * 2 * Math.PI, -Math.PI, Math.PI),
        child,
      };
    case 'bend':
      return {
        type: 'bend',
        angle: clamp((rng() - 0.5) * 2 * Math.PI, -Math.PI, Math.PI),
        child,
      };
    case 'repeat':
      return {
        type: 'repeat',
        period: [
          clamp(rng() * 3.5 + 0.5, 0.5, 4.0),
          clamp(rng() * 3.5 + 0.5, 0.5, 4.0),
          clamp(rng() * 3.5 + 0.5, 0.5, 4.0),
        ],
        child,
      };
    default:
      return child;
  }
}

function randomCenter(rng: () => number): [number, number, number] {
  return [
    (rng() - 0.5) * 1.5,
    rng() * 1.2,
    (rng() - 0.5) * 1.5,
  ];
}

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}

function pick<T>(arr: T[], rng: () => number): T {
  return arr[Math.floor(rng() * arr.length)]!;
}

function normalizeVec(x: number, y: number, z: number): [number, number, number] {
  const len = Math.sqrt(x * x + y * y + z * z) || 1;
  return [x / len, y / len, z / len];
}
