import type { Parada, SimulateResult } from "../api/showroom";
import { haversineKm } from "../shared/geo";

/**
 * Traduce el resultado numérico de POST /api/showroom/simulate a una línea
 * de tiempo animable: qué punto del mapa mostrar y cuánta batería queda en
 * cada instante. Portado 1:1 de la lógica de js/showroom.js (armarTramos/
 * armarSegmentos/puntoEnKm) -- es JS puro sin DOM, así que se porta sin
 * reescribir nada, solo tipado.
 */

export type ParadaConKm = Parada & { cumKm: number };

export interface TramoInfo {
  nombre: "ida" | "vuelta";
  coords: [number, number][];
  cum: number[];
  totalKm: number;
  energiaKwh: number;
  paradas: ParadaConKm[];
}

interface SegmentBase {
  tramo: TramoInfo;
  battFrom: number;
  battTo: number;
  startMs: number;
  durationMs: number;
}

export interface DriveSegment extends SegmentBase {
  type: "drive";
  kmFrom: number;
  kmTo: number;
  driveKm: number;
  kmGlobalFrom: number;
  kmGlobalTo: number;
}

export interface ChargeSegment extends SegmentBase {
  type: "charge";
  kmGlobal: number;
  parada: ParadaConKm;
}

export interface TurnSegment extends SegmentBase {
  type: "turn";
  kmGlobal: number;
}

export type Segment = DriveSegment | ChargeSegment | TurnSegment;

export interface Timeline {
  segments: Segment[];
  totalMs: number;
  totalKm: number;
}

/** Distancia acumulada (km) desde el inicio de `coords` hasta cada punto. */
export function acumular(coords: [number, number][]): number[] {
  const cum = [0];
  for (let i = 1; i < coords.length; i++) {
    const [lat0, lon0] = coords[i - 1]!;
    const [lat1, lon1] = coords[i]!;
    cum.push(cum[i - 1]! + haversineKm(lat0, lon0, lat1, lon1));
  }
  return cum;
}

/** Punto sobre la polilínea a una distancia acumulada dada, interpolando dentro del segmento que la contiene. */
export function puntoEnKm(coords: [number, number][], cum: number[], km: number): [number, number] {
  const total = cum[cum.length - 1]!;
  const objetivo = Math.max(0, Math.min(total, km));
  let i = 1;
  while (i < cum.length - 1 && cum[i]! < objetivo) i++;
  const kmPrev = cum[i - 1]!;
  const kmNext = cum[i]!;
  const t = kmNext > kmPrev ? (objetivo - kmPrev) / (kmNext - kmPrev) : 0;
  const [la0, lo0] = coords[i - 1]!;
  const [la1, lo1] = coords[i]!;
  return [la0 + (la1 - la0) * t, lo0 + (lo1 - lo0) * t];
}

/** A qué distancia acumulada de la polilínea cae un punto suelto (lat/lon de una parada): el punto de ruta más cercano, su acumulada. */
export function cumKmDePunto(coords: [number, number][], cum: number[], lat: number, lon: number): number {
  let bestIdx = 0;
  let bestD = Infinity;
  for (let i = 0; i < coords.length; i++) {
    const [la, lo] = coords[i]!;
    const d = haversineKm(la, lo, lat, lon);
    if (d < bestD) {
      bestD = d;
      bestIdx = i;
    }
  }
  return cum[bestIdx]!;
}

export function armarTramos(resultado: SimulateResult): TramoInfo[] {
  return resultado.detalle.tramos.map((t) => {
    const coords = t.route_coords;
    const cum = acumular(coords);
    const paradas: ParadaConKm[] = resultado.paradas
      .filter((p) => p.tramo === t.tramo)
      .map((p) => ({ ...p, cumKm: cumKmDePunto(coords, cum, p.lat, p.lon) }))
      .sort((a, b) => a.cumKm - b.cumKm);
    return { nombre: t.tramo, coords, cum, totalKm: cum[cum.length - 1]!, energiaKwh: t.energia_kwh, paradas };
  });
}

// Ritmo de animación: "manejar" es proporcional a la distancia real (no al
// tiempo real -- un viaje de 8 horas no puede animarse 8 horas), acotado
// para que ni una vuelta a la esquina ni cruzar el país se sientan mal.
const MS_POR_KM = 26;
const DRIVE_MS_MIN = 3200;
const DRIVE_MS_MAX = 13000;
const CHARGE_MS_MIN = 900;
const CHARGE_MS_MAX = 2600;
const TURN_MS = 1100;

