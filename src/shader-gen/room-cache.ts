import { roomHash } from '@/shared/hash';
import { GEN_VERSION } from '@/shared/constants';
import { generateRoomShader } from './index';
import type { ShaderValidator } from './validator';

const MAX_RETRIES = 5;

export type CellState = 'valid' | 'empty' | 'pending';

export interface RoomEntry {
  state: CellState;
  sdfCode?: string;
}

/**
 * In-memory room cache for one floor.
 *
 * Stores generation results: 'valid' (with GLSL code) or 'empty' (no door).
 * Disposed when the player leaves the floor.
 *
 * Persistent IndexedDB cache appears in Phase 6.
 */
export class FloorRoomCache {
  private map = new Map<string, RoomEntry>();

  constructor(
    private readonly globalSeed: number,
    private readonly floorNum: number,
    private readonly validator: ShaderValidator | null,
  ) {}

  private key(x: number, z: number): string {
    return `${x},${z}`;
  }

  get(x: number, z: number): RoomEntry | undefined {
    return this.map.get(this.key(x, z));
  }

  /**
   * Generate (or retrieve from cache) a room shader for cell (x, z).
   *
   * Retry logic: on validation failure, increment salt up to MAX_RETRIES.
   * If all retries fail → cell marked 'empty'.
   *
   * Time-slicing: this is called once per door approach, not in bulk.
   * Bulk pregeneration deferred to Phase 6.
   */
  generateRoom(x: number, z: number): RoomEntry {
    const cached = this.map.get(this.key(x, z));
    if (cached) return cached;

    const baseId = roomHash(GEN_VERSION, this.globalSeed, this.floorNum, x, z);

    for (let salt = 0; salt < MAX_RETRIES; salt++) {
      const rid = salt === 0 ? baseId : (baseId + salt) >>> 0;
      const sdfCode = generateRoomShader(rid, this.floorNum);

      if (!this.validator || this.validator.validate(sdfCode)) {
        const entry: RoomEntry = { state: 'valid', sdfCode };
        this.map.set(this.key(x, z), entry);
        return entry;
      }
    }

    const entry: RoomEntry = { state: 'empty' };
    this.map.set(this.key(x, z), entry);
    return entry;
  }

  clear(): void {
    this.map.clear();
  }
}
