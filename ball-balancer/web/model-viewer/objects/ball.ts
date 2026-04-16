import * as THREE from "three";
import { BALL_RADIUS } from "./constants";

export function createBallMesh(ballGroup: THREE.Group, radius = BALL_RADIUS) {
  const material = new THREE.MeshStandardMaterial({
    color: 0xfb7185,
    emissive: 0x7f1d1d,
    emissiveIntensity: 0.18,
    metalness: 0.22,
    roughness: 0.24,
  });

  const ball = new THREE.Mesh(
    new THREE.SphereGeometry(radius, 48, 48),
    material,
  );
  ball.castShadow = true;
  ball.receiveShadow = true;

  // A stripe and cap make the sphere's rolling motion easy to read at a glance.
  const stripe = new THREE.Mesh(
    new THREE.TorusGeometry(radius * 0.72, radius * 0.08, 16, 72),
    new THREE.MeshStandardMaterial({
      color: 0xffedd5,
      metalness: 0.08,
      roughness: 0.45,
    }),
  );
  stripe.rotation.x = Math.PI / 2;
  ball.add(stripe);

  const cap = new THREE.Mesh(
    new THREE.SphereGeometry(radius * 0.22, 24, 24),
    new THREE.MeshStandardMaterial({
      color: 0xfffbeb,
      metalness: 0.05,
      roughness: 0.34,
    }),
  );
  cap.position.y = radius * 0.78;
  ball.add(cap);

  ballGroup.add(ball);
  return ball;
}
