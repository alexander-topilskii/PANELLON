import * as THREE from 'three';
import { buildFragmentShader, ROOM_VERT } from './template';

const SAMPLE_SIZE = 16;
const BLACK_LUMINANCE_THRESHOLD = 0.02;
const BLACK_VARIANCE_THRESHOLD = 0.001;
const FOV_RAD = (75 * Math.PI) / 180;

/**
 * Validates a room shader by rendering it to a 16×16 offscreen buffer
 * and checking for black-screen conditions.
 *
 * A room is considered invalid (black) if:
 *  - average luminance < 0.02 AND variance < 0.001
 *
 * This is a synchronous GPU readback for simplicity in Phase 4.
 * Async PBO-based readback deferred to Phase 6 for perf optimization.
 *
 * See ADR-0004, SHADER_PIPELINE.md §2.
 */
export class ShaderValidator {
  private renderTarget: THREE.WebGLRenderTarget;
  private scene = new THREE.Scene();
  private camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  private quad: THREE.Mesh<THREE.PlaneGeometry, THREE.ShaderMaterial>;
  private pixelBuffer: Uint8Array;

  constructor(private readonly renderer: THREE.WebGLRenderer) {
    this.renderTarget = new THREE.WebGLRenderTarget(SAMPLE_SIZE, SAMPLE_SIZE);
    const geo = new THREE.PlaneGeometry(2, 2);
    this.quad = new THREE.Mesh(
      geo,
      new THREE.ShaderMaterial({ depthTest: false, depthWrite: false }),
    );
    this.scene.add(this.quad);
    this.pixelBuffer = new Uint8Array(SAMPLE_SIZE * SAMPLE_SIZE * 4);
  }

  /**
   * Validate an SDF body.
   * @returns `true` if the shader produces a non-black image.
   */
  validate(sdfBody: string): boolean {
    const fragSrc = buildFragmentShader(sdfBody);
    const mat = new THREE.ShaderMaterial({
      vertexShader: ROOM_VERT,
      fragmentShader: fragSrc,
      uniforms: {
        uCameraPos: { value: new THREE.Vector3(0, 1.2, 2.5) },
        uCameraRot: { value: new THREE.Matrix3() },
        uResolution: { value: new THREE.Vector2(SAMPLE_SIZE, SAMPLE_SIZE) },
        uFov: { value: FOV_RAD },
        uTime: { value: 0 },
        uColorSeed: { value: 0.5 },
        uTier: { value: 1 },
      },
      depthTest: false,
      depthWrite: false,
    });

    this.quad.material.dispose();
    this.quad.material = mat;

    this.renderer.setRenderTarget(this.renderTarget);
    this.renderer.render(this.scene, this.camera);
    this.renderer.setRenderTarget(null);

    this.renderer.readRenderTargetPixels(
      this.renderTarget,
      0, 0,
      SAMPLE_SIZE, SAMPLE_SIZE,
      this.pixelBuffer,
    );

    const { mean, variance } = this.computeStats();
    return !(mean < BLACK_LUMINANCE_THRESHOLD && variance < BLACK_VARIANCE_THRESHOLD);
  }

  private computeStats(): { mean: number; variance: number } {
    const count = SAMPLE_SIZE * SAMPLE_SIZE;
    let sum = 0;
    let sumSq = 0;

    for (let i = 0; i < count; i++) {
      const r = this.pixelBuffer[i * 4]! / 255;
      const g = this.pixelBuffer[i * 4 + 1]! / 255;
      const b = this.pixelBuffer[i * 4 + 2]! / 255;
      const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
      sum += lum;
      sumSq += lum * lum;
    }

    const mean = sum / count;
    const variance = sumSq / count - mean * mean;
    return { mean, variance };
  }

  dispose(): void {
    this.quad.material.dispose();
    this.quad.geometry.dispose();
    this.renderTarget.dispose();
  }
}
