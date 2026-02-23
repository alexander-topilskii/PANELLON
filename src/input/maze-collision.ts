import * as THREE from 'three';
import type { SpatialHash } from './spatial-hash';

const PLAYER_HALF_WIDTH = 0.2;

/**
 * Split-axis AABB collision against walls near the player.
 * Uses SpatialHash for O(1) lookup instead of checking all boxes.
 */
export function resolveWallCollisions(
  position: THREE.Vector3,
  moveX: number,
  moveZ: number,
  wallHash: SpatialHash,
): void {
  const pw = PLAYER_HALF_WIDTH;

  // X axis
  position.x += moveX;
  const nearby = wallHash.query(position.x, position.z);

  const playerMinX = position.x - pw;
  const playerMaxX = position.x + pw;
  const playerMinZ = position.z - pw;
  const playerMaxZ = position.z + pw;

  for (const box of nearby) {
    if (
      playerMaxX > box.min.x &&
      playerMinX < box.max.x &&
      playerMaxZ > box.min.z &&
      playerMinZ < box.max.z
    ) {
      if (moveX > 0) {
        position.x = box.min.x - pw;
      } else {
        position.x = box.max.x + pw;
      }
      break;
    }
  }

  // Z axis
  position.z += moveZ;
  const nearbyZ = wallHash.query(position.x, position.z);

  const pMinX2 = position.x - pw;
  const pMaxX2 = position.x + pw;
  const pMinZ2 = position.z - pw;
  const pMaxZ2 = position.z + pw;

  for (const box of nearbyZ) {
    if (
      pMaxX2 > box.min.x &&
      pMinX2 < box.max.x &&
      pMaxZ2 > box.min.z &&
      pMinZ2 < box.max.z
    ) {
      if (moveZ > 0) {
        position.z = box.min.z - pw;
      } else {
        position.z = box.max.z + pw;
      }
      break;
    }
  }
}
