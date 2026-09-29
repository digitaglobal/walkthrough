import * as THREE from "three";

/** Small repeatable weave to restore fabric detail absent from the GLB's flat-color materials. */
export function makeWeaveTexture(dark = false) {
  const size = 128;
  const data = new Uint8Array(size * size * 4);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const hash = ((x * 73856093) ^ (y * 19349663)) >>> 0;
      const thread = (x % 4 === 0 ? 2 : 0) + (y % 4 === 0 ? 2 : 0);
      const value = Math.min(255, (dark ? 224 : 243) + thread + (hash % 7) - 3);
      const index = (y * size + x) * 4;
      data[index] = value;
      data[index + 1] = value;
      data[index + 2] = value;
      data[index + 3] = 255;
    }
  }
  const texture = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(12, 12);
  texture.magFilter = THREE.LinearFilter;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.generateMipmaps = true;
  texture.needsUpdate = true;
  return texture;
}
