import { useEffect, useState } from "react";

export function useViewerNotice() {
  const [viewerNotice, setViewerNotice] = useState("");

  useEffect(() => {
    let timeout: ReturnType<typeof window.setTimeout> | null = null;

    const onViewerNotice = (event: Event) => {
      const customEvent = event as CustomEvent<{ message?: string }>;
      const message = customEvent.detail?.message ?? "";
      setViewerNotice(message);

      if (timeout) {
        window.clearTimeout(timeout);
      }

      timeout = window.setTimeout(() => {
        setViewerNotice("");
      }, 1800);
    };

    window.addEventListener("viewer-notice", onViewerNotice);

    return () => {
      window.removeEventListener("viewer-notice", onViewerNotice);
      if (timeout) {
        window.clearTimeout(timeout);
      }
    };
  }, []);

  return viewerNotice;
}
