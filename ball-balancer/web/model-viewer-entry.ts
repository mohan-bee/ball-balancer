import * as THREE from "three";
import { createViewerScene } from "./model-viewer/scene";
import { createBallMesh, createFloatingBoard } from "./model-viewer/models";
import { createPhysicsState, resetBall, stepPhysics, syncVisualState, updatePhysicsConfig, updateTiltTargets } from "./model-viewer/physics";

const stage = document.getElementById("model-stage");
const status = document.getElementById("model-status");

function setStatus(message: string) {
  if (status) {
    status.textContent = message;
  }
}

if (stage) {
  setStatus("Model: loading...");

  const { scene, camera, renderer, trayGroup, trayShearGroup, ballGroup } = createViewerScene(stage);
  const clock = new THREE.Clock();
  const physics = createPhysicsState();
  const ballMesh = createBallMesh(ballGroup, physics.ballRadius);

  const onTiltState = (event: Event) => {
    const customEvent = event as CustomEvent<{ x: number; z: number }>;
    if (
      typeof customEvent.detail?.x === "number" &&
      typeof customEvent.detail?.z === "number"
    ) {
      updateTiltTargets(physics, customEvent.detail.x, customEvent.detail.z);
    }
  };

  const onPhysicsConfig = (event: Event) => {
    const customEvent = event as CustomEvent<any>;
    updatePhysicsConfig(physics, customEvent.detail);
  };

  const onPhysicsReset = () => {
    resetBall(physics);
  };

  window.addEventListener("tilt-state", onTiltState);
  window.addEventListener("physics-config", onPhysicsConfig);
  window.addEventListener("physics-reset", onPhysicsReset);

  createFloatingBoard(trayShearGroup, setStatus);
  camera.lookAt(0, physics.planeCenter.y, 0);

  const resize = () => {
    const width = stage.clientWidth || 1;
    const height = stage.clientHeight || 1;
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height, false);
  };

  resize();
  const resizeObserver = new ResizeObserver(resize);
  resizeObserver.observe(stage);

  let frame = 0;
  const animate = () => {
    frame = window.requestAnimationFrame(animate);
    const delta = Math.min(clock.getDelta(), 0.05);

    stepPhysics(physics, delta);
    syncVisualState(physics, trayGroup, ballMesh);

    renderer.render(scene, camera);
  };

  animate();

  window.addEventListener("beforeunload", () => {
    window.cancelAnimationFrame(frame);
    resizeObserver.disconnect();
    window.removeEventListener("tilt-state", onTiltState);
    renderer.dispose();
  });
}
