import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { useEffect, useMemo } from "react";
import { MapContainer, Marker, Polyline, Popup, TileLayer, useMap } from "react-leaflet";
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

function FitBounds({ bounds }: { bounds: [number, number][] }) {
  const map = useMap();
  useEffect(() => {
    if (bounds.length) map.fitBounds(L.latLngBounds(bounds), { padding: [24, 24] });
    // Solo al montar: es la unica vez que hace falta encuadrar.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return null;
}

interface SimulationMapProps {
  tramosInfo: TramoInfo[];
  capacidadKwh: number;
  bateriaInicialPct: number;
  tiempoTotalMin: number;
}

export function SimulationMap({ tramosInfo, capacidadKwh, bateriaInicialPct, tiempoTotalMin }: SimulationMapProps) {
  const { markerRef, kmRef, batRef, timeRef, fillRef, statusRef, playing, play } = useSimulationAnimation(
    tramosInfo,
    capacidadKwh,
    bateriaInicialPct,
    tiempoTotalMin
  );

  const bounds = useMemo(() => tramosInfo.flatMap((t) => t.coords), [tramosInfo]);
  const origen = tramosInfo[0]!.coords[0]!;
  const destinoFinal = tramosInfo[0]!.coords[tramosInfo[0]!.coords.length - 1]!;

  useEffect(() => {
    play();
    // Arranca sola al montar, como el original: no algo que haya que ir a buscar con otro click.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className={styles.wrap}>
      <div className={styles.map}>
        <MapContainer center={[-32.5, -56]} zoom={6} zoomControl={false} scrollWheelZoom={false} style={{ height: "100%" }}>
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
              <Marker key={`${tramo.nombre}-${i}`} position={[parada.lat, parada.lon]} icon={stationIcon()} zIndexOffset={300}>
                <Popup>
                  <b>{parada.nombre}</b>
                  <br />+{num(parada.kwh, 1)} kWh · {formatDuration(parada.minutos)}
                </Popup>
              </Marker>
            ))
          )}
          <Marker position={origen} icon={nodeIcon(styles.origin, "O")} zIndexOffset={500} />
          <Marker position={destinoFinal} icon={nodeIcon(styles.destination, "D")} zIndexOffset={500} />
          <Marker position={origen} icon={carIcon()} zIndexOffset={1000} ref={markerRef} />
        </MapContainer>
      </div>
      <button type="button" className={["ghost", styles.replay].join(" ")} onClick={play} disabled={playing}>
        ↻ Repetir animación
      </button>

      <div className={styles.live}>
        <div className={styles.liveRow}>
          <div className={styles.liveItem}>
            <span>Recorrido</span>
            <b ref={kmRef} />
          </div>
          <div className={styles.liveItem}>
            <span>Batería</span>
            <b ref={batRef} />
          </div>
          <div className={styles.liveItem}>
            <span>Tiempo de viaje</span>
            <b ref={timeRef} />
          </div>
        </div>
        <div className={styles.progressTrack}>
          <div className={styles.progressFill} ref={fillRef} />
        </div>
        <div className={styles.status} ref={statusRef}>
          Arrancando…
        </div>
      </div>
    </div>
  );
}
