import { isRouteErrorResponse, useRouteError } from "react-router-dom";
import { useTranslation } from "../i18n/LanguageProvider";
import styles from "./RouteErrorBoundary.module.css";

// Distintos mensajes segun navegador para el mismo fallo (import dinamico o
// su CSS de acompaniamiento 404-eando tras un deploy nuevo): Chrome/Edge
// "Failed to fetch dynamically imported module", Firefox "error loading
// dynamically imported module", Safari "Importing a module script failed",
// mas el propio "Unable to preload CSS for ..." de Vite. Si esto se ve, es
// porque reloadOnStaleChunk.ts ya intento una recarga automatica esta
// sesion y volvio a fallar (o el navegador no dispara vite:preloadError).
function isStaleChunkError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return /dynamically imported module|preload css|module script failed/i.test(message);
}

/** errorElement raiz (routes.tsx): pantalla de error propia en vez del
 * "Unexpected Application Error!" generico de react-router. */
export function RouteErrorBoundary() {
  const { t } = useTranslation();
  const error = useRouteError();
  const staleChunk = !isRouteErrorResponse(error) && isStaleChunkError(error);

  return (
    <div className={styles.wrap}>
      <p className={styles.eyebrow}>RouteEV</p>
      <h1>{staleChunk ? t.shared.routeErrorBoundary.staleChunkTitle : t.shared.routeErrorBoundary.genericTitle}</h1>
      <p className={styles.body}>
        {staleChunk ? t.shared.routeErrorBoundary.staleChunkBody : t.shared.routeErrorBoundary.genericBody}
      </p>
      <button type="button" className="primary" onClick={() => window.location.reload()}>
        {t.shared.routeErrorBoundary.reload}
      </button>
    </div>
  );
}
