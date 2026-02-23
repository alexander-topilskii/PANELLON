/**
 * mulberry32: a simple 32-bit seedable PRNG.
 * Deterministic, fast, no external state.
 * See DETERMINISM_CONTRACT.md §1.
 */
export function mulberry32(seed: number): () => number {
  let s = seed | 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Converts a string to a 32-bit integer seed.
 * Applies FNV-1a on the UTF-16 code units.
 */
export function stringToSeed(str: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/**
 * Composite hash for Room_ID: hash(version, globalSeed, floor, x, z).
 * Returns a 32-bit unsigned integer.
 */
export function roomHash(
  version: number,
  globalSeed: number,
  floor: number,
  x: number,
  z: number,
): number {
  let h = 0x811c9dc5;
  const vals = [version, globalSeed, floor, x, z];
  for (const v of vals) {
    h ^= v & 0xff;
    h = Math.imul(h, 0x01000193);
    h ^= (v >>> 8) & 0xff;
    h = Math.imul(h, 0x01000193);
    h ^= (v >>> 16) & 0xff;
    h = Math.imul(h, 0x01000193);
    h ^= (v >>> 24) & 0xff;
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}
