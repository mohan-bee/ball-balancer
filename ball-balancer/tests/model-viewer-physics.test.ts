import { describe, expect, it } from "bun:test";
import * as THREE from "three";
import {
  createPhysicsState,
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

    expect(state.ballLocalPos.x).toBeGreaterThan(0.2);
    expect(state.ballPos.y).toBeGreaterThan(state.planeCenter.y);
    expect(state.ballVel.length()).toBeGreaterThan(0.1);
  });
});
