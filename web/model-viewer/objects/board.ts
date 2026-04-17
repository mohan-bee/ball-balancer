import * as THREE from "three";
import { BOARD_HALF_SIZE, BOARD_THICKNESS } from "./constants";

export type BoardTheme = "v1" | "v2" | "v3";

export type FloatingBoardOptions = {
  withRims?: boolean;
  theme?: BoardTheme;
};

type RimSpec = {
  position: [number, number, number];
  size: [number, number, number];
};

function createBoardRims(): RimSpec[] {
  const rimThickness = 0.28;
  const rimHeight = 1;
  const rimOffset = BOARD_HALF_SIZE - rimThickness * 0.45;

  return [
    {
      position: [0, rimHeight * 0.3, rimOffset],
      size: [BOARD_HALF_SIZE * 2, rimHeight, rimThickness],
    },
    {
      position: [0, rimHeight * 0.3, -rimOffset],
      size: [BOARD_HALF_SIZE * 2, rimHeight, rimThickness],
    },
    {
      position: [rimOffset, rimHeight * 0.3, 0],
      size: [rimThickness, rimHeight, BOARD_HALF_SIZE * 2],
    },
    {
      position: [-rimOffset, rimHeight * 0.3, 0],
      size: [rimThickness, rimHeight, BOARD_HALF_SIZE * 2],
    },
  ];
}

export function createFloatingBoard(
  trayShearGroup: THREE.Group,
  setStatus: (message: string) => void,
  options: FloatingBoardOptions = {},
) {
  const { withRims = true, theme = "v1" } = options;
  const board = new THREE.Group();

  const deckColor =
    theme === "v2" ? 0x2a2a2a : theme === "v3" ? 0x7c3aed : 0x7dd3fc;
  const insetColor =
    theme === "v2" ? 0x3a3a3a : theme === "v3" ? 0xa78bfa : 0xe0f2fe;
  const insetEmissive =
    theme === "v2" ? 0x000000 : theme === "v3" ? 0x4c1d95 : 0x0f766e;
  const insetEmissiveIntensity =
    theme === "v2" ? 0 : theme === "v3" ? 0.2 : 0.18;
  const rimColor =
    theme === "v2" ? 0x0f0f10 : theme === "v3" ? 0x2e1065 : 0x082f49;
  const glowEmissive =
    theme === "v2" ? 0x111111 : theme === "v3" ? 0xa78bfa : 0x38bdf8;
  const glowEmissiveIntensity =
    theme === "v2" ? 0.08 : theme === "v3" ? 0.28 : 0.25;

  const deck = new THREE.Mesh(
    new THREE.BoxGeometry(
      BOARD_HALF_SIZE * 2,
      BOARD_THICKNESS,
      BOARD_HALF_SIZE * 2,
    ),
    new THREE.MeshStandardMaterial({
      color: deckColor,
      metalness: 0.08,
      roughness: theme === "v2" ? 0.55 : theme === "v3" ? 0.35 : 0.28,
    }),
  );
  deck.castShadow = true;
  deck.receiveShadow = true;
  board.add(deck);

  const topInset = new THREE.Mesh(
    new THREE.BoxGeometry(
      BOARD_HALF_SIZE * 1.88,
      BOARD_THICKNESS * 0.3,
      BOARD_HALF_SIZE * 1.88,
    ),
    new THREE.MeshStandardMaterial({
      color: insetColor,
      emissive: insetEmissive,
      emissiveIntensity: insetEmissiveIntensity,
      metalness: 0.05,
      roughness: theme === "v2" ? 0.6 : theme === "v3" ? 0.46 : 0.42,
    }),
  );
  topInset.position.y = BOARD_THICKNESS * 0.34;
  board.add(topInset);

  if (withRims) {
    const rimMaterial = new THREE.MeshStandardMaterial({
      color: rimColor,
      metalness: 0.2,
      roughness: 0.5,
    });

    for (const rim of createBoardRims()) {
      const mesh = new THREE.Mesh(
        new THREE.BoxGeometry(...rim.size),
        rimMaterial,
      );
      mesh.position.set(...rim.position);
      board.add(mesh);
    }
  }

  const undersideGlow = new THREE.Mesh(
    new THREE.CylinderGeometry(
      BOARD_HALF_SIZE * 0.92,
      BOARD_HALF_SIZE * 1.02,
      0.12,
      48,
    ),
    new THREE.MeshStandardMaterial({
      color: 0x0f172a,
      emissive: glowEmissive,
      emissiveIntensity: glowEmissiveIntensity,
      transparent: true,
      opacity: theme === "v2" ? 0.55 : theme === "v3" ? 0.74 : 0.72,
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
