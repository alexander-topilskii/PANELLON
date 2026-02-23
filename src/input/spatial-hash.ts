import * as THREE from 'three';
import { CELL_SIZE } from '@/shared/constants';

/**
 * Spatial hash grid that bins AABB wall boxes into CELL_SIZE buckets.
 * Collision queries only check boxes in the 9 neighbouring cells.
 */
export class SpatialHash {
  private buckets = new Map<number, THREE.Box3[]>();
  private cellSize: number;

  constructor(cellSize = CELL_SIZE) {
    this.cellSize = cellSize;
  }

  private key(cx: number, cz: number): number {
    return ((cx + 10000) << 16) | ((cz + 10000) & 0xffff);
  }

  insert(box: THREE.Box3): void {
    const cs = this.cellSize;
    const minCx = Math.floor(box.min.x / cs);
    const maxCx = Math.floor(box.max.x / cs);
    const minCz = Math.floor(box.min.z / cs);
    const maxCz = Math.floor(box.max.z / cs);

    for (let cx = minCx; cx <= maxCx; cx++) {
      for (let cz = minCz; cz <= maxCz; cz++) {
        const k = this.key(cx, cz);
        let bucket = this.buckets.get(k);
        if (!bucket) {
          bucket = [];
          this.buckets.set(k, bucket);
        }
        bucket.push(box);
      }
    }
  }

  /** Returns all boxes in the 9 cells around (wx, wz). */
  query(wx: number, wz: number): THREE.Box3[] {
    const cs = this.cellSize;
    const cx = Math.floor(wx / cs);
    const cz = Math.floor(wz / cs);
    const result: THREE.Box3[] = [];
    const seen = new Set<THREE.Box3>();

    for (let dx = -1; dx <= 1; dx++) {
      for (let dz = -1; dz <= 1; dz++) {
        const bucket = this.buckets.get(this.key(cx + dx, cz + dz));
        if (bucket) {
          for (const b of bucket) {
            if (!seen.has(b)) {
              seen.add(b);
              result.push(b);
            }
          }
        }
      }
    }

    return result;
  }

  clear(): void {
    this.buckets.clear();
  }

  static fromBoxes(boxes: THREE.Box3[]): SpatialHash {
    const hash = new SpatialHash();
    for (const b of boxes) hash.insert(b);
    return hash;
  }
}
