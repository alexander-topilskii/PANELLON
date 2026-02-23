import * as THREE from 'three';
import { describeFloor, type FloorDescriptor } from '@/world-gen/floor-descriptor';
import { generateMaze, WALL_N, WALL_S, WALL_E, WALL_W } from '@/world-gen/maze';
import { buildFloor, buildProceduralFloor, disposeFloor, type FloorRuntime } from '@/render/floor-builder';
import { resolveWallCollisions } from '@/input/maze-collision';
import { SpatialHash } from '@/input/spatial-hash';
import { FadeOverlay } from '@/ui/fade-overlay';
import { HUD } from '@/ui/hud';
import type { PlayerController } from '@/input/player-controller';
import type { Engine } from './engine';
import type { RoomRenderer } from '@/render/room-renderer';
import type { StateMachine } from './state-machine';
import type { DoorInfo } from '@/render/door-builder';
import { roomHash } from '@/shared/hash';
import { ROOM_SIZE, CELL_SIZE, GEN_VERSION } from '@/shared/constants';
import type { MinimapFloorData } from '@/ui/minimap';
import { FALLBACK_GRADIENT_SDF } from '@/shader-gen';
import { FloorRoomCache } from '@/shader-gen/room-cache';
import { ShaderValidator } from '@/shader-gen/validator';
import type { ShaderDebug } from '@/ui/shader-debug';
import { PreviewRenderer } from '@/render/preview-renderer';

const EYE_HEIGHT = 1.7;
const WALK_SPEED = 3.5;
const SPRINT_SPEED = 6.5;
const ROOM_MARGIN = 0.25;
const HALF_ROOM = ROOM_SIZE / 2;
const LIGHT_RADIUS = 30;

/**
 * Manages floor lifecycle, stair triggers, and room entry/exit.
 * Holds exactly one floor in memory at a time.
 *
 * Room entry flow:
 *  1. Player bbox intersects door trigger → enterRoom()
 *  2. Player position converted to room-local (world − roomCenter)
 *  3. Engine render override → RoomRenderer
 *  4. State machine → 'room'
 *
 * Room exit flow:
 *  1. Player position crosses door boundary in room-local → exitRoom()
 *  2. Position converted back to world (local + roomCenter)
 *  3. Render override cleared
 *  4. State machine → 'corridor'
 */
export class FloorManager {
  private current: FloorRuntime | null = null;
  private floorNum = 0;
  private transitioning = false;
  private playerBox = new THREE.Box3();
  private playerSize = new THREE.Vector3(0.3, 1.7, 0.3);
  private globalSeed = 0;

  private inRoom = false;
  private activeDoor: DoorInfo | null = null;
  private roomCache: FloorRoomCache | null = null;
  private validator: ShaderValidator;
  private onFloorLoadCallbacks: Array<() => void> = [];
  private doorHash: SpatialHash | null = null;
  private previewRenderer: PreviewRenderer;
  private previewGenerated = new Set<string>();
  private readonly PREVIEW_RANGE_SQ = (CELL_SIZE * 2) * (CELL_SIZE * 2);
  private readonly MAX_PREVIEWS_PER_FRAME = 2;

  bounds = { minX: -2.75, maxX: 2.75, minZ: -2.75, maxZ: 2.75 };
  wallBoxes: THREE.Box3[] = [];
  private wallHash: SpatialHash | null = null;

  constructor(
    private readonly scene: THREE.Scene,
    private readonly player: PlayerController,
    private readonly fade: FadeOverlay,
    private readonly hud: HUD,
    private readonly ambientLight: THREE.AmbientLight,
    private readonly engine: Engine,
    private readonly roomRenderer: RoomRenderer,
    private readonly sm: StateMachine,
    private readonly shaderDebug?: ShaderDebug,
  ) {
    this.validator = new ShaderValidator(engine.renderer);
    this.previewRenderer = new PreviewRenderer(engine.renderer);
  }

  get currentFloor(): number {
    return this.floorNum;
  }

  get isInRoom(): boolean {
    return this.inRoom;
  }

  get hasWallCollision(): boolean {
    return this.wallHash !== null;
  }

  setGlobalSeed(seed: number): void {
    this.globalSeed = seed;
  }

  onFloorLoad(cb: () => void): void {
    this.onFloorLoadCallbacks.push(cb);
  }

