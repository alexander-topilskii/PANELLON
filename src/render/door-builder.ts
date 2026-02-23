import * as THREE from 'three';
import {
  WALL_N,
  WALL_S,
  WALL_E,
  WALL_W,
  hasWall,
  type MazeGrid,
} from '@/world-gen/maze';
import {
  CELL_SIZE,
  ROOM_SIZE,
  CEILING_HEIGHT,
  DOOR_WIDTH,
  GEN_VERSION,
  WALL_THICKNESS,
} from '@/shared/constants';
import { roomHash } from '@/shared/hash';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

export interface DoorInfo {
  cellX: number;
  cellZ: number;
  wallSide: number;
  worldX: number;
  worldZ: number;
  roomCenterX: number;
  roomCenterZ: number;
  triggerBox: THREE.Box3;
  /** Unit vector pointing from corridor into room through the door */
  inward: { x: number; z: number };
  /** Plane mesh in the door opening for room preview texture */
  previewPlane: THREE.Mesh;
}

export interface RoomWallsResult {
  group: THREE.Group;
  wallBoxes: THREE.Box3[];
  doors: DoorInfo[];
}

/**
 * Builds room interior walls (4 per cell) with door gaps.
 *
 * Each 6×6 m cell has a 4×4 m room in the center.
 * Room walls separate the room from the corridor strip (1 m on each side).
 * One wall per cell gets a door gap (~1.5 m) facing an open maze passage.
 */
