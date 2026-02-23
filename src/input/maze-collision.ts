import * as THREE from 'three';

const PLAYER_HALF_WIDTH = 0.2;

/**
 * Split-axis AABB collision against a set of wall boxes.
 * Mutates `position` in-place.
 *
 * Strategy (TECH_SPEC §2):
 * 1. Apply X movement, test all walls, resolve X
 * 2. Apply Z movement, test all walls, resolve Z
 */
export function resolveWallCollisions(
  position: THREE.Vector3,
  moveX: number,
  moveZ: number,
  wallBoxes: THREE.Box3[],
): void {
  const pw = PLAYER_HALF_WIDTH;

  // X axis
  position.x += moveX;
  const playerMinX = position.x - pw;
  const playerMaxX = position.x + pw;
  const playerMinZ = position.z - pw;
  const playerMaxZ = position.z + pw;

  for (const box of wallBoxes) {
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
  const pMinX2 = position.x - pw;
  const pMaxX2 = position.x + pw;
  const pMinZ2 = position.z - pw;
  const pMaxZ2 = position.z + pw;

  for (const box of wallBoxes) {
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
