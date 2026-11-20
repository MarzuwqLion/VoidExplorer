import * as THREE from 'three';

/**
 * Flat shading derives each pixel's normal from screen-space derivatives. On a sliver triangle seen edge-on the
 * cross product is zero and normalize() returns NaN, which lighting turns into a NaN pixel that bloom then spreads
 * across the frame. Fall back to facing the camera when the derivative normal vanishes.
 */
export function installShaderFixes(): void {
  const from = 'vec3 normal = normalize( cross( fdx, fdy ) );';
  const chunk = THREE.ShaderChunk.normal_fragment_begin;
  if (!chunk.includes(from)) return;
  THREE.ShaderChunk.normal_fragment_begin = chunk.replace(
    from,
    'vec3 flatN = cross( fdx, fdy ); vec3 normal = dot( flatN, flatN ) > 1e-24 ? normalize( flatN ) : vec3( 0.0, 0.0, 1.0 );',
  );
}
