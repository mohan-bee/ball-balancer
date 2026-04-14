import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { createViewerScene } from "./model-viewer/scene";
import { loadSphereModel, loadTrayModel } from "./model-viewer/models";
import {
  createPhysicsState,
  integratePhysicsStep,
  updateTiltTargets,
} from "./model-viewer/physics";

const stage = document.getElementById("model-stage");
const status = document.getElementById("model-status");

function setStatus(message: string) {
  if (status) {
    status.textContent = message;
  }
}

if (stage) {
  setStatus("Model: loading...");

  const { scene, camera, renderer, trayGroup, trayShearGroup, ballGroup } =
    createViewerScene(stage);
  const loader = new GLTFLoader();
  const clock = new THREE.Clock();
  const physics = createPhysicsState();
  let sphereModel: THREE.Object3D | null = null;

  const onTiltState = (event: Event) => {
    const customEvent = event as CustomEvent<{ x: number; z: number }>;
    if (
      typeof customEvent.detail?.x === "number" &&
      typeof customEvent.detail?.z === "number"
    ) {
      updateTiltTargets(physics, customEvent.detail.x, customEvent.detail.z);
    }
  };

  window.addEventListener("tilt-state", onTiltState);

  loadTrayModel(loader, trayShearGroup, camera, setStatus, ({
    trayHalfX,
    trayHalfZ,
    trayTopY,
  }) => {
    physics.trayHalfX = trayHalfX;
    physics.trayHalfZ = trayHalfZ;
    physics.trayTopY = trayTopY;
  });

  loadSphereModel(
    loader,
    ballGroup,
    ({ sphereModel: model, ballRadius }) => {
      sphereModel = model;
      physics.ballRadius = ballRadius;
      ballGroup.position.set(0, physics.trayTopY + ballRadius * 2.2, 0);
    },
    ({ sphereModel: fallbackModel, ballRadius }) => {
      sphereModel = fallbackModel;
      physics.ballRadius = ballRadius;
      ballGroup.position.set(0, physics.trayTopY + ballRadius * 2.2, 0);
    },
  );

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

    integratePhysicsStep(physics, delta, trayGroup, sphereModel);
    ballGroup.position.set(
      physics.ballPosition.x,
      physics.ballPosition.y,
      physics.ballPosition.z,
    );

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
