import react from "@vitejs/plugin-react";
// defineConfig sale de "vitest/config" y ya no de "vite": es el mismo helper
// con la clave `test` tipada, y reemplaza al `/// <reference types="vitest/config" />`
// que habia arriba (con un import del mismo modulo, la directiva triple-slash
// pasa a ser redundante y eslint la marca).
import { configDefaults, defineConfig } from "vitest/config";

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
    // ".claude" son las carpetas de trabajo del agente: worktrees de git con
    // una copia entera del proyecto adentro, tests incluidos. Sin excluirlas,
    // `npm test` corre la suite de este proyecto una vez por worktree, contra
    // codigo viejo y con OTRO setupFiles (el de cada copia), asi que ademas
    // fallan. Misma exclusion que en eslint.config.js, por lo mismo.
    exclude: [...configDefaults.exclude, "**/.claude/**"],
  },
});
