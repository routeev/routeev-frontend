// Sin contexto de React a propósito: a diferencia del idioma (donde el
// diccionario entero tiene que estar disponible reactivamente en cada
// componente), acá el CSS ya hace todo el trabajo visual solo con el
// atributo data-theme -- lo poco que necesita saber "cuál está activo
// ahora" (el selector del header, los mapas) lo lee con useActiveTheme.

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
  return THEMED_ROUTE_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
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
// el valor oscuro de index.html sin importar qué tema esté activo. En la
// edición Halloween (data-season, ver src/season/season.ts) el oscuro es el
// --bg de season-halloween.css.
function syncThemeColorMeta(theme: Theme): void {
  const meta = document.querySelector('meta[name="theme-color"]');
  if (!meta) return;
  const season = document.documentElement.hasAttribute("data-season");
  meta.setAttribute("content", theme === "light" ? "#eef1f4" : season ? "#0d0a14" : "#0a0e13");
}

/** Vuelve a calcular theme-color con lo que hay hoy en <html> (al apagar la temporada). */
export function refreshThemeColorMeta(): void {
  syncThemeColorMeta(
    document.documentElement.getAttribute("data-theme") === "light" ? "light" : "dark"
  );
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
  applyTheme(isThemedRoute(pathname) ? getStoredTheme() : "dark");
}
