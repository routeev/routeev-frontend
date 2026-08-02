/**
 * Ver un viaje pasado (boton "Ver" del historial en /profile).
 *
 * El historial ya guarda el resultado completo de A* / Dijkstra (route_coords,
 * desglose, recargas) en result_json, asi que "ver" un viaje pasado no
 * necesita volver a llamar al backend: solo redibuja sobre el mapa los
 * mismos datos que ya se calcularon en su momento.
 */

import { state, els } from "./state.js";
import { setOrigin, setDestination } from "./mapCore.js";
import { renderVehicleSelect, updateBatteryHint } from "./vehicles.js";
import { drawRoutes, renderTripData } from "./routeCalc.js";
import { endLiveTrip, tripEls, setStartBtn } from "./liveTrip.js";

export function loadReplayFromHistory() {
  if (new URLSearchParams(location.search).get("replay") !== "1") return;
  const raw = sessionStorage.getItem("routeev_replay_trip");
  sessionStorage.removeItem("routeev_replay_trip");
  if (!raw) return;

  let h;
  try {
    h = JSON.parse(raw);
  } catch (e) {
    return;
  }
  if (!h.result || (!h.result.astar && !h.result.dijkstra)) return;

  const result = {
    origin: { name: h.origin_name || h.origin_id },
    destination: { name: h.destination_name || h.destination_id },
    dijkstra: h.result.dijkstra,
    astar: h.result.astar,
  };
  // Si A* no encontro ruta se cae a Dijkstra, pero ese puede no existir
  // (calculo sin comparacion): en ese caso se usa igual el resultado de A*,
  // que trae el "no se encontro ruta" que hay que mostrar.
  const primary = result.astar.found ? result.astar : result.dijkstra || result.astar;

  const vehicle = state.vehicles.find((v) => v.id === h.vehicle_id) || null;
  if (vehicle) {
    state.selectedVehicleId = vehicle.id;
    renderVehicleSelect();
    if (h.start_battery_kwh != null) {
      els.startBattery.value = Math.round((h.start_battery_kwh / vehicle.battery_capacity_kwh) * 100);
      updateBatteryHint();
    }
  }

  if (primary.found && primary.route_coords && primary.route_coords.length) {
    const coords = primary.route_coords;
    setOrigin({ id: h.origin_id, name: h.origin_name || h.origin_id, lat: coords[0][0], lon: coords[0][1] });
    setDestination({
      id: h.destination_id,
      name: h.destination_name || h.destination_id,
      lat: coords[coords.length - 1][0],
      lon: coords[coords.length - 1][1],
    });
  }

  state.lastResult = result;
  // Mismo origen/destino/vehiculo que este viaje guardado, para que si se
  // hace "Iniciar viaje" desde un replay, log-trip registre el tramo nuevo
  // contra ESTE origen/destino y no contra el ultimo calculo en vivo.
  state.lastRoutePayload = {
    origin_id: h.origin_id,
    destination_id: h.destination_id,
    vehicle_id: h.vehicle_id,
    start_battery_kwh: h.start_battery_kwh != null ? h.start_battery_kwh : undefined,
  };
  drawRoutes(result);
  els.dashboard.classList.remove("hidden");
  els.dashboardRouteLabel.textContent =
    `${result.origin.name} &rarr; ${result.destination.name} · viaje del ${formatDate(h.created_at)}`.replace("&rarr;", "→");
  const startBatteryKwh = h.start_battery_kwh != null ? h.start_battery_kwh : vehicle ? vehicle.battery_capacity_kwh : 0;
  renderTripData(vehicle, startBatteryKwh, primary);

  endLiveTrip();
  tripEls.live.classList.add("hidden");
  tripEls.control.classList.toggle("hidden", !primary.found || !vehicle);
  tripEls.startBtn.disabled = !primary.found;
  setStartBtn("play", "Iniciar viaje");
}
