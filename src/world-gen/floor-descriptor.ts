import { CEILING_HEIGHT, CELL_SIZE } from '@/shared/constants';
import { floorGridSize } from './maze';
import { roomHash } from '@/shared/hash';

export type FloorType = 'lobby' | 'linear' | 'procedural';

export interface StairDescriptor {
  position: { x: number; z: number };
  direction: 'up' | 'down';
}

export interface TeleportDescriptor {
  position: { x: number; z: number };
  targetFloor: number;
}

export interface FloorDescriptor {
  number: number;
  type: FloorType;
  width: number;
  depth: number;
  height: number;
  stairs: StairDescriptor[];
  teleports: TeleportDescriptor[];
  spawn: { x: number; z: number };
  /** For procedural floors only */
  gridSide?: number;
  /** Grid cells reserved for stairs/teleports — no room doors here */
  reservedCells?: Array<{ x: number; z: number }>;
}

function buildMainLobbyTeleports(): TeleportDescriptor[] {
  const targets = [
    10, 20, 30, 50,
    100, 150, 200, 300, 500,
  ];
  const cols = 5;
  return targets.map((target, i) => ({
    position: {
      x: -6 + (i % cols) * 3,
      z: -1 - Math.floor(i / cols) * 3,
    },
    targetFloor: target,
  }));
}

function buildHubTeleports(base: number): TeleportDescriptor[] {
  const teleports: TeleportDescriptor[] = [];
  for (let offset = -90; offset <= 90; offset += 10) {
    const target = base + offset;
    if (target <= 0 || target === base) continue;
    teleports.push({
      position: {
        x: -6 + (teleports.length % 5) * 3,
        z: -1 - Math.floor(teleports.length / 5) * 3,
      },
      targetFloor: target,
    });
  }
  return teleports;
}

function isHub(floorNum: number): boolean {
  return floorNum > 0 && floorNum % 100 === 0;
}

export function describeFloor(floorNum: number, globalSeed = 0): FloorDescriptor {
  if (floorNum === 0) {
    return {
      number: 0,
      type: 'lobby',
      width: 20,
      depth: 20,
      height: CEILING_HEIGHT,
      stairs: [{ position: { x: 0, z: -9 }, direction: 'up' }],
      teleports: buildMainLobbyTeleports(),
      spawn: { x: 0, z: 7 },
    };
  }

  if (isHub(floorNum)) {
    const stairs: StairDescriptor[] = [
      { position: { x: -4, z: -9 }, direction: 'up' },
      { position: { x: 4, z: -9 }, direction: 'down' },
    ];
    return {
      number: floorNum,
      type: 'lobby',
      width: 20,
      depth: 20,
      height: CEILING_HEIGHT,
      stairs,
      teleports: buildHubTeleports(floorNum),
      spawn: { x: 0, z: 7 },
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
      teleports: [],
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
    teleports: [],
    spawn: { x: stairWorldX, z: stairWorldZ },
    reservedCells: [stairCell],
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
