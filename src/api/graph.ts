import { apiFetch } from "./client";

/**
 * Id de un nodo del grafo vial. Es un STRING, no un número: el backend lo
 * declara `NodeId = Annotated[str, ...]` (routeev-api/app/schemas.py:95) y en
 * los datos son `"n0"`, `"n11573"` (data/seed_graph.json) o `"station_7"` para
 * las estaciones. El `id: number` que estaba acá era mentira de tipos desde
 * siempre: nunca falló porque TypeScript no valida la respuesta de la red,
 * pero cualquier cuenta o comparación numérica sobre un id estaba rota.
 */
export type NodeId = string;

export interface GraphNode {
  id: NodeId;
  name: string;
  lat: number;
  lon: number;
  is_charging_station?: boolean;
}

export interface StationConnector {
  tipo: string;
  con_cable?: boolean;
  potencia_kw: number;
  cantidad: number;
}

export interface Station {
  node_id: NodeId;
  nombre: string;
  lat: number;
  lon: number;
  potencia_kw: number;
  direccion: string;
  departamento?: string;
  tipo_conector: string;
  operador: string;
  nota: string;
  conectores?: StationConnector[];
}

export interface GeocodeResult {
  node: GraphNode;
  matched_address: string;
  distance_to_node_km: number;
}

export function getStations(): Promise<Station[]> {
  return apiFetch<Station[]>("/api/graph/stations");
}

/**
 * Enum cerrado del backend (routeev-api/app/estado_estaciones.py). `desconocido`
 * es un valor legítimo y frecuente: significa que la fuente mandó algo que no
 * está en su tabla de traducción, y la interfaz no muestra nada. No inventar
 * un estado a partir de él.
 */
export type EstadoEstacion = "disponible" | "ocupado" | "fuera_de_servicio" | "desconocido";

export interface EstadoConector {
  tipo: string | null;
  cantidad: number | null;
  estado: EstadoEstacion;
  /** El valor tal cual lo mandó la fuente. Solo para diagnosticar, no se muestra. */
  crudo: string | null;
}

export interface EstadoDeEstacion {
  estado: EstadoEstacion;
  crudo: string | null;
  conectores: EstadoConector[];
}

export interface EstadoEstaciones {
  /**
   * `false` es una respuesta NORMAL, no un error. Hoy es la única que devuelve
   * el backend: el feed de UTE reporta a las 213 estaciones del país con el
   * mismo estado, así que no se publica ninguno (ver el docstring de
   * app/estado_estaciones.py). Con `disponible: false`, `estados` viene vacío
   * y la interfaz no muestra absolutamente nada de estado -- que es lo
   * correcto cuando no se sabe.
   */
  disponible: boolean;
  /** Por qué no se publica, cuando no se publica. Para el log, no para el usuario. */
  motivo: string | null;
  actualizado: string | null;
  fuente: string;
  estaciones_en_feed: number;
  cobertura: number;
  /** node_id -> estado. Solo estaciones de UTE: ningún operador privado publica estado. */
  estados: Record<NodeId, EstadoDeEstacion>;
}

export function getStationStatus(): Promise<EstadoEstaciones> {
  return apiFetch<EstadoEstaciones>("/api/graph/stations/estado");
}

// 3000 es el tope que acepta el backend: con eso el autocompletado local
// (mientras se tipea, sin ir al servidor) cubre muchas mas calles reales, y
// el payload extra se paga una sola vez al abrir el mapa (ver js/map/graphData.js).
export function getSearchableNodes(): Promise<GraphNode[]> {
  return apiFetch<GraphNode[]>("/api/graph/searchable-nodes?limit=3000");
}

// POST aunque solo consulte: la coordenada puede ser la ubicacion real del
// usuario, y en la URL de un GET quedaria en los logs de acceso del servidor.
export function getNearestNode(lat: number, lon: number): Promise<GraphNode> {
  return apiFetch<GraphNode>("/api/graph/nearest", { method: "POST", body: { lat, lon } });
}

/** Una ciudad, pueblo o balneario que el buscador de "Tu viaje" reconoce por nombre. */
export interface Localidad {
  nombre: string;
  departamento: string;
  /** La que representa al departamento cuando se lo elige como origen o destino. */
  es_capital?: boolean;
  alias: string[];
  lat: number;
  lon: number;
}

export function getLocalidades(): Promise<{ localidades: Localidad[] }> {
  return apiFetch<{ localidades: Localidad[] }>("/api/graph/localidades");
}

export function geocode(address: string): Promise<GeocodeResult> {
  return apiFetch<GeocodeResult>(`/api/graph/geocode?q=${encodeURIComponent(address)}`);
}
