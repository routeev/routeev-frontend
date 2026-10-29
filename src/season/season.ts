import { useSyncExternalStore } from "react";

// La temporada vive en un atributo de <html> (data-season), igual que el tema
// (data-theme): el CSS hace todo el trabajo visual y los adornos solo
// necesitan saber si mostrarse. Lo pone el script inline de index.html antes
// del primer paint, con estas MISMAS fechas -- si cambian acá, cambian allá
// (lo chequea src/test/indexHtml.test.ts).
//
// Mientras dura no se puede apagar: no hay botón para sacarla y la app es
// siempre oscura (el tema claro guardado se respeta de nuevo cuando termina,
// ver theme.ts). Pedido explícito: toda la app disfrazada hasta el 3/11.

export type Season = "halloween";

export const HALLOWEEN = {
  // Hora de Montevideo. El fin es exclusivo: el 3/11 a las 00:00 ya no está.
  start: Date.parse("2026-10-27T00:00:00-03:00"),
  end: Date.parse("2026-11-03T00:00:00-03:00"),
} as const;

export function isHalloweenWindow(now: number = Date.now()): boolean {
  return now >= HALLOWEEN.start && now < HALLOWEEN.end;
}

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

export function useSeason(): Season | null {
  return useSyncExternalStore(subscribe, readSeason, () => null);
}
