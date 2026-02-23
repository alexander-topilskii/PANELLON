import * as THREE from 'three';
import { describeFloor } from '@/world-gen/floor-descriptor';
import { buildFloor, disposeFloor, type FloorRuntime } from '@/render/floor-builder';
import { FadeOverlay } from '@/ui/fade-overlay';
import { HUD } from '@/ui/hud';
import type { PlayerController } from '@/input/player-controller';

const EYE_HEIGHT = 1.7;

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

  bounds = { minX: -2.75, maxX: 2.75, minZ: -2.75, maxZ: 2.75 };

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

  /**
   * Load a floor immediately (no fade). Used for initial load.
   */
  loadFloor(floorNum: number): void {
    this.unloadCurrent();
    this.floorNum = floorNum;
    const desc = describeFloor(floorNum);
    const runtime = buildFloor(desc);
    this.scene.add(runtime.group);
    this.current = runtime;
    this.bounds = runtime.bounds;

    this.player.position.set(desc.spawn.x, EYE_HEIGHT, desc.spawn.z);

    this.hud.setFloor(floorNum);
    this.hud.show();

    this.ambientLight.intensity = desc.type === 'linear' ? 0.2 : 0.35;
  }

  /**
   * Called every frame. Checks stair triggers.
   */
  update(): void {
    if (this.transitioning || !this.current) return;

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
    }
  }

  dispose(): void {
    this.unloadCurrent();
  }
}
