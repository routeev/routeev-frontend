// maplibre-gl no tiene export default (solo exports nombrados, ver su
// package.json/dist/maplibre-gl.mjs) -- import default rompia en runtime
// con "does not provide an export named 'default'" pese a compilar bien en
// tsc, porque ese chequeo lo hace el bundler (Vite/esbuild), no el tipado.
import * as maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
// El worker de MapLibre (parsea vector tiles fuera del hilo principal) rompe
// en el BUILD DE PRODUCCION si no se registra asi -- `?url` a secas lo emite
// tal cual, sin el chunk hermano (maplibre-gl-shared.mjs) del que depende, y
// falla en su primer import con un 404 real que Vercel responde con el
// index.html de la SPA (de ahi el "non-JavaScript MIME type" en consola).
// `?worker&url` lo hace pasar por el pipeline de workers de Vite, que arma
// un chunk autocontenido. Solo pasa en produccion -- `vite dev` funciona
// con cualquiera de los dos, por eso no se noto probando en local.
import workerUrl from "maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url";
import type { Theme } from "../theme/theme";

// El registro va aca, en el modulo del basemap, y no en cada componente que
// dibuja un mapa: los modulos ES se evaluan una sola vez y antes que quien
// los importa, asi que con solo tomar de aca el estilo o la atribucion ya
// queda hecho. Cuando lo registraba NavigationMap.tsx, cualquier mapa que no
// pasara por ese archivo (los de Leaflet, que ahora tambien son MapLibre por
// dentro) arrancaba sin el worker y volvia el 404 en produccion.
maplibregl.setWorkerUrl(workerUrl);

// Gratis, sin API key ni limite de uso (ver openfreemap.org) -- el mismo
// criterio de "RouteEV no depende de un plan pago de terceros" que ya regia
// para el resto de los datos del proyecto. Reemplaza a los mapas base de
// CARTO, que desde su cambio de plan estampan un cartel "API KEY REQUIRED"
// sobre cada tile que sirven sin cuenta: seguian cargando, pero con la marca
// de agua encima del mapa.
//
// El mapa sigue al tema de la aplicacion, igual que en routeev-movil (ver
// alla src/theme/mapStyle.ts, que usa este mismo par). Antes quedaba siempre
// oscuro por una razon que ya no aplica: el basemap dejo de ser un TileLayer
// de imagenes y pasa por MapLibre GL (ver BasemapLayer.tsx), que acepta una
// URL de estilo. Lo que si sigue sin poder leer var() es Leaflet para las
// polilineas de encima -- eso se resuelve aparte, en RouteLayers.
//
// `positron` es el equivalente claro de `dark` en OpenFreeMap.
export const DARK_BASEMAP_STYLE_URL = "https://tiles.openfreemap.org/styles/dark";
export const LIGHT_BASEMAP_STYLE_URL = "https://tiles.openfreemap.org/styles/positron";

/**
 * El estilo oscuro de OpenFreeMap pide una imagen "wood-pattern" (textura de
 * bosque) que su propio sprite no trae -- verificado el 30/9/2026 contra
 * sprites/ofm_f384/ofm.json. MapLibre avisa en la consola en cada carga, y sin
 * la imagen los bosques quedan con relleno liso, que es lo que se ve igual.
 * Responder al pedido con una imagen transparente de 1x1 deja exactamente eso
 * y saca el aviso. Vale para cualquier otra imagen que al estilo le falte.
 *
 * setMissingStyleImageResolver y no el evento "styleimagemissing": el
 * resolver corre ANTES de decidir el aviso y MapLibre espera su resultado; el
 * evento llega cuando el aviso ya salió (probado en NavigationMap, que fue el
 * primero en resolverlo). Lo usan los dos mapas: el de navegación y el
 * basemap de Leaflet (BasemapLayer), que hasta ahora seguía avisando.
 */
export function completarImagenesFaltantes(map: maplibregl.Map): void {
  map.setMissingStyleImageResolver((id) => {
    if (!map.hasImage(id)) map.addImage(id, { width: 1, height: 1, data: new Uint8Array(4) });
  });
}

export function basemapStyleForTheme(theme: Theme): string {
  return theme === "light" ? LIGHT_BASEMAP_STYLE_URL : DARK_BASEMAP_STYLE_URL;
}

// OpenFreeMap sirve tiles derivados de OpenStreetMap: acreditar a los dos es
// obligatorio (ODbL) y va en el control de atribucion de cada mapa.
export const BASEMAP_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://openfreemap.org">OpenFreeMap</a>';
