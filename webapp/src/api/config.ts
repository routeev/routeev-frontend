// En dev, sin VITE_API_BASE_URL explicita, se usa ruta relativa a proposito:
// asi el fetch va al propio dev server de Vite (mismo origen, sin CORS) y el
// proxy de vite.config.ts lo reenvia a la API de Railway por detras. En un
// build de produccion no hay proxy corriendo, asi que ahi si hace falta la
// URL completa -- misma logica de fallback que js/config.js del sitio
// estatico.
const ROUTEEV_API_PRODUCCION = "https://routeev-api-production.up.railway.app";

export const API_BASE_URL = (
  import.meta.env.VITE_API_BASE_URL ?? (import.meta.env.DEV ? "" : ROUTEEV_API_PRODUCCION)
).replace(/\/+$/, "");
