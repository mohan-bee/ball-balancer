import { createRoot } from "react-dom/client";
import { OverlayApp } from "./overlay/OverlayApp";

const root = document.getElementById("overlay-root");
if (root) {
  createRoot(root).render(<OverlayApp />);
}
