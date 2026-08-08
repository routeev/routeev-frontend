import type { RouteBreakdown, RouteResult } from "../api/route";
import type { Station } from "../api/graph";
import type { Vehicle } from "../api/vehicles";

/** Un tramo con peaje detectado no siempre tiene tarifa real conocida: distingue "sin costo" de "no sabemos el costo". */
export function hayPeajeSinMonto(b: RouteBreakdown): boolean {
  return (b.peajes_puntos ?? []).some((p) => p.monto_uyu == null);
}

export function pctOfCapacity(kwh: number, vehicle: Vehicle | null): number | null {
  if (!vehicle) return null;
  return Math.max(0, Math.min(100, (kwh / vehicle.battery_capacity_kwh) * 100));
}

export function findStationDetail(stations: Station[], nodeId: number): Station | null {
  return stations.find((s) => s.node_id === nodeId) ?? null;
}

export interface TripSummary {
  distanceKm: number;
  timeMin: number;
  consumedPct: number | null;
  consumedKwh: number;
  tollCount: number;
  hasTolls: boolean;
  arrivalPct: number | null;
  arrivalKwh: number;
  rechargeCount: number;
  costUyu: number;
}

export function summarizeTrip(vehicle: Vehicle | null, startBatteryKwh: number, r: RouteResult): TripSummary | null {
  if (!r.found) return null;
  const b = r.breakdown;
  const arrivalBatteryKwh = startBatteryKwh - b.energia_kwh + r.recharges.reduce((sum, rc) => sum + rc.added_kwh, 0);
  // % de UNA carga completa solo tiene sentido sin recargas en el camino:
  // con paradas, la energia total puede superar la capacidad de la bateria.
  const consumedPct = r.recharges.length === 0 ? pctOfCapacity(b.energia_kwh, vehicle) : null;

  return {
    distanceKm: b.energia_kwh / (vehicle ? vehicle.consumption_kwh_per_km : 0.18),
    timeMin: b.tiempo_min + b.trafico_min + b.recarga_min,
    consumedPct,
    consumedKwh: b.energia_kwh,
    tollCount: (b.peajes_puntos ?? []).length,
    hasTolls: b.peaje > 0,
    arrivalPct: pctOfCapacity(arrivalBatteryKwh, vehicle),
    arrivalKwh: arrivalBatteryKwh,
    rechargeCount: r.recharges.length,
    costUyu: b.costo_uyu_total,
  };
}
