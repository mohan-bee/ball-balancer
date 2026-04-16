import {
  ChevronLeft,
  ChevronRight,
  Copy,
  Download,
  RefreshCcw,
  Smartphone,
} from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { useEffect, useMemo, useState } from "react";
import { useViewerNotice } from "./hooks/useViewerNotice";
import { useViewerSocket } from "./hooks/useViewerSocket";
import { useVersionedPhysics } from "./hooks/useVersionedPhysics";
import { resolveViewerVersionParam, setViewerVersionParam } from "./url";
import { VIEWER_OPTIONS } from "./constants";
import type { ViewerVersion } from "./types";

export function OverlayApp() {
  const [activeVersion, setActiveVersion] = useState<ViewerVersion>(
    () => resolveViewerVersionParam("v1") as ViewerVersion,
  );
  const viewerNotice = useViewerNotice();

  const [setupOpen, setSetupOpen] = useState(true);
  const [copyLabel, setCopyLabel] = useState("Copy link");
  const [pairingHost, setPairingHost] = useState(() => window.location.host);
  const [isSceneLoading, setIsSceneLoading] = useState(false);

  const { panelState, sensorSocketUrl } = useViewerSocket(pairingHost);
  const { physics, updatePhysics } = useVersionedPhysics(activeVersion);

  const viewerVersions = useMemo(
    () => VIEWER_OPTIONS.map((option) => option.id),
    [],
  );
  const activeIndex = Math.max(0, viewerVersions.indexOf(activeVersion));
  const canGoPrev = activeIndex > 0;
  const canGoNext = activeIndex < viewerVersions.length - 1;

  const resetBall = () => {
    window.dispatchEvent(new CustomEvent("physics-reset"));
  };

  useEffect(() => {
    setViewerVersionParam(activeVersion);
    setIsSceneLoading(true);

    window.dispatchEvent(
      new CustomEvent("viewer-version-change", {
        detail: { version: activeVersion },
      }),
    );
  }, [activeVersion]);

  useEffect(() => {
    if (!isSceneLoading) {
      return;
    }

    // `mountModelViewer` dispatches viewer-notice "<VERSION> ready." after first render.
    // Use that to end the loading overlay.
    const expectedReady = `${activeVersion.toUpperCase()} ready.`;
    const onViewerNotice = (event: Event) => {
      const customEvent = event as CustomEvent<{ message?: string }>;
      if (customEvent.detail?.message === expectedReady) {
        setIsSceneLoading(false);
      }
    };

    // Failsafe: never block UI forever.
    const timeout = window.setTimeout(() => setIsSceneLoading(false), 4000);
    window.addEventListener("viewer-notice", onViewerNotice);

    return () => {
      window.removeEventListener("viewer-notice", onViewerNotice);
      window.clearTimeout(timeout);
    };
  }, [activeVersion, isSceneLoading]);

  return (
    <main className="overlay-root">
      <div
        className={`scene-loading ${isSceneLoading ? "show" : ""}`}
        aria-hidden={!isSceneLoading}
      >
        <div className="scene-loading-card">
          <div className="scene-loading-spinner" />
          <div className="scene-loading-text">
            Loading {activeVersion.toUpperCase()}...
          </div>
        </div>
      </div>

      <div className="viewer-notice" hidden={!viewerNotice}>
        {viewerNotice}
      </div>

      <section className="panel panel-left">
        <button
          className="panel-toggle"
          type="button"
          onClick={() => setSetupOpen((value) => !value)}
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
              <p className="setup-step-desc">
                Download the Android transmitter app to your mobile device.
              </p>
              <div className="pairing-qr">
                <a
                  href="https://expo.dev/artifacts/eas/jDXNeCziNRStNCf8ysXKmy.apk"
                  target="_blank"
                  rel="noreferrer"
                >
                  <QRCodeSVG
                    value="https://expo.dev/artifacts/eas/jDXNeCziNRStNCf8ysXKmy.apk"
                    size={140}
                    includeMargin={true}
                  />
                </a>
              </div>
              <a
                className="pairing-copy"
                href="https://expo.dev/artifacts/eas/jDXNeCziNRStNCf8ysXKmy.apk"
                target="_blank"
                rel="noreferrer"
              >
                <Download size={14} strokeWidth={2.4} />
                <span>Download .APK</span>
              </a>
            </div>
          </div>
        </div>
      </section>

      <section className="panel panel-right">
        <div className="panel-card">
          <div className="panel-head">
            <span className="panel-title">2. Connect & Control</span>
          </div>

          <div className="setup-section" style={{ paddingBottom: 0 }}>
            <div className="setup-step">
              <p className="setup-step-desc">
                Scan this QR in the app to pair with{" "}
                <strong>Room {panelState.roomId}</strong>.
              </p>

              <div className="pairing-qr">
                <QRCodeSVG
                  value={sensorSocketUrl}
                  size={140}
                  includeMargin={true}
                />
              </div>

              <label className="pairing-field" style={{ marginTop: "12px" }}>
                <span className="panel-label">WebSocket host</span>
                <input
                  className="pairing-input"
                  type="text"
                  value={pairingHost}
                  onChange={(event) => setPairingHost(event.target.value)}
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
              <span className="panel-label">Version</span>
              <span className="panel-value">{activeVersion.toUpperCase()}</span>
            </div>

            <div className="panel-row">
              <span className="panel-label">Status</span>
              <span
                className={`panel-value ${panelState.status === "Connected" ? "text-green" : ""}`}
              >
                {panelState.status}
              </span>
            </div>

            <div className="panel-row panel-stack">
              <span className="panel-label">Readout</span>
              <pre id="readout">{panelState.readout}</pre>
            </div>

            <div className="panel-divider" />

            <div className="panel-row panel-stack">
              <div className="panel-label-row">
                <span className="panel-label">Gravity</span>
                <span className="panel-value">
                  {physics.gravity.toFixed(1)}
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                step="0.1"
                value={physics.gravity}
                onChange={(event) =>
                  updatePhysics({ gravity: parseFloat(event.target.value) })
                }
              />
            </div>

            <div className="panel-row panel-stack">
              <div className="panel-label-row">
                <span className="panel-label">Response</span>
                <span className="panel-value">
                  {physics.rotationResponse.toFixed(1)}
                </span>
              </div>
              <input
                type="range"
                min="1"
                max="30"
                step="0.5"
                value={physics.rotationResponse}
                onChange={(event) =>
                  updatePhysics({
                    rotationResponse: parseFloat(event.target.value),
                  })
                }
              />
            </div>

            <div className="panel-row">
              <label className="panel-toggle-row">
                <span className="panel-label">Invert Tilt</span>
                <input
                  type="checkbox"
                  checked={physics.invertX}
                  onChange={(event) =>
                    updatePhysics({
                      invertX: event.target.checked,
                      invertZ: event.target.checked,
                    })
                  }
                />
              </label>
            </div>

            <button
              className="panel-action-btn"
              type="button"
              onClick={resetBall}
              style={{ marginTop: "8px" }}
            >
              <RefreshCcw size={14} />
              <span>Reset sphere</span>
            </button>
          </div>
        </div>
      </section>

      <section className="version-dock" aria-label="Version navigation">
        <button
          className="version-dock-btn"
          type="button"
          disabled={!canGoPrev || isSceneLoading}
          aria-label="Previous version"
          onClick={() => {
            if (!canGoPrev) return;
            setActiveVersion(viewerVersions[activeIndex - 1]);
          }}
        >
          <ChevronLeft size={16} />
        </button>

        <div
          className="version-dock-card"
          role="group"
          aria-label="Active version"
        >
          <div className="version-dock-kicker">Version</div>
          <div className="version-dock-title">
            {VIEWER_OPTIONS[activeIndex]?.name ?? activeVersion.toUpperCase()}
          </div>
          <div className="version-dock-subtitle">
            {VIEWER_OPTIONS[activeIndex]?.summary ?? ""}
          </div>
        </div>

        <button
          className="version-dock-btn"
          type="button"
          disabled={!canGoNext || isSceneLoading}
          aria-label="Next version"
          onClick={() => {
            if (!canGoNext) return;
            setActiveVersion(viewerVersions[activeIndex + 1]);
          }}
        >
          <ChevronRight size={16} />
        </button>
      </section>
    </main>
  );
}
import { createRoot } from "react-dom/client";
const root = document.getElementById("overlay-root");
if (root) {
  createRoot(root).render(<OverlayApp />);
}
