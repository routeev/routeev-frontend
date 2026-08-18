import type { Lang } from "./LanguageProvider";

// Aparte de LanguageProvider.tsx (que además exporta el componente y el hook
// useTranslation) porque mezclar un export de función plana con exports de
// componente/hook en el mismo archivo rompe el Fast Refresh de Vite -- cada
// cambio en cualquiera de los dos forzaba un reload completo de la página en
// vez de un hot-swap.
const STORAGE_KEY = "routeev_lang";

/**
 * Para el puñado de módulos que no son componentes/hooks de React (p. ej.
 * src/api/client.ts, que arma mensajes de error antes de que exista ningún
 * árbol de componentes) y por eso no pueden usar useTranslation(). Lee
 * directo del mismo localStorage que LanguageProvider, sin pasar por contexto.
 */
export function getStoredLang(): Lang {
  if (typeof window === "undefined") return "es";
  return window.localStorage.getItem(STORAGE_KEY) === "en" ? "en" : "es";
}
