/**
 * Precarga de los tiles del mapa a lo largo de la ruta durante el viaje en
 * vivo, para que el mapa de navegación no muestre cuadros grises cuando el
 * celular pierde señal en la ruta (o la gana tarde).
 *
 * El basemap son tiles vectoriales de OpenFreeMap (ver basemap.ts) con zoom
 * máximo 14: el mapa de navegación (zoom 17) agranda esos mismos tiles, así
 * que alcanza con los de z14. Pesan de ~15 KB en ruta abierta a ~270 KB en el
 * centro de Montevideo (medido el 30/10/2026), y el servidor los manda con
 * Cache-Control de 10 años y CORS abierto: pedirlos con fetch() los deja en el
 * cache HTTP del navegador, y cuando maplibre los pide de verdad salen de ahí.
 *
 * Por tramos y no la ruta entera de una: Montevideo -> Rivera son ~500 km y
 * varios MB de datos móviles de golpe al tocar "Iniciar viaje". Se precargan
 * los próximos LOOKAHEAD_KM y se va corriendo la ventana a medida que avanza
 * el viaje: en total se baja lo mismo que se vería manejando, solo que antes.
 */

/** Zoom de los tiles vectoriales de OpenFreeMap (maxzoom de su TileJSON). */
export const TILE_ZOOM = 14;
/** Cuánto por delante de la posición actual se precarga. */
export const LOOKAHEAD_KM = 25;
/** Cada cuánto se toma un punto de la ruta para ver en qué tile cae. */
const SAMPLE_KM = 0.5;
/**
 * Margen alrededor de cada punto, en grados (~300 m): cerca del borde de un
 * tile, la pantalla del mapa de navegación ya muestra parte del vecino.
 */
const MARGIN_DEG = 0.003;
const CONCURRENCY = 4;
const TILEJSON_URL = "https://tiles.openfreemap.org/planet";

/** El tile (x, y) que contiene una coordenada, en el esquema XYZ de siempre. */
export function tileFor(lat: number, lon: number, z: number): [number, number] {
  const n = 2 ** z;
  const x = Math.floor(((lon + 180) / 360) * n);
  const latRad = (lat * Math.PI) / 180;
  const y = Math.floor(((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) * n);
  return [x, y];
}

/** Punto de la ruta a `km` del origen, interpolado sobre el tramo que lo contiene. */
function pointAt(coords: [number, number][], cum: number[], km: number): [number, number] {
  let i = 1;
  while (i < cum.length - 1 && cum[i]! < km) i++;
  const a = coords[i - 1]!;
  const b = coords[i]!;
  const largo = cum[i]! - cum[i - 1]!;
  const t = largo > 0 ? Math.min(1, Math.max(0, (km - cum[i - 1]!) / largo)) : 0;
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
}

/**
 * Claves "z/x/y" de los tiles que cubren la ruta entre `desdeKm` y `hastaKm`,
 * en el orden en que se recorren (los más cercanos primero).
 */
export function tilesAlongRoute(
  coords: [number, number][],
  cum: number[],
  desdeKm: number,
  hastaKm: number,
  z = TILE_ZOOM
): string[] {
  if (coords.length < 2) return [];
  const total = cum[cum.length - 1]!;
  const fin = Math.min(hastaKm, total);
  const vistos = new Set<string>();
  for (let km = Math.max(0, desdeKm); km <= fin + SAMPLE_KM / 2; km += SAMPLE_KM) {
    const [lat, lon] = pointAt(coords, cum, Math.min(km, total));
    for (const dLat of [-MARGIN_DEG, 0, MARGIN_DEG]) {
      for (const dLon of [-MARGIN_DEG, 0, MARGIN_DEG]) {
        const [x, y] = tileFor(lat + dLat, lon + dLon, z);
        vistos.add(`${z}/${x}/${y}`);
      }
    }
  }
  return [...vistos];
}

/** La plantilla `.../{z}/{x}/{y}.pbf` vigente: OpenFreeMap la versiona por fecha. */
let plantilla: Promise<string | null> | null = null;
function tileUrlTemplate(): Promise<string | null> {
  plantilla ??= fetch(TILEJSON_URL)
    .then((r) => (r.ok ? r.json() : null))
    .then((tj: { tiles?: string[] } | null) => tj?.tiles?.[0] ?? null)
    .catch(() => {
      // Sin red al arrancar: se vuelve a intentar en la próxima ventana.
      plantilla = null;
      return null;
    });
  return plantilla;
}

export interface RoutePrefetcher {
  /** La posición actual sobre la ruta: precarga hasta `km + LOOKAHEAD_KM`. */
  advance(km: number): void;
  /** Corta lo que esté en vuelo (fin del viaje). */
  stop(): void;
}

/**
 * Precargador de una ruta. Nunca pide dos veces el mismo tile, nunca más de
 * CONCURRENCY a la vez, y no hace nada si el navegador pidió ahorrar datos
 * (Save-Data): ahí el mapa carga los tiles como siempre, al verlos.
 */
export function createRoutePrefetcher(coords: [number, number][], cum: number[]): RoutePrefetcher {
  const pedidos = new Set<string>();
  const cola: string[] = [];
  const control = new AbortController();
  let enVuelo = 0;
  let hastaKm = -1;
  const ahorro = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData === true;

  async function bombear() {
    const url = await tileUrlTemplate();
    if (!url || control.signal.aborted) return;
    while (enVuelo < CONCURRENCY && cola.length > 0) {
      const clave = cola.shift()!;
      const [z, x, y] = clave.split("/");
      enVuelo++;
      fetch(url.replace("{z}", z!).replace("{x}", x!).replace("{y}", y!), { signal: control.signal })
        .then((r) => r.arrayBuffer())
        .catch(() => {
          // Un tile que falla se olvida: maplibre lo vuelve a pedir al verlo.
          pedidos.delete(clave);
        })
        .finally(() => {
          enVuelo--;
          void bombear();
        });
    }
  }

  return {
    advance(km: number) {
      if (ahorro || control.signal.aborted) return;
      const objetivo = km + LOOKAHEAD_KM;
      // Recalcular la ventana entera en cada fix de GPS es trabajo tirado:
      // solo cuando se avanzó al menos un tramo de muestreo.
      if (objetivo <= hastaKm + SAMPLE_KM) return;
      for (const clave of tilesAlongRoute(coords, cum, Math.max(km, hastaKm), objetivo)) {
        if (!pedidos.has(clave)) {
          pedidos.add(clave);
          cola.push(clave);
        }
      }
      hastaKm = objetivo;
      void bombear();
    },
    stop() {
      control.abort();
      cola.length = 0;
    },
  };
}
