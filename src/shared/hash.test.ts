import { describe, it, expect } from 'vitest';
import { mulberry32, stringToSeed, roomHash } from './hash';

describe('mulberry32', () => {
  it('is deterministic: same seed produces same sequence', () => {
    const a = mulberry32(42);
    const b = mulberry32(42);
    for (let i = 0; i < 100; i++) {
      expect(a()).toBe(b());
    }
  });

  it('produces values in [0, 1)', () => {
    const rng = mulberry32(12345);
    for (let i = 0; i < 1000; i++) {
      const v = rng();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });

  it('different seeds produce different sequences', () => {
    const a = mulberry32(1);
    const b = mulberry32(2);
    const aVals = Array.from({ length: 10 }, () => a());
    const bVals = Array.from({ length: 10 }, () => b());
    expect(aVals).not.toEqual(bVals);
  });
});

describe('stringToSeed', () => {
  it('is deterministic', () => {
    expect(stringToSeed('official')).toBe(stringToSeed('official'));
  });

  it('different strings produce different seeds', () => {
    expect(stringToSeed('hello')).not.toBe(stringToSeed('world'));
  });

  it('returns a positive 32-bit integer', () => {
    const s = stringToSeed('test');
    expect(s).toBeGreaterThanOrEqual(0);
    expect(s).toBeLessThanOrEqual(0xffffffff);
  });
});

describe('roomHash', () => {
  it('is deterministic', () => {
    const a = roomHash(1, 42, 10, 3, 5);
    const b = roomHash(1, 42, 10, 3, 5);
    expect(a).toBe(b);
  });

  it('changes when any parameter differs', () => {
    const base = roomHash(1, 42, 10, 3, 5);
    expect(roomHash(2, 42, 10, 3, 5)).not.toBe(base);
    expect(roomHash(1, 43, 10, 3, 5)).not.toBe(base);
    expect(roomHash(1, 42, 11, 3, 5)).not.toBe(base);
    expect(roomHash(1, 42, 10, 4, 5)).not.toBe(base);
    expect(roomHash(1, 42, 10, 3, 6)).not.toBe(base);
  });
});
