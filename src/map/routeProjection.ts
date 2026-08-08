import { haversineKm } from "../shared/geo";

/** Distancia acumulada (km) desde el inicio de `coords` hasta cada punto. */
export function buildRouteCumulative(coords: [number, number][]): number[] {
  const cum = [0];
  for (let i = 1; i < coords.length; i++) {
    cum.push(cum[i - 1]! + haversineKm(coords[i - 1]![0], coords[i - 1]![1], coords[i]![0], coords[i]![1]));
  }
  return cum;
}

/** A qué distancia acumulada de la ruta cae un punto suelto (usado para ubicar paradas de recarga). */
export function nearestCumulativeDistance(coords: [number, number][], cum: number[], lat: number, lon: number): number {
  let bestIdx = 0;
  let bestD = Infinity;
  for (let i = 0; i < coords.length; i++) {
    const d = haversineKm(coords[i]![0], coords[i]![1], lat, lon);
    if (d < bestD) {
      bestD = d;
      bestIdx = i;
    }
  }
  return cum[bestIdx]!;
}

export interface RouteProjection {
  traveledKm: number;
  offRouteM: number;
}

/**
 * Proyecta una posición real (GPS) sobre el segmento más cercano de la ruta,
 * en metros planos aproximados (equirectangular alrededor de la latitud
 * actual -- suficiente precisión a escala de una ruta interurbana). Portado
 * de projectOntoRoute en js/map/liveTrip.js.
 */
export function projectOntoRoute(coords: [number, number][], cum: number[], lat: number, lon: number): RouteProjection {
  const R = 6371008.8;
  const latRad0 = (lat * Math.PI) / 180;
  const cosLat0 = Math.cos(latRad0);
  const toXY = (la: number, lo: number): [number, number] => [
    ((lo * Math.PI) / 180) * cosLat0 * R,
    ((la * Math.PI) / 180) * R,
  ];
  const [px, py] = toXY(lat, lon);

  let bestDist = Infinity;
  let bestCum = 0;
  for (let i = 0; i < coords.length - 1; i++) {
    const [ax, ay] = toXY(coords[i]![0], coords[i]![1]);
    const [bx, by] = toXY(coords[i + 1]![0], coords[i + 1]![1]);
    const dx = bx - ax;
    const dy = by - ay;
    const lenSq = dx * dx + dy * dy;
    let t = lenSq > 0 ? ((px - ax) * dx + (py - ay) * dy) / lenSq : 0;
    t = Math.max(0, Math.min(1, t));
    const cx = ax + dx * t;
    const cy = ay + dy * t;
    const dist = Math.hypot(px - cx, py - cy);
    if (dist < bestDist) {
      bestDist = dist;
      bestCum = cum[i]! + (cum[i + 1]! - cum[i]!) * t;
    }
  }
  return { traveledKm: bestCum, offRouteM: bestDist };
}
