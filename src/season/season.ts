import { useSyncExternalStore } from "react";

// La temporada vive en un atributo de <html> (data-season), igual que el tema
// (data-theme): el CSS hace todo el trabajo visual y los adornos solo
// necesitan saber si mostrarse. Lo pone el script inline de index.html antes
// del primer paint, con estas MISMAS fechas y esta MISMA clave -- si cambian
// acá, cambian allá (lo chequea src/test/indexHtml.test.ts).
//
// Durante la ventana arranca prendida y cualquiera la puede apagar y volver a
// prender con el interruptor del header (SeasonSwitch). Prendida, la app es
// siempre oscura (el disfraz es solo oscuro); apagada, vuelve exactamente a lo
// de siempre, incluido el tema claro que la persona tuviera guardado.

export type Season = "halloween";

export const HALLOWEEN = {
  // Hora de Montevideo. El fin es exclusivo: el 3/11 a las 00:00 ya no está.
  start: Date.parse("2026-10-27T00:00:00-03:00"),
  end: Date.parse("2026-11-03T00:00:00-03:00"),
  // Con el año: apagarla este año no la apaga para el próximo.
  edition: "halloween-2026",
} as const;

// Mismo prefijo routeev_ que el resto de las claves de localStorage.
export const SEASON_OFF_KEY = "routeev_season_off";

export function isHalloweenWindow(now: number = Date.now()): boolean {
  return now >= HALLOWEEN.start && now < HALLOWEEN.end;
}

/** Prendida AHORA: el atributo que puso el script de index.html (o el interruptor). */
export function readSeason(): Season | null {
  return document.documentElement.getAttribute("data-season") === "halloween" ? "halloween" : null;
}

// Sin store propio: el DOM ya es el estado.
function subscribe(onChange: () => void): () => void {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["data-season"],
  });
  return () => observer.disconnect();
}

/** La temporada prendida, para lo que se dibuja solo con ella (adornos, estados vacíos). */
export function useSeason(): Season | null {
  return useSyncExternalStore(subscribe, readSeason, () => null);
}

/**
 * Para el interruptor: si hay una temporada en curso (`available`, para que
 * después del 3/11 no quede ningún control suelto) y si está prendida (`on`).
 */
export function useSeasonSwitch(): { available: boolean; on: boolean } {
  const on = useSeason() !== null;
  return { available: isHalloweenWindow(), on };
}
