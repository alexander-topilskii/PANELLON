import * as THREE from 'three';
import { CEILING_HEIGHT } from '@/shared/constants';

const VESTIBULE_WIDTH = 6;
const VESTIBULE_DEPTH = 6;
const WALL_COLOR = 0xb0a890;
const FLOOR_COLOR = 0x8a8070;
const CEILING_COLOR = 0x999080;

/**
 * Creates a simple box room (floor 0 vestibule): 6×6×2.5 m.
 * Returns the group and walkable bounds.
 */
export function createVestibule(): {
  group: THREE.Group;
  bounds: { minX: number; maxX: number; minZ: number; maxZ: number };
} {
  const group = new THREE.Group();
  const hw = VESTIBULE_WIDTH / 2;
  const hd = VESTIBULE_DEPTH / 2;
  const h = CEILING_HEIGHT;
  const margin = 0.25;

  const floorMat = new THREE.MeshStandardMaterial({ color: FLOOR_COLOR, roughness: 0.9 });
  const wallMat = new THREE.MeshStandardMaterial({
    color: WALL_COLOR,
    roughness: 0.85,
    side: THREE.DoubleSide,
  });
  const ceilMat = new THREE.MeshStandardMaterial({ color: CEILING_COLOR, roughness: 0.9 });

  const floor = new THREE.Mesh(new THREE.PlaneGeometry(VESTIBULE_WIDTH, VESTIBULE_DEPTH), floorMat);
  floor.rotation.x = -Math.PI / 2;
  group.add(floor);

  const ceiling = new THREE.Mesh(
    new THREE.PlaneGeometry(VESTIBULE_WIDTH, VESTIBULE_DEPTH),
    ceilMat,
  );
  ceiling.rotation.x = Math.PI / 2;
  ceiling.position.y = h;
  group.add(ceiling);

  const wallGeomLR = new THREE.PlaneGeometry(VESTIBULE_DEPTH, h);
  const wallGeomFB = new THREE.PlaneGeometry(VESTIBULE_WIDTH, h);

  // Left wall (-X)
  const left = new THREE.Mesh(wallGeomLR, wallMat);
  left.position.set(-hw, h / 2, 0);
  left.rotation.y = Math.PI / 2;
  group.add(left);

  // Right wall (+X)
  const right = new THREE.Mesh(wallGeomLR, wallMat);
  right.position.set(hw, h / 2, 0);
  right.rotation.y = -Math.PI / 2;
  group.add(right);

  // Back wall (-Z)
  const back = new THREE.Mesh(wallGeomFB, wallMat);
  back.position.set(0, h / 2, -hd);
  group.add(back);

  // Front wall (+Z)
  const front = new THREE.Mesh(wallGeomFB, wallMat);
  front.position.set(0, h / 2, hd);
  front.rotation.y = Math.PI;
  group.add(front);

  return {
    group,
    bounds: {
      minX: -hw + margin,
      maxX: hw - margin,
      minZ: -hd + margin,
      maxZ: hd - margin,
    },
  };
}
