import * as THREE from 'three';
import type { StairDescriptor } from '@/world-gen/floor-descriptor';

const PAD_SIZE = 1.2;
const PAD_Y = 0.01;

const UP_COLOR = 0x44cc88;
const DOWN_COLOR = 0xcc8844;

/**
 * Creates a stair pad: glowing platform on the floor with an arrow shape.
 * Returns mesh + trigger box for intersection testing.
 */
export function createStairPad(stair: StairDescriptor): {
  group: THREE.Group;
  triggerBox: THREE.Box3;
} {
  const group = new THREE.Group();
  const isUp = stair.direction === 'up';
  const color = isUp ? UP_COLOR : DOWN_COLOR;

  const padGeo = new THREE.PlaneGeometry(PAD_SIZE, PAD_SIZE);
  const padMat = new THREE.MeshStandardMaterial({
    color,
    emissive: color,
    emissiveIntensity: 0.6,
    side: THREE.DoubleSide,
  });
  const pad = new THREE.Mesh(padGeo, padMat);
  pad.rotation.x = -Math.PI / 2;
  pad.position.set(stair.position.x, PAD_Y, stair.position.z);
  group.add(pad);

  // Arrow indicator
  const arrowShape = new THREE.Shape();
  const s = 0.25;
  arrowShape.moveTo(0, s);
  arrowShape.lineTo(-s, -s * 0.5);
  arrowShape.lineTo(s, -s * 0.5);
  arrowShape.closePath();

  const arrowGeo = new THREE.ShapeGeometry(arrowShape);
  const arrowMat = new THREE.MeshBasicMaterial({ color: 0xffffff, side: THREE.DoubleSide });
  const arrow = new THREE.Mesh(arrowGeo, arrowMat);
  arrow.rotation.x = -Math.PI / 2;
  if (!isUp) arrow.rotation.z = Math.PI;
  arrow.position.set(stair.position.x, PAD_Y + 0.01, stair.position.z);
  group.add(arrow);

  const half = PAD_SIZE / 2;
  const triggerBox = new THREE.Box3(
    new THREE.Vector3(stair.position.x - half, 0, stair.position.z - half),
    new THREE.Vector3(stair.position.x + half, 2.0, stair.position.z + half),
  );

  return { group, triggerBox };
}
