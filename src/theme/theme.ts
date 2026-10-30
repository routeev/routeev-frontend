// Sin contexto de React a propósito: a diferencia del idioma (donde el
// diccionario entero tiene que estar disponible reactivamente en cada
// componente), acá el CSS ya hace todo el trabajo visual solo con el
// atributo data-theme -- lo poco que necesita saber "cuál está activo
// ahora" (el selector del header, los mapas) lo lee con useActiveTheme.

import { temporadaAplicada } from "../season/season";

export type Theme = "dark" | "light";

// Mismo prefijo routeev_ que el resto de las claves de localStorage del
// proyecto (routeev_token, routeev_username, routeev_lang). Misma clave que
// lee el script inline de index.html antes del primer paint.
const STORAGE_KEY = "routeev_theme";

// El claro/oscuro es una preferencia de LA APLICACIÓN (/app, /profile), no
// del sitio entero -- pedido explícito: landing, showroom, legales y login
// se quedan siempre en el oscuro de toda la vida, sin importar qué haya
// elegido la persona la última vez que estuvo en la app. Mismas dos rutas
// que routes.tsx envuelve en ProtectedRoute.
const THEMED_ROUTE_PREFIXES = ["/app", "/profile"];

export function isThemedRoute(pathname: string): boolean {
  return THEMED_ROUTE_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );
}

// Oscuro es el default de toda la vida (el :root sin atributo en tokens.css)
// -- solo se pasa a claro si la persona lo eligió antes, en esta pestaña o
// en una visita anterior.
export function getStoredTheme(): Theme {
  if (typeof window === "undefined") return "dark";
  return window.localStorage.getItem(STORAGE_KEY) === "light" ? "light" : "dark";
}

// El color de la barra de direcciones del navegador (meta theme-color) tiene
// que seguir al tema igual que el resto de la UI -- sin esto quedaba fijo en
// el valor oscuro de index.html sin importar qué tema esté activo.
function syncThemeColorMeta(theme: Theme): void {
  const meta = document.querySelector('meta[name="theme-color"]');
  if (!meta) return;
  if (theme === "light") meta.setAttribute("content", "#eef1f4");
  // El oscuro de Halloween es otro negro (violeta en vez de azulado): sin
  // esto la barra del navegador en mobile queda del color de la app de
  // siempre y se nota el corte contra el fondo de la pagina.
  else meta.setAttribute("content", temporadaAplicada() ? "#0d0a14" : "#0a0e13");
}

export function applyTheme(theme: Theme): void {
  if (theme === "light") document.documentElement.setAttribute("data-theme", "light");
  else document.documentElement.removeAttribute("data-theme");
  syncThemeColorMeta(theme);
}

export function setTheme(theme: Theme): void {
  window.localStorage.setItem(STORAGE_KEY, theme);
  applyTheme(theme);
}

/**
 * Aplica (o no) el tema guardado según la ruta actual -- se llama al cargar
 * la página y en cada cambio de ruta (ver App.tsx, router.subscribe). Fuera
 * de /app y /profile fuerza oscuro sin tocar localStorage: la preferencia
 * elegida sigue ahí, lista para cuando la persona vuelva a entrar a la app.
 */
export function syncThemeForRoute(pathname: string): void {
  // El disfraz de temporada es solo oscuro, asi que mientras esta prendido
  // la app es oscura aunque la persona tenga elegido el claro. No se toca
  // localStorage: la preferencia sigue guardada, el selector queda a la
  // vista pero bloqueado (ver ThemeSeg) y apagando el disfraz con el
  // interruptor vuelve al momento, sin recargar.
  if (temporadaAplicada()) {
    applyTheme("dark");
    return;
  }
  applyTheme(isThemedRoute(pathname) ? getStoredTheme() : "dark");
}
