export type PanelState = {
  status: string;
  meta: string;
  readout: string;
  roomId: string;
};

export type ViewerVersion = "v1" | "v2" | "v3";

export type PhysicsUiConfig = {
  gravity: number;
  rotationResponse: number;
  linearDamping: number;
  edgeBounce: number;
  invertX: boolean;
  invertZ: boolean;
  invertGravity: boolean;
  swapAxes: boolean;
};

export type ViewerOption = {
  id: ViewerVersion;
  name: string;
  summary: string;
};
