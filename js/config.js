// Configuracion del frontend estatico.
//
// /js/env.js NO es un archivo del repo: scripts/dev-server.js lo sintetiza
// en cada pedido leyendo .env, y define window.ROUTEEV_API_BASE_URL antes
// de que se cargue este archivo.
//
// Consecuencia importante: en cualquier hosting estatico (Netlify, Vercel,
// GitHub Pages, Cloudflare Pages) no corre el dev-server, /js/env.js da 404
// y window.ROUTEEV_API_BASE_URL llega sin definir hasta aca. Por eso el
// fallback tiene que ser la API de produccion y no localhost: si apunta a
// localhost, el sitio publicado carga pero ninguna llamada funciona, y el
// usuario ve "No se pudo conectar con el servidor" como si fuera culpa de
// su conexion.
//
// Para desarrollar contra un backend local: poner la URL en .env y levantar
// scripts/dev-server.js, que es el flujo documentado en el README.

const ROUTEEV_API_PRODUCCION = "https://routeev-api-production.up.railway.app";

window.ROUTEEV_API_BASE_URL = window.ROUTEEV_API_BASE_URL || ROUTEEV_API_PRODUCCION;
