// En dev, sin VITE_API_BASE_URL explicita, se usa ruta relativa a proposito:
// asi el fetch va al propio dev server de Vite (mismo origen, sin CORS) y el
// proxy de vite.config.ts lo reenvia a la API de produccion por detras. En un
// build de produccion no hay proxy corriendo, asi que ahi si hace falta la
// URL completa -- misma logica de fallback que js/config.js del sitio
// estatico.
//
// Dominio propio y no el de la plataforma de turno: cuando la API se mudo de
// Railway a Oracle Cloud hubo que cambiar esta URL (y la del sitemap en
// vercel.json) y redesplegar. Con api.routeev.uy, la proxima mudanza es solo
// un cambio de DNS.
const ROUTEEV_API_PRODUCCION = "https://api.routeev.uy";

export const API_BASE_URL = (
  import.meta.env.VITE_API_BASE_URL ?? (import.meta.env.DEV ? "" : ROUTEEV_API_PRODUCCION)
).replace(/\/+$/, "");
