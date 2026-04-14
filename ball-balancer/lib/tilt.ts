export type ClientMessage =
  | {
      type: "viewer";
    }
  | {
      type: "tilt";
      x: number;
      z: number;
    };

export const INITIAL_READOUT = "Waiting for tilt data...";

export type TiltState = {
  type: "state";
  readout: string;
  x: number;
  z: number;
};

export function formatTiltMessage(x: number, z: number): string {
  return `x: ${x.toFixed(2)}\nz: ${z.toFixed(2)}`;
}

export function createTiltState(x: number, z: number): TiltState {
  return {
    type: "state",
    readout: formatTiltMessage(x, z),
    x,
    z,
  };
}

export function createInitialTiltState(): TiltState {
  return {
    type: "state",
    readout: INITIAL_READOUT,
    x: 0,
    z: 0,
  };
}

export function parseClientMessage(rawMessage: string): ClientMessage | null {
  try {
    const parsed = JSON.parse(rawMessage) as Partial<ClientMessage>;

    if (parsed.type === "viewer") {
      return { type: "viewer" };
    }

    if (
      parsed.type === "tilt" &&
      typeof parsed.x === "number" &&
      Number.isFinite(parsed.x) &&
      typeof parsed.z === "number" &&
      Number.isFinite(parsed.z)
    ) {
      return {
        type: "tilt",
        x: parsed.x,
        z: parsed.z,
      };
    }
  } catch {
    return null;
  }

  return null;
}
