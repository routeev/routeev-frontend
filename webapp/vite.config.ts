/// <reference types="vitest/config" />
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

const ROUTEEV_API_PRODUCCION = "https://routeev-api-production.up.railway.app";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // La API en Railway no tiene http://localhost:5173 en su
    // CORS_ALLOW_ORIGINS (routeev-api es otro repo, no se toca desde acá).
    // El proxy evita el problema del todo en dev: el navegador le habla a
    // este mismo origen (sin CORS de por medio) y Vite reenvia por detras.
    proxy: {
      "/api": {
        target: ROUTEEV_API_PRODUCCION,
        changeOrigin: true,
        secure: true,
      },
    },
  },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: "./src/test/setup.ts",
  },
});
