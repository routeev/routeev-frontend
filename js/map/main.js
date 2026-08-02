/**
 * Arranque de la pantalla del mapa.
 *
 * Se cargan el grafo, las estaciones, la lista de nodos, los vehiculos y los
 * modelos de EV en paralelo. Se usa allSettled (no all) a proposito: si UNA
 * de estas cargas falla (p.ej. un error de red pasajero), las demas no
 * deben quedar a medio inicializar en silencio -- eso era exactamente lo
 * que dejaba "Calcular ruta" trabado en gris sin explicacion: si
 * loadVehicles() fallaba, el catch de un Promise.all conjunto se comia el
 * error y el usuario nunca se enteraba de por que el boton no arrancaba.
 * Con allSettled, cada carga fallida se reporta e intenta de nuevo sola.
 *
 * Este modulo importa (aunque sea solo por su efecto de wiring de eventos,
 * sin usar ningun export) todos los modulos que arman la pantalla: es el
 * unico punto de entrada real, ver map.js en la raiz de /js.
 */

import { els } from "./state.js";
import "./mapCore.js";
import "./geolocation.js";
import "./autocomplete.js";
import { loadGraph, loadStations, loadSearchableNodes } from "./graphData.js";
import { loadVehicles, loadEvModels, checkAiLookupAvailable } from "./vehicles.js";
import { updateCalculateButtonState, showRouteError } from "./calculateGate.js";
import "./routeCalc.js";
import "./liveTrip.js";
import { loadReplayFromHistory } from "./history.js";

async function loadAllWithRetry() {
  const loaders = {
    grafo: loadGraph,
    estaciones: loadStations,
    "lista de intersecciones": loadSearchableNodes,
    vehiculos: loadVehicles,
    "modelos de EV": loadEvModels,
  };
  const entries = Object.entries(loaders);
  const results = await Promise.allSettled(entries.map(([, fn]) => fn()));

  const failed = [];
  results.forEach((r, i) => {
    if (r.status === "rejected") failed.push(entries[i][0]);
  });

  if (failed.length > 0) {
    showRouteError(
      `No se pudo cargar: ${failed.join(", ")}. Revisa tu conexion y toca "Reintentar".`
    );
    showRetryButton();
  } else {
    hideRetryButton();
  }
  updateCalculateButtonState();
}

let retryBtn = null;
function showRetryButton() {
  if (retryBtn) return;
  retryBtn = document.createElement("button");
  retryBtn.type = "button";
  retryBtn.className = "ghost small";
  retryBtn.textContent = "Reintentar carga";
  retryBtn.style.marginTop = "8px";
  retryBtn.addEventListener("click", async () => {
    retryBtn.disabled = true;
    retryBtn.textContent = "Reintentando...";
    await loadAllWithRetry();
    retryBtn.disabled = false;
    retryBtn.textContent = "Reintentar carga";
  });
  els.routeError.insertAdjacentElement("afterend", retryBtn);
}
function hideRetryButton() {
  if (retryBtn) {
    retryBtn.remove();
    retryBtn = null;
  }
}

loadAllWithRetry().then(loadReplayFromHistory);
checkAiLookupAvailable();
