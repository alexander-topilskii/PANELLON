import * as THREE from 'three';
import { KeyboardState } from './keyboard';
import { PointerLockController } from './pointer-lock';

const MOVE_SPEED = 3.5; // m/s — comfortable walking pace
const EYE_HEIGHT = 1.7; // m

/**
 * First-person player controller.
 * Translates WASD input into camera-relative movement with split-axis collision.
 */
export class PlayerController {
  readonly pointerLock: PointerLockController;
  readonly keyboard: KeyboardState;
  readonly position = new THREE.Vector3(0, EYE_HEIGHT, 0);

  private readonly forward = new THREE.Vector3();
  private readonly right = new THREE.Vector3();

  constructor(
    readonly camera: THREE.PerspectiveCamera,
    canvas: HTMLCanvasElement,
  ) {
    this.pointerLock = new PointerLockController(camera, canvas);
    this.keyboard = new KeyboardState();
    this.camera.position.copy(this.position);
  }

  /**
   * @param bounds  Axis-aligned room boundaries {minX, maxX, minZ, maxZ}
   *                representing the walkable area (with a small margin for wall thickness).
   */
  update(
    dt: number,
    bounds: { minX: number; maxX: number; minZ: number; maxZ: number },
  ): void {
    if (!this.pointerLock.locked) return;

    const { dx, dz } = this.keyboard.getMovement();
    if (dx === 0 && dz === 0) return;

    this.camera.getWorldDirection(this.forward);
    this.forward.y = 0;
    this.forward.normalize();

    this.right.crossVectors(this.forward, THREE.Object3D.DEFAULT_UP).normalize();

    const speed = MOVE_SPEED * dt;

    // Split-axis collision (TECH_SPEC §2):
    // 1) attempt X, clamp
    const moveX = (this.right.x * dx + this.forward.x * dz) * speed;
    this.position.x += moveX;
    this.position.x = Math.max(bounds.minX, Math.min(bounds.maxX, this.position.x));

    // 2) attempt Z, clamp
    const moveZ = (this.right.z * dx + this.forward.z * dz) * speed;
    this.position.z += moveZ;
    this.position.z = Math.max(bounds.minZ, Math.min(bounds.maxZ, this.position.z));

    this.position.y = EYE_HEIGHT;
    this.camera.position.copy(this.position);
  }

  dispose(): void {
    this.pointerLock.dispose();
    this.keyboard.dispose();
  }
}
