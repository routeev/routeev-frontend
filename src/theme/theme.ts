// Sin contexto de React a propósito: a diferencia del idioma (donde el
// diccionario entero tiene que estar disponible reactivamente en cada
// componente), acá el CSS ya hace todo el trabajo visual solo con el
// atributo data-theme -- el único lugar que necesita saber "cuál está
// activo ahora" es el propio ThemeSwitcher, que lo lee una vez al montar.

export type Theme = "dark" | "light";

// Mismo prefijo routeev_ que el resto de las claves de localStorage del
// proyecto (routeev_token, routeev_username, routeev_lang). Misma clave que
// lee el script inline de index.html antes del primer paint.
const STORAGE_KEY = "routeev_theme";

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
  if (meta) meta.setAttribute("content", theme === "light" ? "#eef1f4" : "#0a0e13");
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
