import type { MazeGrid } from '@/world-gen/maze';
import { hasWall, WALL_N, WALL_S, WALL_E, WALL_W } from '@/world-gen/maze';
import { CELL_SIZE } from '@/shared/constants';
import type { DoorInfo } from '@/render/door-builder';

const MINI_SIZE = 160;
const FULL_SIZE = 500;

const WALL_STROKE = '#8a8a7a';
const DOOR_COLOR = '#cc8844';
const STAIR_COLOR = '#44cc88';
const TELEPORT_COLOR = '#44aaee';
const PLAYER_COLOR = '#fff';
const BG_COLOR = 'rgba(10, 10, 12, 0.75)';

export interface MinimapFloorData {
  type: 'lobby' | 'linear' | 'procedural';
  bounds: { minX: number; maxX: number; minZ: number; maxZ: number };
  maze?: MazeGrid;
  doors?: DoorInfo[];
  stairs?: Array<{ x: number; z: number; direction: 'up' | 'down' }>;
  teleports?: Array<{ x: number; z: number; targetFloor: number }>;
}

/**
 * Circular minimap overlay drawn on a 2D canvas.
 *
 * Mini mode: 160px circle, bottom-right corner.
 * Full mode: 500px circle, centered on screen.
 * Toggle: M key.
 *
 * Shows walls (maze), doors, stairs, teleports, and player position/heading.
 */
export class Minimap {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private expanded = false;
  private floorData: MinimapFloorData | null = null;

  private mazeCache: HTMLCanvasElement | null = null;
  private mazeCacheWorldSize = 0;

  constructor(uiRoot: HTMLElement) {
    this.canvas = document.createElement('canvas');
    this.canvas.id = 'minimap';
    this.canvas.width = MINI_SIZE * 2;
    this.canvas.height = MINI_SIZE * 2;
    uiRoot.appendChild(this.canvas);
    this.ctx = this.canvas.getContext('2d')!;
    this.applyStyle();

    window.addEventListener('keydown', this.onKey);
  }

  setFloorData(data: MinimapFloorData): void {
    this.floorData = data;
    this.mazeCache = null;
    if (data.type === 'procedural' && data.maze) {
      this.buildMazeCache(data.maze);
    }
  }

  toggle(): void {
    this.expanded = !this.expanded;
    this.applyStyle();
  }

  /**
   * Redraw every frame.
   * @param px  Player world X
   * @param pz  Player world Z
   * @param yaw Camera yaw (radians, 0 = -Z)
   */
  update(px: number, pz: number, yaw: number): void {
    if (!this.floorData) return;
    const size = this.expanded ? FULL_SIZE : MINI_SIZE;
    const dpr = Math.min(window.devicePixelRatio, 2);
    const pxSize = size * dpr;

    if (this.canvas.width !== pxSize) {
      this.canvas.width = pxSize;
      this.canvas.height = pxSize;
    }

    const ctx = this.ctx;
    const r = pxSize / 2;

    ctx.clearRect(0, 0, pxSize, pxSize);

    ctx.save();
    ctx.beginPath();
    ctx.arc(r, r, r - 1, 0, Math.PI * 2);
    ctx.clip();

    ctx.fillStyle = BG_COLOR;
    ctx.fillRect(0, 0, pxSize, pxSize);

    const { bounds } = this.floorData;
    const worldW = bounds.maxX - bounds.minX;
    const worldD = bounds.maxZ - bounds.minZ;
    const worldMax = Math.max(worldW, worldD, 1);
    const margin = 0.85;
    const scale = (pxSize * margin) / worldMax;
    const cx = r;
    const cy = r;

    const toX = (wx: number) => cx + (wx - px) * scale;
    const toY = (wz: number) => cy + (wz - pz) * scale;

    this.drawFloor(ctx, toX, toY, scale);

    ctx.fillStyle = PLAYER_COLOR;
    ctx.beginPath();
    ctx.arc(cx, cy, 4 * dpr, 0, Math.PI * 2);
    ctx.fill();

    const headLen = 10 * dpr;
    ctx.strokeStyle = PLAYER_COLOR;
    ctx.lineWidth = 2 * dpr;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + Math.sin(yaw) * headLen, cy - Math.cos(yaw) * headLen);
    ctx.stroke();

    ctx.restore();

