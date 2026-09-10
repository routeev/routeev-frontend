// `import * as` y no import default: maplibre-gl no tiene export default
// (el porque, largo, esta en basemap.ts).
import * as maplibregl from "maplibre-gl";
import { useEffect, useRef } from "react";
// El estilo del mapa base y el registro del worker de MapLibre viven en un
// solo lugar, compartido con los mapas de Leaflet: con importar algo de ese
// modulo el worker ya queda registrado (ver basemap.ts).
import { useActiveTheme } from "../theme/useActiveTheme";
import { basemapStyleForTheme } from "./basemap";
import styles from "./NavigationMap.module.css";

// Mismo par que RouteLayers.tsx (COLOR_ASTAR): ninguna de las dos librerías
// de mapa puede leer var() en runtime, así que el color queda hardcodeado
// acá también.
const ROUTE_COLOR = "#34e3a8";

const NAV_ZOOM = 17;
const NAV_PITCH = 60;

// Mismos trazados que markerIcons.ts (BOLT_SVG/RADAR_SVG): este mapa no es
// Leaflet y no puede reusar esos DivIcon, pero el dibujo tiene que ser EL
// MISMO que la persona ya vio en el mapa de planificacion -- un simbolo
// nuevo para la misma cosa obligaria a re-aprenderlo manejando.
const BOLT_SVG =
  '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M13.2 2 4.5 13.4h6.1L10.2 22l8.9-11.6h-6.3L13.2 2Z"/></svg>';
const RADAR_SVG =
  '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3.5" y="8" width="12.5" height="9" rx="1.6"/><path d="M16 11.3 20.6 8.4a.85.85 0 0 1 1.3.72v7.76a.85.85 0 0 1-1.3.72L16 14.7Z"/><circle cx="9.75" cy="12.5" r="2.5" fill="#2b0b0b"/></svg>';
// Bajado de 900 probando en un celular real: con el intervalo real de
// watchPosition (varios segundos entre fixes, no uno fijo), una animación
// tan larga no llegaba a asentarse antes del próximo fix -- la cámara
// quedaba siempre "un paso atrás" persiguiendo un objetivo que ya cambió de
// nuevo, que es exactamente el reporte de "va atrasada". Sigue siendo una
// transición suave (no un salto brusco), solo más corta que el intervalo
// típico entre fixes.
const EASE_DURATION_MS = 500;

function routeToGeoJSON(coords: [number, number][]): GeoJSON.Feature<GeoJSON.LineString> {
  return {
    type: "Feature",
    properties: {},
    geometry: { type: "LineString", coordinates: coords.map(([lat, lon]): [number, number] => [lon, lat]) },
  };
}

/**
 * La linea del recorrido vive DENTRO del estilo del mapa (source + layer),
 * asi que cualquier setStyle() la descarta junto con el estilo viejo. Por eso
 * esta afuera y es idempotente (el getSource evita duplicarla): se llama
 * tanto en el "load" inicial como despues de cada cambio de tema (ver el
 * efecto del tema en el componente).
 */
function addRouteLine(map: maplibregl.Map, coords: [number, number][]) {
  if (map.getSource("route")) return;
  map.addSource("route", { type: "geojson", data: routeToGeoJSON(coords) });
  map.addLayer({
    id: "route-line",
    type: "line",
    source: "route",
    layout: { "line-join": "round", "line-cap": "round" },
    paint: { "line-color": ROUTE_COLOR, "line-width": 5, "line-opacity": 0.9 },
  });
}

/** Parada de carga del plan, para marcarla sobre el recorrido en vivo. */
export interface NavChargeStop {
  lat: number;
  lon: number;
  /** Nombre de la estación ("ANCAP América"), va como tooltip nativo. */
  name: string;
}

/** Radar de velocidad fijo que la ruta cruza, para marcarlo en vivo. */
export interface NavRadar {
  lat: number;
  lon: number;
  name: string;
  maxspeedKmh: number | null;
}

interface NavigationMapProps {
  /** [lat, lon]. null hasta que el primer fix del GPS llega (ver useLiveTrip.ts). */
  position: [number, number] | null;
  /** 0-360°, 0=norte. null hasta que hay movimiento real para calcularlo. */
  heading: number | null;
  /** Recorrido completo calculado, fijo durante todo el viaje. */
  routeCoords: [number, number][];
  /** Paradas de carga planificadas (donde hay que enchufar). Fijas durante el viaje. */
  chargeStops: NavChargeStop[];
  /** Radares fijos sobre la ruta. Fijos durante el viaje, como el recorrido. */
  radars: NavRadar[];
}