export function armarSegmentos(tramosInfo: TramoInfo[], bateriaInicialKwh: number): Timeline {
  const segments: Segment[] = [];
  let battKwh = bateriaInicialKwh;
  let kmGlobalPrefix = 0;

  tramosInfo.forEach((tramo, tramoIdx) => {
    const ratePerKm = tramo.totalKm > 0 ? tramo.energiaKwh / tramo.totalKm : 0;
    let kmCursor = 0;

    const empujarTramo = (kmHasta: number) => {
      if (kmHasta <= kmCursor) return;
      const driveKm = kmHasta - kmCursor;
      const battTo = battKwh - ratePerKm * driveKm;
      segments.push({
        type: "drive",
        tramo,
        kmFrom: kmCursor,
        kmTo: kmHasta,
        driveKm,
        kmGlobalFrom: kmGlobalPrefix + kmCursor,
        kmGlobalTo: kmGlobalPrefix + kmHasta,
        battFrom: battKwh,
        battTo,
        startMs: 0,
        durationMs: 0,
      });
      battKwh = battTo;
      kmCursor = kmHasta;
    };

    for (const parada of tramo.paradas) {
      empujarTramo(parada.cumKm);
      const battTo = battKwh + parada.kwh;
      segments.push({
        type: "charge",
        tramo,
        kmGlobal: kmGlobalPrefix + kmCursor,
        battFrom: battKwh,
        battTo,
        parada,
        durationMs: Math.min(CHARGE_MS_MAX, Math.max(CHARGE_MS_MIN, parada.minutos * 35)),
        startMs: 0,
      });
      battKwh = battTo;
    }
    empujarTramo(tramo.totalKm);
    kmGlobalPrefix += tramo.totalKm;

    if (tramoIdx < tramosInfo.length - 1) {
      segments.push({
        type: "turn",
        tramo,
        kmGlobal: kmGlobalPrefix,
        battFrom: battKwh,
        battTo: battKwh,
        durationMs: TURN_MS,
        startMs: 0,
      });
    }
  });

  // Presupuesto de tiempo único para todo lo que es manejar (no por
  // segmento, para que 3 tramos cortos no sumen 3 pisos), repartido a
  // prorrata de km entre los segmentos de manejo.
  const totalDriveKm = segments
    .filter((s): s is DriveSegment => s.type === "drive")
    .reduce((a, s) => a + s.driveKm, 0);
  const driveBudgetMs = Math.min(DRIVE_MS_MAX, Math.max(DRIVE_MS_MIN, totalDriveKm * MS_POR_KM));
  for (const s of segments) {
    if (s.type === "drive") s.durationMs = totalDriveKm > 0 ? driveBudgetMs * (s.driveKm / totalDriveKm) : 0;
  }

  let acc = 0;
  for (const s of segments) {
    s.startMs = acc;
    acc += s.durationMs;
  }
  return { segments, totalMs: acc, totalKm: kmGlobalPrefix };
}

/** Posición [lat, lon] de un segmento en progreso p (0-1). */
export function puntoDeSegmento(seg: Segment, p: number): [number, number] {
  const tramo = seg.tramo;
  if (seg.type === "drive") {
    const km = seg.kmFrom + (seg.kmTo - seg.kmFrom) * p;
    return puntoEnKm(tramo.coords, tramo.cum, km);
  }
  if (seg.type === "charge") return [seg.parada.lat, seg.parada.lon];
  return tramo.coords[tramo.coords.length - 1]!; // turn: quieto en el destino
}

/** Segmento activo (y su progreso 0-1) para un tiempo transcurrido dado. */
export function segmentoEnTiempo(segments: Segment[], elapsedMs: number): { seg: Segment; p: number } {
  for (const s of segments) {
    if (elapsedMs < s.startMs + s.durationMs) {
      const p = s.durationMs > 0 ? (elapsedMs - s.startMs) / s.durationMs : 1;
      return { seg: s, p: Math.max(0, Math.min(1, p)) };
    }
  }
  const last = segments[segments.length - 1]!;
  return { seg: last, p: 1 };
}
