import { useSyncExternalStore } from "react";
import { refreshThemeColorMeta } from "../theme/theme";

// La temporada vive en un atributo de <html> (data-season), igual que el tema
// (data-theme): el CSS hace todo el trabajo visual y los adornos solo
// necesitan saber si mostrarse. Lo pone el script inline de index.html antes
// del primer paint, con estas MISMAS fechas y esta MISMA clave -- si cambian
// acá, cambian allá.

export type Season = "halloween";

export const HALLOWEEN = {
  // Hora de Montevideo. El fin es exclusivo: el 3/11 a las 00:00 ya no está.
  start: Date.parse("2026-10-27T00:00:00-03:00"),
  end: Date.parse("2026-11-03T00:00:00-03:00"),
  // Con el año: cerrarlo este año no lo apaga para el próximo.
  edition: "halloween-2026",
} as const;

// Mismo prefijo routeev_ que el resto de las claves de localStorage.
export const SEASON_OFF_KEY = "routeev_season_off";

export function isHalloweenWindow(now: number = Date.now()): boolean {
  return now >= HALLOWEEN.start && now < HALLOWEEN.end;
}

/**
 * Lo que se ve: hay temporada y la persona no está en el tema claro. En claro
 * (/app y /profile, si lo eligió) los tokens hw-* no existen, así que los
 * adornos tampoco se montan.
 */
export function readSeason(): Season | null {
  const root = document.documentElement;
  if (root.getAttribute("data-season") !== "halloween") return null;
  return root.getAttribute("data-theme") === "light" ? null : "halloween";
}

// Escucha los dos atributos: cerrar el chip saca data-season, y cambiar a
// claro en /app pone data-theme. Sin store propio: el DOM ya es el estado.
function subscribe(onChange: () => void): () => void {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["data-season", "data-theme"],
  });
  return () => observer.disconnect();
}

export function useSeason(): Season | null {
  return useSyncExternalStore(subscribe, readSeason, () => null);
}

/** El chip "Edición Halloween": apaga el disfraz para esta persona hasta el año que viene. */
export function dismissSeason(): void {
  try {
    window.localStorage.setItem(SEASON_OFF_KEY, HALLOWEEN.edition);
  } catch {
    // Sin localStorage se apaga igual, solo que vuelve al recargar.
  }
  document.documentElement.removeAttribute("data-season");
  refreshThemeColorMeta();
}
