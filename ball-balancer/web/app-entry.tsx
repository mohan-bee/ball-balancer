import { Bug, ChevronLeft, ChevronRight, Copy, Download, HelpCircle, RefreshCcw, Smartphone, Link } from "lucide-react";
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
  const [setupOpen, setSetupOpen] = useState(true);
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
      if (isUnmounted) return;
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
        try { payload = JSON.parse(String(event.data)); } catch { return; }
        if (payload?.type !== "state") return;

        window.dispatchEvent(new CustomEvent("tilt-state", {
          detail: { x: payload.x, z: payload.z },
        }));

        setPanelState((current) => ({
          ...current,
          status: "Connected",
          meta: payload.lastRawMessage ?? `Last packet: ${JSON.stringify({ x: payload.x, z: payload.z })}`,
          readout: payload.readout,
        }));
      });

      socket.addEventListener("close", () => {
        if (isUnmounted) return;
        setPanelState((current) => ({ ...current, status: "Disconnected" }));
        reconnectTimeout = window.setTimeout(connect, 2000);
      });
    };

    connect();
    return () => {
      isUnmounted = true;
      if (reconnectTimeout) window.clearTimeout(reconnectTimeout);
      socket?.close();
    };
  }, [panelState.roomId]);

  return (
    <main className="overlay-root">
      {/* LEFT PANEL: APP DOWNLOAD */}
      <section className="panel panel-left">
        <button
          className="panel-toggle"
          type="button"
          onClick={() => setSetupOpen((v) => !v)}
        >
          <Smartphone size={16} strokeWidth={2.25} />
        </button>

        <div className="panel-card" hidden={!setupOpen}>
          <div className="panel-head">
            <span className="panel-title">1. Get App</span>
            <button className="panel-close" onClick={() => setSetupOpen(false)}>
              <ChevronLeft size={16} />
            </button>
          </div>

          <div className="setup-section">
            <div className="setup-step">
              <p className="setup-step-desc">Download the Android transmitter app to your mobile device.</p>
              <div className="pairing-qr">
                <a href="https://expo.dev/artifacts/eas/4De8fxL38497SyYzCMGnUn.apk" target="_blank" rel="noreferrer">
                  <QRCodeSVG
                    value="https://expo.dev/artifacts/eas/4De8fxL38497SyYzCMGnUn.apk"
                    size={140}
                    includeMargin={true}
                  />
                </a>
              </div>
              <a className="pairing-copy" href="https://expo.dev/artifacts/eas/4De8fxL38497SyYzCMGnUn.apk" target="_blank" rel="noreferrer">
                <Download size={14} strokeWidth={2.4} />
                <span>Download .APK</span>
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* RIGHT PANEL: CONNECT & DEBUG */}
      <section className="panel panel-right">
        <button
          className="panel-toggle"
          type="button"
          onClick={() => setDebugOpen((v) => !v)}
        >
          <Link size={16} strokeWidth={2.25} />
        </button>

        <div className="panel-card" hidden={!debugOpen}>
          <div className="panel-head">
            <span className="panel-title">2. Connect & Control</span>
            <button className="panel-close" onClick={() => setDebugOpen(false)}>
              <ChevronRight size={16} />
            </button>
          </div>

          <div className="setup-section" style={{ paddingBottom: 0 }}>
            <div className="setup-step">
              <p className="setup-step-desc">Scan this QR in the app to pair with <strong>Room {panelState.roomId}</strong>.</p>
              
              <div className="pairing-qr">
                <QRCodeSVG value={sensorSocketUrl} size={140} includeMargin={true} />
              </div>

              <label className="pairing-field" style={{ marginTop: '12px' }}>
                <span className="panel-label">WebSocket host</span>
                <input
                  className="pairing-input"
                  type="text"
                  value={pairingHost}
                  onChange={(e) => setPairingHost(e.target.value)}
                />
              </label>

              <button
                className="pairing-copy"
                type="button"
                onClick={async () => {
                  await navigator.clipboard.writeText(sensorSocketUrl);
                  setCopyLabel("Copied");
                  window.setTimeout(() => setCopyLabel("Copy link"), 1200);
                }}
              >
                <Copy size={14} />
                <span>{copyLabel}</span>
              </button>
            </div>
          </div>

          <div className="panel-divider" />

          <div className="panel-sub-section">
            <div className="panel-row">
              <span className="panel-label">Status</span>
              <span className={`panel-value ${panelState.status === 'Connected' ? 'text-green' : ''}`}>
                {panelState.status}
              </span>
            </div>
            
            <div className="panel-row panel-stack">
              <span className="panel-label">Readout</span>
              <pre id="readout">{panelState.readout}</pre>
            </div>

            <div className="panel-divider" />

            {/* Physics Controls */}
            <div className="panel-row panel-stack">
              <div className="panel-label-row">
                <span className="panel-label">Gravity</span>
                <span className="panel-value">{physics.gravity.toFixed(1)}</span>
              </div>
              <input type="range" min="0" max="100" step="0.1" value={physics.gravity} onChange={(e) => updatePhysics({ gravity: parseFloat(e.target.value) })} />
            </div>

            <div className="panel-row panel-stack">
              <div className="panel-label-row">
                <span className="panel-label">Response</span>
                <span className="panel-value">{physics.rotationResponse.toFixed(1)}</span>
              </div>
              <input type="range" min="1" max="30" step="0.5" value={physics.rotationResponse} onChange={(e) => updatePhysics({ rotationResponse: parseFloat(e.target.value) })} />
            </div>

            <div className="panel-row">
              <label className="panel-toggle-row">
                <span className="panel-label">Invert Tilt</span>
                <input type="checkbox" checked={physics.invertX} onChange={(e) => updatePhysics({ invertX: e.target.checked, invertZ: e.target.checked })} />
              </label>
            </div>

            <button className="panel-action-btn" type="button" onClick={resetBall} style={{ marginTop: '8px' }}>
              <RefreshCcw size={14} />
              <span>Reset sphere</span>
            </button>
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