import * as THREE from "three";
import { createViewerScene } from "../scene";
import {
  createBallMesh,
  createFloatingBoard,
  createPathTrack,
} from "../models";
import {
  createPhysicsState,
  hasBallLeftBoard,
  resetBall,
  stepPhysics,
  stepTrayRotation,
  syncVisualState,
  updatePhysicsConfig,
  updateTiltTargets,
} from "../physics";
import { createResizeHandler, createStatusSetter } from "./dom";
import {
  beginBallFall,
  createFallingState,
  resetAfterFall,
  shouldRespawn,
  stepFallingBall,
} from "./fall";
import { dispatchViewerNotice } from "./notices";
import type { TiltDetail, ViewerVersion } from "./types";

export function mountModelViewer(
  stage: HTMLElement,
  status: HTMLElement | null,
  version: ViewerVersion = "v1",
) {
  const setStatus = createStatusSetter(status);
  setStatus(`Model: ${version.toUpperCase()} loading...`);
  dispatchViewerNotice(`${version.toUpperCase()} loading...`);

  const {
    scene,
    camera,
    cameraTarget,
    renderer,
    trayGroup,
    trayShearGroup,
    ballGroup,
  } = createViewerScene(stage);
  const clock = new THREE.Clock();
  const physics = createPhysicsState();
  const ballMesh = createBallMesh(ballGroup, physics.ballRadius);
  const fallingState = createFallingState();

  // Centralized per-version behavior.
  const viewerConfig = (() => {
    if (version === "v3") {
      return {
        enforceBounds: false,
        cameraFollow: true,
        board: "path" as const,
      };
    }

    return {
      enforceBounds: version === "v1",
      cameraFollow: false,
      board: "floating" as const,
    };
  })();

  const pathTrack =
    viewerConfig.board === "path"
      ? createPathTrack(trayShearGroup, setStatus, {
          length: 18,
          width: 2.6,
          tileSize: 0.85,
        })
      : null;

  if (viewerConfig.board === "floating") {
    createFloatingBoard(trayShearGroup, setStatus, {
      withRims: version === "v1",
      theme: version,
    });
  }

  // Spawn/respawn rules.
  const spawn = pathTrack?.spawn ?? { x: 0, z: 0 };
  resetBall(physics, spawn);

  // Camera framing.
  if (viewerConfig.cameraFollow) {
    camera.position.set(0, 14, 12);
  } else {
    camera.position.set(0, 30, 16);
  }
  cameraTarget.set(0, physics.planeCenter.y, 0);
  camera.lookAt(cameraTarget);

  const onTiltState = (event: Event) => {
    const customEvent = event as CustomEvent<TiltDetail>;

    if (
      typeof customEvent.detail?.x === "number" &&
      typeof customEvent.detail?.z === "number"
    ) {
      updateTiltTargets(physics, customEvent.detail.x, customEvent.detail.z);
    }
  };

  const onPhysicsConfig = (event: Event) => {
    const customEvent = event as CustomEvent<Record<string, unknown>>;
    updatePhysicsConfig(physics, customEvent.detail ?? {});
  };

  const onPhysicsReset = () => {
    resetAfterFall(fallingState);
    resetBall(physics, spawn);
    dispatchViewerNotice(`${version.toUpperCase()} sphere reset.`);
  };

  window.addEventListener("tilt-state", onTiltState);
  window.addEventListener("physics-config", onPhysicsConfig);
  window.addEventListener("physics-reset", onPhysicsReset);

  const resize = createResizeHandler(stage, camera, renderer);
  resize();

  const resizeObserver = new ResizeObserver(resize);
  resizeObserver.observe(stage);

  let frame = 0;
  let hasRenderedOnce = false;

  const cameraPos = camera.position.clone();

  const stepCameraFollow = (delta: number) => {
    if (!viewerConfig.cameraFollow) {
      return;
    }

    // Follow the ball smoothly without changing the overall vibe of the scene.
    const desiredTarget = (
      fallingState.active ? fallingState.position : physics.ballPos
    ).clone();
    desiredTarget.y = physics.planeCenter.y;

    const blend = 1 - Math.exp(-5.5 * delta);
    cameraTarget.lerp(desiredTarget, blend);

    const desiredPos = cameraTarget
      .clone()
      .add(new THREE.Vector3(0, 11.5, 10.5));

    cameraPos.lerp(desiredPos, blend);
    camera.position.copy(cameraPos);
    camera.lookAt(cameraTarget);
  };

  const animate = () => {
    frame = window.requestAnimationFrame(animate);
    const delta = Math.min(clock.getDelta(), 0.05);

    if (fallingState.active) {
      stepTrayRotation(physics, delta);
      stepFallingBall(fallingState, delta);

      if (shouldRespawn(fallingState, delta)) {
        resetAfterFall(fallingState);
        resetBall(physics, spawn);
        dispatchViewerNotice("Ball respawned.");
      }

      syncVisualState(physics, trayGroup, ballMesh, fallingState.position);
    } else {
      stepPhysics(physics, delta, {
        enforceBounds: viewerConfig.enforceBounds,
      });

      if (version === "v3") {
        const bounds = pathTrack?.bounds;
        if (bounds) {
          const x = physics.ballLocalPos.x;
          const z = physics.ballLocalPos.y;

          // Custom fall: leave the strip bounds.
          if (
            x < bounds.minX ||
            x > bounds.maxX ||
            z < bounds.minZ ||
            z > bounds.maxZ
          ) {
            beginBallFall(fallingState, physics.ballPos, physics.ballVel);
          }
        }
      } else {
        // V2 (and any future rimless floating board): fall once it fully leaves.
        if (!viewerConfig.enforceBounds && hasBallLeftBoard(physics)) {
          beginBallFall(fallingState, physics.ballPos, physics.ballVel);
        }
      }

      syncVisualState(physics, trayGroup, ballMesh);
    }

    stepCameraFollow(delta);

    renderer.render(scene, camera);

    if (!hasRenderedOnce) {
      hasRenderedOnce = true;
      dispatchViewerNotice(`${version.toUpperCase()} ready.`);
    }
  };

  animate();

  return () => {
    window.cancelAnimationFrame(frame);
    resizeObserver.disconnect();
    window.removeEventListener("tilt-state", onTiltState);
    window.removeEventListener("physics-config", onPhysicsConfig);
    window.removeEventListener("physics-reset", onPhysicsReset);
    // Ensure we don't stack canvases when switching versions.
    if (renderer.domElement.parentElement === stage) {
      stage.removeChild(renderer.domElement);
    }
    renderer.dispose();
  };
}
