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
    const protocol = location.protocol === "https:" ? "wss:" : "ws:";
    const socket = new WebSocket(protocol + "//" + location.host);
    const handleBeforeUnload = () => {
      socket.close();
    };

    socket.addEventListener("open", () => {
      setPanelState((current) => ({
        ...current,
        status: "Connected",
      }));
      socket.send(JSON.stringify({ type: "viewer" }));
    });

    socket.addEventListener("message", (event) => {
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
      };

      window.dispatchEvent(
        new CustomEvent("tilt-state", {
          detail: {
            x: state.x,
            z: state.z,
          },
        }),
      );

      setPanelState({
        status: "Connected",
        meta: `Last packet: ${JSON.stringify({
          x: state.x,
          z: state.z,
        })}`,
        readout: state.readout,
      });
    });

    socket.addEventListener("close", () => {
      setPanelState((current) => ({
        ...current,
        status: "Disconnected",
      }));
    });

    socket.addEventListener("error", () => {
      setPanelState((current) => ({
        ...current,
        status: "Connection error",
      }));
    });

    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      socket.close();
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