/**
 * Modo navegación en vivo (cámara en perspectiva, rotando hacia donde se
 * viaja, tipo Google Maps) durante "Iniciar viaje". Leaflet no tiene noción
 * de inclinación/rotación de cámara -- por eso este modo usa un motor
 * distinto (MapLibre GL) en vez de una capa más del mapa de planificación
 * (MapCanvas.tsx), que se sigue usando para todo lo demás.
 */
export function NavigationMap({ position, heading, routeCoords, chargeStops, radars }: NavigationMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markerRef = useRef<maplibregl.Marker | null>(null);
  const loadedRef = useRef(false);
  // El efecto de montaje usa el valor INICIAL de estos props (centro de
  // arranque, recorrido a dibujar) y no debe volver a correr si cambian --
  // seguirlos en vivo es trabajo de los dos efectos de más abajo, que sí los
  // tienen en sus deps. Sin refs, incluir `position`/`routeCoords` en las
  // deps del primero recrearía el mapa entero (con su animación de estilo)
  // en cada fix del GPS.
  //
  // No se les reasigna `.current` en cada render a propósito: `useRef(x)` ya
  // deja el valor del primer render, que es justo lo que "inicial" quiere
  // decir, y estos dos refs no se leen en ningún lado fuera del efecto de
  // montaje. Reasignarlos los volvía el valor MÁS NUEVO (lo contrario de lo
  // que dice este comentario) y además es una escritura durante el render,
  // que React marca como error.
  const initialPositionRef = useRef(position);
  const routeCoordsRef = useRef(routeCoords);
  // El valor MAS NUEVO de routeCoords, a diferencia del ref de arriba (que
  // congela el inicial a proposito): lo actualiza el efecto que sigue a
  // routeCoords, y lo lee el callback de "style.load" del efecto del tema,
  // que corre en un momento arbitrario posterior.
  const latestRouteCoordsRef = useRef(routeCoords);
  // El tema SI se sigue en vivo (ver el efecto mas abajo), igual que en el
  // mapa de planificacion (BasemapLayer). La primera version de este mapa lo
  // congelaba al montar para no pagar el costo de setStyle() -- que descarta
  // las fuentes y capas agregadas a mano -- pero eso dejaba el mapa en el
  // color viejo contra una interfaz ya cambiada (reporte real, con captura:
  // panel claro sobre mapa oscuro en medio de un viaje). El costo se paga
  // re-agregando la linea del recorrido cuando el estilo nuevo termina de
  // cargar (addRouteLine, idempotente); los marcadores (posicion, destino,
  // paradas, radares) son DOM aparte del estilo y sobreviven solos.
  const theme = useActiveTheme();
  // El tema que el mapa tiene APLICADO ahora: le evita al efecto del tema
  // re-aplicar en el primer render el mismo estilo que el montaje ya puso.
  const appliedThemeRef = useRef(theme);

  useEffect(() => {
    if (!containerRef.current) return;
    const startCoords = initialPositionRef.current ?? routeCoordsRef.current[0];
    const startLngLat: [number, number] = startCoords ? [startCoords[1], startCoords[0]] : [-56.16, -34.9];

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: basemapStyleForTheme(appliedThemeRef.current),
      center: startLngLat,
      zoom: NAV_ZOOM,
      pitch: NAV_PITCH,
      bearing: heading ?? 0,
      attributionControl: { compact: true },
    });
    mapRef.current = map;

    // El estilo "dark" de OpenFreeMap referencia sprites (p. ej.
    // "wood-pattern") que a veces no vienen en el atlas que sirve su CDN.
    // MapLibre solo evita el warning si la imagen llega ANTES de resolver
    // la falta: setMissingStyleImageResolver corre primero y se espera su
    // resultado, así que llega a tiempo -- el evento "styleimagemissing"
    // (probado antes) dispara demasiado tarde, cuando el warning ya está
    // decidido. Un pixel transparente 1x1 alcanza: no hay sprite propio que
    // mantener, y en un estilo oscuro un relleno vacío no se nota donde
    // iría el patrón.
    map.setMissingStyleImageResolver((id) => {
      if (!map.hasImage(id)) map.addImage(id, { width: 1, height: 1, data: new Uint8Array(4) });
    });

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

    // Pin del destino: fijo durante todo el viaje (el recorrido no cambia
    // una vez arrancado, ver el comentario del efecto de `routeCoords` más
    // abajo), por eso se arma una sola vez acá y no necesita su propio ref
    // ni actualizarse en el efecto que sigue la posición en vivo.
    const destCoords = routeCoordsRef.current[routeCoordsRef.current.length - 1];
    if (destCoords) {
      const destEl = document.createElement("div");
      destEl.className = styles.destinationMarker;
      destEl.innerHTML =
        '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2C7.58 2 4 5.58 4 10c0 5.25 8 12 8 12s8-6.75 8-12c0-4.42-3.58-8-8-8Zm0 11a3 3 0 1 1 0-6 3 3 0 0 1 0 6Z" /></svg>';
      new maplibregl.Marker({ element: destEl, anchor: "bottom" }).setLngLat([destCoords[1], destCoords[0]]).addTo(map);
    }

    map.on("load", () => {
      loadedRef.current = true;
      addRouteLine(map, routeCoordsRef.current);
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

  // Cambiar el tema en medio del viaje re-estila el mapa en vivo (el bug que
  // esto arregla: el mapa quedaba en el color viejo contra la interfaz ya
  // cambiada). "style.load" dispara una vez por cada estilo aplicado -- a
  // diferencia de "load", que es solo el primero de la vida del mapa -- y es
  // el momento en que ya se puede volver a colgar la linea del recorrido que
  // setStyle acaba de descartar. Si el tema cambia dos veces rapido, los dos
  // callbacks terminan corriendo sobre el ultimo estilo: addRouteLine es
  // idempotente justo para eso.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || appliedThemeRef.current === theme) return;
    appliedThemeRef.current = theme;
    map.setStyle(basemapStyleForTheme(theme));
    map.once("style.load", () => addRouteLine(map, latestRouteCoordsRef.current));
  }, [theme]);

  // Paradas de carga y radares del plan: los mismos simbolos que la persona
  // ya vio en el mapa de planificacion (markerIcons.ts), aca como Markers de
  // MapLibre. Son DOM aparte del estilo del mapa -- sobreviven a un setStyle
  // por cambio de tema sin re-agregarse, a diferencia de la linea de la ruta.
  // El plan es fijo durante el viaje, asi que esto corre una vez en la
  // practica; el efecto igual limpia y rehace por si el resultado cambia.
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const markers: maplibregl.Marker[] = [];
    const markerElement = (className: string, svg: string, title: string, speedKmh?: number | null) => {
      const el = document.createElement("div");
      el.className = className;
      el.innerHTML = svg;
      el.title = title;
      if (speedKmh != null) {
        // Mini cartel de limite pegado bajo la camara: manejando no hay hover
        // que valga, el limite tiene que leerse en el mapa mismo.
        const chip = document.createElement("span");
        chip.className = styles.radarSpeed;
        chip.textContent = String(speedKmh);
        el.appendChild(chip);
      }
      return el;
    };
    for (const stop of chargeStops) {
      const el = markerElement(styles.stopMarker, BOLT_SVG, stop.name);
      markers.push(new maplibregl.Marker({ element: el }).setLngLat([stop.lon, stop.lat]).addTo(map));
    }
    for (const radar of radars) {
      const title = radar.maxspeedKmh != null ? `${radar.name} · ${radar.maxspeedKmh} km/h` : radar.name;
      const el = markerElement(styles.radarMarker, RADAR_SVG, title, radar.maxspeedKmh);
      markers.push(new maplibregl.Marker({ element: el }).setLngLat([radar.lon, radar.lat]).addTo(map));
    }
    return () => markers.forEach((m) => m.remove());
  }, [chargeStops, radars]);

  // Sigue la posición/rumbo real en vivo. bearing = heading es lo que rota
  // el mapa entero para que "arriba" sea siempre hacia dónde se viaja; sin
  // `zoom` en este easeTo, un acercamiento/alejamiento manual del usuario
  // durante el viaje no se pisa solo en el próximo fix del GPS.
  //
  // PROBADO Y REVERTIDO (9/set/2026): un intento de separar heading de este
  // efecto -- para no relanzar el easeTo entero (center+pitch) en cada tick
  // de brújula, más frecuente que un fix real de posición -- reemplazó la
  // rotación por `map.setBearing()` sin animación. En un viaje real esto se
  // vio "trancado": la rotación continua de la cámara durante la marcha NO
  // es desperdicio, es el comportamiento correcto de cualquier app de
  // navegación (Google Maps incluida) -- cortarla la vuelve entrecortada.
  // Con bearing en las deps, cada tick de brújula sí relanza el easeTo
  // completo, pero es literalmente lo que da la sensación fluida.
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
    latestRouteCoordsRef.current = routeCoords;
    const map = mapRef.current;
    if (!map || !loadedRef.current) return;
    // Puede no existir en la ventana entre un setStyle por cambio de tema y
    // su "style.load" (que la re-agrega leyendo latestRouteCoordsRef, recien
    // actualizado arriba): ahi el ?. alcanza, no se pierde nada.
    const source = map.getSource("route") as maplibregl.GeoJSONSource | undefined;
    source?.setData(routeToGeoJSON(routeCoords));
  }, [routeCoords]);

  return <div ref={containerRef} className={styles.container} />;
}
