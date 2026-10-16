// Quién ve la bienvenida encima de la home (LandingPage). Aparte del
// componente para que lazyPages.tsx pueda preguntarlo sin bajarse la página.

const SEEN_KEY = "routeev_welcome_seen";

// Google baja en sus resultados a las páginas que, apenas llegás desde el
// buscador, tapan el contenido con una pantalla así. A quien viene de uno le
// mostramos la home directo.
const SEARCH_ENGINE =
  /^https?:\/\/([^/]+\.)?(google|bing|yahoo|duckduckgo|ecosia|yandex|baidu|brave)\./i;

function seen(): boolean {
  try {
    return localStorage.getItem(SEEN_KEY) === "1";
  } catch {
    return false;
  }
}

/**
 * Si a quien llega a la home todavía le toca la bienvenida: sin sesión, sin
 * haberla cerrado antes y sin venir de un buscador. `entry` dice si la home
 * es la primera página de la visita; entrando desde otra página del sitio
 * (Inicio en el showroom) no sale.
 */
export function shouldShowWelcome(loggedIn: boolean, entry = true): boolean {
  return entry && !loggedIn && !seen() && !SEARCH_ENGINE.test(document.referrer);
}

/** Una vez cerrada, no vuelve a salir en este navegador. */
export function markWelcomeSeen(): void {
  try {
    localStorage.setItem(SEEN_KEY, "1");
  } catch {
    // Sin almacenamiento (ventana privada estricta) vuelve a salir la próxima
    // vez; no hay mucho más que hacer.
  }
}
