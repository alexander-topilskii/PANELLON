import * as THREE from 'three';
import { Engine } from './core/engine';
import { StateMachine } from './core/state-machine';
import { FloorManager } from './core/floor-manager';
import { PlayerController } from './input/player-controller';
import { StartScreen } from './ui/start-screen';
import { FadeOverlay } from './ui/fade-overlay';
import { HUD } from './ui/hud';
import { resolveSeed, persistSeed, seedToGlobal } from './shared/seed';
import { RoomRenderer } from './render/room-renderer';

function checkWebGL2(): boolean {
  const testCanvas = document.createElement('canvas');
  return testCanvas.getContext('webgl2') !== null;
}

function showError(message: string): void {
  const root = document.getElementById('ui-root');
  if (!root) return;
  root.innerHTML = `
    <div style="
      display:flex; align-items:center; justify-content:center;
      width:100%; height:100%; pointer-events:auto;
      background:#111; color:#e55; font-size:1.2rem; text-align:center; padding:2rem;
    ">
      <p>${message}</p>
    </div>
  `;
}

function bootstrap(): void {
  if (!checkWebGL2()) {
    showError('WebGL 2 is required but not available in your browser.');
    return;
  }

  const canvasEl = document.getElementById('game-canvas') as HTMLCanvasElement | null;
  const uiRoot = document.getElementById('ui-root');
  if (!canvasEl || !uiRoot) {
    showError('Required DOM elements not found.');
    return;
  }
  const canvas: HTMLCanvasElement = canvasEl;

  const engine = new Engine(canvas);
  const sm = new StateMachine();

  const ambient = new THREE.AmbientLight(0xffeedd, 0.35);
  engine.scene.add(ambient);

  const startScreen = new StartScreen(uiRoot);
  const fade = new FadeOverlay(uiRoot);
  const hud = new HUD(uiRoot);
  hud.hide();

  const roomRenderer = new RoomRenderer(engine.renderer);
  engine.onResize((w, h) => roomRenderer.resize(w, h));

  let player: PlayerController | null = null;
  let floorMgr: FloorManager | null = null;

  sm.onTransition((_from, to) => {
    if (to === 'menu') {
      startScreen.show(enterWorld);
      hud.hide();
      if (player) player.pointerLock.unlock();
    }
    if (to === 'corridor') {
      startScreen.hide();
      canvas.addEventListener('click', requestLock, { once: true });
    }
  });

  function requestLock(): void {
    player?.pointerLock.lock();
  }

  function enterWorld(seedInput: string): void {
    const seed = resolveSeed(seedInput);
    persistSeed(seed);
    const globalSeed = seedToGlobal(seed);

    if (!player) {
      player = new PlayerController(engine.camera, canvas);
    }

    if (!floorMgr) {
      floorMgr = new FloorManager(
        engine.scene,
        player,
        fade,
        hud,
        ambient,
        engine,
        roomRenderer,
        sm,
      );
    }

    floorMgr.setGlobalSeed(globalSeed);
    floorMgr.loadFloor(0);

    engine.onUpdate((dt) => {
      if (!floorMgr || !player) return;
      if (floorMgr.wallBoxes.length === 0 && !floorMgr.isInRoom) {
        player.update(dt, floorMgr.bounds);
      }
      floorMgr.update(dt);
    });

    sm.transition('corridor');
    canvas.addEventListener('click', requestLock);
  }

  window.addEventListener('keydown', (e) => {
    if (e.code === 'Escape' && player?.pointerLock.locked) {
      player.pointerLock.unlock();
    }
  });

  sm.transition('menu');
  engine.start();
}

bootstrap();
