import { Bug, ChevronLeft, ChevronRight, Copy, Download, HelpCircle, RefreshCcw, Smartphone } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";

type PanelState = {
  status: string;
  meta: string;
  readout: string;
  roomId: string;
};

function createRoomId() {
  return crypto.randomUUID().replace(/-/g, "").slice(0, 10).toUpperCase();
}

function buildSensorSocketUrl(roomId: string, host: string) {
  const url = new URL(window.location.href);
  url.protocol = location.protocol === "https:" ? "wss:" : "ws:";
  url.host = host;
  url.searchParams.set("room", roomId);
  url.searchParams.set("role", "sensor");
  url.hash = "";
  return url.toString();
}

function buildSocketUrl(roomId: string) {
  const url = new URL(window.location.href);
  url.protocol = location.protocol === "https:" ? "wss:" : "ws:";
  url.searchParams.set("room", roomId);
  url.searchParams.set("role", "viewer");
  url.hash = "";
  return url.toString();
}

function OverlayApp() {
  const [usageOpen, setUsageOpen] = useState(true);
  const [debugOpen, setDebugOpen] = useState(false);
  const [copyLabel, setCopyLabel] = useState("Copy link");
  const [pairingHost, setPairingHost] = useState(() => window.location.host);
  const [physics, setPhysics] = useState({
    gravity: 29.43,
    rotationResponse: 8.5,
    linearDamping: 0.99,
    edgeBounce: 0.6,
    invertX: false,
    invertZ: false,
    invertGravity: false,
    swapAxes: false,
  });

  const updatePhysics = (patch: Partial<typeof physics>) => {
    setPhysics((current) => {
      const next = { ...current, ...patch };
      window.dispatchEvent(new CustomEvent("physics-config", { detail: patch }));
      return next;
    });
  };

  const resetBall = () => {
    window.dispatchEvent(new CustomEvent("physics-reset"));
  };
  const [panelState, setPanelState] = useState<PanelState>(() => {
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
  });

  const sensorSocketUrl = useMemo(
    () => buildSensorSocketUrl(panelState.roomId, pairingHost || window.location.host),
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

        setPanelState((current) => ({
          ...current,
          status: "Connected",
        }));
        socket?.send(JSON.stringify({ type: "viewer" }));
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
          roomId?: string;
          lastRawMessage?: string;
        };

        window.dispatchEvent(
          new CustomEvent("tilt-state", {
            detail: {
              x: state.x,
              z: state.z,
            },
          }),
        );

        setPanelState((current) => ({
          ...current,
          status: "Connected",
          meta: state.lastRawMessage ?? `Last packet: ${JSON.stringify({ x: state.x, z: state.z })}`,
          readout: state.readout,
        }));
      });

      socket.addEventListener("close", () => {
        if (isUnmounted) {
          return;
        }

        setPanelState((current) => ({
          ...current,
          status: "Disconnected",
        }));

        if (reconnectTimeout) {
          window.clearTimeout(reconnectTimeout);
        }

        reconnectTimeout = window.setTimeout(() => {
          connect();
        }, 2000);
      });

      socket.addEventListener("error", () => {
        if (isUnmounted) {
          return;
        }

        setPanelState((current) => ({
          ...current,
          status: "Connection error",
        }));
      });
    };

    const handleBeforeUnload = () => {
      socket?.close();
    };

    connect();
    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      isUnmounted = true;
      if (reconnectTimeout) {
        window.clearTimeout(reconnectTimeout);
      }
      socket?.close();
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [panelState.roomId]);

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
            <span className="panel-title">Pairing</span>
            <button
              className="panel-close"
              type="button"
              aria-label="Collapse pairing panel"
              onClick={() => setUsageOpen(false)}
            >
              <ChevronLeft size={16} strokeWidth={2.5} />
            </button>
          </div>

          <div className="panel-tabs">
            <button
              className={`panel-tab ${!debugOpen ? "active" : ""}`}
              onClick={() => {}}
              type="button"
            >
              Setup
            </button>
          </div>

          <div className="setup-section">
            <div className="setup-step">
              <div className="setup-step-head">
                <div className="setup-step-num">1</div>
                <div className="setup-step-title">Get Transmitter App</div>
                <Smartphone size={14} className="panel-label" style={{ marginLeft: 'auto', opacity: 0.5 }} />
              </div>
              <p className="setup-step-desc">Scan or click to download the Android app to your mobile device.</p>
              <div className="pairing-qr">
                <a
                  href="https://expo.dev/artifacts/eas/sf2KVfkt4MLq2tE2H3T5v9.apk "
                  target="_blank"
                  rel="noreferrer"
                  title="Download Transmitter App"
                >
                  <QRCodeSVG
                    value="https://expo.dev/artifacts/eas/sf2KVfkt4MLq2tE2H3T5v9.apk "
                    size={140}
                    bgColor="#ffffff"
                    fgColor="#0f172a"
                    includeMargin={true}
                  />
                </a>
              </div>
              <a
                className="pairing-copy"
                href="https://expo.dev/artifacts/eas/sf2KVfkt4MLq2tE2H3T5v9.apk "
                target="_blank"
                rel="noreferrer"
              >
                <Download size={14} strokeWidth={2.4} />
                <span>Download .APK</span>
              </a>
            </div>

            <div className="panel-divider" />

            <div className="setup-step">
              <div className="setup-step-head">
                <div className="setup-step-num">2</div>
                <div className="setup-step-title">Connect & Control</div>
              </div>
              <p className="setup-step-desc">Open the app and scan this QR to pair your phone with this room.</p>

              <label className="pairing-field">
                <span className="panel-label">WebSocket host</span>
                <input
                  className="pairing-input"
                  type="text"
                  value={pairingHost}
                  onChange={(event) => setPairingHost(event.target.value)}
                  spellCheck={false}
                  autoCapitalize="off"
                  autoCorrect="off"
                />
              </label>

              <div className="pairing-room">Room {panelState.roomId}</div>
              <div className="pairing-qr">
                <QRCodeSVG
                  value={sensorSocketUrl}
                  size={140}
                  bgColor="#ffffff"
                  fgColor="#0f172a"
                  includeMargin={true}
                />
              </div>
              <div className="pairing-url">{sensorSocketUrl}</div>
              <button
                className="pairing-copy"
                type="button"
                onClick={async () => {
                  await navigator.clipboard.writeText(sensorSocketUrl);
                  setCopyLabel("Copied");
                  window.setTimeout(() => setCopyLabel("Copy link"), 1200);
                }}
              >
                <Copy size={14} strokeWidth={2.4} />
                <span>{copyLabel}</span>
              </button>
            </div>
          </div>

          <ul className="panel-list">
            <li>The transmitter app uses your phone's tilt sensors.</li>
            <li>If your phone cannot connect, ensure both are on the same WiFi.</li>
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

          <div className="panel-divider" />

          <div className="panel-row panel-stack">
            <div className="panel-label-row">
              <span className="panel-label">Gravity</span>
              <span className="panel-value">{physics.gravity.toFixed(1)}</span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              step="0.1"
              value={physics.gravity}
              onChange={(e) => updatePhysics({ gravity: parseFloat(e.target.value) })}
            />
          </div>

          <div className="panel-row panel-stack">
            <div className="panel-label-row">
              <span className="panel-label">Response</span>
              <span className="panel-value">{physics.rotationResponse.toFixed(1)}</span>
            </div>
            <input
              type="range"
              min="1"
              max="30"
              step="0.5"
              value={physics.rotationResponse}
              onChange={(e) => updatePhysics({ rotationResponse: parseFloat(e.target.value) })}
            />
          </div>

          <div className="panel-row panel-stack">
            <div className="panel-label-row">
              <span className="panel-label">Damping</span>
              <span className="panel-value">{physics.linearDamping.toFixed(3)}</span>
            </div>
            <input
              type="range"
              min="0.8"
              max="1"
              step="0.001"
              value={physics.linearDamping}
              onChange={(e) => updatePhysics({ linearDamping: parseFloat(e.target.value) })}
            />
          </div>

          <div className="panel-row panel-stack">
            <div className="panel-label-row">
              <span className="panel-label">Bounciness</span>
              <span className="panel-value">{physics.edgeBounce.toFixed(2)}</span>
            </div>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={physics.edgeBounce}
              onChange={(e) => updatePhysics({ edgeBounce: parseFloat(e.target.value) })}
            />
          </div>

          <div className="panel-row">
            <label className="panel-toggle-row">
              <span className="panel-label">Invert horizontal</span>
              <input
                type="checkbox"
                className="panel-checkbox"
                checked={physics.invertX}
                onChange={(e) => updatePhysics({ invertX: e.target.checked })}
              />
            </label>
          </div>

          <div className="panel-row">
            <label className="panel-toggle-row">
              <span className="panel-label">Invert vertical</span>
              <input
                type="checkbox"
                className="panel-checkbox"
                checked={physics.invertZ}
                onChange={(e) => updatePhysics({ invertZ: e.target.checked })}
              />
            </label>
          </div>

          <div className="panel-row">
            <label className="panel-toggle-row">
              <span className="panel-label">Invert gravity</span>
              <input
                type="checkbox"
                className="panel-checkbox"
                checked={physics.invertGravity}
                onChange={(e) => updatePhysics({ invertGravity: e.target.checked })}
              />
            </label>
          </div>

          <div className="panel-row">
            <label className="panel-toggle-row">
              <span className="panel-label">Swap directions</span>
              <input
                type="checkbox"
                className="panel-checkbox"
                checked={physics.swapAxes}
                onChange={(e) => updatePhysics({ swapAxes: e.target.checked })}
              />
            </label>
          </div>

          <button className="panel-action-btn" type="button" onClick={resetBall}>
            <RefreshCcw size={14} />
            <span>Reset sphere</span>
          </button>
        </div>
      </section>
    </main>
  );
}

const root = document.getElementById("overlay-root");

if (root) {
  createRoot(root).render(<OverlayApp />);
}
