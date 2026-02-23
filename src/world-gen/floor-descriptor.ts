import { CEILING_HEIGHT, CELL_SIZE } from '@/shared/constants';
import { floorGridSize } from './maze';
import { roomHash } from '@/shared/hash';

export type FloorType = 'lobby' | 'linear' | 'procedural';

export interface StairDescriptor {
  position: { x: number; z: number };
  direction: 'up' | 'down';
}

export interface FloorDescriptor {
  number: number;
  type: FloorType;
  width: number;
  depth: number;
  height: number;
  stairs: StairDescriptor[];
  spawn: { x: number; z: number };
  /** For procedural floors only */
  gridSide?: number;
}

export function describeFloor(floorNum: number, globalSeed = 0): FloorDescriptor {
  if (floorNum === 0) {
    return {
      number: 0,
      type: 'lobby',
      width: 6,
      depth: 6,
      height: CEILING_HEIGHT,
      stairs: [{ position: { x: 0, z: -2.5 }, direction: 'up' }],
      spawn: { x: 0, z: 2 },
    };
  }

  if (floorNum >= 1 && floorNum <= 5) {
    return {
      number: floorNum,
      type: 'linear',
      width: 4,
      depth: 30,
      height: CEILING_HEIGHT,
      stairs: [
        { position: { x: 0, z: -14 }, direction: 'up' },
        { position: { x: 0, z: 14 }, direction: 'down' },
      ],
      spawn: { x: 0, z: 13 },
    };
  }

  // Procedural floors 6+
  const { side } = floorGridSize(floorNum);
  const totalSize = side * CELL_SIZE;
  const halfSize = totalSize / 2;

  // Stair position: deterministic from hash(floor), on grid edge
  const stairHash = roomHash(0, globalSeed, floorNum, 0, 0);
  const edgeCells = side * 4 - 4;
  const edgeIdx = stairHash % Math.max(edgeCells, 1);
  const stairCell = edgeIndexToCell(edgeIdx, side);
  const stairWorldX = stairCell.x * CELL_SIZE - halfSize + CELL_SIZE / 2;
  const stairWorldZ = stairCell.z * CELL_SIZE - halfSize + CELL_SIZE / 2;

  return {
    number: floorNum,
    type: 'procedural',
    width: totalSize,
    depth: totalSize,
    height: CEILING_HEIGHT,
    gridSide: side,
    stairs: [
      { position: { x: stairWorldX, z: stairWorldZ }, direction: 'up' },
      { position: { x: stairWorldX, z: stairWorldZ }, direction: 'down' },
    ],
    spawn: { x: stairWorldX, z: stairWorldZ },
  };
}

/** Converts a linear edge index to (x, z) cell coordinates */
function edgeIndexToCell(idx: number, side: number): { x: number; z: number } {
  if (side <= 1) return { x: 0, z: 0 };

  const topLen = side;
  if (idx < topLen) return { x: idx, z: 0 };
  const rightLen = side - 2;
  if (idx < topLen + rightLen) return { x: side - 1, z: idx - topLen + 1 };
  const bottomLen = side;
  if (idx < topLen + rightLen + bottomLen)
    return { x: side - 1 - (idx - topLen - rightLen), z: side - 1 };
  return { x: 0, z: side - 1 - (idx - topLen - rightLen - bottomLen) };
}
