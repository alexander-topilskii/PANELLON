import * as THREE from 'three';
import type { TeleportDescriptor } from '@/world-gen/floor-descriptor';

const PAD_SIZE = 1.4;
const PAD_Y = 0.01;
const PAD_COLOR = 0x4499ee;

/**
 * Creates a teleport pad: glowing blue platform with a floor number label.
 *
 * The label is rendered as a small canvas texture on a sprite so it
 * always faces the camera. The pad acts as a trigger zone.
 */
export function createTeleportPad(desc: TeleportDescriptor): {
  group: THREE.Group;
  triggerBox: THREE.Box3;
} {
  const group = new THREE.Group();

  const padGeo = new THREE.PlaneGeometry(PAD_SIZE, PAD_SIZE);
  const padMat = new THREE.MeshStandardMaterial({
    color: PAD_COLOR,
    emissive: PAD_COLOR,
    emissiveIntensity: 0.7,
    side: THREE.DoubleSide,
  });
  const pad = new THREE.Mesh(padGeo, padMat);
  pad.rotation.x = -Math.PI / 2;
  pad.position.set(desc.position.x, PAD_Y, desc.position.z);
  group.add(pad);

  const labelTex = makeLabel(String(desc.targetFloor));
  const spriteMat = new THREE.SpriteMaterial({ map: labelTex, depthTest: false });
  const sprite = new THREE.Sprite(spriteMat);
  sprite.scale.set(1.0, 0.5, 1);
  sprite.position.set(desc.position.x, 0.9, desc.position.z);
  group.add(sprite);

  const half = PAD_SIZE / 2;
  const triggerBox = new THREE.Box3(
    new THREE.Vector3(desc.position.x - half, 0, desc.position.z - half),
    new THREE.Vector3(desc.position.x + half, 2.0, desc.position.z + half),
  );

  return { group, triggerBox };
}

function makeLabel(text: string): THREE.CanvasTexture {
  const size = 128;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size / 2;
  const ctx = canvas.getContext('2d')!;

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = 'rgba(20, 60, 120, 0.6)';
  roundRect(ctx, 4, 4, canvas.width - 8, canvas.height - 8, 10);
  ctx.fill();

  ctx.font = 'bold 28px monospace';
  ctx.fillStyle = '#aaddff';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, canvas.width / 2, canvas.height / 2);

  const tex = new THREE.CanvasTexture(canvas);
  tex.needsUpdate = true;
  return tex;
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, w: number, h: number, r: number,
): void {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}
