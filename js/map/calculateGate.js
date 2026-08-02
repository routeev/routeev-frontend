/**
 * El "gate" de "Calcular ruta": decide si ya hay lo necesario (vehiculo,
 * origen, destino) para habilitar el boton y explica que falta si no, y el
 * banner generico de error de ruta. Vive aparte porque lo tocan modulos que,
 * si no, formarian un ciclo entre si (mapCore fija origen/destino y necesita
 * refrescar este estado; routeCalc calcula la ruta y necesita lo mismo).
 */

import { state, els } from "./state.js";

export function updateCalculateButtonState() {
  const missing = [];
  if (!state.vehiclesLoaded) missing.push("cargando vehiculos...");
  else if (!state.selectedVehicleId) missing.push("elegi o crea un vehiculo");
  if (!state.originId) missing.push("fija un origen");
  if (!state.destinationId) missing.push("fija un destino");
  if (state.originId && state.destinationId && state.originId === state.destinationId) {
    missing.push("origen y destino no pueden ser el mismo punto");
  }

  const ready = missing.length === 0;
  els.calculateBtn.disabled = !ready;
  els.calculateHint.textContent = ready ? "Listo para calcular." : "Falta: " + missing.join(", ") + ".";
  els.calculateHint.classList.toggle("hint-ok", ready);
}

export function showRouteError(msg) {
  els.routeError.textContent = msg;
  els.routeError.classList.remove("hidden");
}

export function clearRouteError() {
  els.routeError.classList.add("hidden");
}
