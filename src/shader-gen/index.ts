/**
 * Shader generation module.
 *
 * Entry point: `generateRoomShader(roomId, floor)` → GLSL SDF body.
 */

export { buildFragmentShader, TEST_SPHERE_SDF, FALLBACK_GRADIENT_SDF } from './template';
export { compileToGLSL } from './codegen';
export { generateSDF } from './generator';
export type { SDFNode, TierConfig } from './types';
export { getTierConfig } from './types';

import { generateSDF } from './generator';
import { compileToGLSL } from './codegen';
import { normalizeSDF } from './normalize';

/**
 * Full pipeline: Room_ID + floor → GLSL SDF body string.
 *
 *  1. Generate AST from grammar profile by floor tier.
 *  2. Normalize: center, scale to fit ~1.5 m, clamp aspect ratios.
 *  3. Compile AST → GLSL.
 *
 * The returned string defines `float sceneSDF(vec3 p) { ... }`
 * and any needed helpers.
 */
export function generateRoomShader(roomId: number, floor: number): string {
  const ast = generateSDF(roomId, floor);
  normalizeSDF(ast);
  return compileToGLSL(ast);
}
