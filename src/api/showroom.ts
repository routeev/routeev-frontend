import { apiFetch } from "./client";

export interface ShowroomModel {
  id: string;
  marca: string;
  modelo: string;
  bateria_kwh: number;
  autonomia_aprox_km: number;
  potencia_carga_kw: number;
  consumo_kwh_km: number;
  fuente?: "catalogo" | "ia";
  nota?: string;
  foto_url?: string;
  foto_credito?: PhotoCredit;
}

export interface ShowroomCatalog {
  models: ShowroomModel[];
}

export interface ChargeCurveRow {
  potencia_kw: number;
  estaciones: number;
  potencia_efectiva_kw: number;
  minutos: number;
}

export interface ShowroomMetrics {
  autonomia_calculada_km: number;
  consumo_kwh_100km: number;
  costo_uyu_100km: number;
  energia_uyu_kwh: number;
  costo_carga_completa_uyu: number;
  carga_desde_pct: number;
  carga_hasta_pct: number;
  carga_km_recuperados: number;
  estaciones_red: number;
  carga: ChargeCurveRow[];
}

export interface ShowroomFicha {
  model: ShowroomModel;
  metricas: ShowroomMetrics;
}

export interface PhotoCredit {
  autor?: string;
  licencia?: string;
  archivo_url?: string;
}

export interface PhotoLookup {
  encontrada: boolean;
  url?: string;
  credito?: PhotoCredit;
}

export interface Destino {
  id: string;
  nombre: string;
  departamento: string;
}

export interface SimulateRequest {
  origin_id: string;
  destination_id: string;
  model_ids: string[];
  bateria_inicial_pct: number;
  ida_y_vuelta: boolean;
}

export interface RouteTramo {
  tramo: "ida" | "vuelta";
  distancia_km: number;
  conduccion_min: number;
  trafico_min: number;
  recarga_min: number;
  costo_uyu_total: number;
  costo_uyu_energia: number;
  energia_kwh: number;
  route_coords: [number, number][];
}

export interface RouteDetalle {
  distancia_km: number;
  conduccion_min: number;
  trafico_min: number;
  recarga_min: number;
  energia_kwh: number;
  costo_uyu_energia: number;
  peaje_uyu: number;
  peajes?: string;
  tramos: RouteTramo[];
}

export interface Parada {
  nombre: string;
  direccion?: string;
  operador?: string;
  minutos: number;
  kwh: number;
  potencia_kw: number;
  potencia_efectiva_kw?: number;
  conector?: string;
  lat: number;
  lon: number;
  tramo: "ida" | "vuelta";
}

export interface SimulateResult {
  llega: boolean;
  tiempo_total_min: number;
  bateria_llegada_pct: number;
  costo_uyu: number;
  detalle: RouteDetalle;
  paradas: Parada[];
}

export interface SimulateResponse {
  resultados: SimulateResult[];
}

export function showroomModels(concesionaria?: string): Promise<ShowroomCatalog> {
  const qs = concesionaria ? `?concesionaria=${encodeURIComponent(concesionaria)}` : "";
  return apiFetch<ShowroomCatalog>(`/api/showroom/models${qs}`);
}

export function showroomModel(id: string): Promise<ShowroomFicha> {
  return apiFetch<ShowroomFicha>(`/api/showroom/models/${encodeURIComponent(id)}`);
}

export function showroomImage(nombre: string): Promise<PhotoLookup> {
  return apiFetch<PhotoLookup>(`/api/showroom/imagen?q=${encodeURIComponent(nombre)}`);
}

export function showroomLookupAi(consulta: string): Promise<ShowroomFicha> {
  return apiFetch<ShowroomFicha>("/api/showroom/lookup-ai", { method: "POST", body: { consulta } });
}

export function showroomDestinos(): Promise<Destino[]> {
  return apiFetch<Destino[]>("/api/showroom/destinos");
}

export function showroomSimulate(payload: SimulateRequest): Promise<SimulateResponse> {
  return apiFetch<SimulateResponse>("/api/showroom/simulate", { method: "POST", body: payload });
}
