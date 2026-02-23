import { mulberry32 } from '@/shared/hash';
import type { SDFNode, PrimitiveNode, TierConfig } from './types';
import { getTierConfig } from './types';

/**
 * Generates a deterministic SDF AST from a Room_ID hash.
 *
 * Phase 4.3: single primitive (depth 1).
 * Phase 4.4+: combiners, modifiers, deeper trees.
 * Phase 5.2+: noise, fractals, animations.
 */
export function generateSDF(roomId: number, floor: number): SDFNode {
  const rng = mulberry32(roomId);
  const tier = getTierConfig(floor);
  const depth = tier.minDepth + Math.floor(rng() * (tier.maxDepth - tier.minDepth + 1));

  return buildNode(rng, tier, depth);
}

/**
 * Weight table for choosing node category at depth ≥ 2.
 * Probabilities are cumulative and adjust when more families unlock.
 */
function buildNode(rng: () => number, tier: TierConfig, depth: number): SDFNode {
  if (depth <= 1 || tier.combiners.length === 0) {
    return maybeWrapLeaf(rng, tier, buildPrimitive(rng, tier));
  }

  const hasMods = tier.modifiers.length > 0;
  const hasNoise = tier.noise.length > 0;
  const hasFractals = tier.fractals.length > 0;
  const hasAnims = tier.animations.length > 0;
  const roll = rng();

  let threshold = 0;

  // Combiner: 45% base
  threshold += 0.45;
  if (roll < threshold) {
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

  // Modifier: 15%
  if (hasMods) {
    threshold += 0.15;
    if (roll < threshold) {
      const modType = pick(tier.modifiers, rng);
      const child = buildNode(rng, tier, depth - 1);
      return buildModifier(rng, modType, child);
    }
  }

  // Noise: 12%
  if (hasNoise && depth >= 2) {
    threshold += 0.12;
    if (roll < threshold) {
      const noiseType = pick(tier.noise, rng);
      const child = buildNode(rng, tier, depth - 1);
      return buildNoiseNode(rng, noiseType, child);
    }
  }

  // Animation: 12%
  if (hasAnims && depth >= 2) {
    threshold += 0.12;
    if (roll < threshold) {
      const animType = pick(tier.animations, rng);
      if (animType === 'morph') {
        const a = buildNode(rng, tier, depth - 1);
        const b = buildNode(rng, tier, depth - 1);
        return { type: 'morph', frequency: 0.3 + rng() * 0.7, a, b };
      }
      const child = buildNode(rng, tier, depth - 1);
      return buildAnimNode(rng, animType, child);
    }
  }

  // Fractal: 10%
  if (hasFractals && depth >= 2) {
    threshold += 0.10;
    if (roll < threshold) {
      const fracType = pick(tier.fractals, rng);
      return buildFractalNode(rng, fracType, tier, depth);
    }
  }

  // Fallback: primitive (possibly wrapped in leaf-level animation/noise)
  return maybeWrapLeaf(rng, tier, buildPrimitive(rng, tier));
}

/**
 * At leaf level, optionally wrap a primitive in a single animation
 * or noise modifier for visual variety.
 */
function maybeWrapLeaf(rng: () => number, tier: TierConfig, node: SDFNode): SDFNode {
  if (tier.animations.length > 0 && rng() < 0.25) {
    const animType = pick(tier.animations, rng);
    if (animType === 'morph') return node;
    return buildAnimNode(rng, animType, node);
  }
  if (tier.noise.length > 0 && rng() < 0.15) {
    const noiseType = pick(tier.noise, rng);
    return buildNoiseNode(rng, noiseType, node);
  }
  return node;
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

function buildNoiseNode(
  rng: () => number,
  noiseType: string,
  child: SDFNode,
): SDFNode {
  switch (noiseType) {
    case 'displace':
      return {
        type: 'displace',
        amplitude: clamp(rng() * 0.3 + 0.05, 0.05, 0.35),
        frequency: clamp(rng() * 3 + 1, 1, 4),
        child,
      };
    case 'fbmDisplace':
      return {
        type: 'fbmDisplace',
        amplitude: clamp(rng() * 0.25 + 0.05, 0.05, 0.3),
        frequency: clamp(rng() * 2.5 + 0.5, 0.5, 3),
        octaves: Math.floor(rng() * 3) + 2,
        child,
      };
    default:
      return child;
  }
}

function buildAnimNode(
  rng: () => number,
  animType: string,
  child: SDFNode,
): SDFNode {
  switch (animType) {
    case 'rotateY':
      return {
        type: 'rotateY',
        speed: clamp(rng() * 1.5 + 0.3, 0.3, 1.8),
        child,
      };
    case 'pulse':
      return {
        type: 'pulse',
        amplitude: clamp(rng() * 0.3 + 0.05, 0.05, 0.35),
        frequency: clamp(rng() * 2 + 0.5, 0.5, 2.5),
        child,
      };
    case 'slide':
      return {
        type: 'slide',
        axis: (['x', 'y', 'z'] as const)[Math.floor(rng() * 3)]!,
        amplitude: clamp(rng() * 0.8 + 0.1, 0.1, 0.9),
        frequency: clamp(rng() * 1.5 + 0.3, 0.3, 1.8),
        child,
      };
    default:
      return child;
  }
}

function buildFractalNode(
  rng: () => number,
  fracType: string,
  tier: TierConfig,
  depth: number,
): SDFNode {
  switch (fracType) {
    case 'fractalRepeat':
      return {
        type: 'fractalRepeat',
        iterations: Math.floor(rng() * 3) + 2,
        scale: clamp(rng() * 1.5 + 1.5, 1.5, 3.0),
        child: buildNode(rng, tier, depth - 1),
      };
    case 'menger':
      return {
        type: 'menger',
        iterations: Math.floor(rng() * 2) + 3,
        size: clamp(rng() * 1.0 + 0.8, 0.8, 1.8),
        center: randomCenter(rng),
      };
    case 'sierpinski':
      return {
        type: 'sierpinski',
        iterations: Math.floor(rng() * 3) + 3,
        scale: clamp(rng() * 0.5 + 1.5, 1.5, 2.0),
        center: randomCenter(rng),
      };
    default:
      return buildPrimitive(rng, tier);
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
