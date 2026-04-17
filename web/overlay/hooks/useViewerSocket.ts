import { useEffect, useMemo, useState } from "react";
import type { PanelState } from "../types";
import { buildSensorSocketUrl, buildSocketUrl, createRoomId } from "../url";

function createInitialPanelState(): PanelState {
  const url = new URL(window.location.href);
  let roomId = url.searchParams.get("room");

  if (!roomId) {
    roomId = createRoomId();
    url.searchParams.set("room", roomId);
    url.searchParams.set("role", "viewer");
    window.history.replaceState({}, "", url.toString());
  }

  return {
    status: "Connecting",
    meta: "Waiting for transmitter...",
    readout: "Waiting for tilt data...",
    roomId,
  };
}

export function useViewerSocket(pairingHost: string) {
  const [panelState, setPanelState] = useState<PanelState>(
    createInitialPanelState,
  );

  const sensorSocketUrl = useMemo(
    () =>
      buildSensorSocketUrl(
        panelState.roomId,
        pairingHost || window.location.host,
      ),
    [pairingHost, panelState.roomId],
  );

  useEffect(() => {
    let socket: WebSocket | null = null;
    let reconnectTimeout: ReturnType<typeof window.setTimeout> | null = null;
    let isUnmounted = false;

    const connect = () => {
      if (isUnmounted) {
        return;
      }

      socket = new WebSocket(buildSocketUrl(panelState.roomId));

      socket.addEventListener("open", () => {
        if (isUnmounted) {
          socket?.close();
          return;
        }

        setPanelState((current) => ({ ...current, status: "Connected" }));
      });

      socket.addEventListener("message", (event) => {
        let payload: any;

        try {
          payload = JSON.parse(String(event.data));
        } catch {
          return;
        }

        if (payload?.type !== "state") {
          return;
        }

        window.dispatchEvent(
          new CustomEvent("tilt-state", {
            detail: { x: payload.x, z: payload.z },
          }),
        );

        setPanelState((current) => ({
          ...current,
          status: "Connected",
          meta:
            payload.lastRawMessage ??
            `Last packet: ${JSON.stringify({ x: payload.x, z: payload.z })}`,
          readout: payload.readout,
        }));
      });

      socket.addEventListener("close", () => {
        if (isUnmounted) {
          return;
        }

        setPanelState((current) => ({ ...current, status: "Disconnected" }));
        reconnectTimeout = window.setTimeout(connect, 2000);
      });
    };

    connect();

    return () => {
      isUnmounted = true;

      if (reconnectTimeout) {
        window.clearTimeout(reconnectTimeout);
      }

      socket?.close();
    };
  }, [panelState.roomId]);

  return {
    panelState,
    sensorSocketUrl,
  };
}
