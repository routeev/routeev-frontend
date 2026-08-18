import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { useCallback, useEffect, useMemo, useState } from "react";
import { MapContainer, Marker, Polyline, Popup, TileLayer, useMap, ZoomControl } from "react-leaflet";
import { useTranslation } from "../i18n/LanguageProvider";
import { formatDuration } from "../shared/format";
import { num } from "./num";
import type { TramoInfo } from "./simulationTimeline";
import { useSimulationAnimation } from "./useSimulationAnimation";
import styles from "./SimulationMap.module.css";

const CAR_SVG =
  '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5.6 15.4h12.8v2.3a.9.9 0 0 1-.9.9h-1.3a.9.9 0 0 1-.9-.9v-.6H8.7v.6a.9.9 0 0 1-.9.9H6.5a.9.9 0 0 1-.9-.9v-2.3Z"/><path d="M4.9 10.6 6.4 6.4a1.7 1.7 0 0 1 1.6-1.1h8a1.7 1.7 0 0 1 1.6 1.1l1.5 4.2a2 2 0 0 1 .1.7v3.3a.8.8 0 0 1-.8.8H5.6a.8.8 0 0 1-.8-.8v-3.3a2 2 0 0 1 .1-.7Z"/><circle cx="8.1" cy="12.8" r="1.05" fill="#0a0e13"/><circle cx="15.9" cy="12.8" r="1.05" fill="#0a0e13"/></svg>';
const BOLT_SVG =
  '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M13.2 2 4.5 13.4h6.1L10.2 22l8.9-11.6h-6.3L13.2 2Z"/></svg>';

// Mismo par de colores que --accent-astar/--accent-dijkstra (src/styles/tokens.css):
// Leaflet pinta sobre un <canvas>, no puede leer var() en runtime.
const COLOR_IDA = "#34e3a8";
const COLOR_VUELTA = "#f2a154";

function nodeIcon(cls: string, label: string) {
  return L.divIcon({
    className: "",
    html: `<div class="${styles.nodeMarker} ${cls}">${label}</div>`,
    iconSize: [22, 22],
    iconAnchor: [11, 11],
  });
}

