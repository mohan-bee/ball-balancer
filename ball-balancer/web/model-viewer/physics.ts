import * as THREE from "three";
import { BALL_RADIUS, BOARD_HALF_SIZE } from "./models";

export interface PhysicsConfig {
  gravity: number;
  rotationResponse: number;
  accelerationFactor: number;
  linearDamping: number;
  edgeBounce: number;
  invertX: boolean;
  invertZ: boolean;
  invertGravity: boolean;
  swapAxes: boolean;
}

export interface PhysicsState {
  targetRotationX: number;
  targetRotationZ: number;
  currentRotationX: number;
  currentRotationZ: number;
  ballPos: THREE.Vector3;
  ballVel: THREE.Vector3;
  ballRadius: number;
  ballLocalPos: THREE.Vector2;
  ballLocalVel: THREE.Vector2;
  planeCenter: THREE.Vector3;
  planeNormal: THREE.Vector3;
  planeAxisX: THREE.Vector3;
  planeAxisZ: THREE.Vector3;
  lastBallWorldPos: THREE.Vector3 | null;
  config: PhysicsConfig;
}

type StepPhysicsOptions = {
  enforceBounds?: boolean;
};

const DEFAULT_CONFIG: PhysicsConfig = {
  gravity: 9.81 * 3,
  rotationResponse: 14.5,
  accelerationFactor: 5 / 7,
  linearDamping: 0.99,
  edgeBounce: 0.6,
  invertX: false,
  invertZ: false,
  invertGravity: false,
  swapAxes: false,
};

export function getBoardLimit(ballRadius: number) {
  return BOARD_HALF_SIZE - ballRadius * 0.55;
}

function roundRotation(value: number) {
  return Math.round(value * 100) / 100;
}

function updatePlaneBasis(state: PhysicsState) {
  const rotation = new THREE.Euler(
    state.currentRotationX,
    0,
    state.currentRotationZ,
    "XYZ",
  );
  const basis = new THREE.Matrix4().makeRotationFromEuler(rotation);

  state.planeAxisX.set(1, 0, 0).applyMatrix4(basis).normalize();
  state.planeAxisZ.set(0, 0, 1).applyMatrix4(basis).normalize();
  state.planeNormal.set(0, 1, 0).applyMatrix4(basis).normalize();
}

function syncBallWorldPosition(state: PhysicsState) {
  const worldX = state.planeAxisX.clone().multiplyScalar(state.ballLocalPos.x);
  const worldZ = state.planeAxisZ.clone().multiplyScalar(state.ballLocalPos.y);
  const lift = state.planeNormal.clone().multiplyScalar(state.ballRadius);

  state.ballPos.copy(state.planeCenter).add(worldX).add(worldZ).add(lift);

  const tangentVelocity = state.planeAxisX
    .clone()
    .multiplyScalar(state.ballLocalVel.x)
    .add(state.planeAxisZ.clone().multiplyScalar(state.ballLocalVel.y));
  state.ballVel.copy(tangentVelocity);
}

function applyBoardAcceleration(state: PhysicsState, delta: number) {
  const { config } = state;

  // 5/7 is the standard acceleration factor for a solid sphere rolling without slipping.
  const baseAccel = config.gravity * config.accelerationFactor;
  const accelX = -Math.sin(state.currentRotationZ) * baseAccel;
  const accelZ = Math.sin(state.currentRotationX) * baseAccel;
  const multiplier = config.invertGravity ? -1 : 1;

  if (config.swapAxes) {
    state.ballLocalVel.x += accelZ * delta * multiplier;
    state.ballLocalVel.y += accelX * delta * multiplier;
    return;
  }

  state.ballLocalVel.x += accelX * delta * multiplier;
  state.ballLocalVel.y += accelZ * delta * multiplier;
}

function applyBoardBounds(state: PhysicsState) {
  const limit = getBoardLimit(state.ballRadius);

  if (Math.abs(state.ballLocalPos.x) > limit) {
    state.ballLocalPos.x = Math.sign(state.ballLocalPos.x) * limit;
    state.ballLocalVel.x *= -state.config.edgeBounce;
  }

  if (Math.abs(state.ballLocalPos.y) > limit) {
    state.ballLocalPos.y = Math.sign(state.ballLocalPos.y) * limit;
    state.ballLocalVel.y *= -state.config.edgeBounce;
  }
}