  loadFloor(floorNum: number, arrivedVia: 'up' | 'down' | null = null): void {
    if (this.inRoom) this.exitRoom();

    this.unloadCurrent();
    this.floorNum = floorNum;
    const desc = describeFloor(floorNum, this.globalSeed);

    let runtime: FloorRuntime;

    if (desc.type === 'procedural' && desc.gridSide) {
      const mazeSeed = roomHash(0, this.globalSeed, floorNum, 0, 0);
      const maze = generateMaze(desc.gridSide, mazeSeed);
      runtime = buildProceduralFloor(desc, maze, this.globalSeed, floorNum);
    } else {
      runtime = buildFloor(desc);
    }

    this.scene.add(runtime.group);
    this.current = runtime;
    this.bounds = runtime.bounds;
    this.wallBoxes = runtime.wallBoxes;
    this.wallHash = runtime.wallBoxes.length > 0
      ? SpatialHash.fromBoxes(runtime.wallBoxes)
      : null;

    if (runtime.doors.length > 0) {
      this.doorHash = new SpatialHash();
      for (const d of runtime.doors) this.doorHash.insert(d.triggerBox);
    } else {
      this.doorHash = null;
    }

    this.roomCache = new FloorRoomCache(
      this.globalSeed,
      floorNum,
      desc.type === 'procedural' ? this.validator : null,
    );

    const spawn = this.pickSpawn(desc, runtime, arrivedVia);
    this.player.position.set(spawn.x, EYE_HEIGHT, spawn.z);
    this.player.camera.position.copy(this.player.position);

    this.hud.setFloor(floorNum);
    this.hud.show();

    this.ambientLight.intensity = desc.type === 'linear' ? 0.2 : 0.35;
    for (const cb of this.onFloorLoadCallbacks) cb();
  }

  private pickSpawn(
    desc: FloorDescriptor,
    runtime: FloorRuntime,
    arrivedVia: 'up' | 'down' | null,
  ): { x: number; z: number } {
    if (!arrivedVia) return desc.spawn;

    const SPAWN_OFFSET = 1.5;
    const targetDir = arrivedVia === 'up' ? 'down' : 'up';
    const stair = runtime.stairs.find((s) => s.direction === targetDir);
    if (stair) {
      const center = new THREE.Vector3();
      stair.triggerBox.getCenter(center);
      const toCenter = new THREE.Vector2(-center.x, -center.z);
      const len = toCenter.length();
      if (len > 0.01) {
        toCenter.divideScalar(len).multiplyScalar(SPAWN_OFFSET);
      }
      return { x: center.x + toCenter.x, z: center.z + toCenter.y };
    }

    return desc.spawn;
  }

  update(dt: number): void {
    if (this.transitioning || !this.current) return;

    if (this.inRoom) {
      this.updateRoom(dt);
    } else {
      this.updateCorridor(dt);
    }
  }

  private updateLights(): void {
    if (!this.current) return;
    const px = this.player.position.x;
    const pz = this.player.position.z;
    const r2 = LIGHT_RADIUS * LIGHT_RADIUS;

    for (const light of this.current.lights) {
      const dx = light.position.x - px;
      const dz = light.position.z - pz;
      light.visible = dx * dx + dz * dz < r2;
    }
  }

  private updatePreviews(): void {
    if (!this.current || !this.roomCache) return;

    const px = this.player.position.x;
    const pz = this.player.position.z;
    let generated = 0;

    for (const door of this.current.doors) {
      if (generated >= this.MAX_PREVIEWS_PER_FRAME) break;

      const key = `${door.cellX},${door.cellZ}`;
      if (this.previewGenerated.has(key)) continue;

      const dx = door.worldX - px;
      const dz = door.worldZ - pz;
      if (dx * dx + dz * dz > this.PREVIEW_RANGE_SQ) continue;

      this.previewGenerated.add(key);
      const entry = this.roomCache.generateRoom(door.cellX, door.cellZ);
      if (entry.state !== 'valid' || !entry.sdfCode) continue;

      const rid = roomHash(GEN_VERSION, this.globalSeed, this.floorNum, door.cellX, door.cellZ);
      const colorSeed = (rid & 0xffff) / 65536;
      const tier = floorToTier(this.floorNum);
      const rt = this.previewRenderer.renderPreview(entry.sdfCode, door.wallSide, colorSeed, tier);
      if (rt) {
        const mat = door.previewPlane.material as THREE.MeshBasicMaterial;
        mat.map = rt.texture;
        mat.color.set(0xffffff);
        mat.opacity = 1.0;
        mat.needsUpdate = true;
        door.previewPlane.visible = true;
        door.previewPlane.userData.previewRT = rt;
        generated++;
      }
    }
  }

