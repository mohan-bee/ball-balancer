import { Bug, ChevronLeft, ChevronRight, HelpCircle } from "lucide-react";
import { createRoot } from "react-dom/client";
import { useEffect, useState } from "react";

type PanelState = {
  status: string;
  meta: string;
  readout: string;
};

function OverlayApp() {
  const [usageOpen, setUsageOpen] = useState(false);
  const [debugOpen, setDebugOpen] = useState(false);
  const [panelState, setPanelState] = useState<PanelState>({
    status: "Connecting",
    meta: "Waiting",
    readout: "Waiting for tilt data...",
  });

  useEffect(() => {
    let socket: WebSocket | null = null;
    let pollingTimer: ReturnType<typeof window.setInterval> | null = null;
    let fallbackTimer: ReturnType<typeof window.setTimeout> | null = null;
    let didReceiveSocketMessage = false;
    let didUseSocket = false;

    const applyState = (state: {
      x: number;
      z: number;
      readout: string;
      lastRawMessage?: string;
    }) => {
      window.dispatchEvent(
        new CustomEvent("tilt-state", {
          detail: {
            x: state.x,
            z: state.z,
          },
        }),
      );

      setPanelState({
        status: didUseSocket ? "Connected" : "Polling",
        meta: `Last packet: ${state.lastRawMessage ?? JSON.stringify({
          x: state.x,
          z: state.z,
        })}`,
        readout: state.readout,
      });
    };

    const stopPolling = () => {
      if (pollingTimer !== null) {
        window.clearInterval(pollingTimer);
        pollingTimer = null;
      }
    };

    const startPolling = () => {
      if (pollingTimer !== null) {
        return;
      }

      const poll = async () => {
        try {
          const response = await fetch("/api/state");
          if (!response.ok) {
            return;
          }

          const state = (await response.json()) as {
            type?: string;
            x?: number;
            z?: number;
            readout?: string;
            lastRawMessage?: string;
          };

          if (
            state.type !== "state" ||
            typeof state.x !== "number" ||
            typeof state.z !== "number" ||
            typeof state.readout !== "string"
          ) {
            return;
          }

          applyState({
            x: state.x,
            z: state.z,
            readout: state.readout,
            lastRawMessage: state.lastRawMessage,
          });
        } catch {
          // Keep retrying; the overlay stays usable even if the backend is warming up.
        }
      };

      void poll();
      pollingTimer = window.setInterval(poll, 250);
    };

    const protocol = location.protocol === "https:" ? "wss:" : "ws:";
    socket = new WebSocket(protocol + "//" + location.host);

    fallbackTimer = window.setTimeout(() => {
      if (!didReceiveSocketMessage) {
        setPanelState((current) => ({
          ...current,
          status: "Polling",
        }));
        startPolling();
      }
    }, 750);

    socket.addEventListener("open", () => {
      didUseSocket = true;
      setPanelState((current) => ({
        ...current,
        status: "Connected",
      }));

      try {
        socket?.send(JSON.stringify({ type: "viewer" }));
      } catch {
        startPolling();
      }
    });

    socket.addEventListener("message", (event) => {
      didReceiveSocketMessage = true;
      if (fallbackTimer !== null) {
        window.clearTimeout(fallbackTimer);
        fallbackTimer = null;
      }

      let payload: unknown;

      try {
        payload = JSON.parse(String(event.data));
      } catch {
        return;
      }

      if (
        !payload ||
        typeof payload !== "object" ||
        !("type" in payload) ||
        (payload as { type?: string }).type !== "state"
      ) {
        return;
      }

      const state = payload as {
        x: number;
        z: number;
        readout: string;
        lastRawMessage?: string;
      };

      applyState(state);
      stopPolling();
    });

    socket.addEventListener("close", () => {
      if (!didReceiveSocketMessage) {
        startPolling();
      }
      setPanelState((current) => ({
        ...current,
        status: didUseSocket ? "Disconnected" : "Polling",
      }));
    });

    socket.addEventListener("error", () => {
      startPolling();
      setPanelState((current) => ({
        ...current,
        status: "Polling",
      }));
    });

    const handleBeforeUnload = () => {
      stopPolling();
      socket?.close();
    };

    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      if (fallbackTimer !== null) {
        window.clearTimeout(fallbackTimer);
      }
      stopPolling();
      socket?.close();
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, []);

  return (
    <main className="overlay-root">
      <section className="panel panel-left">
        <button
          className="panel-toggle"
          type="button"
          aria-expanded={usageOpen}
          aria-controls="usage-panel"
          onClick={() => setUsageOpen((value) => !value)}
        >
          <HelpCircle size={16} strokeWidth={2.25} />
        </button>

        <div id="usage-panel" className="panel-card" hidden={!usageOpen}>
          <div className="panel-head">
            <span className="panel-title">Usage</span>
            <button
              className="panel-close"
              type="button"
              aria-label="Collapse usage panel"
              onClick={() => setUsageOpen(false)}
            >
              <ChevronLeft size={16} strokeWidth={2.5} />
            </button>
          </div>

          <ul className="panel-list">
            <li>Move the device to tilt the tray.</li>
            <li>Use the debug icon on the right for live packets.</li>
            <li>The ball follows gyro x and z only.</li>
          </ul>
        </div>
      </section>

      <section className="panel panel-right">
        <button
          className="panel-toggle"
          type="button"
          aria-expanded={debugOpen}
          aria-controls="debug-panel"
          onClick={() => setDebugOpen((value) => !value)}
        >
          <Bug size={16} strokeWidth={2.25} />
        </button>

        <div id="debug-panel" className="panel-card" hidden={!debugOpen}>
          <div className="panel-head">
            <span className="panel-title">Debug</span>
            <button
              className="panel-close"
              type="button"
              aria-label="Collapse debug panel"
              onClick={() => setDebugOpen(false)}
            >
              <ChevronRight size={16} strokeWidth={2.5} />
            </button>
          </div>

          <div className="panel-row">
            <span className="panel-label">Status</span>
            <span className="panel-value" id="status">
              {panelState.status}
            </span>
          </div>
          <div className="panel-row">
            <span className="panel-label">Packet</span>
            <span className="panel-value" id="meta">
              {panelState.meta}
            </span>
          </div>
          <div className="panel-row panel-stack">
            <span className="panel-label">Readout</span>
            <pre id="readout">{panelState.readout}</pre>
          </div>
          <div className="panel-row">
            <span className="panel-label">Model</span>
            <span className="panel-value" id="model-status">
              Loading
            </span>
          </div>
        </div>
      </section>
    </main>
  );
}

const root = document.getElementById("overlay-root");

if (root) {
  createRoot(root).render(<OverlayApp />);
}
