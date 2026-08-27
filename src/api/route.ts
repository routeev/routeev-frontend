import { apiFetch } from "./client";
import type { NodeId } from "./graph";
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
  node_id: NodeId;
  added_kwh: number;
  time_min: number;
  station_name: string;
  // Solo presente cuando este resultado vino de planRoute() (v2, ver
  // toCompareRoutesResult mas abajo). Un resultado viejo, guardado en el
  // historial ANTES de esta version y reproducido con "Ver" (replay), no
  // los tiene -- useLiveTrip.ts cae a su alternativa (route/node_coords)
  // cuando faltan, asi que "Iniciar viaje" sobre un replay viejo sigue
  // funcionando igual que siempre.
  lat?: number;
  lon?: number;
}

export interface RouteResult {
  found: boolean;
  route_coords: [number, number][];
  route: NodeId[];
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
  // La reserva que la busqueda exigio DE VERDAD. Opcional: ausente en
  // respuestas guardadas por versiones viejas (replay del historial).
  //
  // Hace falta para poder explicar por que un viaje no da: sin esto la pantalla
  // ve margen_pct = 10 y una ruta descartada por una reserva que en realidad
  // equivalia al 22%, porque el cargador del destino estaba a 40 km.
  reserva?: RouteReserva;
}

export interface RouteReserva {
  kwh: number;
  // La reserva como % de la capacidad. Puede ser MAYOR que margen_pct.
  pct: number;
  // "margen": el colchon de siempre.
  // "cargador_destino": subio para poder alcanzar un cargador al llegar.
  motivo: "margen" | "cargador_destino";
}

/**
 * Estacion de carga con su distancia a un punto por el que se pregunto.
 * Ver app/estaciones.py: estacion_a_dict.
 */
export interface EstacionCercana {
  node_id: NodeId;
  nombre: string;
  direccion: string | null;
  departamento: string | null;
  ciudad: string | null;
  operador: string | null;
  potencia_kw: number | null;
  lat: number;
  lon: number;
  // EN LINEA RECTA, no por calle: la pantalla tiene que decirlo asi. Mostrar
  // "a 12 km" cuando por calle son 17 es exactamente el numero de mas que hace
  // que alguien se quede sin bateria confiando en la app.
  distancia_km_recta: number;
}

/**
 * El cargador mas cercano al destino, cuando se pidio la ruta declarando que
 * alla no hay donde enchufar. Es EstacionCercana mas por que importa.
 */
export interface CargadorDestino extends EstacionCercana {
  // Energia estimada para llegar hasta el, con el factor de seguridad aplicado.
  energia_estimada_kwh: number;
  // true si la reserva efectivamente subio para poder alcanzarlo.
  cubierto_por_la_reserva: boolean;
  // true si esta tan lejos que cubrirlo pediria media bateria: se informa, pero
  // la reserva no lo intenta. Ahi el problema no es el margen, es que no hay
  // infraestructura, y corresponde decirlo.
  demasiado_lejos: boolean;
}

/**
 * El respaldo de una parada: a que OTRO cargador se llegaria si el de esa
 * parada no funciona. Mismo shape que el cargador del destino, porque es la
 * misma pregunta hecha en otro momento del viaje.
 */
export type CargadorRespaldo = CargadorDestino;

export interface RespaldoParada {
  node_id: string;
  estacion: string;
  // null cuando el backend no supo calcularlo (o es una respuesta vieja).
  respaldo?: CargadorRespaldo | null;
}

export interface CompareRoutesResult {
  origin: { name: string };
  destination: { name: string };
  // Ausente en respuestas guardadas por versiones viejas (replay del historial).
  bateria?: RouteBattery;
  // Con dato solo cuando se pidio con cargador_en_destino: false.
  cargador_destino?: CargadorDestino | null;
  // Si el plan garantiza que a cada parada se llega con bateria para alcanzar
  // otro cargador en caso de que ese no funcione. Opcional: una API vieja no lo
  // manda y la interfaz simplemente no muestra la seccion.
  respaldo_paradas?: {
    cubierto: boolean;
    paradas: RespaldoParada[];
  };
  dijkstra: RouteResult | null;
  astar: RouteResult;
}

export interface CompareRoutesPayload {
  origin_id: NodeId;
  destination_id: NodeId;
  vehicle_id: number;
  start_battery_kwh?: number;
  // ¿Hay donde enchufar en el destino? El backend asume true si no se manda.
  // En false el margen deja de ser "llegar con colchon" y pasa a ser "llegar
  // pudiendo alcanzar un cargador" (ver reserva_para_destino en la API).
  cargador_en_destino?: boolean;
}

