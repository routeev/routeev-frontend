import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import { setupStaleChunkReload } from "./shared/reloadOnStaleChunk.ts";
import "./styles/tokens.css";
import "./styles/base.css";
// Después de tokens.css: pisa sus valores solo con data-season="halloween".
import "./styles/season-halloween.css";

setupStaleChunkReload();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>
);

// Instrumentación de diagnóstico (escribe INP/LCP/CLS en la consola): solo en
// desarrollo, o en producción si se prende a mano con
// localStorage.routeev_vitals = "1". Antes viajaba en el chunk de entrada
// (13 kB) y escribía en la consola de todas las visitas en cada interacción.
function vitalsEnabled(): boolean {
  if (import.meta.env.DEV) return true;
  try {
    return window.localStorage.getItem("routeev_vitals") === "1";
  } catch {
    return false;
  }
}

if (vitalsEnabled()) {
  void import("./shared/reportWebVitals.ts").then((m) => m.reportWebVitals());
}
