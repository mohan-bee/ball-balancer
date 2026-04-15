import * as THREE from "three";

export function createViewerScene(stage: HTMLElement) {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x060a12);

  const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 100);
  camera.position.set(0, 30, 16);
  camera.up.set(0, 0, -1);

  const renderer = new THREE.WebGLRenderer({
    antialias: true,
    alpha: true,
    powerPreference: "high-performance",
  });
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  stage.appendChild(renderer.domElement);

  const trayGroup = new THREE.Group();
  trayGroup.rotation.set(0, 0, 0);
  trayGroup.position.y = 1.4;
  scene.add(trayGroup);

  const trayShearGroup = new THREE.Group();
  trayShearGroup.matrixAutoUpdate = false;
  trayShearGroup.matrix.set(
    1,
    0.08,
    0,
    0,
    0.05,
    1,
    0,
    0,
    0,
    0,
    1,
    0,
    0,
    0,
    0,
    1,
  );
  trayGroup.add(trayShearGroup);

  const ambient = new THREE.AmbientLight(0xffffff, 1.7);
  scene.add(ambient);

  const keyLight = new THREE.DirectionalLight(0xffffff, 3.6);
  keyLight.position.set(6, 10, 8);
  scene.add(keyLight);

  const fillLight = new THREE.DirectionalLight(0xffffff, 1.35);
  fillLight.position.set(-7, 4, 7);
  scene.add(fillLight);

  const topLight = new THREE.SpotLight(0xffffff, 2.8, 100, Math.PI / 5, 0.45, 1);
  topLight.position.set(0, 18, 8);
  topLight.target.position.set(0, 0, 0);
  scene.add(topLight);
  scene.add(topLight.target);

  const groundShadow = new THREE.Mesh(
    new THREE.CircleGeometry(8.8, 48),
    new THREE.MeshBasicMaterial({
      color: 0x02040a,
      transparent: true,
      opacity: 0.28,
      depthWrite: false,
    }),
  );
  groundShadow.rotation.x = -Math.PI / 2;
  groundShadow.position.y = -1.55;
  scene.add(groundShadow);

  const ballGroup = new THREE.Group();
  scene.add(ballGroup);

  return {
    scene,
    camera,
    renderer,
    trayGroup,
    trayShearGroup,
    ballGroup,
  };
}
