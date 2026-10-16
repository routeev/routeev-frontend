// Quién ve la bienvenida encima de la home (LandingPage). Aparte del
// componente para que lazyPages.tsx pueda preguntarlo sin bajarse la página.

// sessionStorage y no localStorage: la bienvenida es lo primero que se ve en
// CADA visita (pedido explicito, 16/10/2026), no solo la primera vez en ese
// navegador. Cerrarla vale hasta el final de esa visita (la pestaña): recargar
// o volver a "Inicio" no la vuelve a mostrar.
const SEEN_KEY = "routeev_welcome_seen";

// Google baja en sus resultados a las páginas que, apenas llegás desde el
// buscador, tapan el contenido con una pantalla así. A quien viene de uno le
// mostramos la home directo.
const SEARCH_ENGINE =
  /^https?:\/\/([^/]+\.)?(google|bing|yahoo|duckduckgo|ecosia|yandex|baidu|brave)\./i;

function seen(): boolean {
  try {
    return sessionStorage.getItem(SEEN_KEY) === "1";
  } catch {
    return false;
  }
}

/**
 * Si a quien llega a la home todavía le toca la bienvenida: sin sesión, sin
 * haberla cerrado en esta visita y sin venir de un buscador. `entry` dice si la home
 * es la primera página de la visita; entrando desde otra página del sitio
 * (Inicio en el showroom) no sale.
 */
export function shouldShowWelcome(loggedIn: boolean, entry = true): boolean {
  return entry && !loggedIn && !seen() && !SEARCH_ENGINE.test(document.referrer);
}

/** Una vez cerrada, no vuelve a salir en esta visita (ver SEEN_KEY). */
export function markWelcomeSeen(): void {
  try {
    sessionStorage.setItem(SEEN_KEY, "1");
  } catch {
    // Sin almacenamiento (ventana privada estricta) puede volver a salir al
    // recargar; no hay mucho más que hacer.
  }
}
