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
 * Rumbo de brújula (0-360°, 0 = norte, sentido horario) a partir de
 * DeviceOrientationEvent (alpha/beta/gamma), compensando la inclinación del
 * celular -- necesario porque en un auto el teléfono está montado en algún
 * ángulo (no plano sobre una mesa), y la fórmula ingenua `(360 - alpha) %
 * 360` sólo vale con el celular acostado. Formula estándar de rotación
 * ZXY (la misma que usa la brújula nativa de la mayoría de las apps web con
 * DeviceOrientationEvent); ver el comentario en useLiveTrip.ts sobre por qué
 * el modo navegación pasó de rumbo-por-GPS a esto.
 */
export function computeCompassHeading(alphaDeg: number, betaDeg: number, gammaDeg: number): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const α = toRad(alphaDeg);
  const β = toRad(betaDeg);
  const γ = toRad(gammaDeg);
  const cA = Math.cos(α);
  const sA = Math.sin(α);
  const sB = Math.sin(β);
  const cG = Math.cos(γ);
  const sG = Math.sin(γ);
  const rA = -cA * sG - sA * sB * cG;
  const rB = -sA * sG + cA * sB * cG;
  return ((Math.atan2(rA, rB) * 180) / Math.PI + 360) % 360;
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
