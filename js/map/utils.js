/**
 * Utilidades puras sin estado propio ni dependencias de otros modulos del
 * mapa: distancia entre coordenadas, normalizacion de texto para busqueda,
 * escape de HTML y el helper generico de "ocultar un desplegable".
 */

export function haversineKmJs(lat1, lon1, lat2, lon2) {
  const R = 6371.0088;
  const toRad = (d) => (d * Math.PI) / 180;
  const dphi = toRad(lat2 - lat1);
  const dlambda = toRad(lon2 - lon1);
  const a = Math.sin(dphi / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dlambda / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(a)));
}

// Rango Unicode de los diacriticos combinantes (tildes, diéresis, etc.)
// que deja sueltos normalize("NFD"). Se comparan codepoints en vez de un
// regex con el rango literal para no depender de que este archivo se
// guarde/sirva siempre como UTF-8 -- con hex ASCII puro no hay nada que
// un editor o proxy mal configurado pueda corromper.
const COMBINING_DIACRITIC_START = 0x0300;
const COMBINING_DIACRITIC_END = 0x036f;

export function normalizeForSearch(s) {
  // saca tildes: tipear "camino maldonado" tiene que matchear "Camino
  // Maldonado".
  let out = "";
  for (const ch of s.toLowerCase().normalize("NFD")) {
    const code = ch.codePointAt(0);
    if (code < COMBINING_DIACRITIC_START || code > COMBINING_DIACRITIC_END) out += ch;
  }
  return out;
}

const HTML_ESCAPES = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };

// Los nombres de nodo vienen de OSM (via searchable-nodes) y lo que se
// muestra como "geocode" es texto tipeado por el propio usuario: ninguno
// de los dos es HTML de confianza, asi que no pueden ir crudos dentro de
// un innerHTML.
export function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => HTML_ESCAPES[c]);
}

export function hideSuggestions(listEl) {
  listEl.classList.add("hidden");
  listEl.innerHTML = "";
}
