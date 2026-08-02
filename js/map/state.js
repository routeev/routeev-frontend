/**
 * Estado compartido de la pantalla del mapa: los datos que van cambiando
 * (state), las referencias a los elementos del DOM que se tocan desde varios
 * modulos (els) y los iconos SVG reusados en varios lados (icons).
 *
 * Es el primer modulo que evalua toda la app (todos los demas lo importan),
 * asi que el chip de usuario y el boton de salir se fijan aca mismo: es
 * exactamente el mismo lugar/momento que en el archivo original, antes de
 * crear el mapa o cualquier otra cosa.
 */

export const state = {
  nodesById: new Map(), // id -> {id,name,lat,lon,is_charging_station,...}
  searchableNodes: [], // subconjunto curado para el autocompletado de origen/destino
  vehicles: [],
  evModels: [],
  stations: [],
  selectedVehicleId: null,
  vehiclesLoaded: false,
  originId: null,
  destinationId: null,
  pickMode: "origin",
  lastResult: null,
  // Mismo payload que se le mando a /api/route/compare (origin_id,
  // destination_id, vehicle_id, start_battery_kwh): se reusa para
  // /api/route/log-trip al terminar el viaje en vivo, sin pedirselo de
  // nuevo al usuario.
  lastRoutePayload: null,
};

export const els = {
  userChip: document.getElementById("user-chip"),
  logoutBtn: document.getElementById("logout-btn"),
  vehicleSelect: document.getElementById("vehicle-select"),
  startBattery: document.getElementById("start-battery"),
  batteryHint: document.getElementById("battery-hint"),
  toggleNewVehicle: document.getElementById("toggle-new-vehicle"),
  newVehicleForm: document.getElementById("new-vehicle-form"),
  modelSearch: document.getElementById("v-model-search"),
  modelDatalist: document.getElementById("v-model-datalist"),
  aiLookupField: document.getElementById("ai-lookup-field"),
  aiQuery: document.getElementById("v-ai-query"),
  aiSearchBtn: document.getElementById("v-ai-search-btn"),
  aiResult: document.getElementById("v-ai-result"),
  pickOriginBtn: document.getElementById("pick-origin-btn"),
  pickDestBtn: document.getElementById("pick-dest-btn"),
  myLocationBtn: document.getElementById("my-location-btn"),
  myLocationResult: document.getElementById("my-location-result"),
  originInput: document.getElementById("origin-input"),
  originSuggestions: document.getElementById("origin-suggestions"),
  originResult: document.getElementById("origin-result"),
  destinationInput: document.getElementById("destination-input"),
  destinationSuggestions: document.getElementById("destination-suggestions"),
  destinationResult: document.getElementById("destination-result"),
  calculateBtn: document.getElementById("calculate-btn"),
  routeError: document.getElementById("route-error"),
  calculateHint: document.getElementById("calculate-hint"),
  stationList: document.getElementById("station-list"),
  dashboard: document.getElementById("dashboard"),
  dashboardRouteLabel: document.getElementById("dashboard-route-label"),
  tripDataStats: document.getElementById("trip-data-stats"),
  tripChargingStops: document.getElementById("trip-charging-stops"),
};

// Iconos dibujados, no glifos Unicode ni emoji: un ⚡ o un 🚗 los renderiza
// cada sistema operativo a su manera (colores, peso y hasta forma distintos
// en Windows, Android y iOS), asi que no se pueden alinear ni teñir con el
// resto de la interfaz. Estos heredan el color del contexto y siempre se ven
// igual. Todos con el mismo encuadre 24x24 para que compartan tamaño optico.
export const icons = {
  bolt: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M13.2 2 4.5 13.4h6.1L10.2 22l8.9-11.6h-6.3L13.2 2Z"/></svg>',
  play: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5.2v13.6L19 12 8 5.2Z"/></svg>',
  stop: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="6.5" y="6.5" width="11" height="11" rx="1.6"/></svg>',
  car: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5.6 15.4h12.8v2.3a.9.9 0 0 1-.9.9h-1.3a.9.9 0 0 1-.9-.9v-.6H8.7v.6a.9.9 0 0 1-.9.9H6.5a.9.9 0 0 1-.9-.9v-2.3Z"/><path d="M4.9 10.6 6.4 6.4a1.7 1.7 0 0 1 1.6-1.1h8a1.7 1.7 0 0 1 1.6 1.1l1.5 4.2a2 2 0 0 1 .1.7v3.3a.8.8 0 0 1-.8.8H5.6a.8.8 0 0 1-.8-.8v-3.3a2 2 0 0 1 .1-.7Z"/><circle cx="8.1" cy="12.8" r="1.05" fill="#0a0e13"/><circle cx="15.9" cy="12.8" r="1.05" fill="#0a0e13"/></svg>',
};

els.userChip.textContent = getUsername() || "usuario";
els.logoutBtn.addEventListener("click", () => {
  clearSession();
  window.location.href = "/";
});
