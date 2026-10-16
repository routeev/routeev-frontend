import { useSyncExternalStore } from "react";

/**
 * Si un media query se cumple AHORA, y re-renderiza cuando cambia.
 *
 * Para lo que el CSS solo no alcanza: el panel de /app no cambia solo de
 * aspecto entre escritorio y celular, cambia de comportamiento (en el celular
 * es una hoja que se arrastra y achica el mapa). useSyncExternalStore porque
 * matchMedia ya es un store externo con su propio evento de cambio.
 */
export function useMediaQuery(query: string): boolean {
  return useSyncExternalStore(
    (onChange) => {
      const mql = window.matchMedia(query);
      mql.addEventListener("change", onChange);
      return () => mql.removeEventListener("change", onChange);
    },
    () => window.matchMedia(query).matches,
    () => false
  );
}
