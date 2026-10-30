import { syncThemeForRoute } from "../theme/theme";
import { HALLOWEEN, SEASON_OFF_KEY } from "./season";

/**
 * Prende o apaga la edición Halloween para esta persona. Aparte de season.ts
 * porque toca el tema (theme.ts importa de season.ts, y al revés sería un
 * ciclo).
 *
 * La preferencia se guarda como "apagada esta edición": sin la marca, durante
 * la ventana está prendida (es el default), y el script de index.html la lee
 * antes del primer paint para que no haya parpadeo al recargar.
 *
 * Después se vuelve a resolver el tema de la ruta actual: prendida fuerza
 * oscuro; apagada, en /app y /profile vuelve el tema que la persona hubiera
 * elegido (que nunca se borró).
 */
export function setSeasonOn(on: boolean): void {
  try {
    if (on) window.localStorage.removeItem(SEASON_OFF_KEY);
    else window.localStorage.setItem(SEASON_OFF_KEY, HALLOWEEN.edition);
  } catch {
    // Sin localStorage vale igual para esta visita; solo no se recuerda.
  }
  const root = document.documentElement;
  if (on) root.setAttribute("data-season", "halloween");
  else root.removeAttribute("data-season");
  syncThemeForRoute(window.location.pathname);
}
