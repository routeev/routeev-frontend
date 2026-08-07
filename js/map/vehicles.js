/**
 * Vehiculos: selector, hint de bateria, alta de vehiculo (a mano, desde el
 * catalogo estatico, o via busqueda por IA).
 */

import { state, els } from "./state.js";
import { updateCalculateButtonState, showRouteError } from "./calculateGate.js";

export function selectedVehicle() {
  return state.vehicles.find((v) => v.id === state.selectedVehicleId) || null;
}

export function renderVehicleSelect() {
  els.vehicleSelect.innerHTML = "";
  if (state.vehicles.length === 0) {
    const opt = document.createElement("option");
    opt.textContent = "No hay vehiculos: crea uno abajo";
    opt.value = "";
    els.vehicleSelect.appendChild(opt);
    els.vehicleSelect.disabled = true;
    els.newVehicleForm.classList.remove("hidden");
    state.selectedVehicleId = null;
  } else {
    els.vehicleSelect.disabled = false;
    for (const v of state.vehicles) {
      const opt = document.createElement("option");
      opt.value = v.id;
      // Evitar "Nombre (52 kWh) (52 kWh)" cuando el nombre ya trae la capacidad
      // (p.ej. autocompletado desde el catalogo de modelos de EV).
      opt.textContent = v.name.includes(`${v.battery_capacity_kwh} kWh`) ? v.name : `${v.name} (${v.battery_capacity_kwh} kWh)`;
      els.vehicleSelect.appendChild(opt);
    }
    if (!state.selectedVehicleId) state.selectedVehicleId = state.vehicles[0].id;
    els.vehicleSelect.value = state.selectedVehicleId;
  }
  syncBatteryField();
  updateCalculateButtonState();
}

function syncBatteryField() {
  const v = selectedVehicle();
  if (!v) {
    els.startBattery.value = "";
    els.startBattery.disabled = true;
    els.batteryHint.textContent = "Elegi o crea un vehiculo primero.";
    return;
  }
  els.startBattery.disabled = false;
  els.startBattery.max = 100;
  if (!els.startBattery.value || Number(els.startBattery.value) > 100) {
    els.startBattery.value = 100;
  }
  updateBatteryHint();
}

function vehicleAutonomyKm(v) {
  return v.battery_capacity_kwh / v.consumption_kwh_per_km;
}

export function batteryPctToKwh(v, pct) {
  return (pct / 100) * v.battery_capacity_kwh;
}

export function updateBatteryHint() {
  const v = selectedVehicle();
  if (!v) return;
  const pct = Math.max(0, Math.min(100, Number(els.startBattery.value) || 0));
  const autonomyFullKm = vehicleAutonomyKm(v);
  const rangeAtPct = autonomyFullKm * (pct / 100);
  els.batteryHint.textContent = `${pct}% de bateria · autonomia estimada ${rangeAtPct.toFixed(0)} km (${autonomyFullKm.toFixed(0)} km a bateria llena para este vehiculo)`;
}

els.startBattery.addEventListener("input", updateBatteryHint);

els.vehicleSelect.addEventListener("change", () => {
  state.selectedVehicleId = Number(els.vehicleSelect.value);
  syncBatteryField();
  updateCalculateButtonState();
});

els.toggleNewVehicle.addEventListener("click", () => {
  els.newVehicleForm.classList.toggle("hidden");
});

// Mapa "Marca Modelo" -> modelo, para resolver lo que se tipeo en el buscador
// (un <input list> + <datalist>, no un <select>: con 880 modelos un select
// no se puede navegar, pero un datalist deja escribir y filtra en vivo con
// el autocompletado nativo del navegador, sin agregar ningun componente
// propio de JS). La igualdad es por texto exacto porque el datalist solo
// ofrece SUGERENCIAS -- el navegador no obliga a elegir una, así que hay
// que confirmar que lo tipeado coincide con un modelo real antes de
// precargar el formulario.
const evModelsByLabel = new Map();

