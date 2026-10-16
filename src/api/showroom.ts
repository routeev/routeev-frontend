import { apiFetch } from "./client";

export interface ShowroomModel {
  id: string;
  marca: string;
  modelo: string;
  bateria_kwh: number;
  autonomia_aprox_km: number;
  /**
   * La autonomía de HOMOLOGACIÓN (WLTP, o CLTC/NEDC en varios chinos), cuando
   * difiere de la real. No es lo mismo que `autonomia_aprox_km`: esa es la que
   * usa el motor de ruteo, calculada con el consumo de mundo real. Solo existe
   * donde las dos cifras no coinciden — ver `data/correcciones_specs.json` en
   * la API y la sección "Las dos autonomías" de DATOS-Y-LICENCIAS.md.
   */
  autonomia_homologada_km?: number | null;
  potencia_carga_kw: number;
  consumo_kwh_km: number;
  fuente?: "catalogo" | "ia";
  nota?: string;
  foto_url?: string;
  foto_credito?: PhotoCredit;
  /**
   * Nombre(s) con los que se conoce el auto acá, cuando no coinciden con el
   * de fábrica ("E2" para el BYD Dolphin). Sale de la curaduría propia en
   * `data/nombres_locales.json`.
   *
   * Opcional y de forma laxa a propósito: el que está en producción todavía no
   * lo manda. Nunca leerlo directo -- usar modelAliases()/familyAliases() de
   * showroom/modelAlias.ts, que se bancan que falte, que venga como string
   * suelto o que traiga basura adentro.
   */
  nombres_locales?: string[] | null;
  /**
   * Línea del modelo y versión dentro de esa línea, separadas por el backend
   * ("Dolphin" + "60,4 kWh"). Antes la versión venía embutida dentro de
   * `modelo` como texto y no había forma de agrupar variantes sin adivinar.
   */
  linea?: string;
  version?: string;
  /**
   * Precio de lista en Uruguay (USD), solo para el subconjunto chico de
   * modelos que lo tiene (ver la nota de `data/precios_uy.json` en la API) —
   * null para el resto del catálogo, nunca una estimación. Sirve para una
   * sola cosa: la franja del IMESI a eléctricos que empieza a regir el
   * 1/enero/2027.
   */
  precio_uy?: PrecioUy | null;
}

export interface FranjaImesi2027 {
  tramo: "exento" | "tramo_5" | "tramo_9";
  porcentaje_2027: number;
  vigente_desde: string;
  // Siempre true: se calcula sobre precio de lista, no sobre el valor de
  // importación real (no es público por modelo) — ver app/imesi.py.
  aproximado: boolean;
}

export interface PrecioUy {
  precio_usd: number;
  fuente: string;
  verificado_el: string;
  imesi_2027: FranjaImesi2027;
}

export interface ShowroomCatalog {
  models: ShowroomModel[];
}

// Cotización de una recarga en ruta con el tarifario real del operador
// (pliego UTE 2026: cargo por conexión + energía, con AC y DC a precios
// distintos). Si el operador no publica tarifario, TODO viene null y
// tarifa_conocida en false: el costo "no se sabe", nunca se inventa.
export interface TarifaRecarga {
  tarifa_conocida: boolean;
  operador_tarifa: string | null;
  modalidad: "AC" | "DC" | null;
  tarifa_uyu_kwh: number | null;
  cargo_base_uyu: number | null;
  costo_energia_uyu: number | null;
  // Cargo base + energía; null si no hay tarifario publicado.
  costo_uyu: number | null;
  // $/min por quedarse enchufado SIN cargar, pasada la tolerancia de abajo.
  // Informativo (depende del conductor): NO va sumado a ningún total.
  ocupacion_uyu_min: number | null;
  ocupacion_tolerancia_min: number | null;
  // Cargos de operadores privados (UMT); también informativos.
  estacionamiento_uyu_min: number | null;
  reserva_uyu: number | null;
}

