import * as THREE from 'three';
import { type MazeGrid, hasWall, WALL_N, WALL_S, WALL_E, WALL_W } from '@/world-gen/maze';
import { CELL_SIZE, CEILING_HEIGHT } from '@/shared/constants';

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
 * Each cell is 6×6m. Walls are thin boxes on cell edges.
 *
 * For small floors (≤20×20) this is called once for the whole grid.
 * For large floors it's called per chunk.
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

  const wallMat = new THREE.MeshStandardMaterial({ color: WALL_COLOR, roughness: 0.85 });
  const floorMat = new THREE.MeshStandardMaterial({ color: FLOOR_COLOR, roughness: 0.9 });
  const ceilMat = new THREE.MeshStandardMaterial({ color: CEILING_COLOR, roughness: 0.9 });

  const h = CEILING_HEIGHT;
  const cs = CELL_SIZE;
  const offset = (grid.side * cs) / 2;

  const rangeW = endX - startX;
  const rangeD = endZ - startZ;

  // Floor plane for the range
  const floorGeo = new THREE.PlaneGeometry(rangeW * cs, rangeD * cs);
  const floorMesh = new THREE.Mesh(floorGeo, floorMat);
  floorMesh.rotation.x = -Math.PI / 2;
  floorMesh.position.set(
    (startX + rangeW / 2) * cs - offset,
    0,
    (startZ + rangeD / 2) * cs - offset,
  );
  group.add(floorMesh);

  // Ceiling plane for the range
  const ceilGeo = new THREE.PlaneGeometry(rangeW * cs, rangeD * cs);
  const ceilMesh = new THREE.Mesh(ceilGeo, ceilMat);
  ceilMesh.rotation.x = Math.PI / 2;
  ceilMesh.position.set(
    (startX + rangeW / 2) * cs - offset,
    h,
    (startZ + rangeD / 2) * cs - offset,
  );
  group.add(ceilMesh);

  // Wall segments
  for (let z = startZ; z < endZ; z++) {
    for (let x = startX; x < endX; x++) {
      const wx = x * cs - offset;
      const wz = z * cs - offset;

      // North wall (between cell and cell z-1)
      if (hasWall(grid, x, z, WALL_N)) {
        addWallSegment(group, wallBoxes, wallMat, wx, wz, cs, h, 'horizontal');
      }

      // West wall (between cell and cell x-1)
      if (hasWall(grid, x, z, WALL_W)) {
        addWallSegment(group, wallBoxes, wallMat, wx, wz, cs, h, 'vertical');
      }

      // South wall on last row
      if (z === endZ - 1 && hasWall(grid, x, z, WALL_S)) {
        addWallSegment(group, wallBoxes, wallMat, wx, wz + cs, cs, h, 'horizontal');
      }

      // East wall on last column
      if (x === endX - 1 && hasWall(grid, x, z, WALL_E)) {
        addWallSegment(group, wallBoxes, wallMat, wx + cs, wz, cs, h, 'vertical');
      }
    }
  }

  return { group, wallBoxes };
}

function addWallSegment(
  group: THREE.Group,
  wallBoxes: THREE.Box3[],
  mat: THREE.Material,
  x: number,
  z: number,
  cellSize: number,
  height: number,
  orientation: 'horizontal' | 'vertical',
): void {
  let geo: THREE.BoxGeometry;
  let px: number, pz: number;

  if (orientation === 'horizontal') {
    // Wall along X axis (north/south edge)
    geo = new THREE.BoxGeometry(cellSize, height, WALL_THICKNESS);
    px = x + cellSize / 2;
    pz = z;
  } else {
    // Wall along Z axis (east/west edge)
    geo = new THREE.BoxGeometry(WALL_THICKNESS, height, cellSize);
    px = x;
    pz = z + cellSize / 2;
  }

  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.set(px, height / 2, pz);
  group.add(mesh);

  const box = new THREE.Box3();
  box.setFromObject(mesh);
  wallBoxes.push(box);
}

export function disposeCorridorRuntime(runtime: CorridorRuntime): void {
  runtime.group.traverse((obj) => {
    if (obj instanceof THREE.Mesh) {
      obj.geometry.dispose();
    }
  });
  runtime.group.removeFromParent();
}
