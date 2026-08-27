import { useState } from "react";
import { useTranslation } from "../i18n/LanguageProvider";
import { useMapStore } from "./mapStore";
import { fromCoords } from "./routePoint";
import { snapInBackground } from "./snapPoint";

type ResultKind = "" | "warn" | "error";

/**
 * navigator.geolocation.getCurrentPosition con el mismo fallback que usa
 * "Usar mi ubicación" (useMyLocation, mas abajo): sin chip GPS (notebook/PC),
 * pedir alta precision suele agotar el timeout igual con la conexion
 * andando bien, asi que ante un TIMEOUT se reintenta una vez sin
 * enableHighAccuracy (ubicacion por Wi-Fi/IP, menos exacta pero mucho mas
 * rapida). Extraido a parte porque lo usan tanto el boton como el auto-zoom
 * al abrir /app (MapCanvas.tsx).
 */
export function getCurrentPositionWithFallback(
  onSuccess: (pos: GeolocationPosition) => void,
  onFinalError: (err: GeolocationPositionError) => void,
  onRetryWithoutGPS?: () => void
) {
  navigator.geolocation.getCurrentPosition(
    onSuccess,
    (err) => {
      if (err.code === err.TIMEOUT) {
        onRetryWithoutGPS?.();
        navigator.geolocation.getCurrentPosition(onSuccess, onFinalError, {
          enableHighAccuracy: false,
          timeout: 20000,
          maximumAge: 60000,
        });
        return;
      }
      onFinalError(err);
    },
    { enableHighAccuracy: true, timeout: 8000, maximumAge: 60000 }
  );
}

/** "Usar mi ubicación" como origen, portado de js/map/geolocation.js. */
export function useGeolocation() {
  const { t } = useTranslation();
  const geo = t.map.geolocation;
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ text: string; kind: ResultKind } | null>(null);
  const setOrigin = useMapStore((s) => s.setOrigin);
  const setPickMode = useMapStore((s) => s.setPickMode);

  const ERROR_MESSAGES: Record<number, string> = {
    1: geo.permissionDenied,
    2: geo.unableToDetermine,
    3: geo.timeout,
  };

  function useMyLocation() {
    if (busy) return;
    if (!navigator.geolocation) {
      setResult({ text: geo.unsupportedBrowser, kind: "error" });
      return;
    }

    setBusy(true);
    setResult({ text: geo.grantPermissionHint, kind: "" });

    const onSuccess = (pos: GeolocationPosition) => {
      const { latitude, longitude } = pos.coords;
      // "Salgo desde acá" es literal: el origen es la ubicación real, no el
      // cruce más cercano del grafo. Antes esto esperaba a /api/graph/nearest
      // y podía terminar poniendo el origen a kilómetros de donde estaba la
      // persona, con un aviso de "quedó impreciso" como único consuelo.
      const p = fromCoords(latitude, longitude);
      setOrigin(p);
      setPickMode("destination");
      const map = useMapStore.getState().leafletMap;
      map?.setView([latitude, longitude], Math.max(map.getZoom(), 15));
      setResult({ text: geo.originSet(p.name), kind: "" });
      setBusy(false);
      // El nombre de la calle llega después, sin bloquear (ver snapPoint.ts).
      void snapInBackground("origin", latitude, longitude);
    };

    const onFinalError = (err: GeolocationPositionError) => {
      setResult({
        text: ERROR_MESSAGES[err.code] ?? geo.genericError,
        kind: "error",
      });
      setBusy(false);
    };

    getCurrentPositionWithFallback(onSuccess, onFinalError, () =>
      setResult({ text: geo.noGpsFallback, kind: "warn" })
    );
  }

  return { useMyLocation, busy, result };
}