function stationIcon() {
  return L.divIcon({
    className: "",
    html: `<div class="${styles.stationMarker}">${BOLT_SVG}</div>`,
    iconSize: [20, 20],
    iconAnchor: [10, 10],
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
 * Encuadra el trayecto entero. Es la misma operacion que corre al montar y la
 * que dispara el boton "Ver el trayecto completo", por eso vive suelta acá y
 * no adentro de FitBounds: son el mismo "volver a la vista de siempre".
 *
 * animate se apaga con prefers-reduced-motion: el vuelo de camara de Leaflet
 * es movimiento en pantalla como cualquier otro, y el reset de base.css solo
 * alcanza a las transiciones de CSS.
 */
function fitTrayecto(map: L.Map, bounds: [number, number][]) {
  if (!bounds.length) return;
  const animate = !window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
  map.fitBounds(L.latLngBounds(bounds), { padding: [24, 24], animate });
}

function FitBounds({ bounds }: { bounds: [number, number][] }) {
  const map = useMap();
  useEffect(() => {
    fitTrayecto(map, bounds);
    // Solo al montar: es la unica vez que hace falta encuadrar.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    // Leaflet mide su contenedor una unica vez al montar. Este mapa aparece
    // dentro del resultado de la simulacion, que se muestra recien despues
    // de "Calcular el viaje" -- si el layout de alrededor todavia no
    // termino de asentarse en ese momento (fuentes/imagenes cargando,
    // animacion de entrada del panel), Leaflet queda con un tamaño viejo
    // cacheado y el mapa se ve cortado/mal encuadrado. Mismo fix que
    // MapCanvas.tsx (mapa de /app): un ResizeObserver que avisa cada vez
    // que el contenedor realmente cambia de tamaño.
    const container = map.getContainer();
    const observer = new ResizeObserver(() => map.invalidateSize());
    observer.observe(container);
    return () => observer.disconnect();
  }, [map]);

  return null;
}

interface SimulationMapProps {
  tramosInfo: TramoInfo[];
  capacidadKwh: number;
  bateriaInicialPct: number;
  tiempoTotalMin: number;
}

export function SimulationMap({
  tramosInfo,
  capacidadKwh,
  bateriaInicialPct,
  tiempoTotalMin,
}: SimulationMapProps) {
  const { t } = useTranslation();
  const { markerRef, kmRef, batRef, timeRef, fillRef, statusRef, playing, play } =
    useSimulationAnimation(tramosInfo, capacidadKwh, bateriaInicialPct, tiempoTotalMin);

  const bounds = useMemo(() => tramosInfo.flatMap((t) => t.coords), [tramosInfo]);
  const origen = tramosInfo[0]!.coords[0]!;
  const destinoFinal = tramosInfo[0]!.coords[tramosInfo[0]!.coords.length - 1]!;

  // La instancia real de Leaflet, para que el boton de "ver todo" (que vive
  // AFUERA del <MapContainer>, junto al de repetir) pueda reencuadrar. Es
  // estado y no un ref porque el primer render todavia no tiene mapa y el
  // boton tiene que quedar deshabilitado hasta que exista.
  const [map, setMap] = useState<L.Map | null>(null);
  const verTodo = useCallback(() => {
    if (map) fitTrayecto(map, bounds);
  }, [map, bounds]);

  useEffect(() => {
    play();
    // Arranca sola al montar, como el original: no algo que haya que ir a buscar con otro click.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className={styles.wrap}>
      <div className={styles.map}>
        <MapContainer
          center={[-32.5, -56]}
          zoom={6}
          // El control de zoom por defecto se apaga para poner el nuestro con
          // titulos en castellano y arriba a la izquierda (arriba a la derecha
          // ya viven los botones de repetir/ver todo).
          zoomControl={false}
          // A proposito: la rueda del mouse tiene que seguir scrolleando la
          // pagina, no acercando el mapa -- este mapa esta en el medio de una
          // pagina larga. Por eso mismo hacian falta botones de zoom: sin
          // rueda y sin botones no habia NINGUNA forma de acercarse, y quien
          // se acercaba con doble click no tenia como volver.
          scrollWheelZoom={false}
          ref={setMap}
          style={{ height: "100%" }}
        >
          <ZoomControl
            position="topleft"
            zoomInTitle={t.showroom.simulationMap.zoomIn}
            zoomOutTitle={t.showroom.simulationMap.zoomOut}
          />
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>'
            url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
            subdomains="abcd"
            maxZoom={19}
          />
          <FitBounds bounds={bounds} />
          {tramosInfo.map((tramo) => (
            <Polyline
              key={tramo.nombre}
              positions={tramo.coords}
              pathOptions={{
                color: tramo.nombre === "ida" ? COLOR_IDA : COLOR_VUELTA,
                weight: 4,
                opacity: 0.9,
                dashArray: tramo.nombre === "ida" ? undefined : "2 10",
                lineCap: "round",
              }}
            />
          ))}
          {tramosInfo.flatMap((tramo) =>
            tramo.paradas.map((parada, i) => (
              <Marker
                key={`${tramo.nombre}-${i}`}
                position={[parada.lat, parada.lon]}
                icon={stationIcon()}
                zIndexOffset={300}
              >
                <Popup>
                  <b>{parada.nombre}</b>
                  <br />
                  {t.showroom.simulationMap.popupParada(num(parada.kwh, 1), formatDuration(parada.minutos))}
                </Popup>
              </Marker>
            ))
          )}
          <Marker position={origen} icon={nodeIcon(styles.origin, "O")} zIndexOffset={500} />
          <Marker
            position={destinoFinal}
            icon={nodeIcon(styles.destination, "D")}
            zIndexOffset={500}
          />
          <Marker position={origen} icon={carIcon()} zIndexOffset={1000} ref={markerRef} />
        </MapContainer>
      </div>
      <div className={styles.mapActions}>
        <button
          type="button"
          className={["ghost", styles.mapAction].join(" ")}
          onClick={verTodo}
          disabled={!map}
        >
          {t.showroom.simulationMap.verTrayecto}
        </button>
        <button
          type="button"
          className={["ghost", styles.mapAction].join(" ")}
          onClick={play}
          disabled={playing}
        >
          {t.showroom.simulationMap.repetirAnimacion}
        </button>
      </div>

      <div className={styles.live}>
        <div className={styles.liveRow}>
          <div className={styles.liveItem}>
            <span>{t.showroom.simulationMap.recorrido}</span>
            <b ref={kmRef} />
          </div>
          <div className={styles.liveItem}>
            <span>{t.showroom.simulationMap.bateria}</span>
            <b ref={batRef} />
          </div>
          <div className={styles.liveItem}>
            <span>{t.showroom.simulationMap.tiempoDeViaje}</span>
            <b ref={timeRef} />
          </div>
        </div>
        <div className={styles.progressTrack}>
          <div className={styles.progressFill} ref={fillRef} />
        </div>
        <div className={styles.status} ref={statusRef}>
          {t.showroom.simulationMap.arrancando}
        </div>
      </div>
    </div>
  );
}
