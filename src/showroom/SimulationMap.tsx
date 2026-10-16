import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { useCallback, useEffect, useMemo, useState } from "react";
import { MapContainer, Marker, Polyline, Popup, useMap, ZoomControl } from "react-leaflet";
import { BasemapLayer } from "../map/BasemapLayer";
import { IconRetry } from "../map/panelIcons";
import { useTranslation } from "../i18n/LanguageProvider";
import { formatDuration } from "../shared/format";
import { num } from "./num";
import type { TramoInfo } from "./simulationTimeline";
import { useSimulationAnimation } from "./useSimulationAnimation";
import styles from "./SimulationMap.module.css";

const CAR_SVG =
  '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5.6 15.4h12.8v2.3a.9.9 0 0 1-.9.9h-1.3a.9.9 0 0 1-.9-.9v-.6H8.7v.6a.9.9 0 0 1-.9.9H6.5a.9.9 0 0 1-.9-.9v-2.3Z"/><path d="M4.9 10.6 6.4 6.4a1.7 1.7 0 0 1 1.6-1.1h8a1.7 1.7 0 0 1 1.6 1.1l1.5 4.2a2 2 0 0 1 .1.7v3.3a.8.8 0 0 1-.8.8H5.6a.8.8 0 0 1-.8-.8v-3.3a2 2 0 0 1 .1-.7Z"/><circle cx="8.1" cy="12.8" r="1.05" fill="#0a0e13"/><circle cx="15.9" cy="12.8" r="1.05" fill="#0a0e13"/></svg>';

// Mismo menta que --accent-astar (src/styles/tokens.css): Leaflet pinta las
// líneas sobre un <canvas>/SVG propio y no puede leer var() en runtime. El
// showroom es siempre oscuro, así que no hace falta seguir al tema.
const ROUTE = "#34e3a8";

