import * as THREE from 'three';
import {
  ROOM_VERT,
  BLIT_VERT,
  BLIT_FRAG,
  buildFragmentShader,
  TEST_SPHERE_SDF,
  FALLBACK_GRADIENT_SDF,
} from '@/shader-gen/template';

const DEFAULT_SCALE = 0.5;
const FOV_RAD = (75 * Math.PI) / 180;

/**
 * Renders a raymarching room via a fullscreen quad.
 *
 * Architecture:
 *  1. A separate Three.js scene with one fullscreen quad (ShaderMaterial).
 *  2. Renders into a WebGLRenderTarget at `scale` × screen resolution.
 *  3. A blit pass copies the render target to the screen.
 *
 * Lifecycle:
 *  - `setShader(sdfCode)` — compiles a new room shader.
 *  - `render(renderer, camera, elapsed)` — called every frame while in room.
 *  - `resize(w, h)` — updates render target dimensions.
 *  - `dispose()` — frees GPU resources.
 */
export class RoomRenderer {
  private roomScene = new THREE.Scene();
  private blitScene = new THREE.Scene();
  private orthoCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

  private renderTarget: THREE.WebGLRenderTarget;
  private roomQuad: THREE.Mesh<THREE.PlaneGeometry, THREE.ShaderMaterial>;
  private blitQuad: THREE.Mesh<THREE.PlaneGeometry, THREE.ShaderMaterial>;

  private scale: number;
  private rotMatrix = new THREE.Matrix3();

  /** Last compilation error, if any */
  lastError: string | null = null;

  constructor(
    private readonly renderer: THREE.WebGLRenderer,
    scale = DEFAULT_SCALE,
  ) {
    this.scale = scale;

    const size = renderer.getSize(new THREE.Vector2());
    const w = Math.max(1, Math.floor(size.x * scale));
    const h = Math.max(1, Math.floor(size.y * scale));

    this.renderTarget = new THREE.WebGLRenderTarget(w, h, {
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
    });

    const geo = new THREE.PlaneGeometry(2, 2);

    this.roomQuad = new THREE.Mesh(
      geo,
      this.createRoomMaterial(TEST_SPHERE_SDF),
    );
    this.roomScene.add(this.roomQuad);

    this.blitQuad = new THREE.Mesh(
      geo.clone(),
      new THREE.ShaderMaterial({
        vertexShader: BLIT_VERT,
        fragmentShader: BLIT_FRAG,
        uniforms: {
          tDiffuse: { value: this.renderTarget.texture },
        },
        depthTest: false,
        depthWrite: false,
      }),
    );
    this.blitScene.add(this.blitQuad);
  }

  private colorSeed = 0;
  private tier = 1;

  setRoomParams(colorSeed: number, tier: number): void {
    this.colorSeed = colorSeed;
    this.tier = tier;
  }

  /**
   * Compile a new room shader from an SDF body.
   * On compile error, falls back to gradient sphere and stores the error.
   *
   * @returns true if compilation succeeded
   */
  setShader(sdfBody: string): boolean {
    this.lastError = null;
    const mat = this.createRoomMaterial(sdfBody);

    const ok = this.checkCompilation(mat);
    if (!ok) {
      mat.dispose();
      const fallback = this.createRoomMaterial(FALLBACK_GRADIENT_SDF);
      this.replaceRoomMaterial(fallback);
      return false;
    }

    this.replaceRoomMaterial(mat);
    return true;
  }

  /**
   * Render the room for this frame.
   * Call from the engine's render override while in room state.
   */
  render(camera: THREE.PerspectiveCamera, elapsed: number): void {
    const mat = this.roomQuad.material;
    const u = mat.uniforms as Record<string, THREE.IUniform>;

    u.uCameraPos!.value.copy(camera.position);
    this.rotMatrix.setFromMatrix4(camera.matrixWorld);
    u.uCameraRot!.value.copy(this.rotMatrix);
    u.uResolution!.value.set(this.renderTarget.width, this.renderTarget.height);
    u.uFov!.value = FOV_RAD;
    u.uTime!.value = elapsed;
    u.uColorSeed!.value = this.colorSeed;
    u.uTier!.value = this.tier;

    this.renderer.setRenderTarget(this.renderTarget);
    this.renderer.render(this.roomScene, this.orthoCamera);

    this.renderer.setRenderTarget(null);
    this.renderer.render(this.blitScene, this.orthoCamera);
  }

  /** Update render target when window resizes */
  resize(width: number, height: number): void {
    const w = Math.max(1, Math.floor(width * this.scale));
    const h = Math.max(1, Math.floor(height * this.scale));
    this.renderTarget.setSize(w, h);
  }

  dispose(): void {
    this.roomQuad.material.dispose();
    this.roomQuad.geometry.dispose();
    this.blitQuad.material.dispose();
    this.blitQuad.geometry.dispose();
    this.renderTarget.dispose();
  }

  private createRoomMaterial(sdfBody: string): THREE.ShaderMaterial {
    return new THREE.ShaderMaterial({
      vertexShader: ROOM_VERT,
      fragmentShader: buildFragmentShader(sdfBody),
      uniforms: {
        uCameraPos: { value: new THREE.Vector3() },
        uCameraRot: { value: new THREE.Matrix3() },
        uResolution: { value: new THREE.Vector2() },
        uFov: { value: FOV_RAD },
        uTime: { value: 0 },
        uColorSeed: { value: 0 },
        uTier: { value: 1 },
      },
      depthTest: false,
      depthWrite: false,
    });
  }

  /**
   * Force-compile the shader program and check for errors.
   * Three.js lazily compiles on first render — we trigger it explicitly
   * via renderer.compile() to catch errors before the first frame.
   */
  private checkCompilation(mat: THREE.ShaderMaterial): boolean {
    const tempMesh = new THREE.Mesh(this.roomQuad.geometry, mat);
    const tempScene = new THREE.Scene();
    tempScene.add(tempMesh);

    try {
      this.renderer.compile(tempScene, this.orthoCamera);
    } catch (e) {
      this.lastError = e instanceof Error ? e.message : String(e);
      return false;
    }

    const gl = this.renderer.getContext();
    const programs = this.renderer.info.programs;
    if (programs && programs.length > 0) {
      const prog = programs[programs.length - 1];
      if (prog && 'diagnostics' in prog && prog.diagnostics) {
        const diag = prog.diagnostics as { runnable: boolean; programLog: string };
        if (!diag.runnable) {
          this.lastError = diag.programLog || 'Shader compilation failed';
          return false;
        }
      }
    }

    // Check for WebGL-level errors
    const err = gl.getError();
    if (err !== gl.NO_ERROR) {
      this.lastError = `WebGL error: ${err}`;
      return false;
    }

    tempScene.remove(tempMesh);
    return true;
  }

  private replaceRoomMaterial(mat: THREE.ShaderMaterial): void {
    this.roomQuad.material.dispose();
    this.roomQuad.material = mat;
  }
}
