import type { ViewerVersionChangeDetail } from "./model-viewer/viewer/types";
import { mountModelViewer } from "./model-viewer/viewer/mount";

type ViewerVersion = "v1" | "v2" | "v3";

function resolveInitialVersion(): ViewerVersion {
  const url = new URL(window.location.href);
  const version = url.searchParams.get("version");
  return version === "v2" || version === "v3" || version === "v1"
    ? version
    : "v1";
}

const stage = document.getElementById("model-stage");
const status = document.getElementById("model-status");

if (stage) {
  let cleanup: (() => void) | null = null;

  const mountSelectedVersion = (version: string) => {
    cleanup?.();
    cleanup = null;

    const nextVersion: ViewerVersion =
      version === "v2" || version === "v3" || version === "v1" ? version : "v1";
    cleanup = mountModelViewer(stage, status, nextVersion);
  };

  const onVersionChange = (event: Event) => {
    const customEvent = event as CustomEvent<ViewerVersionChangeDetail>;
    mountSelectedVersion(customEvent.detail?.version ?? "v1");
  };

  mountSelectedVersion(resolveInitialVersion());
  window.addEventListener("viewer-version-change", onVersionChange);
  window.addEventListener(
    "beforeunload",
    () => {
      window.removeEventListener("viewer-version-change", onVersionChange);
      cleanup?.();
    },
    { once: true },
  );
}