function divIcon(className: string, size: number, html = "") {
  return L.divIcon({
    className: "",
    html: `<div class="${className}">${html}</div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
}

function carIcon() {
  return L.divIcon({
    className: "",
    html: `<div class="${styles.carMarker}"><div class="${styles.carPulse}"></div><div class="${styles.carDot}"></div><div class="${styles.carIcon}">${CAR_SVG}</div></div>`,
    iconSize: [30, 30],
    iconAnchor: [15, 15],
  });
}

/**
 * Encuadra el trayecto entero. Es lo que corre al montar y lo que hace el
 * botón "Ver todo el viaje": el mismo "volver a la vista de siempre".
 * Sin animación con prefers-reduced-motion: el vuelo de cámara de Leaflet
 * no lo alcanza el reset de base.css, que es solo de CSS.
 */
function fitTrayecto(map: L.Map, bounds: [number, number][]) {
  if (!bounds.length) return;
  const animate = !window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
  // Arriba deja lugar a los botones de zoom y de "ver todo".
  map.fitBounds(L.latLngBounds(bounds), {
    paddingTopLeft: [28, 60],
    paddingBottomRight: [28, 28],
    animate,
  });
}

function FitBounds({ bounds }: { bounds: [number, number][] }) {
  const map = useMap();
  useEffect(() => {
    fitTrayecto(map, bounds);
    // Solo al montar: es la única vez que hace falta encuadrar.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    // Leaflet mide su contenedor una sola vez al montar, y este mapa aparece
    // con el resultado, mientras el layout de alrededor todavía se acomoda.
    // Mismo arreglo que MapCanvas.tsx: avisarle cada vez que cambia de tamaño.
    // Mientras se acomoda (el primer segundo y medio) además se vuelve a
    // encuadrar: si no, el viaje quedaba chiquito, encuadrado para la caja
    // de antes. Después ya no, para no pisar el zoom que haya elegido la persona.
    const settledAt = performance.now() + 1500;
    const observer = new ResizeObserver(() => {
      map.invalidateSize();
      if (performance.now() < settledAt) fitTrayecto(map, bounds);
    });
    observer.observe(map.getContainer());
    return () => observer.disconnect();
    // bounds no cambia mientras el mapa está montado (un resultado nuevo lo remonta).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map]);

  return null;
}

interface SimulationMapProps {
  tramosInfo: TramoInfo[];
  capacidadKwh: number;
  bateriaInicialPct: number;
  tiempoTotalMin: number;
}

/**
 * El viaje simulado sobre el mapa real: ruta menta con halo, origen (círculo
 * blanco), destino (rombo violeta) y las paradas como cuadrados ámbar
 * numerados, igual que en /app. El auto recorre la ruta y la batería baja y
 * sube tramo a tramo.
 */
export function SimulationMap({
  tramosInfo,
  capacidadKwh,
  bateriaInicialPct,
  tiempoTotalMin,
}: SimulationMapProps) {
  const { t } = useTranslation();
  const tm = t.showroom.simulationMap;
  const { markerRef, batRef, fillRef, statusRef, playing, play } = useSimulationAnimation(
    tramosInfo,
    capacidadKwh,
    bateriaInicialPct,
    tiempoTotalMin
  );

  const bounds = useMemo(() => tramosInfo.flatMap((tramo) => tramo.coords), [tramosInfo]);
  const origen = tramosInfo[0]!.coords[0]!;
  const destino = tramosInfo[0]!.coords[tramosInfo[0]!.coords.length - 1]!;
  const paradas = tramosInfo.flatMap((tramo) => tramo.paradas);

  // La instancia de Leaflet, para el botón de "ver todo" (vive afuera del
  // <MapContainer>). Estado y no ref: en el primer render todavía no existe y
  // el botón tiene que esperar.
  const [map, setMap] = useState<L.Map | null>(null);
  const verTodo = useCallback(() => {
    if (map) fitTrayecto(map, bounds);
  }, [map, bounds]);

  useEffect(() => {
    play();
    // Arranca sola al montar: no es algo que haya que ir a buscar con otro click.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className={styles.wrap}>
      <div className={styles.mapBox}>
        <MapContainer
          className={styles.map}
          center={[-32.5, -56]}
          zoom={6}
          // El zoom propio, con títulos traducidos, arriba a la izquierda (a la
          // derecha van "ver todo" y "repetir").
          zoomControl={false}
          // A propósito: la rueda tiene que seguir bajando la página, que es
          // larga. Para acercarse están los botones de zoom.
          scrollWheelZoom={false}
          maxZoom={19}
          ref={setMap}
        >
          <ZoomControl position="topleft" zoomInTitle={tm.zoomIn} zoomOutTitle={tm.zoomOut} />
          <BasemapLayer />
          <FitBounds bounds={bounds} />
          {tramosInfo.map((tramo) =>
            tramo.nombre === "ida" ? (
              [
                <Polyline
                  key={`${tramo.nombre}-halo`}
                  positions={tramo.coords}
                  pathOptions={{
                    color: ROUTE,
                    weight: 11,
                    opacity: 0.18,
                    lineCap: "round",
                    lineJoin: "round",
                  }}
                />,
                <Polyline
                  key={tramo.nombre}
                  positions={tramo.coords}
                  pathOptions={{
                    color: ROUTE,
                    weight: 3.5,
                    opacity: 1,
                    lineCap: "round",
                    lineJoin: "round",
                  }}
                />,
              ]
            ) : (
              // La vuelta va por las mismas rutas: punteada, para que se lea
              // como "de nuevo" y no tape la ida.
              <Polyline
                key={tramo.nombre}
                positions={tramo.coords}
                pathOptions={{
                  color: ROUTE,
                  weight: 3,
                  opacity: 0.85,
                  dashArray: "2 9",
                  lineCap: "round",
                }}
              />
            )
          )}
          {paradas.map((parada, i) => (
            <Marker
              key={`${parada.tramo}-${i}`}
              position={[parada.lat, parada.lon]}
              icon={divIcon(styles.stopMarker, 22, String(i + 1))}
              zIndexOffset={300}
            >
              <Popup>
                <b>{parada.nombre}</b>
                <br />
                {tm.popupStop(num(parada.kwh, 1), formatDuration(parada.minutos))}
              </Popup>
            </Marker>
          ))}
          <Marker position={origen} icon={divIcon(styles.originMarker, 14)} zIndexOffset={500} />
          <Marker position={destino} icon={divIcon(styles.destMarker, 14)} zIndexOffset={500} />
          <Marker position={origen} icon={carIcon()} zIndexOffset={1000} ref={markerRef} />
        </MapContainer>

        <div className={styles.actions}>
          <button type="button" className={styles.action} onClick={verTodo} disabled={!map}>
            {tm.fit}
          </button>
          <button
            type="button"
            className={styles.action}
            onClick={play}
            disabled={playing}
            aria-label={tm.replay}
          >
            <IconRetry size={16} />
          </button>
        </div>
      </div>

      {/* Debajo del mapa y no encima: en la columna angosta de escritorio, una
          tarjeta flotante tapaba la punta de la ruta. */}
      <div className={styles.live}>
        <div className={styles.liveRow}>
          <span className={styles.status} ref={statusRef}>
            {tm.starting}
          </span>
          <span className={styles.battery}>
            <span className="sr-only">{tm.battery} </span>
            <b ref={batRef} />
          </span>
        </div>
        <div className={styles.progress}>
          <div className={styles.progressFill} ref={fillRef} />
        </div>
      </div>
    </div>
  );
}