export async function loadEvModels() {
  state.evModels = await api.listEvModels();
  for (const m of state.evModels) {
    const label = `${m.marca} ${m.modelo}`;
    evModelsByLabel.set(label, m);
    const opt = document.createElement("option");
    opt.value = label;
    els.modelDatalist.appendChild(opt);
  }
}

function prefillVehicleForm(name, capacityKwh, consumptionKwhKm, chargingPowerKw) {
  document.getElementById("v-name").value = name;
  document.getElementById("v-capacity").value = capacityKwh;
  document.getElementById("v-consumption").value = consumptionKwhKm;
  document.getElementById("v-charging-power").value = chargingPowerKw;
}

els.modelSearch.addEventListener("input", () => {
  const model = evModelsByLabel.get(els.modelSearch.value.trim());
  if (!model) return; // todavia escribiendo, o no matchea ningun modelo: no toca los campos
  prefillVehicleForm(`${model.marca} ${model.modelo}`, model.bateria_kwh, model.consumo_kwh_km, model.potencia_carga_kw);
  // Foto de stock del modelo (Cloudinary, ver scripts/warm_vehicle_photos.py):
  // solo informativa. La foto del vehiculo en si se sube aparte, ya creado
  // (ver profile.js), o se identifica con una foto propia.
  if (model.foto_url) {
    els.modelPhoto.src = model.foto_url;
    els.modelPhoto.classList.remove("hidden");
  } else {
    els.modelPhoto.classList.add("hidden");
  }
});

// Buscar "cualquier auto" por nombre via IA (solo visible si el servidor
// tiene el servicio configurado, ver checkAiLookupAvailable). Rellena los
// mismos campos que elegir un modelo del catalogo estatico.
async function searchVehicleAi() {
  const query = els.aiQuery.value.trim();
  if (!query || els.aiSearchBtn.disabled) return;
  els.aiSearchBtn.disabled = true;
  els.aiSearchBtn.textContent = "Buscando...";
  els.aiResult.classList.add("hidden");
  try {
    const model = await api.lookupVehicleAi(query);
    prefillVehicleForm(
      `${model.marca} ${model.modelo}`,
      model.bateria_kwh,
      model.consumo_kwh_km,
      model.potencia_carga_kw
    );
    els.modelSearch.value = "";
    els.aiResult.textContent = `Encontrado: ${model.marca} ${model.modelo} (autonomia aprox. ${Math.round(model.autonomia_aprox_km)} km). Revisa los campos antes de crear el vehiculo.`;
    els.aiResult.classList.remove("hidden", "error");
  } catch (err) {
    els.aiResult.textContent = err.message;
    els.aiResult.classList.remove("hidden");
    els.aiResult.classList.add("error");
  } finally {
    els.aiSearchBtn.disabled = false;
    els.aiSearchBtn.textContent = "Buscar";
  }
}
els.aiSearchBtn.addEventListener("click", searchVehicleAi);
els.aiQuery.addEventListener("keydown", (e) => {
  if (e.key === "Enter") {
    e.preventDefault();
    searchVehicleAi();
  }
});

export async function checkAiLookupAvailable() {
  try {
    const cfg = await api.authConfig();
    els.aiLookupField.classList.toggle("hidden", !cfg.ai_vehicle_lookup_enabled);
  } catch (e) {
    /* si falla, el campo queda oculto (comportamiento por defecto) */
  }
}

els.newVehicleForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const payload = {
    name: document.getElementById("v-name").value.trim(),
    battery_capacity_kwh: Number(document.getElementById("v-capacity").value),
    consumption_kwh_per_km: Number(document.getElementById("v-consumption").value),
    charging_power_kw: Number(document.getElementById("v-charging-power").value),
  };
  try {
    const vehicle = await api.createVehicle(payload);
    state.vehicles.push(vehicle);
    state.selectedVehicleId = vehicle.id;
    renderVehicleSelect();
    els.newVehicleForm.reset();
    els.newVehicleForm.classList.add("hidden");
  } catch (err) {
    showRouteError(err.message);
  }
});

export async function loadVehicles() {
  state.vehicles = await api.listVehicles();
  state.vehiclesLoaded = true;
  renderVehicleSelect();
}
