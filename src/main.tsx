import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Registra o Service Worker (apenas em produção/https)
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("/service-worker.js")
      .then((registration) => {
        console.log("[PWA] Service Worker registrado:", registration.scope);
      })
      .catch((error) => {
        console.error("[PWA] Erro ao registrar o Service Worker:", error);
      });
  });
}

createRoot(document.getElementById("root")!).render(<App />);
