/**
 * Grafo (nodos + aristas), estaciones de carga y la lista curada de
 * intersecciones para el autocompletado.
 */

import { state, els, icons } from "./state.js";
import { map } from "./mapCore.js";
import { normalizeForSearch } from "./utils.js";

export async function loadGraph() {
  const data = await api.getGraph();
  for (const n of data.nodes) state.nodesById.set(n.id, n);

  const segments = [];
  for (const e of data.edges) {
    const a = state.nodesById.get(e.from);
    const b = state.nodesById.get(e.to);
    if (a && b) segments.push([[a.lat, a.lon], [b.lat, b.lon]]);
  }
  L.polyline(segments, { color: "#3a4552", weight: 1.4, opacity: 0.65 }).addTo(map);

  const bounds = L.latLngBounds(data.nodes.map((n) => [n.lat, n.lon]));
  map.fitBounds(bounds, { padding: [20, 20] });
}

function stationDetailHtml(st) {
  const conectores = Array.isArray(st.conectores) && st.conectores.length ? st.conectores : null;
  const conectorRows = conectores
    ? conectores
        .map(
          (c) =>
            `<div class="station-detail-row"><span>${c.tipo}${c.con_cable === false ? " (sin cable)" : ""}</span><b>${c.potencia_kw} kW &times; ${c.cantidad}</b></div>`
        )
        .join("")
    : `<div class="station-detail-row"><span>Conector</span><b>${st.tipo_conector} · ${st.potencia_kw} kW</b></div>`;
  return `
    <div class="station-detail-row"><span>Direccion</span><b>${st.direccion}</b></div>
    ${st.departamento ? `<div class="station-detail-row"><span>Departamento</span><b>${st.departamento}</b></div>` : ""}
    ${conectorRows}
    <div class="station-detail-row"><span>Operador</span><b>${st.operador}</b></div>
    <div class="station-detail-row"><span>Coordenadas</span><b>${st.lat.toFixed(4)}, ${st.lon.toFixed(4)}</b></div>
    <div class="station-detail-note">${st.nota}</div>`;
}

export async function loadStations() {
  const stations = await api.getStations();
  state.stations = stations;
  els.stationList.innerHTML = "";
  for (const st of stations) {
    state.nodesById.set(st.node_id, { id: st.node_id, name: st.nombre, lat: st.lat, lon: st.lon, is_charging_station: true });

    const marker = L.marker([st.lat, st.lon], {
      icon: L.divIcon({ className: "", html: `<div class="station-marker">${icons.bolt}</div>`, iconSize: [20, 20], iconAnchor: [10, 10] }),
    })
      .addTo(map)
      .bindPopup(`<b>${st.nombre}</b><br>${stationDetailHtml(st)}`);

    const li = document.createElement("li");
    li.className = "station-item";

    const header = document.createElement("div");
    header.className = "station-item-header";
    header.innerHTML = `<span class="station-item-name">${icons.bolt}${st.nombre}</span><span class="station-power">${st.potencia_kw} kW</span>`;

    const detail = document.createElement("div");
    detail.className = "station-detail hidden";
    detail.innerHTML = stationDetailHtml(st);

    header.addEventListener("click", () => {
      const willOpen = detail.classList.contains("hidden");
      detail.classList.toggle("hidden");
      if (willOpen) {
        map.setView([st.lat, st.lon], 16);
        marker.openPopup();
      }
    });

    li.appendChild(header);
    li.appendChild(detail);
    els.stationList.appendChild(li);
  }
}

export async function loadSearchableNodes() {
  const nodes = await api.getSearchableNodes();
  // Se precalcula una unica vez aca (no en cada tecla del autocompletado,
  // ver localNodeMatches en autocomplete.js): el nombre normalizado de cada
  // nodo no cambia durante la vida de la pagina.
  for (const n of nodes) n._norm = normalizeForSearch(n.name);
  state.searchableNodes = nodes;
  for (const n of nodes) state.nodesById.set(n.id, n);

  // Si el usuario ya empezo a escribir en origen/destino antes de que esta
  // carga terminara, ese desplegable se armo contra state.searchableNodes
  // todavia vacio (loadAllWithRetry las pide todas en paralelo, sin orden
  // garantizado) y se quedo asi -- nada lo volvia a dibujar cuando los
  // datos por fin llegaban. Se refresca disparando el mismo evento "input"
  // que ya maneja setupRouteAutocomplete, solo para el campo que siga
  // enfocado con texto sin vaciar.
  if (document.activeElement === els.originInput || document.activeElement === els.destinationInput) {
    if (document.activeElement.value.trim()) {
      document.activeElement.dispatchEvent(new Event("input"));
    }
  }
}