// -- v2, Fase 4 de la migracion a Valhalla (POST /api/route/plan) ----------
//
// Convive con compareRoutes: no lo reemplaza todavia. origen/destino pasan a
// ser coordenadas (ver VALHALLA.md §9) en vez de ids del grafo propio -- por
// eso toCompareRoutesResult existe: adapta la respuesta nueva a la MISMA
// forma que ya consume toda la interfaz (StationsLayer, TripDashboard,
// tripStats, useLiveTrip), para no tener que tocar ninguno de esos archivos.

export interface RoutePlanPayload {
  origen: { lat: number; lon: number };
  destino: { lat: number; lon: number };
  vehicle_id: number;
  start_battery_kwh?: number;
  cargador_en_destino?: boolean;
  comparar?: boolean;
}

/** Una parada de carga con la ficha completa (ver estaciones.estacion_a_dict en la API) -- lo que reemplaza a route/node_coords en v2. */
export interface ParadaV2 {
  node_id: NodeId;
  nombre: string;
  direccion: string | null;
  departamento: string | null;
  ciudad: string | null;
  operador: string | null;
  potencia_kw: number | null;
  conectores: unknown;
  lat: number;
  lon: number;
  added_kwh: number;
  time_min: number;
}

interface RouteResultV2 {
  found: boolean;
  algorithm: string;
  cost_total: number | null;
  route_coords: [number, number][];
  nodes_expanded: number;
  execution_time_ms: number;
  breakdown: RouteBreakdown;
}

export interface CompareRoutesResultV2 {
  bateria?: RouteBattery;
  cargador_destino?: CargadorDestino | null;
  respaldo_paradas?: { cubierto: boolean; paradas: RespaldoParada[] };
  paradas: ParadaV2[];
  astar: RouteResultV2;
  dijkstra: RouteResultV2 | null;
}

export function planRoute(payload: RoutePlanPayload): Promise<CompareRoutesResultV2> {
  return apiFetch<CompareRoutesResultV2>("/api/route/plan", { method: "POST", body: payload });
}

/**
 * Adapta una respuesta de planRoute() (v2) a la misma forma que devuelve
 * compareRoutes() (v1), para que el resto de la interfaz no tenga que saber
 * cual de las dos calculó la ruta. `originName`/`destinationName` van aparte
 * porque v2 no los devuelve (no hay grafo propio que los sepa de memoria):
 * el llamador ya los tiene, son el nombre que se muestra en los campos de
 * "¿Desde dónde salís?"/"¿A dónde vas?" al elegir el punto.
 *
 * `dijkstra.recharges` queda vacío a propósito: v2 solo arma la ficha
 * completa de paradas para el resultado de A* (el que se dibuja y compara),
 * no para Dijkstra -- que además, por la garantía central del motor (los dos
 * algoritmos dan el mismo óptimo), casi nunca termina siendo el resultado
 * que se muestra.
 */
export function toCompareRoutesResult(
  v2: CompareRoutesResultV2,
  originName: string,
  destinationName: string
): CompareRoutesResult {
  const recharges: Recharge[] = v2.paradas.map((p) => ({
    node_id: p.node_id,
    added_kwh: p.added_kwh,
    time_min: p.time_min,
    station_name: p.nombre,
    lat: p.lat,
    lon: p.lon,
  }));
  const toRouteResult = (r: RouteResultV2, withRecharges: boolean): RouteResult => ({
    found: r.found,
    route_coords: r.route_coords,
    route: [],
    node_coords: [],
    breakdown: r.breakdown,
    recharges: withRecharges ? recharges : [],
  });
  return {
    origin: { name: originName },
    destination: { name: destinationName },
    bateria: v2.bateria,
    cargador_destino: v2.cargador_destino,
    respaldo_paradas: v2.respaldo_paradas,
    astar: toRouteResult(v2.astar, true),
    dijkstra: v2.dijkstra ? toRouteResult(v2.dijkstra, false) : null,
  };
}

export interface LogTripPayload {
  origin_id: NodeId;
  destination_id: NodeId;
  vehicle_id: number;
  start_battery_kwh?: number;
  traveled_km: number;
  recharge_node_ids: NodeId[];
}

export interface HistoryEntry {
  id?: number;
  created_at: string;
  origin_id: NodeId;
  origin_name?: string;
  destination_id: NodeId;
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
