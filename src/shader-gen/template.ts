/**
 * GLSL shader templates for raymarching rooms.
 *
 * The fragment template contains a {SCENE_SDF} placeholder —
 * codegen replaces it with a generated `sceneSDF(vec3 p)` function.
 *
 * Design decisions (see docs/phases/phase-4-raymarching-rooms.md):
 *  - FOV matches Three.js PerspectiveCamera (75°) via uniform.
 *  - Camera rotation passed as mat3 extracted from camera.matrixWorld.
 *  - 100 raymarch steps (tier-based tuning deferred to Phase 6).
 *  - Lighting: ambient + directional key from door side (+Z in room space).
 *  - Room space: center (0,0,0), extents ±2 m XZ, 0..2.5 m Y.
 */

export const ROOM_VERT = /* glsl */ `
varying vec2 vUv;

void main() {
  vUv = uv;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}
`;

/**
 * Build the complete fragment shader by injecting the SDF body.
 * `sdfBody` must define: `float sceneSDF(vec3 p) { ... }`
 */
export function buildFragmentShader(sdfBody: string): string {
  return ROOM_FRAG_PREFIX + sdfBody + ROOM_FRAG_SUFFIX;
}

const ROOM_FRAG_PREFIX = /* glsl */ `
precision highp float;

uniform vec3  uCameraPos;
uniform mat3  uCameraRot;
uniform vec2  uResolution;
uniform float uTime;
uniform float uFov;
uniform float uColorSeed;
uniform float uTier;

vec3 hsv2rgb(vec3 c) {
  vec4 K = vec4(1.0, 2.0/3.0, 1.0/3.0, 3.0);
  vec3 p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);
  return c.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), c.y);
}

`;

const ROOM_FRAG_SUFFIX = /* glsl */ `

vec3 calcNormal(vec3 p) {
  const float h = 0.0005;
  const vec2 k = vec2(1.0, -1.0);
  return normalize(
    k.xyy * sceneSDF(p + k.xyy * h) +
    k.yyx * sceneSDF(p + k.yyx * h) +
    k.yxy * sceneSDF(p + k.yxy * h) +
    k.xxx * sceneSDF(p + k.xxx * h)
  );
}

void main() {
  vec2 ndc = (gl_FragCoord.xy / uResolution - 0.5) * 2.0;
  float aspect = uResolution.x / uResolution.y;
  float fovScale = tan(uFov * 0.5);

  vec3 ro = uCameraPos;
  vec3 rd = normalize(uCameraRot * vec3(ndc.x * aspect * fovScale, ndc.y * fovScale, -1.0));

  float t = 0.0;
  float d = 0.0;

  for (int i = 0; i < 100; i++) {
    d = sceneSDF(ro + rd * t);
    if (abs(d) < 0.001) break;
    t += d;
    if (t > 20.0) break;
  }

  vec3 col = vec3(0.02, 0.02, 0.03);

  if (t < 20.0 && abs(d) < 0.001) {
    vec3 p = ro + rd * t;
    vec3 n = calcNormal(p);

    vec3 lightDir = normalize(vec3(0.2, 0.6, 1.0));
    float diff = max(dot(n, lightDir), 0.0);
    float spec = pow(max(dot(reflect(-lightDir, n), -rd), 0.0), 16.0);

    float amb = 0.15 + 0.05 * n.y;

    vec3 baseColor;
    if (uTier < 1.5) {
      baseColor = vec3(0.7, 0.65, 0.6);
    } else if (uTier < 2.5) {
      float hue = uColorSeed + atan(n.x, n.z) * 0.05;
      baseColor = hsv2rgb(vec3(hue, 0.25, 0.7));
    } else if (uTier < 3.5) {
      float hue = uColorSeed + length(p.xz) * 0.1 + uTime * 0.03;
      baseColor = hsv2rgb(vec3(hue, 0.4, 0.75));
    } else {
      float hue = uColorSeed + dot(p, n) * 0.15 + sin(uTime * 0.5) * 0.1;
      float sat = 0.5 + 0.2 * sin(p.y * 3.0 + uTime);
      baseColor = hsv2rgb(vec3(hue, sat, 0.8));
    }

    col = baseColor * (amb + 0.75 * diff) + vec3(0.3) * spec;
  }

  col = pow(col, vec3(1.0 / 2.2));
  gl_FragColor = vec4(col, 1.0);
}
`;

/** Default SDF for testing: a sphere at origin */
export const TEST_SPHERE_SDF = /* glsl */ `
float sceneSDF(vec3 p) {
  return length(p) - 0.5;
}
`;

/** Blit pass shaders — copy render target texture to screen */
export const BLIT_VERT = /* glsl */ `
varying vec2 vUv;

void main() {
  vUv = uv;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}
`;

export const BLIT_FRAG = /* glsl */ `
precision highp float;
uniform sampler2D tDiffuse;
varying vec2 vUv;

void main() {
  gl_FragColor = texture2D(tDiffuse, vUv);
}
`;

/** Fallback gradient shader — used when SDF compilation fails */
export const FALLBACK_GRADIENT_SDF = /* glsl */ `
float sceneSDF(vec3 p) {
  return length(p - vec3(0.0, 0.0, 0.0)) - 0.4;
}
`;
