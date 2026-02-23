import * as THREE from 'three';

/**
 * Wraps PointerLock API for first-person camera control.
 * Applies mouse movement as yaw/pitch to the camera.
 */
export class PointerLockController {
  readonly euler = new THREE.Euler(0, 0, 0, 'YXZ');
  private readonly PI_2 = Math.PI / 2;
  private readonly sensitivity: number;
  private _locked = false;

  constructor(
    private readonly camera: THREE.Camera,
    private readonly domElement: HTMLElement,
    sensitivity = 0.002,
  ) {
    this.sensitivity = sensitivity;
    this.euler.setFromQuaternion(camera.quaternion);

    document.addEventListener('pointerlockchange', this.onLockChange);
    document.addEventListener('mousemove', this.onMouseMove);
  }

  get locked(): boolean {
    return this._locked;
  }

  lock(): void {
    this.domElement.requestPointerLock();
  }

  unlock(): void {
    document.exitPointerLock();
  }

  private onLockChange = (): void => {
    this._locked = document.pointerLockElement === this.domElement;
  };

  private onMouseMove = (e: MouseEvent): void => {
    if (!this._locked) return;

    this.euler.y -= e.movementX * this.sensitivity;
    this.euler.x -= e.movementY * this.sensitivity;
    this.euler.x = Math.max(-this.PI_2, Math.min(this.PI_2, this.euler.x));

    this.camera.quaternion.setFromEuler(this.euler);
  };

  dispose(): void {
    document.removeEventListener('pointerlockchange', this.onLockChange);
    document.removeEventListener('mousemove', this.onMouseMove);
  }
}
