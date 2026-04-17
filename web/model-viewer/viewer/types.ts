import type * as THREE from "three";

export type ViewerVersion = "v1" | "v2" | "v3";

export type TiltDetail = {
  x: number;
  z: number;
};

export type ViewerVersionChangeDetail = {
  version?: string;
};

export type FallingState = {
  active: boolean;
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  respawnTimer: number;
};
