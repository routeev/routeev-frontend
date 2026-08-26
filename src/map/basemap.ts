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
export const BASEMAP_STYLE_URL = "https://tiles.openfreemap.org/styles/dark";

// OpenFreeMap sirve tiles derivados de OpenStreetMap: acreditar a los dos es
// obligatorio (ODbL) y va en el control de atribucion de cada mapa.
export const BASEMAP_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://openfreemap.org">OpenFreeMap</a>';
