import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import { reportWebVitals } from "./shared/reportWebVitals.ts";
import { setupStaleChunkReload } from "./shared/reloadOnStaleChunk.ts";
import "./styles/tokens.css";
import "./styles/base.css";
// Despues de tokens.css a proposito: pisa 16 de sus tokens mientras
// data-season="halloween" este en <html>. Fuera de temporada el bloque no
// matchea y no cuesta nada. Se borra entero despues del 3/11.
import "./styles/season-halloween.css";

setupStaleChunkReload();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>
);

reportWebVitals();
