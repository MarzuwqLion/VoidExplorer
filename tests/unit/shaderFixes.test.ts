import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import { installShaderFixes } from '../../src/world/shaderFixes';

describe('shader fixes', () => {
  it('guards the flat-shading normal against a zero-length derivative cross product', () => {
    expect(THREE.ShaderChunk.normal_fragment_begin).toContain('normalize( cross( fdx, fdy ) )');
    installShaderFixes();
    const c = THREE.ShaderChunk.normal_fragment_begin;
    expect(c).not.toContain('normalize( cross( fdx, fdy ) )');
    expect(c).toContain('dot( flatN, flatN ) > 1e-24');
    installShaderFixes();
    expect(THREE.ShaderChunk.normal_fragment_begin).toBe(c);
  });
});
