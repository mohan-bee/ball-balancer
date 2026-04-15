import * as THREE from "three";

export const BOARD_HALF_SIZE = 4.5;
export const BOARD_THICKNESS = 0.34;
export const BALL_RADIUS = 0.52;

export function createFloatingBoard(
  trayShearGroup: THREE.Group,
  setStatus: (message: string) => void,
) {
  const board = new THREE.Group();

  const deck = new THREE.Mesh(
    new THREE.BoxGeometry(BOARD_HALF_SIZE * 2, BOARD_THICKNESS, BOARD_HALF_SIZE * 2),
    new THREE.MeshStandardMaterial({
      color: 0x7dd3fc,
      metalness: 0.08,
      roughness: 0.28,
    }),
  );
  deck.castShadow = true;
  deck.receiveShadow = true;
  board.add(deck);

  const topInset = new THREE.Mesh(
    new THREE.BoxGeometry(BOARD_HALF_SIZE * 1.88, BOARD_THICKNESS * 0.3, BOARD_HALF_SIZE * 1.88),
    new THREE.MeshStandardMaterial({
      color: 0xe0f2fe,
      emissive: 0x0f766e,
      emissiveIntensity: 0.18,
      metalness: 0.05,
      roughness: 0.42,
    }),
  );
  topInset.position.y = BOARD_THICKNESS * 0.34;
  board.add(topInset);

  const rimMaterial = new THREE.MeshStandardMaterial({
    color: 0x082f49,
    metalness: 0.2,
    roughness: 0.38,
  });

  const rimThickness = 0.28;
  const rimHeight = 0.4;
  const rimOffset = BOARD_HALF_SIZE - rimThickness * 0.45;

  const rims = [
    { position: [0, rimHeight * 0.3, rimOffset], size: [BOARD_HALF_SIZE * 2, rimHeight, rimThickness] },
    { position: [0, rimHeight * 0.3, -rimOffset], size: [BOARD_HALF_SIZE * 2, rimHeight, rimThickness] },
    { position: [rimOffset, rimHeight * 0.3, 0], size: [rimThickness, rimHeight, BOARD_HALF_SIZE * 2] },
    { position: [-rimOffset, rimHeight * 0.3, 0], size: [rimThickness, rimHeight, BOARD_HALF_SIZE * 2] },
  ] as const;

  for (const rim of rims) {
    const mesh = new THREE.Mesh(
      new THREE.BoxGeometry(...rim.size),
      rimMaterial,
    );
    mesh.position.set(...rim.position);
    board.add(mesh);
  }

  const undersideGlow = new THREE.Mesh(
    new THREE.CylinderGeometry(BOARD_HALF_SIZE * 0.92, BOARD_HALF_SIZE * 1.02, 0.12, 48),
    new THREE.MeshStandardMaterial({
      color: 0x0f172a,
      emissive: 0x38bdf8,
      emissiveIntensity: 0.25,
      transparent: true,
      opacity: 0.72,
      metalness: 0.1,
      roughness: 0.62,
    }),
  );
  undersideGlow.position.y = -(BOARD_THICKNESS * 0.8);
  board.add(undersideGlow);

  trayShearGroup.add(board);
  setStatus("Model: floating board ready");

  return board;
}

export function createBallMesh(ballGroup: THREE.Group, radius = BALL_RADIUS) {
  const material = new THREE.MeshStandardMaterial({
    color: 0xfb7185,
    emissive: 0x7f1d1d,
    emissiveIntensity: 0.18,
    metalness: 0.22,
    roughness: 0.24,
  });

  const ball = new THREE.Mesh(new THREE.SphereGeometry(radius, 48, 48), material);
  ball.castShadow = true;
  ball.receiveShadow = true;

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
