import { describe, it, expect } from 'vitest';
import { Clock } from './clock';

describe('Clock', () => {
  it('computes delta time in seconds', () => {
    const clock = new Clock();
    clock.tick(0);
    clock.tick(16.667);
    expect(clock.delta).toBeCloseTo(0.016667, 4);
  });

  it('accumulates elapsed time', () => {
    const clock = new Clock();
    clock.tick(0);
    clock.tick(16);
    clock.tick(32);
    // Two frames of 16ms each = 32ms = 0.032s
    expect(clock.elapsed).toBeCloseTo(0.032, 4);
  });

  it('clamps delta to MAX_DELTA on long pauses', () => {
    const clock = new Clock();
    clock.tick(0);
    clock.tick(5000); // 5 seconds — tab was inactive
    expect(clock.delta).toBeLessThanOrEqual(1 / 15 + 0.001);
  });
});
