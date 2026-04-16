export function createRoomId() {
  return crypto.randomUUID().replace(/-/g, "").slice(0, 10).toUpperCase();
}

export function resolveViewerVersionParam(defaultVersion = "v1") {
  const url = new URL(window.location.href);
  const version = url.searchParams.get("version")?.toLowerCase();
  return version === "v1" || version === "v2" || version === "v3"
    ? version
    : defaultVersion;
}

export function setViewerVersionParam(version: string) {
  const url = new URL(window.location.href);
  url.searchParams.set("version", version);
  window.history.replaceState({}, "", url.toString());
}

export function buildSensorSocketUrl(roomId: string, host: string) {
  const url = new URL(window.location.href);
  url.protocol = location.protocol === "https:" ? "wss:" : "ws:";
  url.host = host;
  url.searchParams.set("room", roomId);
  url.searchParams.set("role", "sensor");
  url.hash = "";
  return url.toString();
}

export function buildSocketUrl(roomId: string) {
  const url = new URL(window.location.href);
  url.protocol = location.protocol === "https:" ? "wss:" : "ws:";
  url.searchParams.set("room", roomId);
  url.searchParams.set("role", "viewer");
  url.hash = "";
  return url.toString();
}
