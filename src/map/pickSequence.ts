import type { PickMode } from "./mapStore";

/**
 * Cuánto espera ClickToPick antes de resolver un toque del mapa.
 *
 * Existe por el doble-click-para-hacer-zoom de Leaflet: ese gesto dispara DOS
 * eventos "click" ANTES del "dblclick", así que sin la espera cada zoom con
 * doble click terminaba fijando origen y destino donde la persona solo quería
 * acercarse. El "dblclick" llega dentro de esta ventana y cancela los dos.
 */
export const DOUBLE_CLICK_GUARD_MS = 250;

/**
 * A qué rol (origen o destino) le corresponde un toque nuevo del mapa cuando
 * todavía hay toques anteriores agendados o resolviéndose contra la API.
 *
 * Existe por un bug concreto y bien reproducible: "el click en el mapa no fija
 * el destino". El guard de arriba se implementaba con UN solo timeout, y cada
 * click nuevo cancelaba el pendiente. Dos toques deliberados separados por
 * menos de 250 ms (en dos puntos distintos, sin dblclick de por medio) hacían
 * UNA sola llamada a /api/graph/nearest, y encima leyendo el pickMode DENTRO
 * del timeout -- es decir todavía en "origin". Resultado exacto del reporte:
 * el origen saltaba al segundo punto y el destino nunca se fijaba.
 *
 * Ahora cada toque se agenda por separado y se queda con su rol en el momento
 * del toque, no cuando el timeout corre. Como el store recién se entera del
 * primer toque cuando su llamada a la API vuelve, el rol no se puede leer de
 * ahí para el segundo: hay que derivarlo de lo ya repartido.
 *
 * @param storeMode  pickMode actual del store (lo que muestra el panel).
 * @param claimed    roles que se llevaron los toques todavía sin aplicar, en
 *                   orden de toque.
 */
export function claimPickRole(storeMode: PickMode, claimed: readonly PickMode[]): PickMode {
  const last = claimed[claimed.length - 1];
  // Sin nada en vuelo manda el store: es el rol que la persona ve marcado en
  // los botones de chincheta del panel.
  if (last === undefined) return storeMode;
  // Fijar el origen adelanta al destino -- misma regla que aplica el propio
  // store cuando el pick aterriza. Fijar el destino no vuelve al origen: el
  // toque siguiente reemplaza el destino, que es lo que espera cualquiera que
  // se equivocó de punto de llegada.
  return last === "origin" ? "destination" : last;
}