export function createPhysicsState(
  planeCenter = new THREE.Vector3(0, 1.4, 0),
): PhysicsState {
  const state: PhysicsState = {
    targetRotationX: 0,
    targetRotationZ: 0,
    currentRotationX: 0,
    currentRotationZ: 0,
    ballPos: new THREE.Vector3(),
    ballVel: new THREE.Vector3(),
    ballRadius: BALL_RADIUS,
    ballLocalPos: new THREE.Vector2(0, 0),
    ballLocalVel: new THREE.Vector2(0, 0),
    planeCenter: planeCenter.clone(),
    planeNormal: new THREE.Vector3(0, 1, 0),
    planeAxisX: new THREE.Vector3(1, 0, 0),
    planeAxisZ: new THREE.Vector3(0, 0, 1),
    lastBallWorldPos: null,
    config: { ...DEFAULT_CONFIG },
  };

  updatePlaneBasis(state);
  syncBallWorldPosition(state);
  return state;
}

export function updateTiltTargets(state: PhysicsState, x: number, z: number) {
  const { config } = state;
  const horizontal = config.invertX ? -x : x;
  const vertical = config.invertZ ? -z : z;

  state.targetRotationX = roundRotation(
    THREE.MathUtils.clamp(vertical * 0.8, -0.95, 0.95),
  );
  state.targetRotationZ = roundRotation(
    THREE.MathUtils.clamp(horizontal * 0.8, -0.95, 0.95),
  );
}

export function stepTrayRotation(state: PhysicsState, delta: number) {
  const { config } = state;
  const blend = 1 - Math.exp(-config.rotationResponse * delta);
  state.currentRotationX = THREE.MathUtils.lerp(
    state.currentRotationX,
    state.targetRotationX,
    blend,
  );
  state.currentRotationZ = THREE.MathUtils.lerp(
    state.currentRotationZ,
    state.targetRotationZ,
    blend,
  );
  updatePlaneBasis(state);
}

export function stepBallOnBoard(
  state: PhysicsState,
  delta: number,
  options: StepPhysicsOptions = {},
) {
  const { enforceBounds = true } = options;
  const { config } = state;

  applyBoardAcceleration(state, delta);

  const damping = Math.pow(config.linearDamping, delta * 60);
  state.ballLocalVel.multiplyScalar(damping);

  state.ballLocalPos.x += state.ballLocalVel.x * delta;
  state.ballLocalPos.y += state.ballLocalVel.y * delta;

  if (enforceBounds) {
    applyBoardBounds(state);
  }

  syncBallWorldPosition(state);
}

export function stepPhysics(
  state: PhysicsState,
  delta: number,
  options: StepPhysicsOptions = {},
) {
  stepTrayRotation(state, delta);
  stepBallOnBoard(state, delta, options);
}

export function hasBallLeftBoard(state: PhysicsState) {
  const edgeThreshold =
    getBoardLimit(state.ballRadius) + state.ballRadius * 0.9;
  return (
    Math.abs(state.ballLocalPos.x) > edgeThreshold ||
    Math.abs(state.ballLocalPos.y) > edgeThreshold
  );
}

export function updatePhysicsConfig(
  state: PhysicsState,
  patch: Partial<PhysicsConfig>,
) {
  state.config = { ...state.config, ...patch };
}

export function resetBall(
  state: PhysicsState,
  spawn?: { x: number; z: number },
) {
  state.ballLocalPos.set(spawn?.x ?? 0, spawn?.z ?? 0);
  state.ballLocalVel.set(0, 0);
  state.lastBallWorldPos = null;
  syncBallWorldPosition(state);
}

export function syncVisualState(
  state: PhysicsState,
  trayGroup: THREE.Group,
  ballMesh?: THREE.Object3D,
  ballPositionOverride?: THREE.Vector3,
) {
  trayGroup.rotation.x = state.currentRotationX;
  trayGroup.rotation.z = state.currentRotationZ;
  trayGroup.rotation.y = 0;
  trayGroup.position.copy(state.planeCenter);

  if (!ballMesh) {
    return;
  }

  const visualBallPosition = ballPositionOverride ?? state.ballPos;
  ballMesh.position.copy(visualBallPosition);

  if (state.lastBallWorldPos) {
    const displacement = visualBallPosition.clone().sub(state.lastBallWorldPos);
    const distance = displacement.length();

    if (distance > 1e-5) {
      const axis = new THREE.Vector3()
        .crossVectors(state.planeNormal, displacement)
        .normalize();
      ballMesh.rotateOnWorldAxis(axis, distance / state.ballRadius);
    }
  }

  state.lastBallWorldPos = visualBallPosition.clone();
}
