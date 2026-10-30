// Prender y apagar el disfraz desde el interruptor. Aparte de season.ts
// porque esto es lo unico que escribe: season.ts solo lee y deriva, y asi
// los adornos y los tests no arrastran la dependencia con el tema.

import { syncThemeForRoute } from "../theme/theme";
import { SEASON_ID, SEASON_OFF_KEY, aplicarTemporada } from "./season";

// Un fundido corto para que la paleta no salte de golpe. Si el navegador no
// trae View Transitions (Firefox y Safari viejo) o la persona pidio menos
// movimiento, el cambio es directo: el fundido es un lujo, no parte de la
// funcionalidad.
function conFundido(cambio: () => void): void {
  const prefiereQuieto = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const start = (document as Document & { startViewTransition?: (cb: () => void) => void })
    .startViewTransition;
  if (prefiereQuieto || typeof start !== "function") {
    cambio();
    return;
  }
  start.call(document, cambio);
}

/**
 * Guarda la eleccion, pone o saca el atributo, y vuelve a resolver el tema
 * de la ruta actual -- prendido fuerza oscuro, apagado devuelve al momento
 * el claro/oscuro que la persona tenia guardado, sin recargar.
 */
export function setSeasonOn(on: boolean): void {
  try {
    if (on) window.localStorage.removeItem(SEASON_OFF_KEY);
    else window.localStorage.setItem(SEASON_OFF_KEY, SEASON_ID);
  } catch {
    // Safari en modo privado tira al escribir. El disfraz igual cambia en
    // esta pestana; lo que se pierde es que se acuerde al recargar.
  }

  conFundido(() => {
    aplicarTemporada(on);
    syncThemeForRoute(window.location.pathname);
  });
}
