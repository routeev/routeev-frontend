import { apiFetch } from "./client";
import type { TarifaRecarga } from "./showroom";

export interface PeajePunto {
  lat: number;
  lon: number;
  monto_uyu: number | null;
}

export interface RouteBreakdown {
  energia_kwh: number;
  tiempo_min: number;
  trafico_min: number;
  recarga_min: number;
  peaje: number;
  peaje_uyu: number;
  peajes_puntos?: PeajePunto[];
  // OJO semántica: cuando costo_uyu_recargas está presente (backend nuevo),
  // esto es SOLO la energía cargada en casa.
  costo_uyu_energia: number;
  costo_uyu_total: number;
  // Todo lo de abajo es opcional: el backend viejo en producción no lo manda,
  // y los replays del historial guardados antes de esta versión tampoco.
  energia_casa_kwh?: number;
  energia_recargada_kwh?: number;
  costo_uyu_recargas?: number;
  // Recargas en operadores sin tarifario publicado: quedan FUERA del total.
  recargas_sin_tarifa?: number;
  // Alineado 1 a 1 con `recharges` (mismo orden); trae node_id por si los
  // largos no coinciden y hay que caer a matchear por estación.
  recargas_costos?: ({ node_id: string } & TarifaRecarga)[];
}

export interface Recharge {
  node_id: number;
  added_kwh: number;
  time_min: number;
  station_name: string;
}

export interface RouteResult {
  found: boolean;
  route_coords: [number, number][];
  route: number[];
  node_coords: [number, number][];
  breakdown: RouteBreakdown;
  recharges: Recharge[];
}

export interface RouteBattery {
  llegada_kwh: number | null;
  llegada_pct: number | null;
  margen_pct: number;
  // false: ni agregando recargas se pudo respetar el margen pedido -- la ruta
  // devuelta es la mejor SIN margen y hay que mostrar la advertencia.
  margen_alcanzado: boolean;
}

export interface CompareRoutesResult {
  origin: { name: string };
  destination: { name: string };
  // Ausente en respuestas guardadas por versiones viejas (replay del historial).
  bateria?: RouteBattery;
  dijkstra: RouteResult | null;
  astar: RouteResult;
}

export interface CompareRoutesPayload {
  origin_id: number;
  destination_id: number;
  vehicle_id: number;
  start_battery_kwh?: number;
}

export interface LogTripPayload {
  origin_id: number;
  destination_id: number;
  vehicle_id: number;
  start_battery_kwh?: number;
  traveled_km: number;
  recharge_node_ids: number[];
}

export interface HistoryEntry {
  id?: number;
  created_at: string;
  origin_id: number;
  origin_name?: string;
  destination_id: number;
  destination_name?: string;
  vehicle_id: number;
  start_battery_kwh?: number;
  distance_km: number | null;
  energy_kwh: number | null;
  trip_time_min: number | null;
  costo_uyu_total: number | null;
  recharge_count: number;
  // Resultado completo (astar/dijkstra) de esta ruta, guardado en su momento
  // -- "ver" un viaje pasado redibuja esto sin volver a llamar al backend
  // (ver js/map/history.js).
  result?: { astar: RouteResult; dijkstra: RouteResult | null } | null;
}

export interface MonthlyStat {
  month: string;
  trip_count: number;
  total_distance_km: number | null;
  total_energy_kwh: number | null;
  total_cost_uyu: number | null;
  total_recharges: number;
  avg_distance_km: number | null;
  avg_cost_uyu: number | null;
}

export interface VehicleStat {
  vehicle_name: string;
  trip_count: number;
  total_distance_km: number | null;
  total_energy_kwh: number | null;
  total_cost_uyu: number | null;
  cost_uyu_per_km: number | null;
  total_recharges: number;
}

export function compareRoutes(payload: CompareRoutesPayload): Promise<CompareRoutesResult> {
  return apiFetch<CompareRoutesResult>("/api/route/compare", { method: "POST", body: payload });
}

export function logTrip(payload: LogTripPayload): Promise<void> {
  return apiFetch<void>("/api/route/log-trip", { method: "POST", body: payload });
}

export function getHistory(): Promise<HistoryEntry[]> {
  return apiFetch<HistoryEntry[]>("/api/route/history");
}

export function getMonthlyStats(): Promise<MonthlyStat[]> {
  return apiFetch<MonthlyStat[]>("/api/route/monthly-stats");
}

export function getVehicleStats(): Promise<VehicleStat[]> {
  return apiFetch<VehicleStat[]>("/api/route/vehicle-stats");
}
