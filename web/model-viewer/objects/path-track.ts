import * as THREE from "three";
import { BOARD_THICKNESS } from "./constants";

export type PathTrackOptions = {
  length?: number;
  width?: number;
  tileSize?: number;
};

// A simple tiled strip to balance along (V3).
export function createPathTrack(
  trayShearGroup: THREE.Group,
  setStatus: (message: string) => void,
  options: PathTrackOptions = {},
) {
  const length = options.length ?? 16;
  const width = options.width ?? 2.4;
  const tileSize = options.tileSize ?? 0.8;

  const track = new THREE.Group();

  const base = new THREE.Mesh(
    new THREE.BoxGeometry(width, BOARD_THICKNESS, length),
    new THREE.MeshStandardMaterial({
      color: 0x0b1220,
      metalness: 0.06,
      roughness: 0.82,
    }),
  );
  base.receiveShadow = true;
  track.add(base);

  const tileGeo = new THREE.BoxGeometry(
    tileSize * 0.92,
    BOARD_THICKNESS * 0.28,
    tileSize * 0.92,
  );
  const tileMatA = new THREE.MeshStandardMaterial({
    color: 0x8b5cf6,
    metalness: 0.08,
    roughness: 0.48,
    emissive: 0x2e1065,
    emissiveIntensity: 0.12,
  });
  const tileMatB = new THREE.MeshStandardMaterial({
    color: 0x0ea5e9,
    metalness: 0.08,
    roughness: 0.5,
    emissive: 0x082f49,
    emissiveIntensity: 0.08,
  });

  const countZ = Math.floor(length / tileSize);
  const countX = Math.floor(width / tileSize);
  const zStart = -((countZ - 1) * tileSize) / 2;
  const xStart = -((countX - 1) * tileSize) / 2;

  for (let zi = 0; zi < countZ; zi += 1) {
    for (let xi = 0; xi < countX; xi += 1) {
      const tile = new THREE.Mesh(
        tileGeo,
        (xi + zi) % 2 === 0 ? tileMatA : tileMatB,
      );
      tile.position.set(
        xStart + xi * tileSize,
        BOARD_THICKNESS * 0.26,
        zStart + zi * tileSize,
      );
      tile.receiveShadow = true;
      track.add(tile);
    }
  }

  trayShearGroup.add(track);
  setStatus("Model: path track ready");

  const halfWidth = width / 2;
  const halfLength = length / 2;
  return {
    object: track,
    bounds: {
      minX: -halfWidth,
      maxX: halfWidth,
      minZ: -halfLength,
      maxZ: halfLength,
    },
    spawn: { x: 0, z: -halfLength + tileSize * 1.25 },
  };
}
