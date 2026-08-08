import L from "leaflet";
import styles from "./markers.module.css";

const BOLT_SVG =
  '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M13.2 2 4.5 13.4h6.1L10.2 22l8.9-11.6h-6.3L13.2 2Z"/></svg>';
const CAR_SVG =
  '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5.6 15.4h12.8v2.3a.9.9 0 0 1-.9.9h-1.3a.9.9 0 0 1-.9-.9v-.6H8.7v.6a.9.9 0 0 1-.9.9H6.5a.9.9 0 0 1-.9-.9v-2.3Z"/><path d="M4.9 10.6 6.4 6.4a1.7 1.7 0 0 1 1.6-1.1h8a1.7 1.7 0 0 1 1.6 1.1l1.5 4.2a2 2 0 0 1 .1.7v3.3a.8.8 0 0 1-.8.8H5.6a.8.8 0 0 1-.8-.8v-3.3a2 2 0 0 1 .1-.7Z"/><circle cx="8.1" cy="12.8" r="1.05" fill="#0a0e13"/><circle cx="15.9" cy="12.8" r="1.05" fill="#0a0e13"/></svg>';

export function nodeIcon(kind: "origin" | "destination", label: string): L.DivIcon {
  const cls = kind === "origin" ? styles.origin : styles.destination;
  return L.divIcon({
    className: "",
    html: `<div class="${styles.node} ${cls}">${label}</div>`,
    iconSize: [22, 22],
    iconAnchor: [11, 11],
  });
}

export function stationIcon(): L.DivIcon {
  return L.divIcon({
    className: "",
    html: `<div class="${styles.station}">${BOLT_SVG}</div>`,
    iconSize: [20, 20],
    iconAnchor: [10, 10],
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

export function liveLocationIcon(): L.DivIcon {
  return L.divIcon({
    className: "",
    html: `<div class="${styles.liveMarker}"><div class="${styles.livePulse}"></div><div class="${styles.liveDot}"></div><div class="${styles.liveCar}">${CAR_SVG}</div></div>`,
    iconSize: [30, 30],
    iconAnchor: [15, 15],
  });
}
