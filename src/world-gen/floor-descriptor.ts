import { CEILING_HEIGHT } from '@/shared/constants';

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
  /** Player spawn position on entering this floor */
  spawn: { x: number; z: number };
}

/**
 * Returns floor descriptor for special floors 0–5.
 * Floors 6+ are procedural and handled in Phase 3.
 */
export function describeFloor(floorNum: number): FloorDescriptor {
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

  // Placeholder for procedural floors (Phase 3)
  return {
    number: floorNum,
    type: 'procedural',
    width: 6,
    depth: 6,
    height: CEILING_HEIGHT,
    stairs: [],
    spawn: { x: 0, z: 0 },
  };
}
