import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import { reportWebVitals } from "./shared/reportWebVitals.ts";
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

reportWebVitals();
