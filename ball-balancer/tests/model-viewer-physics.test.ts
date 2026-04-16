import { describe, expect, it } from "bun:test";
import * as THREE from "three";
import {
  createPhysicsState,
  getBoardLimit,
  hasBallLeftBoard,
  stepPhysics,
  syncVisualState,
  updateTiltTargets,
} from "../web/model-viewer/physics";

describe("model viewer physics", () => {
  it("creates the default physics state", () => {
    const state = createPhysicsState();

    expect(state.targetRotationX).toBe(0);
    expect(state.targetRotationZ).toBe(0);
  });

  it("maps gyro tilt to tray rotation", () => {
    const state = createPhysicsState();

    updateTiltTargets(state, 2, -2);

    expect(state.targetRotationX).toBeCloseTo(-0.95, 5);
    expect(state.targetRotationZ).toBeCloseTo(0.95, 5);
  });

  it("syncs tray rotation back into the three group", () => {
    const state = createPhysicsState();
    const trayGroup = new THREE.Group();

    updateTiltTargets(state, 0.5, 0.25);
    stepPhysics(state, 1 / 60);
    syncVisualState(state, trayGroup);

    expect(trayGroup.rotation.x).toBeGreaterThan(0);
    expect(trayGroup.rotation.z).toBeGreaterThan(0);
  });

  it("moves the sphere along the tilted plane while staying above it", () => {
    const state = createPhysicsState();

    updateTiltTargets(state, 0.8, 0);

    for (let index = 0; index < 60; index += 1) {
      stepPhysics(state, 1 / 60);
    }

    const centerToBall = state.ballPos.clone().sub(state.planeCenter);

    expect(Math.abs(state.ballLocalPos.x)).toBeGreaterThan(0.2);
    expect(centerToBall.dot(state.planeNormal)).toBeCloseTo(
      state.ballRadius,
      5,
    );
    expect(state.ballVel.length()).toBeGreaterThan(0.1);
  });

  it("lets the sphere leave the board when bounds are disabled", () => {
    const state = createPhysicsState();

    updateTiltTargets(state, 1.2, 0);

    for (let index = 0; index < 220; index += 1) {
      stepPhysics(state, 1 / 60, { enforceBounds: false });
    }

    expect(Math.abs(state.ballLocalPos.x)).toBeGreaterThan(
      getBoardLimit(state.ballRadius),
    );
    expect(hasBallLeftBoard(state)).toBe(true);
  });
});
