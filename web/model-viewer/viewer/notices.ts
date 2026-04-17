export function dispatchViewerNotice(message: string) {
  window.dispatchEvent(
    new CustomEvent("viewer-notice", { detail: { message } }),
  );
}