export interface ChargeCurveRow {
  potencia_kw: number;
  estaciones: number;
  potencia_efectiva_kw: number;
  minutos: number;
  // Opcionales: el backend viejo en producción no los manda.
  modalidad?: "AC" | "DC";
  costo_uyu?: number | null;
}

// Precios publicados de una modalidad de carga (AC o DC) en la red pública.
export interface TarifaRedModalidad {
  cargo_base_uyu: number;
  energia_uyu_kwh: number;
  ocupacion_uyu_min: number;
  ocupacion_tolerancia_min: number;
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
  // Tarifario vigente de la red (pliego UTE). Opcional: backend viejo no lo
  // manda, y en ese caso los costos de la ficha siguen siendo "a precio de casa".
  tarifas_red?: {
    operador: string | null;
    vigencia: string;
    casa_uyu_kwh: number;
    ac: TarifaRedModalidad | null;
    dc: TarifaRedModalidad | null;
  };
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
  // OJO semántica: cuando costo_uyu_recargas está presente (backend nuevo),
  // esto es SOLO la energía cargada en casa; las recargas en ruta van aparte,
  // cotizadas con el tarifario de cada operador.
  costo_uyu_energia: number;
  energia_kwh: number;
  route_coords: [number, number][];
  // Opcionales: el backend viejo en producción no los manda.
  costo_uyu_recargas?: number;
  // Recargas en operadores sin tarifario publicado: quedan FUERA del total.
  recargas_sin_tarifa?: number;
}

export interface RouteDetalle {
  distancia_km: number;
  conduccion_min: number;
  trafico_min: number;
  recarga_min: number;
  energia_kwh: number;
  // Misma semántica nueva que en RouteTramo: solo energía de casa cuando
  // costo_uyu_recargas está presente.
  costo_uyu_energia: number;
  peaje_uyu: number;
  // Cuántos peajes hay en el camino. El backend en producción manda un número;
  // el tipo viejo decía string, así que se lee con Number() y se tolera igual.
  peajes?: number | string;
  tramos: RouteTramo[];
  costo_uyu_recargas?: number;
  recargas_sin_tarifa?: number;
}

export interface Parada {
  nombre: string;
  direccion?: string;
  // Opcionales: el backend viejo no los manda.
  ciudad?: string;
  departamento?: string;
  operador?: string;
  minutos: number;
  kwh: number;
  potencia_kw: number;
  potencia_efectiva_kw?: number;
  conector?: string;
  lat: number;
  lon: number;
  tramo: "ida" | "vuelta";
  // Costo de ESTA recarga según el tarifario del operador; null si no publica.
  costo_uyu?: number | null;
  tarifa?: TarifaRecarga | null;
}

export interface SimulateResult {
  llega: boolean;
  tiempo_total_min: number;
  bateria_llegada_pct: number;
  // false: ni agregando recargas se pudo respetar el margen de seguridad --
  // el plan mostrado es el mejor SIN margen. Opcional por si el backend
  // deployado todavía no manda el campo.
  margen_alcanzado?: boolean;
  costo_uyu: number;
  detalle: RouteDetalle;
  paradas: Parada[];
}

export interface SimulateResponse {
  // % de la capacidad que el plan mantiene como piso (default del backend: 10).
  margen_bateria_pct?: number;
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
  // El campo se llama "query" en ShowroomLookupRequest (schemas.py); mandarlo
  // como "consulta" devolvía 422 ("Field required, Extra inputs are not
  // permitted") y rompía el botón "Identificarlo con IA".
  return apiFetch<ShowroomFicha>("/api/showroom/lookup-ai", { method: "POST", body: { query: consulta } });
}

export function showroomDestinos(): Promise<Destino[]> {
  return apiFetch<Destino[]>("/api/showroom/destinos");
}

export function showroomSimulate(payload: SimulateRequest): Promise<SimulateResponse> {
  return apiFetch<SimulateResponse>("/api/showroom/simulate", { method: "POST", body: payload });
}
