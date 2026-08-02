/**
 * Calculo de ruta: boton "Calcular ruta", dibujo de las polilineas
 * Dijkstra/A* y los marcadores de peaje sobre el mapa, y el dashboard con el
 * desglose del viaje (distancia, tiempo, bateria, peajes, paradas de carga).
 */

import { state, els, icons } from "./state.js";
import { map } from "./mapCore.js";
import { selectedVehicle, batteryPctToKwh } from "./vehicles.js";
import { updateCalculateButtonState, showRouteError, clearRouteError } from "./calculateGate.js";
import { endLiveTrip, tripEls, setStartBtn } from "./liveTrip.js";

let routeLayerDijkstra = null;
let routeLayerAstar = null;
let tollMarkers = [];

els.calculateBtn.addEventListener("click", async () => {
  clearRouteError();
  els.calculateBtn.disabled = true;
  els.calculateBtn.textContent = "Calculando...";
  try {
    const vehicleForBattery = selectedVehicle();
    const payload = {
      origin_id: state.originId,
      destination_id: state.destinationId,
      vehicle_id: state.selectedVehicleId,
      start_battery_kwh: vehicleForBattery ? batteryPctToKwh(vehicleForBattery, Number(els.startBattery.value)) : undefined,
    };
    const result = await api.compareRoutes(payload);
    state.lastResult = result;
    state.lastRoutePayload = payload;
    drawRoutes(result);
    renderDashboard(result);
  } catch (err) {
    showRouteError(err.message);
    els.dashboard.classList.add("hidden");
  } finally {
    els.calculateBtn.disabled = false;
    els.calculateBtn.textContent = "Calcular ruta";
    updateCalculateButtonState();
  }
});

export function drawRoutes(result) {
  if (routeLayerDijkstra) map.removeLayer(routeLayerDijkstra);
  if (routeLayerAstar) map.removeLayer(routeLayerAstar);
  routeLayerDijkstra = null;
  routeLayerAstar = null;
  tollMarkers.forEach((m) => map.removeLayer(m));
  tollMarkers = [];

  // result.dijkstra viene null cuando no se pidio la comparacion (el caso
  // normal), y tambien en los viajes del historial guardados de esa forma.
  if (result.dijkstra && result.dijkstra.found) {
    routeLayerDijkstra = L.polyline(result.dijkstra.route_coords, {
      color: getComputedStyle(document.documentElement).getPropertyValue("--accent-dijkstra").trim(),
      weight: 5,
      opacity: 0.85,
      dashArray: "2 10",
      lineCap: "round",
    }).addTo(map);
  }
  if (result.astar.found) {
    routeLayerAstar = L.polyline(result.astar.route_coords, {
      color: getComputedStyle(document.documentElement).getPropertyValue("--accent-astar").trim(),
      weight: 4,
      opacity: 0.95,
      lineCap: "round",
    }).addTo(map);
    map.fitBounds(routeLayerAstar.getBounds(), { padding: [40, 40] });
  }

  // Si A* no encontro ruta se cae a Dijkstra, pero ese puede no existir
  // (calculo sin comparacion): en ese caso se usa igual el resultado de A*,
  // que trae el "no se encontro ruta" que hay que mostrar.
  const primary = result.astar.found ? result.astar : result.dijkstra || result.astar;
  const peajesPuntos = (primary.breakdown && primary.breakdown.peajes_puntos) || [];
  for (const p of peajesPuntos) {
    const marker = L.marker([p.lat, p.lon], {
      icon: L.divIcon({ className: "", html: '<div class="toll-marker">$</div>', iconSize: [18, 18], iconAnchor: [9, 9] }),
      zIndexOffset: 400,
    })
      .addTo(map)
      .bindPopup(p.monto_uyu ? `Peaje: ${formatUyu(p.monto_uyu)}` : "Tramo con peaje (monto exacto no disponible)");
    tollMarkers.push(marker);
  }
}

// --- Datos del viaje -----------------------------------------------------------

function tripStat(label, value, sub) {
  return `<div class="trip-stat"><div class="trip-stat-label">${label}</div><div class="trip-stat-value mono-num">${value}</div>${
    sub ? `<div class="trip-stat-sub mono-num">${sub}</div>` : ""
  }</div>`;
}

// Un tramo con peaje detectado (toll=yes de OSM) no siempre tiene tarifa real
// conocida (ver apply_real_tolls.py: solo cubre los peajes interdepartamentales
// publicados, con un radio de 3 km). Distinguir este caso evita que "peajes $0"
// se lea como "sin costo" cuando en realidad es "no sabemos el costo".
function hayPeajeSinMonto(b) {
  return (b.peajes_puntos || []).some((p) => p.monto_uyu == null);
}

function peajeSubLabel(b) {
  if (!(b.peaje > 0)) return null;
  if (b.peaje_uyu > 0) return hayPeajeSinMonto(b) ? `${formatUyu(b.peaje_uyu)} y otros sin monto conocido` : formatUyu(b.peaje_uyu);
  return "monto no disponible";
}

function findStationDetail(nodeId) {
  return state.stations.find((s) => s.node_id === nodeId) || null;
}

function pctOfCapacity(kwh, vehicle) {
  if (!vehicle) return null;
  return Math.max(0, Math.min(100, (kwh / vehicle.battery_capacity_kwh) * 100));
}

