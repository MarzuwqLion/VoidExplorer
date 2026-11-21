import * as THREE from 'three';

/** Shared clock for every swaying material (seconds). */
export const swayTime = { value: 0 };

/**
 * Patch a standard material so its vertices sway in the wind. Instanced meshes get a per-instance phase from their
 * position; heightWeighted keeps the base still and moves the tips.
 */
export function addSway(mat: THREE.Material, amount: number, heightWeighted: boolean): void {
  mat.onBeforeCompile = (shader) => {
    shader.uniforms.uSwayTime = swayTime;
    shader.uniforms.uSwayAmt = { value: amount };
    shader.vertexShader =
      'uniform float uSwayTime;\nuniform float uSwayAmt;\n' +
      shader.vertexShader.replace(
        '#include <begin_vertex>',
        `#include <begin_vertex>
#ifdef USE_INSTANCING
vec2 swayP = instanceMatrix[3].xz;
#else
vec2 swayP = vec2(0.0);
#endif
float swayW = ${heightWeighted ? 'max(position.y, 0.0)' : '1.0'};
float sw = sin(uSwayTime * 1.7 + swayP.x * 0.31 + swayP.y * 0.23) + 0.45 * sin(uSwayTime * 3.3 + swayP.x * 0.8);
transformed.x += sw * uSwayAmt * swayW;
transformed.z += sw * uSwayAmt * 0.6 * swayW;`,
      );
  };
  mat.customProgramCacheKey = () => 'sway:' + amount + ':' + heightWeighted;
}