  private updateCorridor(dt: number): void {
    if (!this.current) return;

    this.updateLights();
    this.updatePreviews();

    if (this.wallHash && this.player.pointerLock.locked) {
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

        resolveWallCollisions(this.player.position, moveX, moveZ, this.wallHash);
        this.player.camera.position.copy(this.player.position);
      }
    }

    const p = this.player.position;
    this.playerBox.setFromCenterAndSize(p, this.playerSize);

    // Door triggers — spatial query for nearby trigger boxes
    if (this.doorHash) {
      const nearbyTriggers = this.doorHash.query(p.x, p.z);
      const nearbySet = new Set(nearbyTriggers);
      for (const door of this.current.doors) {
        if (!nearbySet.has(door.triggerBox)) continue;
        if (door.triggerBox.intersectsBox(this.playerBox)) {
          this.enterRoom(door);
          return;
        }
      }
    }

    // Teleport triggers (few items, no spatial hash needed)
    for (const tp of this.current.teleports) {
      if (tp.triggerBox.intersectsBox(this.playerBox)) {
        void this.transitionTo(tp.targetFloor, 'up');
        return;
      }
    }

    // Stair triggers (few items)
    for (const stair of this.current.stairs) {
      if (stair.triggerBox.intersectsBox(this.playerBox)) {
        const targetFloor = stair.direction === 'up' ? this.floorNum + 1 : this.floorNum - 1;
        if (targetFloor < 0) continue;
        void this.transitionTo(targetFloor, stair.direction);
        break;
      }
    }
  }

  /**
   * Per-frame update while inside a raymarching room.
   * Movement is in room-local space with bounds collision.
   */
  private updateRoom(dt: number): void {
    if (!this.player.pointerLock.locked || !this.activeDoor) return;

    const { dx, dz } = this.player.keyboard.getMovement();
    if (dx !== 0 || dz !== 0) {
      const forward = new THREE.Vector3();
      this.player.camera.getWorldDirection(forward);
      forward.y = 0;
      forward.normalize();

      const right = new THREE.Vector3();
      right.crossVectors(forward, THREE.Object3D.DEFAULT_UP).normalize();

      const speed = (this.player.keyboard.sprinting ? SPRINT_SPEED : WALK_SPEED) * dt;
      const mx = (right.x * dx + forward.x * dz) * speed;
      const mz = (right.z * dx + forward.z * dz) * speed;

      this.player.position.x += mx;
      this.player.position.z += mz;

      // Exit check runs on raw position BEFORE collision clamp,
      // otherwise the clamp prevents the player from ever reaching
      // the exit threshold.
      if (this.checkRoomExit()) {
        this.exitRoom();
        return;
      }

      this.applyRoomCollision();
      this.player.position.y = EYE_HEIGHT;
      this.player.camera.position.copy(this.player.position);
    }
  }

  /**
   * Clamp player within room bounds ±HALF_ROOM, except at the door opening.
   */
  private applyRoomCollision(): void {
    const p = this.player.position;
    const door = this.activeDoor!;
    const min = -HALF_ROOM + ROOM_MARGIN;
    const max = HALF_ROOM - ROOM_MARGIN;

    const { wallSide } = door;
    const halfDoor = 0.75;

    if (wallSide === WALL_N || wallSide === WALL_S) {
      p.x = Math.max(min, Math.min(max, p.x));
      const isInDoorGap = Math.abs(p.x) < halfDoor;
      if (!isInDoorGap) {
        p.z = Math.max(min, Math.min(max, p.z));
      } else {
        const softLimit = HALF_ROOM + 0.5;
        p.z = Math.max(-softLimit, Math.min(softLimit, p.z));
      }
    } else {
      p.z = Math.max(min, Math.min(max, p.z));
      const isInDoorGap = Math.abs(p.z) < halfDoor;
      if (!isInDoorGap) {
        p.x = Math.max(min, Math.min(max, p.x));
      } else {
        const softLimit = HALF_ROOM + 0.5;
        p.x = Math.max(-softLimit, Math.min(softLimit, p.x));
      }
    }
  }

  /**
   * Check if the player has moved past the door boundary → exit room.
   * In room-local space, the door is at ±HALF_ROOM on the door's axis.
   */
  private checkRoomExit(): boolean {
    if (!this.activeDoor) return false;
    const p = this.player.position;
    const { wallSide } = this.activeDoor;
    const threshold = HALF_ROOM + 0.3;

    switch (wallSide) {
      case WALL_N: return p.z < -threshold;
      case WALL_S: return p.z > threshold;
      case WALL_E: return p.x > threshold;
      case WALL_W: return p.x < -threshold;
      default:     return false;
    }
  }

  private enterRoom(door: DoorInfo): void {
    if (!this.roomCache) return;

    const entry = this.roomCache.generateRoom(door.cellX, door.cellZ);
    if (entry.state === 'empty') return;

    this.inRoom = true;
    this.activeDoor = door;

    const worldX = this.player.position.x;
    const worldZ = this.player.position.z;
    this.player.position.x = worldX - door.roomCenterX;
    this.player.position.z = worldZ - door.roomCenterZ;
    this.player.camera.position.copy(this.player.position);

    const rid = roomHash(GEN_VERSION, this.globalSeed, this.floorNum, door.cellX, door.cellZ);
    const colorSeed = (rid & 0xffff) / 65536;
    const tier = floorToTier(this.floorNum);
    this.roomRenderer.setRoomParams(colorSeed, tier);

    const sdf = entry.sdfCode!;
    const ok = this.roomRenderer.setShader(sdf);
    if (!ok) {
      this.roomRenderer.setShader(FALLBACK_GRADIENT_SDF);
      this.shaderDebug?.setCode(FALLBACK_GRADIENT_SDF);
    } else {
      this.shaderDebug?.setCode(sdf);
    }

    this.engine.setRenderOverride(() => {
      this.roomRenderer.render(this.engine.camera, this.engine.clock.elapsed);
    });

    if (this.sm.state === 'corridor') {
      this.sm.transition('room');
    }
  }

  private exitRoom(): void {
    if (!this.activeDoor) return;

    // Convert position back to world space
    const localX = this.player.position.x;
    const localZ = this.player.position.z;
    this.player.position.x = localX + this.activeDoor.roomCenterX;
    this.player.position.z = localZ + this.activeDoor.roomCenterZ;
    this.player.position.y = EYE_HEIGHT;
    this.player.camera.position.copy(this.player.position);

    this.engine.setRenderOverride(null);
    this.shaderDebug?.clear();

    if (this.sm.state === 'room') {
      this.sm.transition('corridor');
    }

    this.activeDoor = null;
    this.inRoom = false;
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
      for (const door of this.current.doors) {
        const rt = door.previewPlane.userData.previewRT as THREE.WebGLRenderTarget | undefined;
        rt?.dispose();
      }
      disposeFloor(this.current);
      this.current = null;
      this.wallBoxes = [];
      this.wallHash = null;
      this.doorHash = null;
    }
    this.previewGenerated.clear();
    if (this.roomCache) {
      this.roomCache.clear();
      this.roomCache = null;
    }
  }

  /** Returns player position in world space, even when inside a room. */
  getWorldPosition(): { x: number; z: number } {
    if (this.inRoom && this.activeDoor) {
      return {
        x: this.player.position.x + this.activeDoor.roomCenterX,
        z: this.player.position.z + this.activeDoor.roomCenterZ,
      };
    }
    return { x: this.player.position.x, z: this.player.position.z };
  }

  getMinimapData(): MinimapFloorData | null {
    if (!this.current) return null;
    const runtime = this.current;
    const desc = describeFloor(this.floorNum, this.globalSeed);

    const stairs = runtime.stairs.map((s) => {
      const center = new THREE.Vector3();
      s.triggerBox.getCenter(center);
      return { x: center.x, z: center.z, direction: s.direction };
    });

    const teleports = (runtime.teleports ?? []).map((t) => {
      const center = new THREE.Vector3();
      t.triggerBox.getCenter(center);
      return { x: center.x, z: center.z, targetFloor: t.targetFloor };
    });

    return {
      type: desc.type,
      bounds: runtime.bounds,
      maze: runtime.maze,
      doors: runtime.doors,
      stairs,
      teleports,
    };
  }

  dispose(): void {
    if (this.inRoom) this.exitRoom();
    this.unloadCurrent();
    this.validator.dispose();
    this.previewRenderer.dispose();
  }
}

function floorToTier(floor: number): number {
  if (floor <= 20) return 1;
  if (floor <= 50) return 2;
  if (floor <= 150) return 3;
  return 4;
}
