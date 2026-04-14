import { describe, expect, it } from "bun:test";
import {
  createInitialTiltState,
  createTiltState,
  formatTiltMessage,
  INITIAL_READOUT,
  parseClientMessage,
} from "../lib/tilt";

describe("tilt helpers", () => {
  it("formats the tilt values as plain text", () => {
    expect(formatTiltMessage(1.234, -5.678)).toBe("x: 1.23\nz: -5.68");
  });

  it("parses a tilt message payload", () => {
    expect(parseClientMessage('{"type":"tilt","x":1.5,"z":-0.25}')).toEqual({
      type: "tilt",
      x: 1.5,
      z: -0.25,
    });
  });

  it("keeps the initial readout text available", () => {
    expect(INITIAL_READOUT).toBe("Waiting for tilt data...");
  });

  it("creates a structured tilt state for broadcasting", () => {
    expect(createTiltState(12.5, -3.25)).toEqual({
      type: "state",
      readout: "x: 12.50\nz: -3.25",
      x: 12.5,
      z: -3.25,
    });
  });

  it("creates a default startup state", () => {
    expect(createInitialTiltState()).toEqual({
      type: "state",
      readout: "Waiting for tilt data...",
      x: 0,
      z: 0,
    });
  });
});