    ctx.strokeStyle = 'rgba(100,100,100,0.5)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(r, r, r - 1, 0, Math.PI * 2);
    ctx.stroke();
  }

  show(): void {
    this.canvas.style.display = '';
  }

  hide(): void {
    this.canvas.style.display = 'none';
  }

  dispose(): void {
    window.removeEventListener('keydown', this.onKey);
    this.canvas.remove();
  }

  private drawFloor(
    ctx: CanvasRenderingContext2D,
    toX: (wx: number) => number,
    toY: (wz: number) => number,
    scale: number,
  ): void {
    if (!this.floorData) return;
    const dpr = Math.min(window.devicePixelRatio, 2);

    if (this.floorData.type === 'procedural' && this.mazeCache) {
      this.drawMazeFromCache(ctx, toX, toY, scale);
    } else {
      const { bounds } = this.floorData;
      ctx.strokeStyle = WALL_STROKE;
      ctx.lineWidth = 1.5 * dpr;
      ctx.strokeRect(
        toX(bounds.minX), toY(bounds.minZ),
        (bounds.maxX - bounds.minX) * scale,
        (bounds.maxZ - bounds.minZ) * scale,
      );
    }

    if (this.floorData.doors) {
      ctx.fillStyle = DOOR_COLOR;
      for (const d of this.floorData.doors) {
        const dx = toX(d.worldX);
        const dy = toY(d.worldZ);
        ctx.beginPath();
        ctx.arc(dx, dy, 2.5 * dpr, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    if (this.floorData.stairs) {
      for (const s of this.floorData.stairs) {
        ctx.fillStyle = STAIR_COLOR;
        const sx = toX(s.x);
        const sy = toY(s.z);
        ctx.beginPath();
        ctx.arc(sx, sy, 4 * dpr, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    if (this.floorData.teleports) {
      ctx.font = `${8 * dpr}px monospace`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      for (const t of this.floorData.teleports) {
        ctx.fillStyle = TELEPORT_COLOR;
        const tx = toX(t.x);
        const ty = toY(t.z);
        ctx.beginPath();
        ctx.arc(tx, ty, 5 * dpr, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#fff';
        ctx.fillText(String(t.targetFloor), tx, ty);
      }
    }
  }

  /**
   * Pre-render the maze walls into an offscreen canvas once per floor load.
   * This avoids iterating all cells every frame.
   */
  private buildMazeCache(maze: MazeGrid): void {
    const pxPerCell = 6;
    const size = maze.side * pxPerCell;
    const off = document.createElement('canvas');
    off.width = size;
    off.height = size;
    const ctx = off.getContext('2d')!;

    ctx.strokeStyle = WALL_STROKE;
    ctx.lineWidth = 1;

    for (let z = 0; z < maze.side; z++) {
      for (let x = 0; x < maze.side; x++) {
        const x0 = x * pxPerCell;
        const y0 = z * pxPerCell;
        const x1 = x0 + pxPerCell;
        const y1 = y0 + pxPerCell;

        if (hasWall(maze, x, z, WALL_N)) {
          ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y0); ctx.stroke();
        }
        if (hasWall(maze, x, z, WALL_W)) {
          ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x0, y1); ctx.stroke();
        }
        if (z === maze.side - 1 && hasWall(maze, x, z, WALL_S)) {
          ctx.beginPath(); ctx.moveTo(x0, y1); ctx.lineTo(x1, y1); ctx.stroke();
        }
        if (x === maze.side - 1 && hasWall(maze, x, z, WALL_E)) {
          ctx.beginPath(); ctx.moveTo(x1, y0); ctx.lineTo(x1, y1); ctx.stroke();
        }
      }
    }

    this.mazeCache = off;
    this.mazeCacheWorldSize = maze.side * CELL_SIZE;
  }

  private drawMazeFromCache(
    ctx: CanvasRenderingContext2D,
    toX: (wx: number) => number,
    toY: (wz: number) => number,
    scale: number,
  ): void {
    if (!this.mazeCache) return;
    const half = this.mazeCacheWorldSize / 2;
    const dx = toX(-half);
    const dy = toY(-half);
    const drawSize = this.mazeCacheWorldSize * scale;
    ctx.drawImage(this.mazeCache, dx, dy, drawSize, drawSize);
  }

  private applyStyle(): void {
    const size = this.expanded ? FULL_SIZE : MINI_SIZE;
    const s = this.canvas.style;
    s.position = 'fixed';
    s.width = `${size}px`;
    s.height = `${size}px`;
    s.borderRadius = '50%';
    s.pointerEvents = 'none';
    s.zIndex = '10';

    if (this.expanded) {
      s.bottom = '';
      s.right = '';
      s.top = '50%';
      s.left = '50%';
      s.transform = 'translate(-50%, -50%)';
    } else {
      s.top = '';
      s.left = '';
      s.transform = '';
      s.bottom = '1.5rem';
      s.right = '1.5rem';
    }
  }

  private onKey = (e: KeyboardEvent): void => {
    if (e.code === 'KeyM') this.toggle();
  };
}