export function renderTripData(vehicle, startBatteryKwh, r) {
  if (!r.found) {
    els.tripDataStats.innerHTML = `<div class="trip-stat" style="grid-column:1/-1"><div class="trip-stat-value" style="color:var(--danger)">No se encontro una ruta viable con esta bateria.</div></div>`;
    els.tripChargingStops.innerHTML = "";
    return;
  }
  const b = r.breakdown;
  const arrivalBatteryKwh = startBatteryKwh - b.energia_kwh + r.recharges.reduce((sum, rc) => sum + rc.added_kwh, 0);
  const arrivalPct = pctOfCapacity(arrivalBatteryKwh, vehicle);
  // Porcentaje de UNA carga completa solo tiene sentido si no hubo recargas en
  // el camino: con paradas de carga, la energia total del viaje puede superar
  // la capacidad de la bateria (se "llena el tanque" mas de una vez), asi que
  // mostrar eso como % daria un numero > 100% o clampeado (enganoso). Sin
  // recargas, el consumo nunca puede superar la bateria inicial (si no, no se
  // hubiera encontrado ruta), asi que ahi si es un % valido.
  const consumedPct = r.recharges.length === 0 ? pctOfCapacity(b.energia_kwh, vehicle) : null;

  els.tripDataStats.innerHTML =
    tripStat("Distancia total", (b.energia_kwh / (vehicle ? vehicle.consumption_kwh_per_km : 0.18)).toFixed(1) + " km") +
    tripStat("Tiempo estimado", formatDuration(b.tiempo_min + b.trafico_min + b.recarga_min)) +
    tripStat(
      "Bateria consumida",
      consumedPct !== null ? `${consumedPct.toFixed(0)}%` : b.energia_kwh.toFixed(2) + " kWh",
      consumedPct !== null ? `${b.energia_kwh.toFixed(2)} kWh` : null
    ) +
    tripStat(
      "Peajes",
      b.peaje > 0 ? `${(b.peajes_puntos || []).length} en la ruta` : "Sin peajes",
      peajeSubLabel(b)
    ) +
    tripStat(
      "Bateria al llegar",
      arrivalPct !== null ? `${arrivalPct.toFixed(0)}%` : arrivalBatteryKwh.toFixed(1) + " kWh",
      arrivalPct !== null ? `${arrivalBatteryKwh.toFixed(1)} kWh` : null
    ) +
    tripStat("Paradas de recarga", r.recharges.length) +
    tripStat(
      "Costo estimado",
      formatUyu(b.costo_uyu_total),
      hayPeajeSinMonto(b)
        ? `energia ${formatUyu(b.costo_uyu_energia)} + peajes ${b.peaje_uyu > 0 ? formatUyu(b.peaje_uyu) + " y otros sin monto conocido" : "sin monto conocido"}`
        : `energia ${formatUyu(b.costo_uyu_energia)} + peajes ${formatUyu(b.peaje_uyu)}`
    );

  if (!r.recharges.length) {
    els.tripChargingStops.innerHTML = `<div class="hint" style="margin:8px 0 0">Sin paradas de recarga: la bateria alcanza para todo el viaje.</div>`;
    return;
  }

  els.tripChargingStops.innerHTML =
    `<h3>Puestos de carga usados</h3>` +
    r.recharges
      .map((rc) => {
        const detail = findStationDetail(rc.node_id);
        const addedPct = pctOfCapacity(rc.added_kwh, vehicle);
        return `
          <div class="charging-stop-card">
            <div class="charging-stop-header">${icons.bolt}${rc.station_name}</div>
            <div class="charging-stop-row"><span>Bateria agregada</span><b>${
              addedPct !== null ? `+${addedPct.toFixed(0)}% (+${rc.added_kwh.toFixed(1)} kWh)` : `+${rc.added_kwh.toFixed(1)} kWh`
            }</b></div>
            <div class="charging-stop-row"><span>Tiempo de carga</span><b>${rc.time_min.toFixed(1)} min</b></div>
            ${detail ? `<div class="charging-stop-row"><span>Direccion</span><b>${detail.direccion}</b></div>` : ""}
            ${detail ? `<div class="charging-stop-row"><span>Potencia disponible</span><b>${detail.potencia_kw} kW max</b></div>` : ""}
            ${detail ? `<div class="charging-stop-row"><span>Conectores</span><b>${detail.tipo_conector}</b></div>` : ""}
          </div>`;
      })
      .join("");
}

function renderDashboard(result) {
  els.dashboard.classList.remove("hidden");
  els.dashboardRouteLabel.textContent = `${result.origin.name} &rarr; ${result.destination.name}`.replace("&rarr;", "→");
  const vehicle = selectedVehicle();
  const startBatteryKwh = vehicle ? batteryPctToKwh(vehicle, Number(els.startBattery.value)) : 0;
  renderTripData(vehicle, startBatteryKwh, result.astar.found ? result.astar : result.dijkstra || result.astar);

  endLiveTrip();
  tripEls.live.classList.add("hidden");
  tripEls.control.classList.toggle("hidden", !result.astar.found);
  tripEls.startBtn.disabled = !result.astar.found;
  setStartBtn("play", "Iniciar viaje");
}
