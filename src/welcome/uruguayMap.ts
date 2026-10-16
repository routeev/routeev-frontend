/**
 * Geometría simplificada de Uruguay para las ilustraciones de la bienvenida
 * (la textura de fondo y el mapa del mockup del teléfono) y el mapa del hero
 * de la landing. Son dibujos, no cartografía: una treintena de puntos para el
 * contorno y las rutas nacionales principales en trazo recto entre ciudades.
 * Para el mapa de verdad está /app.
 */

type LatLon = readonly [lat: number, lon: number];

export const URUGUAY_OUTLINE: readonly LatLon[] = [
  [-30.19, -57.61],
  [-30.3, -57.05],
  [-30.4, -56.47],
  [-30.75, -55.85],
  [-30.9, -55.55],
  [-31.08, -55.25],
  [-31.3, -55.0],
  [-31.65, -54.55],
  [-31.87, -54.16],
  [-32.25, -53.75],
  [-32.58, -53.38],
  [-33.1, -53.3],
  [-33.5, -53.5],
  [-33.72, -53.4],
  [-34.05, -53.58],
  [-34.4, -53.78],
  [-34.66, -54.16],
  [-34.92, -54.95],
  [-34.82, -55.35],
  [-34.8, -55.8],
  [-34.92, -56.15],
  [-34.85, -56.4],
  [-34.72, -56.8],
  [-34.45, -57.2],
  [-34.47, -57.85],
  [-34.2, -58.25],
  [-33.88, -58.42],
  [-33.12, -58.3],
  [-32.32, -58.08],
  [-31.39, -57.96],
  [-30.8, -57.85],
];

export const NATIONAL_ROADS: readonly (readonly LatLon[])[] = [
  [
    [-34.885, -56.18],
    [-34.63, -56.62],
    [-34.47, -57.84],
  ],
  [
    [-34.63, -56.62],
    [-34.34, -56.71],
    [-33.52, -56.9],
    [-32.8, -57.6],
    [-32.32, -58.08],
    [-31.39, -57.96],
    [-30.27, -57.6],
  ],
  [
    [-34.885, -56.18],
    [-34.72, -55.95],
    [-34.37, -55.23],
    [-33.23, -54.38],
    [-32.37, -54.17],
    [-31.87, -54.16],
  ],
  [
    [-34.72, -55.95],
    [-34.79, -54.92],
    [-34.48, -54.33],
    [-33.7, -53.46],
  ],
  [
    [-32.32, -58.08],
    [-32.1, -57.1],
    [-31.73, -55.98],
    [-32.1, -55.1],
    [-32.37, -54.17],
  ],
  [
    [-34.32, -57.35],
    [-33.25, -58.03],
    [-33.12, -58.3],
  ],
  [
    [-30.4, -56.47],
    [-31.2, -55.75],
    [-31.73, -55.98],
  ],
  [
    [-34.885, -56.18],
    [-34.18, -55.74],
    [-33.4, -55.6],
    [-32.37, -54.17],
  ],
];

/** Ruta 5, Montevideo → Rivera. El punto 6 es la parada de carga (Paso de los Toros). */
export const ROUTE_5: readonly LatLon[] = [
  [-34.885, -56.18],
  [-34.73, -56.22],
  [-34.53, -56.28],
  [-34.1, -56.22],
  [-33.73, -56.33],
  [-33.38, -56.52],
  [-32.82, -56.52],
  [-32.3, -56.3],
  [-31.73, -55.98],
  [-31.3, -55.75],
  [-30.905, -55.55],
];
export const ROUTE_5_CHARGE_STOP_INDEX = 6;

/** Ancho del mundo en Web Mercator a zoom 7: 2^7 teselas de 256px. */
const WORLD_PX = 32768;
const TILE_PX = 256;

/**
 * Web Mercator a zoom 7, en pixeles relativos a la esquina de la tesela
 * (tileX, tileY): la misma proyección que usan las teselas del mapa real,
 * así el dibujo tiene las proporciones del país y no un contorno aplastado.
 */
export function project([lat, lon]: LatLon, tileX: number, tileY: number): [x: number, y: number] {
  const rad = (lat * Math.PI) / 180;
  const x = ((lon + 180) / 360) * WORLD_PX - tileX * TILE_PX;
  const y =
    ((1 - Math.log(Math.tan(rad) + 1 / Math.cos(rad)) / Math.PI) / 2) * WORLD_PX - tileY * TILE_PX;
  return [x, y];
}

/** Lista de puntos proyectados en el formato del atributo `points` de SVG. */
export function toSvgPoints(line: readonly LatLon[], tileX: number, tileY: number): string {
  return line
    .map((p) => project(p, tileX, tileY))
    .map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`)
    .join(" ");
}
