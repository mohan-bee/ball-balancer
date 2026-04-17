import * as THREE from "three";
import type { FallingState } from "./types";
import { dispatchViewerNotice } from "./notices";

const FALL_ACCELERATION = 24;
const RESPAWN_DELAY_SECONDS = 1.05;
const FALL_DISTANCE_LIMIT = -8;

export function createFallingState(): FallingState {
  return {
    active: false,
    position: new THREE.Vector3(),
    velocity: new THREE.Vector3(),
    respawnTimer: 0,
  };
}

export function beginBallFall(
  fallingState: FallingState,
  startPosition: THREE.Vector3,
  startVelocity: THREE.Vector3,
) {
  fallingState.active = true;
  fallingState.position.copy(startPosition);
  fallingState.velocity.copy(startVelocity);
  fallingState.velocity.y = Math.min(fallingState.velocity.y, -1.5);
  fallingState.respawnTimer = 0;
  dispatchViewerNotice("Ball fell off the board. Respawning...");
}

export function resetAfterFall(fallingState: FallingState) {
  fallingState.active = false;
  fallingState.velocity.set(0, 0, 0);
  fallingState.respawnTimer = 0;
}

export function stepFallingBall(fallingState: FallingState, delta: number) {
  fallingState.velocity.y -= FALL_ACCELERATION * delta;
  fallingState.position.addScaledVector(fallingState.velocity, delta);
}

export function shouldRespawn(fallingState: FallingState, delta: number) {
  if (fallingState.position.y >= FALL_DISTANCE_LIMIT) {
    return false;
  }

  fallingState.respawnTimer += delta;
  return fallingState.respawnTimer >= RESPAWN_DELAY_SECONDS;
}
