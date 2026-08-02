/**
 * Origen/destino: autocompletado (intersecciones locales + geocodificacion).
 *
 * Cada input tiene su propio desplegable. Mientras se escribe, se filtran
 * en el cliente -- sin golpear el backend -- las intersecciones ya
 * cargadas en state.searchableNodes (instantaneo). La ultima fila del
 * desplegable manda la consulta completa a /api/graph/geocode (que
 * primero intenta resolverla contra el grafo propio y recien despues
 * cae a Nominatim), pero SOLO por una accion explicita del usuario
 * (click o Enter) -- nunca en cada tecla, porque la politica de uso de
 * Nominatim prohibe autocompletar contra su servicio.
 */

import { state, els } from "./state.js";
import { escapeHtml, normalizeForSearch, hideSuggestions } from "./utils.js";
import { setOrigin, setDestination, setPickMode } from "./mapCore.js";

function localNodeMatches(query) {
  const q = normalizeForSearch(query);
  if (!q) return [];
  const scored = [];
  for (const n of state.searchableNodes) {
    // n._norm se precalcula una sola vez en loadSearchableNodes (no en
    // cada tecla): son ~500 nombres que no cambian durante la vida de la
    // pagina, y normalizeForSearch (NFD + filtro por codepoint) no es
    // gratis para repetirlo por cada uno en cada letra tipeada.
    const idx = n._norm.indexOf(q);
    if (idx !== -1) scored.push({ node: n, idx });
  }
  // Los matches que empiezan por lo tipeado ("18 de julio" al tipear "18")
  // van primero: es lo que se espera de un autocompletado de direcciones.
  scored.sort((a, b) => a.idx - b.idx || a.node.name.length - b.node.name.length);
  return scored.slice(0, 8).map((s) => s.node);
}

/**
 * Conecta un <input> de origen/destino con su desplegable de sugerencias.
 * setNode(node) es lo que efectivamente fija el punto (setOrigin o
 * setDestination, encadenado con el cambio de modo que corresponda).
 * resultEl muestra el mensaje ("Encontrado: ..." o el error) de una
 * busqueda por direccion completa.
 */
function setupRouteAutocomplete(inputEl, listEl, resultEl, setNode) {
  let activeIndex = -1;
  let items = []; // [{type:"node", node} | {type:"geocode", label}]

  function render(matches, query) {
    items = matches.map((node) => ({ type: "node", node }));
    const trimmed = query.trim();
    if (trimmed.length >= 3) items.push({ type: "geocode", label: trimmed });
    activeIndex = -1;

    if (items.length === 0) {
      listEl.innerHTML = `<li class="autocomplete-item ac-empty">Segui escribiendo para buscar...</li>`;
      listEl.classList.remove("hidden");
      return;
    }

    listEl.innerHTML = items
      .map((item, i) =>
        item.type === "geocode"
          ? `<li class="autocomplete-item ac-geocode" data-index="${i}">Buscar «${escapeHtml(item.label)}» como direccion completa</li>`
          : `<li class="autocomplete-item" data-index="${i}">${escapeHtml(item.node.name)}</li>`
      )
      .join("");
    listEl.classList.remove("hidden");
  }

  function setActive(i) {
    activeIndex = i;
    listEl.querySelectorAll(".autocomplete-item").forEach((el, idx) => el.classList.toggle("active", idx === i));
  }

  async function chooseItem(item) {
    if (!item) return;
    if (item.type === "node") {
      setNode(item.node);
      resultEl.classList.add("hidden");
      return;
    }
    // item.type === "geocode": misma consulta completa que antes disparaba
    // el boton "Buscar" separado.
    hideSuggestions(listEl);
    inputEl.disabled = true;
    resultEl.textContent = "Buscando...";
    resultEl.classList.remove("hidden", "warn", "error");
    try {
      const result = await api.geocode(item.label);
      state.nodesById.set(result.node.id, result.node);
      setNode(result.node);
      let msg = `Encontrado: ${result.matched_address}`;
      let kind = "";
      if (result.distance_to_node_km > 2) {
        msg += ` (a ${result.distance_to_node_km.toFixed(1)} km de la calle mas cercana del grafo cubierto -- puede no ser precisa)`;
        kind = "warn";
      }
      resultEl.textContent = msg;
      if (kind) resultEl.classList.add(kind);
    } catch (err) {
      resultEl.textContent = err.message;
      resultEl.classList.add("error");
    } finally {
      inputEl.disabled = false;
    }
  }

  inputEl.addEventListener("input", () => {
    resultEl.classList.add("hidden");
    // Igual que en "focus" mas abajo: sin este chequeo, borrar el campo
    // hasta dejarlo vacio igual mostraba el desplegable con el placeholder
    // "Segui escribiendo...", flotando sobre un input sin nada tipeado.
    if (inputEl.value.trim()) {
      render(localNodeMatches(inputEl.value), inputEl.value);
    } else {
      hideSuggestions(listEl);
    }
  });

  inputEl.addEventListener("focus", () => {
    if (inputEl.value.trim()) render(localNodeMatches(inputEl.value), inputEl.value);
  });

  // mousedown (no click) para que dispare ANTES del blur del input: blur
  // esconde el desplegable, y si eso pasa primero el click nunca le llega
  // a un <li> que ya no existe.
  listEl.addEventListener("mousedown", (e) => {
    const li = e.target.closest(".autocomplete-item");
    if (!li || li.classList.contains("ac-empty")) return;
    e.preventDefault();
    chooseItem(items[Number(li.dataset.index)]);
  });

  inputEl.addEventListener("keydown", (e) => {
    if (listEl.classList.contains("hidden") || items.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive(Math.min(items.length - 1, activeIndex + 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive(Math.max(0, activeIndex - 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      chooseItem(items[activeIndex >= 0 ? activeIndex : 0]);
    } else if (e.key === "Escape") {
      hideSuggestions(listEl);
    }
  });

  inputEl.addEventListener("blur", () => {
    // Delay corto: si el blur vino de tocar un item de la lista, el
    // mousedown de arriba ya alcanzo a procesar la eleccion antes de que
    // esto la esconda.
    setTimeout(() => hideSuggestions(listEl), 120);
  });
}

setupRouteAutocomplete(els.originInput, els.originSuggestions, els.originResult, (node) => {
  setOrigin(node);
  setPickMode("destination");
});
setupRouteAutocomplete(els.destinationInput, els.destinationSuggestions, els.destinationResult, setDestination);
