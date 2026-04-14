import * as THREE from "three";

export interface PhysicsState {
  targetRotationX: number;
  targetRotationZ: number;
  ballVelocityX: number;
  ballVelocityZ: number;
  ballVelocityY: number;
  ballRadius: number;
  trayHalfX: number;
  trayHalfZ: number;
  trayTopY: number;
  ballSettled: boolean;
  ballPosition: THREE.Vector3;
}

export function createPhysicsState() {
  return {
    targetRotationX: 0,
    targetRotationZ: 0,
    ballVelocityX: 0,
    ballVelocityZ: 0,
    ballVelocityY: 0,
    ballRadius: 0.42,
    trayHalfX: 2.2,
    trayHalfZ: 1.5,
    trayTopY: 0.65,
    ballSettled: false,
    ballPosition: new THREE.Vector3(0, 3.4, 0),
  };
}

export function updateTiltTargets(
  state: PhysicsState,
  x: number,
  z: number,
) {
  state.targetRotationX = THREE.MathUtils.clamp(x * 0.9, -1.1, 1.1);
  state.targetRotationZ = THREE.MathUtils.clamp(-z * 0.9, -1.1, 1.1);
}

export function integratePhysicsStep(
  state: PhysicsState,
  delta: number,
  trayGroup: THREE.Group,
  sphereModel: THREE.Object3D | null,
) {
  const fixedStep = 1 / 120;
  const gravity = 42;
  const slideAcceleration = 22;
  const linearDamping = 0.992;

  trayGroup.rotation.x = THREE.MathUtils.lerp(trayGroup.rotation.x, state.targetRotationX, 0.12);
  trayGroup.rotation.y = 0;
  trayGroup.rotation.z = THREE.MathUtils.lerp(trayGroup.rotation.z, state.targetRotationZ, 0.12);

  const resolveCollisions = () => {
    const floorY = state.trayTopY + state.ballRadius;
    if (state.ballPosition.y < floorY) {
      state.ballPosition.y = floorY;
      if (state.ballVelocityY < 0) {
        state.ballVelocityY = 0;
      }
      state.ballSettled = true;
    }

    const boundX = state.trayHalfX - state.ballRadius;
    const boundZ = state.trayHalfZ - state.ballRadius;

    if (state.ballPosition.x > boundX) {
      state.ballPosition.x = boundX;
      state.ballVelocityX *= -0.55;
    } else if (state.ballPosition.x < -boundX) {
      state.ballPosition.x = -boundX;
      state.ballVelocityX *= -0.55;
    }

    if (state.ballPosition.z > boundZ) {
      state.ballPosition.z = boundZ;
      state.ballVelocityZ *= -0.55;
    } else if (state.ballPosition.z < -boundZ) {
      state.ballPosition.z = -boundZ;
      state.ballVelocityZ *= -0.55;
    }
  };

  const substeps = Math.max(1, Math.ceil(delta / fixedStep));
  const stepDelta = delta / substeps;

  for (let i = 0; i < substeps; i += 1) {
    if (!state.ballSettled) {
      state.ballVelocityY -= gravity * stepDelta;
      state.ballPosition.y += state.ballVelocityY * stepDelta;
      resolveCollisions();
      continue;
    }

    const tiltAccelX = -slideAcceleration * Math.sin(state.targetRotationZ);
    const tiltAccelZ = slideAcceleration * Math.sin(state.targetRotationX);

    state.ballVelocityX += tiltAccelX * stepDelta;
    state.ballVelocityZ += tiltAccelZ * stepDelta;
    state.ballVelocityX *= linearDamping;
    state.ballVelocityZ *= linearDamping;

    state.ballPosition.x += state.ballVelocityX * stepDelta;
    state.ballPosition.z += state.ballVelocityZ * stepDelta;
    resolveCollisions();
  }

  if (sphereModel) {
    sphereModel.rotation.x -= (state.ballVelocityZ / Math.max(state.ballRadius, 0.001)) * delta * 0.9;
    sphereModel.rotation.z += (state.ballVelocityX / Math.max(state.ballRadius, 0.001)) * delta * 0.9;
  }
}
