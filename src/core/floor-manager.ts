import * as THREE from 'three';
import { describeFloor, type FloorDescriptor } from '@/world-gen/floor-descriptor';
import { generateMaze } from '@/world-gen/maze';
import { buildFloor, buildProceduralFloor, disposeFloor, type FloorRuntime } from '@/render/floor-builder';
import { resolveWallCollisions } from '@/input/maze-collision';
import { FadeOverlay } from '@/ui/fade-overlay';
import { HUD } from '@/ui/hud';
import type { PlayerController } from '@/input/player-controller';
import { roomHash } from '@/shared/hash';

const EYE_HEIGHT = 1.7;
const WALK_SPEED = 3.5;
const SPRINT_SPEED = 6.5;

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

  /**
   * @param arrivedVia  'up' if the player went UP to reach this floor,
   *                    'down' if the player went DOWN. null for initial load.
   *                    Spawn is placed near the stair matching the OPPOSITE direction
   *                    (so the player can go back).
   */
  loadFloor(floorNum: number, arrivedVia: 'up' | 'down' | null = null): void {
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

    // Choose spawn near the stair that matches opposite of arrival direction.
    // If arrived via 'up', spawn near 'down' stair (so player can go back).
    const spawn = this.pickSpawn(desc, runtime, arrivedVia);
    this.player.position.set(spawn.x, EYE_HEIGHT, spawn.z);
    this.player.camera.position.copy(this.player.position);

    this.hud.setFloor(floorNum);
    this.hud.show();

    this.ambientLight.intensity = desc.type === 'linear' ? 0.2 : 0.35;
  }

  private pickSpawn(
    desc: FloorDescriptor,
    runtime: FloorRuntime,
    arrivedVia: 'up' | 'down' | null,
  ): { x: number; z: number } {
    if (!arrivedVia) return desc.spawn;

    const SPAWN_OFFSET = 1.5; // meters away from stair towards floor center

    // Find the stair going in the opposite direction
    const targetDir = arrivedVia === 'up' ? 'down' : 'up';
    const stair = runtime.stairs.find((s) => s.direction === targetDir);
    if (stair) {
      const center = new THREE.Vector3();
      stair.triggerBox.getCenter(center);

      // Offset towards (0,0) — the floor center
      const toCenter = new THREE.Vector2(-center.x, -center.z);
      const len = toCenter.length();
      if (len > 0.01) {
        toCenter.divideScalar(len).multiplyScalar(SPAWN_OFFSET);
      }

      return { x: center.x + toCenter.x, z: center.z + toCenter.y };
    }

    return desc.spawn;
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

        const speed = (this.player.keyboard.sprinting ? SPRINT_SPEED : WALK_SPEED) * dt;
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
        void this.transitionTo(targetFloor, stair.direction);
        break;
      }
    }
  }

  private async transitionTo(targetFloor: number, arrivedVia: 'up' | 'down'): Promise<void> {
    this.transitioning = true;
    await this.fade.fadeOut();
    this.loadFloor(targetFloor, arrivedVia);
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
