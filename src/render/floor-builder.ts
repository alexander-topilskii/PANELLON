import * as THREE from 'three';
import type { FloorDescriptor } from '@/world-gen/floor-descriptor';
import { createStairPad } from './stair-mesh';
import { buildCorridorMeshes, disposeCorridorRuntime, type CorridorRuntime } from './corridor-builder';
import { buildRoomWalls, type DoorInfo } from './door-builder';
import { type MazeGrid } from '@/world-gen/maze';
import { CELL_SIZE, CEILING_HEIGHT } from '@/shared/constants';

const WALL_COLOR = 0xb0a890;
const FLOOR_COLOR = 0x8a8070;
const CEILING_COLOR = 0x999080;
const ROOM_WALL_COLOR = 0xa09880;

export interface FloorRuntime {
  group: THREE.Group;
  stairs: Array<{ triggerBox: THREE.Box3; direction: 'up' | 'down' }>;
  bounds: { minX: number; maxX: number; minZ: number; maxZ: number };
  lights: THREE.Light[];
  wallBoxes: THREE.Box3[];
  corridorChunks: CorridorRuntime[];
  doors: DoorInfo[];
  maze?: MazeGrid;
}

/**
 * Builds Three.js geometry for special floors (0–5).
 */
export function buildFloor(desc: FloorDescriptor): FloorRuntime {
  const group = new THREE.Group();
  const hw = desc.width / 2;
  const hd = desc.depth / 2;
  const h = desc.height;
  const margin = 0.25;

  const floorMat = new THREE.MeshStandardMaterial({ color: FLOOR_COLOR, roughness: 0.9 });
  const wallMat = new THREE.MeshStandardMaterial({
    color: WALL_COLOR,
    roughness: 0.85,
    side: THREE.DoubleSide,
  });
  const ceilMat = new THREE.MeshStandardMaterial({ color: CEILING_COLOR, roughness: 0.9 });

  const floor = new THREE.Mesh(new THREE.PlaneGeometry(desc.width, desc.depth), floorMat);
  floor.rotation.x = -Math.PI / 2;
  group.add(floor);

  const ceiling = new THREE.Mesh(new THREE.PlaneGeometry(desc.width, desc.depth), ceilMat);
  ceiling.rotation.x = Math.PI / 2;
  ceiling.position.y = h;
  group.add(ceiling);

  const wallLR = new THREE.PlaneGeometry(desc.depth, h);
  const wallFB = new THREE.PlaneGeometry(desc.width, h);

  const left = new THREE.Mesh(wallLR, wallMat);
  left.position.set(-hw, h / 2, 0);
  left.rotation.y = Math.PI / 2;
  group.add(left);

  const right = new THREE.Mesh(wallLR, wallMat);
  right.position.set(hw, h / 2, 0);
  right.rotation.y = -Math.PI / 2;
  group.add(right);

  const back = new THREE.Mesh(wallFB, wallMat);
  back.position.set(0, h / 2, -hd);
  group.add(back);

  const front = new THREE.Mesh(wallFB, wallMat);
  front.position.set(0, h / 2, hd);
  front.rotation.y = Math.PI;
  group.add(front);

  const lights: THREE.Light[] = [];
  if (desc.type === 'lobby') {
    const pt = new THREE.PointLight(0xffd599, 1.0, 12);
    pt.position.set(0, h - 0.2, 0);
    group.add(pt);
    lights.push(pt);
  } else if (desc.type === 'linear') {
    const count = Math.ceil(desc.depth / 6);
    for (let i = 0; i < count; i++) {
      const z = -hd + 3 + i * 6;
      const intensity = 0.5 + Math.sin(i * 0.7) * 0.15;
      const pt = new THREE.PointLight(0xffd599, intensity, 8);
      pt.position.set(0, h - 0.2, z);
      group.add(pt);
      lights.push(pt);
    }
  }

  const stairs: FloorRuntime['stairs'] = [];
  for (const stairDesc of desc.stairs) {
    const { group: stairGroup, triggerBox } = createStairPad(stairDesc);
    group.add(stairGroup);
    stairs.push({ triggerBox, direction: stairDesc.direction });
  }

  return {
    group,
    stairs,
    bounds: {
      minX: -hw + margin,
      maxX: hw - margin,
      minZ: -hd + margin,
      maxZ: hd - margin,
    },
    lights,
    wallBoxes: [],
    corridorChunks: [],
    doors: [],
  };
}

/**
 * Builds a procedural floor (6+) with maze corridors and room walls.
 */
export function buildProceduralFloor(
  desc: FloorDescriptor,
  maze: MazeGrid,
  globalSeed: number,
  floorNum: number,
): FloorRuntime {
  const group = new THREE.Group();
  const side = maze.side;
  const halfSize = (side * CELL_SIZE) / 2;
  const margin = 0.25;

  const corridorRuntime = buildCorridorMeshes(maze, 0, 0, side, side);
  group.add(corridorRuntime.group);

  const roomWallMat = new THREE.MeshStandardMaterial({
    color: ROOM_WALL_COLOR,
    roughness: 0.85,
  });
  const roomWalls = buildRoomWalls(maze, globalSeed, floorNum, roomWallMat);
  group.add(roomWalls.group);

  const allWallBoxes = [...corridorRuntime.wallBoxes, ...roomWalls.wallBoxes];

  const lights: THREE.Light[] = [];
  const lightSpacing = 4;
  for (let z = 0; z < side; z += lightSpacing) {
    for (let x = 0; x < side; x += lightSpacing) {
      const wx = x * CELL_SIZE - halfSize + CELL_SIZE / 2;
      const wz = z * CELL_SIZE - halfSize + CELL_SIZE / 2;
      const pt = new THREE.PointLight(0xffd599, 0.5, 18);
      pt.position.set(wx, CEILING_HEIGHT - 0.2, wz);
      group.add(pt);
      lights.push(pt);
    }
  }

  const stairs: FloorRuntime['stairs'] = [];
  for (const stairDesc of desc.stairs) {
    const { group: stairGroup, triggerBox } = createStairPad(stairDesc);
    group.add(stairGroup);
    stairs.push({ triggerBox, direction: stairDesc.direction });
  }

  return {
    group,
    stairs,
    bounds: {
      minX: -halfSize + margin,
      maxX: halfSize - margin,
      minZ: -halfSize + margin,
      maxZ: halfSize - margin,
    },
    lights,
    wallBoxes: allWallBoxes,
    corridorChunks: [corridorRuntime],
    doors: roomWalls.doors,
    maze,
  };
}

export function disposeFloor(runtime: FloorRuntime): void {
  for (const chunk of runtime.corridorChunks) {
    disposeCorridorRuntime(chunk);
  }
  runtime.group.traverse((obj) => {
    if (obj instanceof THREE.Mesh) {
      obj.geometry.dispose();
      if (Array.isArray(obj.material)) {
        obj.material.forEach((m) => m.dispose());
      } else {
        obj.material.dispose();
      }
    }
  });
  runtime.group.removeFromParent();
}
