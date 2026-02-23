import { describe, it, expect } from 'vitest';
import { generateMaze, hasWall, WALL_N, WALL_S, WALL_E, WALL_W, VISITED, floorGridSize } from './maze';

describe('generateMaze', () => {
  it('all cells are visited (connected)', () => {
    const grid = generateMaze(5, 42);
    for (let i = 0; i < grid.cells.length; i++) {
      expect(grid.cells[i]! & VISITED).toBeTruthy();
    }
  });

  it('is deterministic: same seed → same maze', () => {
    const a = generateMaze(5, 12345);
    const b = generateMaze(5, 12345);
    expect(Array.from(a.cells)).toEqual(Array.from(b.cells));
  });

  it('different seeds → different mazes', () => {
    const a = generateMaze(5, 1);
    const b = generateMaze(5, 2);
    expect(Array.from(a.cells)).not.toEqual(Array.from(b.cells));
  });

  it('perfect maze: N-1 passages for NxN cells', () => {
    const side = 4;
    const grid = generateMaze(side, 99);
    let passages = 0;

    for (let z = 0; z < side; z++) {
      for (let x = 0; x < side; x++) {
        if (x < side - 1 && !hasWall(grid, x, z, WALL_E)) passages++;
        if (z < side - 1 && !hasWall(grid, x, z, WALL_S)) passages++;
      }
    }

    // A spanning tree of N nodes has exactly N-1 edges
    expect(passages).toBe(side * side - 1);
  });

  it('walls are consistent between neighbors', () => {
    const grid = generateMaze(4, 77);
    for (let z = 0; z < 4; z++) {
      for (let x = 0; x < 3; x++) {
        const eastOpen = !hasWall(grid, x, z, WALL_E);
        const westOpen = !hasWall(grid, x + 1, z, WALL_W);
        expect(eastOpen).toBe(westOpen);
      }
    }
    for (let z = 0; z < 3; z++) {
      for (let x = 0; x < 4; x++) {
        const southOpen = !hasWall(grid, x, z, WALL_S);
        const northOpen = !hasWall(grid, x, z + 1, WALL_N);
        expect(southOpen).toBe(northOpen);
      }
    }
  });

  it('handles 1×1 grid', () => {
    const grid = generateMaze(1, 0);
    expect(grid.side).toBe(1);
    expect(grid.cells[0]! & VISITED).toBeTruthy();
  });

  it('handles large grid (50×50) without error', () => {
    const grid = generateMaze(50, 42);
    expect(grid.cells.length).toBe(2500);
    for (let i = 0; i < grid.cells.length; i++) {
      expect(grid.cells[i]! & VISITED).toBeTruthy();
    }
  });
});

describe('floorGridSize', () => {
  it('floor 6 → 1 room, side 1', () => {
    const { rooms, side } = floorGridSize(6);
    expect(rooms).toBe(1);
    expect(side).toBe(1);
  });

  it('floor 10 → 2 rooms, side 2', () => {
    const { rooms, side } = floorGridSize(10);
    expect(rooms).toBe(2);
    expect(side).toBe(2);
  });

  it('floor 100 → 101 rooms, side 11', () => {
    const { rooms, side } = floorGridSize(100);
    expect(rooms).toBe(101);
    expect(side).toBe(11);
  });

  it('floor 500 → 2501 rooms, side 51', () => {
    const { rooms, side } = floorGridSize(500);
    expect(rooms).toBe(2501);
    expect(side).toBe(51);
  });
});
