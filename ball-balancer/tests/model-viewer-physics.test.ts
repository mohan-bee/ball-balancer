import { describe, expect, it } from "bun:test";
import * as THREE from "three";
import {
  createPhysicsState,
  integratePhysicsStep,
  updateTiltTargets,
} from "../web/model-viewer/physics";

describe("model viewer physics", () => {
  it("creates the default physics state", () => {
    expect(createPhysicsState()).toEqual({
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
      ballPosition: expect.any(THREE.Vector3),
    });
  });

  it("maps gyro tilt to clamped tray rotation", () => {
    const state = createPhysicsState();

    updateTiltTargets(state, 2, -2);

    expect(state.targetRotationX).toBeCloseTo(1.1, 5);
    expect(state.targetRotationZ).toBeCloseTo(1.1, 5);
  });

  it("settles the ball on the tray floor before applying roll physics", () => {
    const state = createPhysicsState();
    const trayGroup = new THREE.Group();
    const sphereModel = new THREE.Object3D();

    state.ballPosition.set(0, 0, 0);
    state.ballVelocityY = -3;
    state.trayTopY = 2;
    state.ballRadius = 0.5;

    integratePhysicsStep(state, 1 / 60, trayGroup, sphereModel);

    expect(state.ballSettled).toBe(true);
    expect(state.ballPosition.y).toBeCloseTo(2.5, 5);
    expect(state.ballVelocityY).toBe(0);
  });

  it("clamps the ball to the tray edge when it reaches the boundary", () => {
    const state = createPhysicsState();
    const trayGroup = new THREE.Group();
    const sphereModel = new THREE.Object3D();

    state.ballSettled = true;
    state.ballRadius = 0.5;
    state.trayHalfX = 4;
    state.trayHalfZ = 4;
    state.trayTopY = 1;
    state.ballPosition.set(5, 1.5, 0);
    state.ballVelocityX = 0;
    state.targetRotationX = 0.75;

    integratePhysicsStep(state, 1 / 60, trayGroup, sphereModel);

    expect(state.ballPosition.x).toBeCloseTo(3.5, 5);
    expect(Math.abs(state.ballVelocityX)).toBe(0);
    expect(trayGroup.rotation.x).toBeGreaterThan(0);
  });
});
