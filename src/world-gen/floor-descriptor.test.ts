import { describe, it, expect } from 'vitest';
import { describeFloor } from './floor-descriptor';

describe('describeFloor', () => {
  it('floor 0 is lobby with stair up and teleports', () => {
    const d = describeFloor(0);
    expect(d.type).toBe('lobby');
    expect(d.width).toBe(20);
    expect(d.depth).toBe(20);
    expect(d.stairs).toHaveLength(1);
    expect(d.stairs[0]!.direction).toBe('up');
    expect(d.teleports.length).toBeGreaterThan(0);
    expect(d.teleports[0]!.targetFloor).toBe(10);
  });

  it('floors 1–5 are linear with two stairs', () => {
    for (let f = 1; f <= 5; f++) {
      const d = describeFloor(f);
      expect(d.type).toBe('linear');
      expect(d.width).toBe(4);
      expect(d.depth).toBe(30);
      expect(d.stairs).toHaveLength(2);

      const dirs = d.stairs.map((s) => s.direction).sort();
      expect(dirs).toEqual(['down', 'up']);
    }
  });

  it('floor 6+ is procedural with separate up/down stairs', () => {
    const d = describeFloor(10);
    expect(d.type).toBe('procedural');
    expect(d.stairs).toHaveLength(2);
    const dirs = d.stairs.map((s) => s.direction).sort();
    expect(dirs).toEqual(['down', 'up']);
    expect(d.reservedCells!.length).toBeGreaterThanOrEqual(2);
  });

  it('floor 100 is a hub lobby with teleports', () => {
    const d = describeFloor(100);
    expect(d.type).toBe('lobby');
    expect(d.teleports.length).toBeGreaterThan(0);
    expect(d.stairs).toHaveLength(2);
  });
});
