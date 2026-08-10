const SESSION_KEY = "routeev:reloaded-on-stale-chunk";

/**
 * Tras un deploy nuevo, Vercel borra los assets hasheados del deploy
 * anterior. Una pestaña que quedó abierta desde antes del deploy (o que iOS
 * Safari resucitó en segundo plano) sigue intentando bajar esos hashes
 * viejos la próxima vez que React.lazy() dispara un `import()` -- 404, y
 * sin manejo eso tira a react-router a su pantalla de error genérica
 * ("Unexpected Application Error! Unable to preload CSS for ...").
 *
 * Vite emite `vite:preloadError` para exactamente este caso (falla un
 * import dinámico o el <link> de preload que lo acompaña):
 * https://vitejs.dev/guide/build.html#load-error-handling
 *
 * Recargamos una sola vez por pestaña: si el problema era el deploy viejo,
 * la recarga trae el HTML con los hashes nuevos y resuelve solo. Si vuelve
 * a fallar (sin red, error real de la app), el guard de sessionStorage
 * corta el loop y el error sigue su curso hasta RouteErrorBoundary, que
 * ofrece un botón de recargar manual.
 */
export function setupStaleChunkReload(): void {
  window.addEventListener("vite:preloadError", () => {
    if (sessionStorage.getItem(SESSION_KEY)) return;
    sessionStorage.setItem(SESSION_KEY, "1");
    window.location.reload();
  });
}
