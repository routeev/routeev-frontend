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
  // Desglose de timeMin -- antes se sumaban en un solo numero sin mostrar
  // de donde salia cada minuto (manejando vs. parado en trafico vs.
  // cargando), aunque el backend ya los manda separados.
  drivingMin: number;
  trafficMin: number;
  chargingMin: number;
  // null si no hay tiempo real de manejo/trafico para promediar contra
  // (viaje de 0 km, o toda la duracion es carga).
  avgSpeedKmh: number | null;
  consumedPct: number | null;
  consumedKwh: number;
  // Presentes solo con el backend nuevo (route_result.build_breakdown):
  // cuanto de la energia gastada vino de la carga en casa vs. de paradas
  // en ruta. null en respuestas del backend viejo o replays guardados
  // antes de esta version.
  homeEnergyKwh: number | null;
  publicEnergyKwh: number | null;
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
  const distanceKm = b.energia_kwh / (vehicle ? vehicle.consumption_kwh_per_km : 0.18);
  const movingMin = b.tiempo_min + b.trafico_min;

  return {
    distanceKm,
    timeMin: b.tiempo_min + b.trafico_min + b.recarga_min,
    drivingMin: b.tiempo_min,
    trafficMin: b.trafico_min,
    chargingMin: b.recarga_min,
    avgSpeedKmh: movingMin > 0 ? distanceKm / (movingMin / 60) : null,
    consumedPct,
    consumedKwh: b.energia_kwh,
    homeEnergyKwh: b.energia_casa_kwh ?? null,
    publicEnergyKwh: b.energia_recargada_kwh ?? null,
    tollCount: (b.peajes_puntos ?? []).length,
    hasTolls: b.peaje > 0,
    arrivalPct: pctOfCapacity(arrivalBatteryKwh, vehicle),
    arrivalKwh: arrivalBatteryKwh,
    rechargeCount: r.recharges.length,
    costUyu: b.costo_uyu_total,
  };
}
