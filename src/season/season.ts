// El disfraz de temporada: un solo atributo en <html>, data-season, que pisa
// los tokens de tokens.css con el bloque de season-halloween.css. No es un
// rediseno -- el layout, los componentes, los flujos y los textos son los de
// siempre; cambian superficies, bordes, sombras y unos adornos en SVG.
//
// Se apaga de tres maneras: la persona lo apaga con el interruptor, la fecha
// se pasa de SEASON_END, o (despues del 3/11) un PR borra esta carpeta, el
// CSS y las nueve lineas del script de index.html.

import { useState, useSyncExternalStore } from "react";

export type Season = "halloween" | null;

// La EDICION, no la temporada: lo que se guarda es cual edicion apago la
// persona, asi un Halloween futuro no arranca apagado para quien apago el de
// este ano.
export const SEASON_ID = "halloween-2026";

// Clave aparte de routeev_theme a proposito: apagar el disfraz no tiene que
// pisar el claro/oscuro que la persona eligio para /app. Mismo prefijo
// routeev_ que el resto de las claves del proyecto.
export const SEASON_OFF_KEY = "routeev_season_off";

// Del 27/10 al 2/11 inclusive, hora de Montevideo (UTC-3 todo el ano desde
// 2015, sin horario de verano). El fin es el 3/11 a las 00:00 y es
// exclusivo: a esa hora la app vuelve sola a lo de siempre para todo el
// mundo, sin desplegar nada.
//
// Estas dos cadenas estan repetidas tal cual en el script inline de
// index.html, que corre antes del primer paint para que no haya parpadeo.
// season.test.ts lee el HTML y chequea que no se desincronicen.
export const SEASON_START = "2026-10-27T00:00:00-03:00";
export const SEASON_END = "2026-11-03T00:00:00-03:00";

/** Si la fecha cae en la ventana de la temporada. */
export function enVentana(ahora: number = Date.now()): boolean {
  return ahora >= Date.parse(SEASON_START) && ahora < Date.parse(SEASON_END);
}

/** Si la persona apago esta edicion con el interruptor. */
export function apagadaPorLaPersona(): boolean {
  try {
    return window.localStorage.getItem(SEASON_OFF_KEY) === SEASON_ID;
  } catch {
    // Safari en modo privado tira al leer localStorage. Sin preferencia
    // guardada, la temporada manda.
    return false;
  }
}

/**
 * Lo que decide el atributo: la fecha esta en la ventana y la persona no lo
 * apago. Misma cuenta que hace el script de index.html.
 */
export function temporadaCorresponde(ahora: number = Date.now()): boolean {
  return enVentana(ahora) && !apagadaPorLaPersona();
}

/** Lo que hay puesto ahora en <html>, que es la unica fuente de verdad. */
export function temporadaAplicada(): Season {
  if (typeof document === "undefined") return null;
  return document.documentElement.getAttribute("data-season") === "halloween" ? "halloween" : null;
}

export function aplicarTemporada(on: boolean): void {
  if (on) document.documentElement.setAttribute("data-season", "halloween");
  else document.documentElement.removeAttribute("data-season");
}

/**
 * La temporada activa, leida del atributo y no de un estado propio -- mismo
 * criterio (y misma API) que useActiveTheme: el atributo del DOM ES el
 * store, asi que el interruptor del header, los adornos y los estados
 * vacios no pueden desincronizarse entre si. Con useState + useEffect
 * habria que re-leer el valor dentro del efecto, que es el setState
 * sincronico que react-hooks/set-state-in-effect marca como error.
 */
export function useSeason(): Season {
  return useSyncExternalStore(suscribir, temporadaAplicada, () => null);
}

function suscribir(alCambiar: () => void): () => void {
  const observer = new MutationObserver(alCambiar);
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["data-season"],
  });
  return () => observer.disconnect();
}

/**
 * Si el interruptor va en el header: solo dentro de la ventana de fechas.
 * Apagado el disfraz, el interruptor sigue ahi (es como se vuelve a
 * prender); pasado el 3/11 desaparece.
 */
export function useHayTemporada(): boolean {
  const [hay] = useState(() => enVentana());
  return hay;
}
