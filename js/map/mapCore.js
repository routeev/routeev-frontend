/**
 * El mapa Leaflet en si: instancia, marcadores de origen/destino, y como se
 * fija cada uno (click en el mapa, con el candado anti doble-click-es-zoom;
 * o setOrigin/setDestination llamados desde otros modulos como el
 * autocompletado, el GPS o el replay de un viaje del historial).
 */

import { state, els } from "./state.js";
import { escapeHtml, hideSuggestions } from "./utils.js";
import { updateCalculateButtonState, showRouteError } from "./calculateGate.js";

export const map = L.map("map", { preferCanvas: true, zoomControl: true }).setView([-34.89, -56.16], 13);

L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
  attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
  subdomains: "abcd",
  maxZoom: 19,
}).addTo(map);

let originMarker = null;
let destinationMarker = null;

export function markerIcon(cls, label) {
  return L.divIcon({
    className: "",
    html: `<div class="node-marker ${cls}">${label}</div>`,
    iconSize: [22, 22],
    iconAnchor: [11, 11],
  });
}

export function setOrigin(node) {
  state.originId = node.id;
  if (originMarker) map.removeLayer(originMarker);
  originMarker = L.marker([node.lat, node.lon], { icon: markerIcon("origin", "O"), zIndexOffset: 500 })
    .addTo(map)
    .bindPopup(`<b>Origen</b><br>${escapeHtml(node.name)}`);
  els.originInput.value = node.name;
  hideSuggestions(els.originSuggestions);
  // Un origen fijado por cualquier via (click en el mapa, autocompletado,
  // GPS) invalida cualquier mensaje de resultado que quedara de una
  // busqueda anterior -- sin esto, cambiar el origen por otro metodo
  // dejaba "Encontrado: ..." o "Origen fijado en ..." describiendo un
  // punto que ya no es el elegido.
  els.originResult.classList.add("hidden");
  els.myLocationResult.classList.add("hidden");
  updateCalculateButtonState();
}

export function setDestination(node) {
  state.destinationId = node.id;
  if (destinationMarker) map.removeLayer(destinationMarker);
  destinationMarker = L.marker([node.lat, node.lon], { icon: markerIcon("destination", "D"), zIndexOffset: 500 })
    .addTo(map)
    .bindPopup(`<b>Destino</b><br>${escapeHtml(node.name)}`);
  els.destinationInput.value = node.name;
  hideSuggestions(els.destinationSuggestions);
  els.destinationResult.classList.add("hidden");
  updateCalculateButtonState();
}

// Un doble click para hacer zoom (comportamiento default de Leaflet) dispara
// DOS eventos "click" nativos antes del "dblclick" -- sin este delay, cada
// doble click para acercar el mapa terminaba fijando origen Y destino en
// el punto donde se hizo zoom, sin que el usuario lo pidiera. Se retrasa
// la accion real de "click" un instante; si llega un "dblclick" en ese
// instante, se cancela (era zoom, no una eleccion de punto).
let pendingClickTimeout = null;

map.on("click", (e) => {
  if (pendingClickTimeout) clearTimeout(pendingClickTimeout);
  pendingClickTimeout = setTimeout(async () => {
    pendingClickTimeout = null;
    try {
      const node = await api.getNearestNode(e.latlng.lat, e.latlng.lng);
      state.nodesById.set(node.id, node);
      if (state.pickMode === "origin") {
        setOrigin(node);
        setPickMode("destination");
      } else {
        setDestination(node);
      }
    } catch (err) {
      showRouteError(err.message);
    }
  }, 250);
});

map.on("dblclick", () => {
  if (pendingClickTimeout) {
    clearTimeout(pendingClickTimeout);
    pendingClickTimeout = null;
  }
});

export function setPickMode(mode) {
  state.pickMode = mode;
  els.pickOriginBtn.classList.toggle("active", mode === "origin");
  els.pickDestBtn.classList.toggle("active", mode === "destination");
  // aria-pressed acompaña a la clase .active: el estado "el proximo toque en
  // el mapa cae aca" se comunica con color, y sin esto un lector de pantalla
  // no tiene forma de saber cual de los dos esta activo.
  els.pickOriginBtn.setAttribute("aria-pressed", String(mode === "origin"));
  els.pickDestBtn.setAttribute("aria-pressed", String(mode === "destination"));
}

els.pickOriginBtn.addEventListener("click", () => setPickMode("origin"));
els.pickDestBtn.addEventListener("click", () => setPickMode("destination"));
