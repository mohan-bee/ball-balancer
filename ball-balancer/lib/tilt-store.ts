import { Redis } from "@upstash/redis";
import { createInitialTiltState, formatTiltMessage, type TiltState } from "./tilt";

export type TiltSnapshot = TiltState & {
  lastRawMessage: string;
  updatedAt: number;
};

const STORAGE_KEY = "ball-balancer:tilt";
const memoryState: { current: TiltSnapshot } = {
  current: {
    ...createInitialTiltState(),
    lastRawMessage: "No sensor packet received yet.",
    updatedAt: Date.now(),
  },
};

const redis =
  process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
    ? Redis.fromEnv()
    : null;

export async function readTiltSnapshot(): Promise<TiltSnapshot> {
  if (redis) {
    const stored = await redis.get<TiltSnapshot>(STORAGE_KEY);
    if (stored) {
      return stored;
    }
  }

  return memoryState.current;
}

export async function writeTiltSnapshot(x: number, z: number, rawMessage?: string) {
  const snapshot: TiltSnapshot = {
    type: "state",
    readout: formatTiltMessage(x, z),
    x,
    z,
    lastRawMessage: rawMessage ?? formatTiltMessage(x, z),
    updatedAt: Date.now(),
  };

  memoryState.current = snapshot;

  if (redis) {
    await redis.set(STORAGE_KEY, snapshot);
  }

  return snapshot;
}
