import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import { reportWebVitals } from "./shared/reportWebVitals.ts";
import { setupStaleChunkReload } from "./shared/reloadOnStaleChunk.ts";
import "./styles/tokens.css";
import "./styles/base.css";

setupStaleChunkReload();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>
);

reportWebVitals();
