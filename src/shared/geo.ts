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

/**
 * Rumbo (0-360°, 0 = norte, sentido horario) del punto 1 al punto 2. Usado
 * por el modo navegación (NavigationMap.tsx) para rotar la cámara hacia
 * donde apunta el viaje cuando el GPS no manda coords.heading directamente.
 */
export function bearingDeg(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const φ1 = toRad(lat1);
  const φ2 = toRad(lat2);
  const Δλ = toRad(lon2 - lon1);
  const y = Math.sin(Δλ) * Math.cos(φ2);
  const x = Math.cos(φ1) * Math.sin(φ2) - Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ);
  return ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
}

/**
 * Interpola circularmente entre dos rumbos (0-360°) tomando siempre el
 * camino más corto -- una media lineal ingenua rompe cerca del corte
 * 0°/360° (359° "hacia" 1° promediaría ~180°, el lado opuesto).
 */
export function smoothBearingDeg(prevDeg: number | null, nextDeg: number, alpha: number): number {
  if (prevDeg == null) return nextDeg;
  const diff = ((nextDeg - prevDeg + 540) % 360) - 180; // en [-180, 180)
  return (prevDeg + alpha * diff + 360) % 360;
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
