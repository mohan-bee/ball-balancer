import type * as THREE from "three";

export function createStatusSetter(status: HTMLElement | null) {
  return (message: string) => {
    if (status) {
      status.textContent = message;
    }
  };
}

export function createResizeHandler(
  stage: HTMLElement,
  camera: THREE.PerspectiveCamera,
  renderer: THREE.WebGLRenderer,
) {
  return () => {
    const width = stage.clientWidth || 1;
    const height = stage.clientHeight || 1;
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height, false);
  };
}
