import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";

export function loadTrayModel(
  loader: GLTFLoader,
  trayShearGroup: THREE.Group,
  camera: THREE.PerspectiveCamera,
  setStatus: (message: string) => void,
  onReady: (details: {
    trayModel: THREE.Object3D;
    trayHalfX: number;
    trayHalfZ: number;
    trayTopY: number;
  }) => void,
) {
  loader.load(
    "/models/scene.glb",
    (gltf) => {
      const trayModel = gltf.scene;
      trayModel.traverse((child) => {
        if (child instanceof THREE.Mesh && Array.isArray(child.material)) {
          child.material.forEach((material) => {
            material.needsUpdate = true;
          });
        }
      });

      const bounds = new THREE.Box3().setFromObject(trayModel);
      const size = bounds.getSize(new THREE.Vector3());
      const center = bounds.getCenter(new THREE.Vector3());
      const largest = Math.max(size.x, size.y, size.z) || 1;
      const baseScale = 7 / largest;

      trayModel.position.sub(center);
      trayModel.scale.set(baseScale * 3, baseScale * 2, baseScale * 3);
      trayModel.rotation.set(0, 0, 0);

      const trayHalfX = size.x * baseScale * 3;
      const trayHalfZ = (size.z * baseScale * 3) / 2;
      const trayTopY = size.y * baseScale + 0.12;

      trayShearGroup.add(trayModel);
      camera.position.set(0, 30, 16);
      camera.lookAt(0, 0, 0);
      setStatus("Model: loaded");
      onReady({
        trayModel,
        trayHalfX,
        trayHalfZ,
        trayTopY,
      });
    },
    undefined,
    (error) => {
      console.error(error);
      setStatus("Model: failed to load");
      const fallback = new THREE.Mesh(
        new THREE.BoxGeometry(1.6, 1.6, 1.6),
        new THREE.MeshStandardMaterial({
          color: 0x7dd3fc,
          metalness: 0.15,
          roughness: 0.8,
        }),
      );
      trayShearGroup.add(fallback);
    },
  );
}

export function loadSphereModel(
  loader: GLTFLoader,
  ballGroup: THREE.Group,
  onReady: (details: {
    sphereModel: THREE.Object3D;
    ballRadius: number;
  }) => void,
  onFallback: (details: {
    sphereModel: THREE.Object3D;
    ballRadius: number;
  }) => void,
) {
  loader.load(
    "/models/sphere.glb",
    (gltf) => {
      const sphereModel = gltf.scene;
      sphereModel.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          child.castShadow = false;
          child.receiveShadow = false;
          if (Array.isArray(child.material)) {
            child.material.forEach((material) => {
              material.needsUpdate = true;
            });
          }
        }
      });

      const bounds = new THREE.Box3().setFromObject(sphereModel);
      const size = bounds.getSize(new THREE.Vector3());
      const center = bounds.getCenter(new THREE.Vector3());
      const largest = Math.max(size.x, size.y, size.z) || 1;
      const sphereScale = (0.92 / largest) * 3;
      const ballRadius = largest * sphereScale * 0.5;

      sphereModel.position.sub(center);
      sphereModel.scale.setScalar(sphereScale);
      sphereModel.rotation.set(0, 0, 0);
      ballGroup.add(sphereModel);
      onReady({
        sphereModel,
        ballRadius,
      });
    },
    undefined,
    () => {
      const fallbackBall = new THREE.Mesh(
        new THREE.SphereGeometry(1.26, 32, 32),
        new THREE.MeshStandardMaterial({
          color: 0xf8fafc,
          emissive: 0x1d4ed8,
          emissiveIntensity: 0.08,
          metalness: 0.15,
          roughness: 0.35,
        }),
      );
      ballGroup.add(fallbackBall);
      onFallback({
        sphereModel: fallbackBall,
        ballRadius: 1.26,
      });
    },
  );
}
