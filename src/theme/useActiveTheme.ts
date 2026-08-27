import { useSyncExternalStore } from "react";
import type { Theme } from "./theme";

/**
 * El tema que está aplicado AHORA, para lo poco que no puede resolverse con
 * CSS: los mapas.
 *
 * `theme.ts` no usa contexto de React a propósito -- el CSS hace todo el
 * trabajo visual con solo el atributo `data-theme` en `<html>`. Pero un mapa
 * no es CSS: el basemap de OpenFreeMap es una URL de estilo que hay que
 * pasarle a MapLibre, y los colores de las polilíneas van como hex a Leaflet,
 * que con `preferCanvas` no resuelve `var()`.
 *
 * Así que en vez de meter un contexto (y obligar a envolver la app entera por
 * dos componentes), se lee el mismo atributo que el CSS ya mira. Eso además
 * capta los cambios que NO vienen del switcher: `syncThemeForRoute()` fuerza
 * oscuro fuera de /app y /profile sin tocar localStorage.
 *
 * `useSyncExternalStore` y no useState+useEffect: el atributo del DOM ES un
 * store externo, y esta es la API que React tiene para eso. Con la otra forma
 * hay que re-leer el valor dentro del efecto (por si cambió entre el render y
 * el efecto), y eso es un setState sincrónico en el cuerpo de un efecto: la
 * cascada de renders que `react-hooks/set-state-in-effect` marca como error.
 */
export function useActiveTheme(): Theme {
  return useSyncExternalStore(suscribir, leerTema, () => "dark");
}

function suscribir(alCambiar: () => void): () => void {
  const observer = new MutationObserver(alCambiar);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
  return () => observer.disconnect();
}

/**
 * Oscuro es el default: `tokens.css` define la paleta oscura en el `:root`
 * pelado y solo la pisa con `:root[data-theme="light"]`. Sin atributo, oscuro.
 *
 * Devuelve un string literal y no un objeto: getSnapshot tiene que dar un
 * valor estable por identidad o React entra en un bucle de re-render.
 */
function leerTema(): Theme {
  return document.documentElement.getAttribute("data-theme") === "light" ? "light" : "dark";
}
