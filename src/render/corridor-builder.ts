import * as THREE from 'three';
import { type MazeGrid, hasWall, WALL_N, WALL_S, WALL_E, WALL_W } from '@/world-gen/maze';
import { CELL_SIZE, CEILING_HEIGHT } from '@/shared/constants';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

const WALL_THICKNESS = 0.15;
const WALL_COLOR = 0xb0a890;
const FLOOR_COLOR = 0x8a8070;
const CEILING_COLOR = 0x999080;

export interface CorridorRuntime {
  group: THREE.Group;
  wallBoxes: THREE.Box3[];
}

/**
 * Builds corridor geometry for a range of cells in the maze grid.
 * All wall segments are merged into a single mesh to minimize draw calls.
 */
export function buildCorridorMeshes(
  grid: MazeGrid,
  startX: number,
  startZ: number,
  endX: number,
  endZ: number,
): CorridorRuntime {
  const group = new THREE.Group();
  const wallBoxes: THREE.Box3[] = [];
  const wallGeos: THREE.BufferGeometry[] = [];

  const h = CEILING_HEIGHT;
  const cs = CELL_SIZE;
  const offset = (grid.side * cs) / 2;

  const rangeW = endX - startX;
  const rangeD = endZ - startZ;

  const floorMat = new THREE.MeshStandardMaterial({ color: FLOOR_COLOR, roughness: 0.9 });
  const ceilMat = new THREE.MeshStandardMaterial({ color: CEILING_COLOR, roughness: 0.9 });
  const wallMat = new THREE.MeshStandardMaterial({ color: WALL_COLOR, roughness: 0.85 });

  const floorGeo = new THREE.PlaneGeometry(rangeW * cs, rangeD * cs);
  const floorMesh = new THREE.Mesh(floorGeo, floorMat);
  floorMesh.rotation.x = -Math.PI / 2;
  floorMesh.position.set(
    (startX + rangeW / 2) * cs - offset,
    0,
    (startZ + rangeD / 2) * cs - offset,
  );
  group.add(floorMesh);

  const ceilGeo = new THREE.PlaneGeometry(rangeW * cs, rangeD * cs);
  const ceilMesh = new THREE.Mesh(ceilGeo, ceilMat);
  ceilMesh.rotation.x = Math.PI / 2;
  ceilMesh.position.set(
    (startX + rangeW / 2) * cs - offset,
    h,
    (startZ + rangeD / 2) * cs - offset,
  );
  group.add(ceilMesh);

  for (let z = startZ; z < endZ; z++) {
    for (let x = startX; x < endX; x++) {
      const wx = x * cs - offset;
      const wz = z * cs - offset;

      if (hasWall(grid, x, z, WALL_N)) {
        collectWall(wallGeos, wallBoxes, wx, wz, cs, h, 'horizontal');
      }
      if (hasWall(grid, x, z, WALL_W)) {
        collectWall(wallGeos, wallBoxes, wx, wz, cs, h, 'vertical');
      }
      if (z === endZ - 1 && hasWall(grid, x, z, WALL_S)) {
        collectWall(wallGeos, wallBoxes, wx, wz + cs, cs, h, 'horizontal');
      }
      if (x === endX - 1 && hasWall(grid, x, z, WALL_E)) {
        collectWall(wallGeos, wallBoxes, wx + cs, wz, cs, h, 'vertical');
      }
    }
  }

  if (wallGeos.length > 0) {
    const merged = mergeGeometries(wallGeos, false);
    if (merged) {
      group.add(new THREE.Mesh(merged, wallMat));
      for (const g of wallGeos) g.dispose();
    }
  }

  return { group, wallBoxes };
}

function collectWall(
  geos: THREE.BufferGeometry[],
  wallBoxes: THREE.Box3[],
  x: number,
  z: number,
  cellSize: number,
  height: number,
  orientation: 'horizontal' | 'vertical',
): void {
  let sx: number, sz: number, px: number, pz: number;

  if (orientation === 'horizontal') {
    sx = cellSize; sz = WALL_THICKNESS;
    px = x + cellSize / 2; pz = z;
  } else {
    sx = WALL_THICKNESS; sz = cellSize;
    px = x; pz = z + cellSize / 2;
  }

  const geo = new THREE.BoxGeometry(sx, height, sz);
  geo.translate(px, height / 2, pz);
  geos.push(geo);

  wallBoxes.push(new THREE.Box3(
    new THREE.Vector3(px - sx / 2, 0, pz - sz / 2),
    new THREE.Vector3(px + sx / 2, height, pz + sz / 2),
  ));
}

export function disposeCorridorRuntime(runtime: CorridorRuntime): void {
  runtime.group.traverse((obj) => {
    if (obj instanceof THREE.Mesh) {
      obj.geometry.dispose();
    }
  });
  runtime.group.removeFromParent();
}