export function buildRoomWalls(
  grid: MazeGrid,
  globalSeed: number,
  floorNum: number,
  wallMat: THREE.Material,
  reservedCells: Array<{ x: number; z: number }> = [],
): RoomWallsResult {
  const group = new THREE.Group();
  const wallBoxes: THREE.Box3[] = [];
  const wallGeos: THREE.BufferGeometry[] = [];
  const doors: DoorInfo[] = [];
  const halfGrid = (grid.side * CELL_SIZE) / 2;
  const hr = ROOM_SIZE / 2;

  const reservedSet = new Set(reservedCells.map((c) => `${c.x},${c.z}`));

  for (let z = 0; z < grid.side; z++) {
    for (let x = 0; x < grid.side; x++) {
      const cx = x * CELL_SIZE - halfGrid + CELL_SIZE / 2;
      const cz = z * CELL_SIZE - halfGrid + CELL_SIZE / 2;

      if (reservedSet.has(`${x},${z}`)) continue;

      const doorWall = pickDoorWall(grid, x, z, globalSeed, floorNum);

      const sides = [WALL_N, WALL_S, WALL_E, WALL_W];
      for (const side of sides) {
        collectRoomWall(wallGeos, wallBoxes, cx, cz, hr, side, side === doorWall);
      }

      if (doorWall !== 0) {
        const pos = doorWorldPos(cx, cz, hr, doorWall);
        const trigger = doorTrigger(pos.x, pos.z, doorWall);
        const previewPlane = createPreviewPlane(pos.x, pos.z, doorWall);
        group.add(previewPlane);
        doors.push({
          cellX: x,
          cellZ: z,
          wallSide: doorWall,
          worldX: pos.x,
          worldZ: pos.z,
          roomCenterX: cx,
          roomCenterZ: cz,
          triggerBox: trigger,
          inward: doorInward(doorWall),
          previewPlane,
        });
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

  return { group, wallBoxes, doors };
}

/**
 * Pick which room wall gets a door.
 * Candidates: sides where the maze wall was removed (open passages).
 * Selection: deterministic via roomHash.
 */
function pickDoorWall(
  grid: MazeGrid,
  x: number,
  z: number,
  globalSeed: number,
  floorNum: number,
): number {
  const open: number[] = [];
  if (!hasWall(grid, x, z, WALL_N)) open.push(WALL_N);
  if (!hasWall(grid, x, z, WALL_S)) open.push(WALL_S);
  if (!hasWall(grid, x, z, WALL_E)) open.push(WALL_E);
  if (!hasWall(grid, x, z, WALL_W)) open.push(WALL_W);
  if (open.length === 0) return 0;

  const h = roomHash(GEN_VERSION, globalSeed, floorNum, x, z);
  return open[h % open.length]!;
}

function collectRoomWall(
  geos: THREE.BufferGeometry[],
  wallBoxes: THREE.Box3[],
  cx: number,
  cz: number,
  halfRoom: number,
  side: number,
  hasDoor: boolean,
): void {
  const h = CEILING_HEIGHT;
  const roomLen = ROOM_SIZE;

  if (side === WALL_N || side === WALL_S) {
    const wz = side === WALL_N ? cz - halfRoom : cz + halfRoom;
    if (!hasDoor) {
      collectBox(geos, wallBoxes, cx, h / 2, wz, roomLen, h, WALL_THICKNESS);
    } else {
      const segLen = (roomLen - DOOR_WIDTH) / 2;
      collectBox(geos, wallBoxes, cx - halfRoom + segLen / 2, h / 2, wz, segLen, h, WALL_THICKNESS);
      collectBox(geos, wallBoxes, cx + halfRoom - segLen / 2, h / 2, wz, segLen, h, WALL_THICKNESS);
    }
  } else {
    const wx = side === WALL_W ? cx - halfRoom : cx + halfRoom;
    if (!hasDoor) {
      collectBox(geos, wallBoxes, wx, h / 2, cz, WALL_THICKNESS, h, roomLen);
    } else {
      const segLen = (roomLen - DOOR_WIDTH) / 2;
      collectBox(geos, wallBoxes, wx, h / 2, cz - halfRoom + segLen / 2, WALL_THICKNESS, h, segLen);
      collectBox(geos, wallBoxes, wx, h / 2, cz + halfRoom - segLen / 2, WALL_THICKNESS, h, segLen);
    }
  }
}

function collectBox(
  geos: THREE.BufferGeometry[],
  wallBoxes: THREE.Box3[],
  px: number,
  py: number,
  pz: number,
  sx: number,
  sy: number,
  sz: number,
): void {
  const geo = new THREE.BoxGeometry(sx, sy, sz);
  geo.translate(px, py, pz);
  geos.push(geo);
  wallBoxes.push(new THREE.Box3(
    new THREE.Vector3(px - sx / 2, py - sy / 2, pz - sz / 2),
    new THREE.Vector3(px + sx / 2, py + sy / 2, pz + sz / 2),
  ));
}

function doorWorldPos(
  cx: number,
  cz: number,
  halfRoom: number,
  side: number,
): { x: number; z: number } {
  switch (side) {
    case WALL_N: return { x: cx, z: cz - halfRoom };
    case WALL_S: return { x: cx, z: cz + halfRoom };
    case WALL_E: return { x: cx + halfRoom, z: cz };
    case WALL_W: return { x: cx - halfRoom, z: cz };
    default: return { x: cx, z: cz };
  }
}

function doorInward(side: number): { x: number; z: number } {
  switch (side) {
    case WALL_N: return { x: 0, z: 1 };
    case WALL_S: return { x: 0, z: -1 };
    case WALL_E: return { x: -1, z: 0 };
    case WALL_W: return { x: 1, z: 0 };
    default: return { x: 0, z: 0 };
  }
}

/**
 * Trigger zone at the door: thin AABB on the corridor side.
 * Player entering this box triggers room transition.
 */
function doorTrigger(
  dx: number,
  dz: number,
  side: number,
): THREE.Box3 {
  const halfDoor = DOOR_WIDTH / 2;
  const depth = 0.25;
  const h = CEILING_HEIGHT;

  switch (side) {
    case WALL_N:
      return new THREE.Box3(
        new THREE.Vector3(dx - halfDoor, 0, dz - depth),
        new THREE.Vector3(dx + halfDoor, h, dz + 0.1),
      );
    case WALL_S:
      return new THREE.Box3(
        new THREE.Vector3(dx - halfDoor, 0, dz - 0.1),
        new THREE.Vector3(dx + halfDoor, h, dz + depth),
      );
    case WALL_E:
      return new THREE.Box3(
        new THREE.Vector3(dx - 0.1, 0, dz - halfDoor),
        new THREE.Vector3(dx + depth, h, dz + halfDoor),
      );
    case WALL_W:
      return new THREE.Box3(
        new THREE.Vector3(dx - depth, 0, dz - halfDoor),
        new THREE.Vector3(dx + 0.1, h, dz + halfDoor),
      );
    default:
      return new THREE.Box3();
  }
}

const PREVIEW_PLANE_W = DOOR_WIDTH - 0.1;
const PREVIEW_PLANE_H = CEILING_HEIGHT - 0.2;

/**
 * Create a plane mesh at the door opening to display room preview.
 * Starts with a dark semi-transparent material; texture assigned later.
 */
function createPreviewPlane(dx: number, dz: number, side: number): THREE.Mesh {
  const geo = new THREE.PlaneGeometry(PREVIEW_PLANE_W, PREVIEW_PLANE_H);
  const mat = new THREE.MeshBasicMaterial({
    color: 0x111115,
    transparent: true,
    opacity: 0.85,
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.y = CEILING_HEIGHT / 2;

  switch (side) {
    case WALL_N:
      mesh.position.set(dx, CEILING_HEIGHT / 2, dz + 0.01);
      mesh.rotation.y = Math.PI;
      break;
    case WALL_S:
      mesh.position.set(dx, CEILING_HEIGHT / 2, dz - 0.01);
      break;
    case WALL_E:
      mesh.position.set(dx - 0.01, CEILING_HEIGHT / 2, dz);
      mesh.rotation.y = -Math.PI / 2;
      break;
    case WALL_W:
      mesh.position.set(dx + 0.01, CEILING_HEIGHT / 2, dz);
      mesh.rotation.y = Math.PI / 2;
      break;
  }

  mesh.visible = false;
  return mesh;
}
