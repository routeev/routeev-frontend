import L from "leaflet";
import styles from "./markers.module.css";

const BOLT_SVG =
  '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M13.2 2 4.5 13.4h6.1L10.2 22l8.9-11.6h-6.3L13.2 2Z"/></svg>';
const CAR_SVG =
  '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5.6 15.4h12.8v2.3a.9.9 0 0 1-.9.9h-1.3a.9.9 0 0 1-.9-.9v-.6H8.7v.6a.9.9 0 0 1-.9.9H6.5a.9.9 0 0 1-.9-.9v-2.3Z"/><path d="M4.9 10.6 6.4 6.4a1.7 1.7 0 0 1 1.6-1.1h8a1.7 1.7 0 0 1 1.6 1.1l1.5 4.2a2 2 0 0 1 .1.7v3.3a.8.8 0 0 1-.8.8H5.6a.8.8 0 0 1-.8-.8v-3.3a2 2 0 0 1 .1-.7Z"/><circle cx="8.1" cy="12.8" r="1.05" fill="#0a0e13"/><circle cx="15.9" cy="12.8" r="1.05" fill="#0a0e13"/></svg>';
// Bandera a cuadros para el destino: mas reconocible a simple vista que una
// letra chica ("D") en un circulo, y de silueta bien distinta del origen
// (circulo/target) para diferenciarlos incluso sin leer el color.
const FLAG_SVG =
  '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 21V4"/><path d="M6 4h11l-2.2 3.5L17 11H6"/></svg>';
// Silueta de cámara (cuerpo + visor + lente), mismo criterio que BOLT_SVG/
// CAR_SVG/FLAG_SVG de arriba: un ícono vectorial propio, no un emoji, para
// que se vea igual en cualquier plataforma.
const RADAR_SVG =
  '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3.5" y="8" width="12.5" height="9" rx="1.6"/><path d="M16 11.3 20.6 8.4a.85.85 0 0 1 1.3.72v7.76a.85.85 0 0 1-1.3.72L16 14.7Z"/><circle cx="9.75" cy="12.5" r="2.5" fill="#2b0b0b"/></svg>';

/**
 * Origen: circulo tipo "target" (punto de partida). Destino: pin clasico
 * tipo Google Maps con una banderita adentro. Formas deliberadamente
 * distintas entre si (no solo el color) para que se distingan de un
 * vistazo, y bastante mas grandes que el "O"/"D" de 22px que habia antes
 * -- ese texto se perdia contra el mapa.
 */
export function originIcon(): L.DivIcon {
  return L.divIcon({
    className: "",
    html: `<div class="${styles.originMarker}"><div class="${styles.originRing}"></div><div class="${styles.originDot}"></div></div>`,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
  });
}

export function destinationIcon(): L.DivIcon {
  return L.divIcon({
    className: "",
    html: `<div class="${styles.destPin}"><div class="${styles.destPinShape}"></div><div class="${styles.destPinIcon}">${FLAG_SVG}</div></div>`,
    iconSize: [30, 40],
    iconAnchor: [15, 38],
  });
}

/** "Estás acá": pulso azul en la ubicacion real del usuario al abrir /app. */
export function myLocationIcon(): L.DivIcon {
  return L.divIcon({
    className: "",
    html: `<div class="${styles.liveMarker}"><div class="${styles.livePulse}"></div><div class="${styles.liveDot}"></div></div>`,
    iconSize: [22, 22],
    iconAnchor: [11, 11],
  });
}

/**
 * El area clickeable/tocable de un DivIcon de Leaflet es EXACTAMENTE
 * iconSize -- con el circulo visual de 20x20 a secas, un toque real (no un
 * click de mouse, mucho mas preciso) facilmente cae al lado y no selecciona
 * nada. .stationHit agranda el area tocable a 36x36 sin agrandar el
 * circulo, que sigue viendose igual de chico (centrado adentro, invisible
 * el resto del wrapper) -- mismo criterio que ya se uso para los botones
 * chicos en mobile (ver button.small en base.css).
 */
/**
 * Las de UTE y las de operadores privados se pintan distinto: el mapa ya no
 * es de una sola red, y de quien es el cargador cambia cosas concretas para
 * el que maneja (con que app se paga, y cuanto sale -- el pliego de UTE es
 * mas barato que las tarifas relevadas de los privados).
 */
export function stationIcon(privada = false): L.DivIcon {
  const clase = privada ? `${styles.station} ${styles.stationPrivada}` : styles.station;
  return L.divIcon({
    className: "",
    html: `<div class="${styles.stationHit}"><div class="${clase}">${BOLT_SVG}</div></div>`,
    iconSize: [36, 36],
    iconAnchor: [18, 18],
  });
}

export function tollIcon(): L.DivIcon {
  return L.divIcon({
    className: "",
    html: `<div class="${styles.toll}">$</div>`,
    iconSize: [18, 18],
    iconAnchor: [9, 9],
  });
}

/** Radar de velocidad fijo que la ruta cruza -- mismo criterio visual que tollIcon, en rojo (--danger) para distinguirlo del peaje (amarillo). */
export function radarIcon(): L.DivIcon {
  return L.divIcon({
    className: "",
    html: `<div class="${styles.radar}">${RADAR_SVG}</div>`,
    iconSize: [20, 20],
    iconAnchor: [10, 10],
  });
}

export function liveLocationIcon(): L.DivIcon {
  return L.divIcon({
    className: "",
    html: `<div class="${styles.liveMarker}"><div class="${styles.livePulse}"></div><div class="${styles.liveDot}"></div><div class="${styles.liveCar}">${CAR_SVG}</div></div>`,
    iconSize: [30, 30],
    iconAnchor: [15, 15],
  });
}
