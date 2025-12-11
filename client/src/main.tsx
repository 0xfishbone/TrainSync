import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import {
  setupInstallPrompt,
  setupWakeLockAutoReacquire,
} from "./lib/webApis";

// Register service worker for PWA functionality
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("/service-worker.js")
      .then((registration) => {
        console.log("SW registered:", registration);
      })
      .catch((error) => {
        console.log("SW registration failed:", error);
      });
  });
}

// Initialize Web APIs
setupInstallPrompt();
setupWakeLockAutoReacquire();

createRoot(document.getElementById("root")!).render(<App />);
