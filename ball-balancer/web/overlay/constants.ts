import type { PhysicsUiConfig, ViewerOption, ViewerVersion } from "./types";

export const DEFAULT_PHYSICS_BY_VERSION: Record<
  ViewerVersion,
  PhysicsUiConfig
> = {
  v1: {
    gravity: 29.43,
    rotationResponse: 8.5,
    linearDamping: 0.99,
    edgeBounce: 0.6,
    invertX: false,
    invertZ: false,
    invertGravity: false,
    swapAxes: false,
  },
  v2: {
    gravity: 29.43,
    rotationResponse: 8.5,
    linearDamping: 0.99,
    edgeBounce: 0.2,
    invertX: false,
    invertZ: false,
    invertGravity: false,
    swapAxes: false,
  },
  v3: {
    gravity: 29.43,
    rotationResponse: 8.5,
    linearDamping: 0.99,
    edgeBounce: 0.2,
    invertX: false,
    invertZ: false,
    invertGravity: false,
    swapAxes: false,
  },
};

export const VIEWER_OPTIONS: ViewerOption[] = [
  {
    id: "v1",
    name: "V1",
    summary: "Rimmed board with bounded rolling physics.",
  },
  {
    id: "v2",
    name: "V2",
    summary: "Rimless board where the ball can fall and respawn.",
  },
  {
    id: "v3",
    name: "V3",
    summary: "New theme variant (same physics as V2 by default).",
  },
];
