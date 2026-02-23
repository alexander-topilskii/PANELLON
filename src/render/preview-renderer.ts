import * as THREE from 'three';
import {
  ROOM_VERT,
  buildFragmentShader,
} from '@/shader-gen/template';
import { WALL_N, WALL_S, WALL_E, WALL_W } from '@/world-gen/maze';

const PREVIEW_SIZE = 64;
const FOV_RAD = (75 * Math.PI) / 180;
const CAM_Y = 1.25;
const CAM_INSET = 1.5;

/**
 * Renders room SDF previews into 64×64 textures for door openings.
 *
 * Each call to renderPreview() compiles the SDF, renders one frame,
 * and returns a persistent WebGLRenderTarget whose .texture is used
 * as the door plane's map.
 *
 * Camera is placed 0.5 m inside the room from the door, looking at
 * the room center — matching the spec in phase-5-content-quality.md.
 */
export class PreviewRenderer {
  private scene = new THREE.Scene();
  private camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  private quad: THREE.Mesh<THREE.PlaneGeometry, THREE.ShaderMaterial>;

  constructor(private readonly renderer: THREE.WebGLRenderer) {
    const geo = new THREE.PlaneGeometry(2, 2);
    this.quad = new THREE.Mesh(
      geo,
      new THREE.ShaderMaterial({ depthTest: false, depthWrite: false }),
    );
    this.scene.add(this.quad);
  }

  /**
   * Render a single preview.
   * Returns a 64×64 WebGLRenderTarget — caller owns it and must dispose.
   * Returns null if the shader fails to compile.
   */
  renderPreview(
    sdfBody: string,
    doorSide: number,
    colorSeed = 0,
    tier = 1,
  ): THREE.WebGLRenderTarget | null {
    const fragSrc = buildFragmentShader(sdfBody);
    const mat = new THREE.ShaderMaterial({
      vertexShader: ROOM_VERT,
      fragmentShader: fragSrc,
      uniforms: {
        uCameraPos: { value: cameraPosition(doorSide) },
        uCameraRot: { value: cameraRotation(doorSide) },
        uResolution: { value: new THREE.Vector2(PREVIEW_SIZE, PREVIEW_SIZE) },
        uFov: { value: FOV_RAD },
        uTime: { value: 0 },
        uColorSeed: { value: colorSeed },
        uTier: { value: tier },
      },
      depthTest: false,
      depthWrite: false,
    });

    const tempScene = new THREE.Scene();
    const tempMesh = new THREE.Mesh(this.quad.geometry, mat);
    tempScene.add(tempMesh);

    try {
      this.renderer.compile(tempScene, this.camera);
    } catch {
      mat.dispose();
      return null;
    }

    const gl = this.renderer.getContext();
    if (gl.getError() !== gl.NO_ERROR) {
      mat.dispose();
      return null;
    }

    const rt = new THREE.WebGLRenderTarget(PREVIEW_SIZE, PREVIEW_SIZE, {
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
    });

    const prevRT = this.renderer.getRenderTarget();
    this.renderer.setRenderTarget(rt);
    this.renderer.render(tempScene, this.camera);
    this.renderer.setRenderTarget(prevRT);

    mat.dispose();
    return rt;
  }

  dispose(): void {
    this.quad.material.dispose();
    this.quad.geometry.dispose();
  }
}

function cameraPosition(doorSide: number): THREE.Vector3 {
  switch (doorSide) {
    case WALL_N: return new THREE.Vector3(0, CAM_Y, -CAM_INSET);
    case WALL_S: return new THREE.Vector3(0, CAM_Y, CAM_INSET);
    case WALL_E: return new THREE.Vector3(CAM_INSET, CAM_Y, 0);
    case WALL_W: return new THREE.Vector3(-CAM_INSET, CAM_Y, 0);
    default:     return new THREE.Vector3(0, CAM_Y, -CAM_INSET);
  }
}

function cameraRotation(doorSide: number): THREE.Matrix3 {
  const eye = cameraPosition(doorSide);
  const target = new THREE.Vector3(0, CAM_Y, 0);

  const forward = new THREE.Vector3().subVectors(target, eye).normalize();
  const worldUp = new THREE.Vector3(0, 1, 0);
  const right = new THREE.Vector3().crossVectors(forward, worldUp).normalize();
  const up = new THREE.Vector3().crossVectors(right, forward).normalize();

  const m = new THREE.Matrix3();
  m.set(
    right.x,  up.x,  -forward.x,
    right.y,  up.y,  -forward.y,
    right.z,  up.z,  -forward.z,
  );
  return m;
}
