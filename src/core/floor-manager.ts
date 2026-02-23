import * as THREE from 'three';
import { describeFloor } from '@/world-gen/floor-descriptor';
import { generateMaze } from '@/world-gen/maze';
import { buildFloor, buildProceduralFloor, disposeFloor, type FloorRuntime } from '@/render/floor-builder';
import { resolveWallCollisions } from '@/input/maze-collision';
import { FadeOverlay } from '@/ui/fade-overlay';
import { HUD } from '@/ui/hud';
import type { PlayerController } from '@/input/player-controller';
import { roomHash } from '@/shared/hash';

const EYE_HEIGHT = 1.7;
const MOVE_SPEED = 3.5;

/**
 * Manages floor lifecycle: loading, unloading, stair triggers, and transitions.
 * Holds exactly one floor in memory at a time.
 */
export class FloorManager {
  private current: FloorRuntime | null = null;
  private floorNum = 0;
  private transitioning = false;
  private playerBox = new THREE.Box3();
  private playerSize = new THREE.Vector3(0.4, 1.7, 0.4);
  private globalSeed = 0;

  bounds = { minX: -2.75, maxX: 2.75, minZ: -2.75, maxZ: 2.75 };
  wallBoxes: THREE.Box3[] = [];

  constructor(
    private readonly scene: THREE.Scene,
    private readonly player: PlayerController,
    private readonly fade: FadeOverlay,
    private readonly hud: HUD,
    private readonly ambientLight: THREE.AmbientLight,
  ) {}

  get currentFloor(): number {
    return this.floorNum;
  }

  setGlobalSeed(seed: number): void {
    this.globalSeed = seed;
  }

  loadFloor(floorNum: number): void {
    this.unloadCurrent();
    this.floorNum = floorNum;
    const desc = describeFloor(floorNum, this.globalSeed);

    let runtime: FloorRuntime;

    if (desc.type === 'procedural' && desc.gridSide) {
      const mazeSeed = roomHash(0, this.globalSeed, floorNum, 0, 0);
      const maze = generateMaze(desc.gridSide, mazeSeed);
      runtime = buildProceduralFloor(desc, maze);
    } else {
      runtime = buildFloor(desc);
    }

    this.scene.add(runtime.group);
    this.current = runtime;
    this.bounds = runtime.bounds;
    this.wallBoxes = runtime.wallBoxes;

    this.player.position.set(desc.spawn.x, EYE_HEIGHT, desc.spawn.z);

    this.hud.setFloor(floorNum);
    this.hud.show();

    this.ambientLight.intensity = desc.type === 'linear' ? 0.2 : 0.35;
  }

  /**
   * Per-frame update. Handles maze wall collision and stair triggers.
   */
  update(dt: number): void {
    if (this.transitioning || !this.current) return;

    // Wall collision for maze floors
    if (this.wallBoxes.length > 0 && this.player.pointerLock.locked) {
      const { dx, dz } = this.player.keyboard.getMovement();
      if (dx !== 0 || dz !== 0) {
        const forward = new THREE.Vector3();
        this.player.camera.getWorldDirection(forward);
        forward.y = 0;
        forward.normalize();

        const right = new THREE.Vector3();
        right.crossVectors(forward, THREE.Object3D.DEFAULT_UP).normalize();

        const speed = MOVE_SPEED * dt;
        const moveX = (right.x * dx + forward.x * dz) * speed;
        const moveZ = (right.z * dx + forward.z * dz) * speed;

        // Undo PlayerController's own movement (it applied bounds-only)
        // and apply wall-aware collision instead
        resolveWallCollisions(this.player.position, moveX, moveZ, this.wallBoxes);
        this.player.camera.position.copy(this.player.position);
      }
    }

    // Stair triggers
    const p = this.player.position;
    this.playerBox.setFromCenterAndSize(p, this.playerSize);

    for (const stair of this.current.stairs) {
      if (stair.triggerBox.intersectsBox(this.playerBox)) {
        const targetFloor = stair.direction === 'up' ? this.floorNum + 1 : this.floorNum - 1;
        if (targetFloor < 0) continue;
        void this.transitionTo(targetFloor);
        break;
      }
    }
  }

  private async transitionTo(targetFloor: number): Promise<void> {
    this.transitioning = true;
    await this.fade.fadeOut();
    this.loadFloor(targetFloor);
    await this.fade.fadeIn();
    this.transitioning = false;
  }

  private unloadCurrent(): void {
    if (this.current) {
      disposeFloor(this.current);
      this.current = null;
      this.wallBoxes = [];
    }
  }

  dispose(): void {
    this.unloadCurrent();
  }
}
