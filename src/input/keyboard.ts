/**
 * Tracks which keys are currently pressed.
 * Provides a normalized (dx, dz) movement vector for WASD.
 */
export class KeyboardState {
  private readonly pressed = new Set<string>();

  constructor() {
    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);
  }

  isDown(code: string): boolean {
    return this.pressed.has(code);
  }

  get sprinting(): boolean {
    return this.pressed.has('ShiftLeft') || this.pressed.has('ShiftRight');
  }

  /**
   * Returns a normalized 2D movement vector based on WASD.
   * +Z = forward (into screen), +X = right.
   */
  getMovement(): { dx: number; dz: number } {
    let dx = 0;
    let dz = 0;

    if (this.pressed.has('KeyW') || this.pressed.has('ArrowUp')) dz += 1;
    if (this.pressed.has('KeyS') || this.pressed.has('ArrowDown')) dz -= 1;
    if (this.pressed.has('KeyA') || this.pressed.has('ArrowLeft')) dx -= 1;
    if (this.pressed.has('KeyD') || this.pressed.has('ArrowRight')) dx += 1;

    const len = Math.sqrt(dx * dx + dz * dz);
    if (len > 0) {
      dx /= len;
      dz /= len;
    }

    return { dx, dz };
  }

  private onKeyDown = (e: KeyboardEvent): void => {
    this.pressed.add(e.code);
  };

  private onKeyUp = (e: KeyboardEvent): void => {
    this.pressed.delete(e.code);
  };

  dispose(): void {
    window.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('keyup', this.onKeyUp);
  }
}
