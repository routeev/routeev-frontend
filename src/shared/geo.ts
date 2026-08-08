// Portado 1:1 desde js/map/utils.js. Sin dependencias de estado ni del DOM
// -- se reusa tal cual en mapCore, geolocation y el simulador de showroom.

export function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371.0088;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dphi = toRad(lat2 - lat1);
  const dlambda = toRad(lon2 - lon1);
  const a =
    Math.sin(dphi / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dlambda / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(a)));
}

// Rango Unicode de los diacriticos combinantes (tildes, dieresis) que deja
// sueltos normalize("NFD"). Comparado por codepoint, no por regex literal,
// para no depender de que el archivo se sirva siempre como UTF-8.
const COMBINING_DIACRITIC_START = 0x0300;
const COMBINING_DIACRITIC_END = 0x036f;

export function normalizeForSearch(s: string): string {
  let out = "";
  for (const ch of s.toLowerCase().normalize("NFD")) {
    const code = ch.codePointAt(0)!;
    if (code < COMBINING_DIACRITIC_START || code > COMBINING_DIACRITIC_END) out += ch;
  }
  return out;
}
