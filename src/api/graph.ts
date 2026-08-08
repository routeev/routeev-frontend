import { apiFetch } from "./client";

export interface GraphNode {
  id: number;
  name: string;
  lat: number;
  lon: number;
  is_charging_station?: boolean;
}

export interface GraphEdge {
  from: number;
  to: number;
}

export interface GraphData {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

export interface StationConnector {
  tipo: string;
  con_cable?: boolean;
  potencia_kw: number;
  cantidad: number;
}

export interface Station {
  node_id: number;
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

export function getGraph(): Promise<GraphData> {
  return apiFetch<GraphData>("/api/graph");
}

export function getStations(): Promise<Station[]> {
  return apiFetch<Station[]>("/api/graph/stations");
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

export function geocode(address: string): Promise<GeocodeResult> {
  return apiFetch<GeocodeResult>(`/api/graph/geocode?q=${encodeURIComponent(address)}`);
}
