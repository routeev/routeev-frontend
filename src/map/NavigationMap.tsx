import "maplibre-gl/dist/maplibre-gl.css";
// maplibre-gl no tiene export default (solo exports nombrados, ver su
// package.json/dist/maplibre-gl.mjs) -- import default rompía en runtime
// con "does not provide an export named 'default'" pese a compilar bien en
// tsc, porque ese chequeo lo hace el bundler (Vite/esbuild), no el tipado.
import * as maplibregl from "maplibre-gl";
// El worker de MapLibre (parsea vector tiles fuera del hilo principal) rompe
// en el BUILD DE PRODUCCIÓN si no se registra así -- `?url` a secas lo emite
// tal cual, sin el chunk hermano (maplibre-gl-shared.mjs) del que depende, y
// falla en su primer import con un 404 real que Vercel responde con el
// index.html de la SPA (de ahí el "non-JavaScript MIME type" en consola).
// `?worker&url` lo hace pasar por el pipeline de workers de Vite, que arma
// un chunk autocontenido. Solo pasa en producción -- `vite dev` funciona
// con cualquiera de los dos, por eso no se notó probando en local.
import workerUrl from "maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url";
import { useEffect, useRef } from "react";
import styles from "./NavigationMap.module.css";

maplibregl.setWorkerUrl(workerUrl);

// Mismo par que RouteLayers.tsx (COLOR_ASTAR): ninguna de las dos librerías
// de mapa puede leer var() en runtime, así que el color queda hardcodeado
// acá también.
const ROUTE_COLOR = "#34e3a8";

// gratis, sin API key ni límite de uso (ver openfreemap.org) -- mismo
// criterio de "RouteEV no depende de un plan pago de terceros" que ya regía
// para el resto de los datos del proyecto.
const STYLE_URL = "https://tiles.openfreemap.org/styles/dark";

const NAV_ZOOM = 17;
const NAV_PITCH = 60;
// Similar al intervalo real de watchPosition (ver useLiveTrip.ts): bastante
// para que la cámara se sienta fluida, no tan largo como para que vaya
// siempre un paso atrás de la posición real.
const EASE_DURATION_MS = 900;

function routeToGeoJSON(coords: [number, number][]): GeoJSON.Feature<GeoJSON.LineString> {
  return {
    type: "Feature",
    properties: {},
    geometry: { type: "LineString", coordinates: coords.map(([lat, lon]): [number, number] => [lon, lat]) },
  };
}

interface NavigationMapProps {
  /** [lat, lon]. null hasta que el primer fix del GPS llega (ver useLiveTrip.ts). */
  position: [number, number] | null;
  /** 0-360°, 0=norte. null hasta que hay movimiento real para calcularlo. */
  heading: number | null;
  /** Recorrido completo calculado, fijo durante todo el viaje. */
  routeCoords: [number, number][];
}

/**
 * Modo navegación en vivo (cámara en perspectiva, rotando hacia donde se
 * viaja, tipo Google Maps) durante "Iniciar viaje". Leaflet no tiene noción
 * de inclinación/rotación de cámara -- por eso este modo usa un motor
 * distinto (MapLibre GL) en vez de una capa más del mapa de planificación
 * (MapCanvas.tsx), que se sigue usando para todo lo demás.
 */
export function NavigationMap({ position, heading, routeCoords }: NavigationMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markerRef = useRef<maplibregl.Marker | null>(null);
  const loadedRef = useRef(false);
  // El efecto de montaje usa el valor INICIAL de estos props (centro de
  // arranque, recorrido a dibujar) y no debe volver a correr si cambian --
  // seguirlos en vivo es trabajo del efecto de más abajo. Sin refs, incluir
  // `position`/`routeCoords` en las deps del primero recrearía el mapa
  // entero (con su animación de estilo) en cada fix del GPS.
  const initialPositionRef = useRef(position);
  initialPositionRef.current = position;
  const routeCoordsRef = useRef(routeCoords);
  routeCoordsRef.current = routeCoords;

  useEffect(() => {
    if (!containerRef.current) return;
    const startCoords = initialPositionRef.current ?? routeCoordsRef.current[0];
    const startLngLat: [number, number] = startCoords ? [startCoords[1], startCoords[0]] : [-56.16, -34.9];

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: STYLE_URL,
      center: startLngLat,
      zoom: NAV_ZOOM,
      pitch: NAV_PITCH,
      bearing: heading ?? 0,
      attributionControl: { compact: true },
    });
    mapRef.current = map;

    // Flecha propia (no el pin por defecto de MapLibre) con
    // rotationAlignment "viewport": queda SIEMPRE apuntando para arriba en
    // pantalla sin importar el rumbo -- es el propio MAPA el que rota hacia
    // donde se viaja (ver el efecto de más abajo), como en cualquier app de
    // navegación real.
    const el = document.createElement("div");
    el.className = styles.marker;
    el.innerHTML =
      '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2 20 20 12 16 4 20 12 2Z" /></svg>';
    const marker = new maplibregl.Marker({ element: el, rotationAlignment: "viewport" }).setLngLat(startLngLat);
    if (initialPositionRef.current) marker.addTo(map);
    markerRef.current = marker;

    map.on("load", () => {
      loadedRef.current = true;
      map.addSource("route", { type: "geojson", data: routeToGeoJSON(routeCoordsRef.current) });
      map.addLayer({
        id: "route-line",
        type: "line",
        source: "route",
        layout: { "line-join": "round", "line-cap": "round" },
        paint: { "line-color": ROUTE_COLOR, "line-width": 5, "line-opacity": 0.9 },
      });
    });

    return () => {
      map.remove();
      mapRef.current = null;
      markerRef.current = null;
      loadedRef.current = false;
    };
    // Solo al montar: ver el comentario de los refs arriba.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sigue la posición/rumbo real en vivo. bearing = heading es lo que rota
  // el mapa entero para que "arriba" sea siempre hacia dónde se viaja; sin
  // `zoom` en este easeTo, un acercamiento/alejamiento manual del usuario
  // durante el viaje no se pisa solo en el próximo fix del GPS.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !position) return;
    const lngLat: [number, number] = [position[1], position[0]];
    if (markerRef.current) {
      markerRef.current.setLngLat(lngLat);
      if (!markerRef.current.getElement().isConnected) markerRef.current.addTo(map);
    }
    map.easeTo({
      center: lngLat,
      bearing: heading ?? map.getBearing(),
      pitch: NAV_PITCH,
      duration: EASE_DURATION_MS,
    });
  }, [position, heading]);

  // El recorrido no cambia durante un viaje ya arrancado (ver useLiveTrip.ts:
  // trip.coords se fija una vez en start()), pero si el efecto de montaje
  // corrió antes de que este prop tuviera su valor final, esto lo corrige.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !loadedRef.current) return;
    const source = map.getSource("route") as maplibregl.GeoJSONSource | undefined;
    source?.setData(routeToGeoJSON(routeCoords));
  }, [routeCoords]);

  return <div ref={containerRef} className={styles.container} />;
}
