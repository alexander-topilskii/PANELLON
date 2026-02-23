import { mulberry32 } from '@/shared/hash';

/**
 * Wall bit flags per cell (lower 4 bits).
 * A set bit means the wall EXISTS (not removed by DFS).
 */
export const WALL_N = 0b0001; // -Z
export const WALL_S = 0b0010; // +Z
export const WALL_E = 0b0100; // +X
export const WALL_W = 0b1000; // -X
export const VISITED = 0b10000;

const ALL_WALLS = WALL_N | WALL_S | WALL_E | WALL_W;

interface Direction {
  dx: number;
  dz: number;
  wall: number;
  opposite: number;
}

const DIRECTIONS: Direction[] = [
  { dx: 0, dz: -1, wall: WALL_N, opposite: WALL_S },
  { dx: 0, dz: 1, wall: WALL_S, opposite: WALL_N },
  { dx: 1, dz: 0, wall: WALL_E, opposite: WALL_W },
  { dx: -1, dz: 0, wall: WALL_W, opposite: WALL_E },
];

export interface MazeGrid {
  side: number;
  cells: Uint8Array;
}

function idx(x: number, z: number, side: number): number {
  return z * side + x;
}

/**
 * Fisher-Yates shuffle (in-place) using a seedable PRNG.
 */
function shuffle<T>(arr: T[], rng: () => number): void {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    const tmp = arr[i]!;
    arr[i] = arr[j]!;
    arr[j] = tmp;
  }
}

/**
 * Generates a perfect maze (spanning tree) on a side×side grid
 * using iterative randomized DFS.
 *
 * All cells start with all 4 walls. DFS removes walls to create passages.
 * Deterministic for a given mazeSeed.
 */
export function generateMaze(side: number, mazeSeed: number): MazeGrid {
  const cells = new Uint8Array(side * side);
  cells.fill(ALL_WALLS);

  const rng = mulberry32(mazeSeed);
  const stack: number[] = [];

  // Start at (0, 0)
  cells[0] = cells[0]! | VISITED;
  stack.push(0);

  const dirs = [...DIRECTIONS];

  while (stack.length > 0) {
    const current = stack[stack.length - 1]!;
    const cx = current % side;
    const cz = Math.floor(current / side);

    shuffle(dirs, rng);

    let pushed = false;
    for (const d of dirs) {
      const nx = cx + d.dx;
      const nz = cz + d.dz;
      if (nx < 0 || nx >= side || nz < 0 || nz >= side) continue;

      const ni = idx(nx, nz, side);
      if (cells[ni]! & VISITED) continue;

      // Remove wall between current and neighbor
      cells[current] = cells[current]! & ~d.wall;
      cells[ni] = (cells[ni]! & ~d.opposite) | VISITED;

      stack.push(ni);
      pushed = true;
      break;
    }

    if (!pushed) {
      stack.pop();
    }
  }

  return { side, cells };
}

/** Check if cell at (x,z) has a wall on given side */
export function hasWall(grid: MazeGrid, x: number, z: number, wall: number): boolean {
  return (grid.cells[idx(x, z, grid.side)]! & wall) !== 0;
}

/** Compute floor room count and grid side length */
export function floorGridSize(floorNum: number): { rooms: number; side: number } {
  const rooms = Math.floor(1 + 0.01 * floorNum * floorNum);
  const side = Math.ceil(Math.sqrt(rooms));
  return { rooms, side };
}
