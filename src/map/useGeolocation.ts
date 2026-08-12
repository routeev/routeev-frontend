import { useState } from "react";
import { getNearestNode } from "../api/graph";
import { haversineKm } from "../shared/geo";
import { useMapStore } from "./mapStore";

type ResultKind = "" | "warn" | "error";

const ERROR_MESSAGES: Record<number, string> = {
  1: "No nos diste permiso para ver tu ubicación. Podés habilitarlo desde el candado en la barra de direcciones del navegador.",
  2: "No se pudo determinar tu ubicación. Revisá que el GPS o la ubicación del dispositivo estén encendidos.",
  3: "La búsqueda de tu ubicación tardó demasiado. Probá de nuevo.",
};

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
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ text: string; kind: ResultKind } | null>(null);
  const setOrigin = useMapStore((s) => s.setOrigin);
  const setPickMode = useMapStore((s) => s.setPickMode);

  function useMyLocation() {
    if (busy) return;
    if (!navigator.geolocation) {
      setResult({ text: "Este navegador no puede darnos tu ubicación.", kind: "error" });
      return;
    }

    setBusy(true);
    setResult({ text: "Si el navegador te pregunta, elegí «Permitir».", kind: "" });

    const onSuccess = async (pos: GeolocationPosition) => {
      const { latitude, longitude } = pos.coords;
      try {
        const node = await getNearestNode(latitude, longitude);
        useMapStore.getState().addNode(node);
        setOrigin(node);
        setPickMode("destination");
        const map = useMapStore.getState().leafletMap;
        map?.setView([node.lat, node.lon], Math.max(map.getZoom(), 15));

        const distanciaKm = haversineKm(latitude, longitude, node.lat, node.lon);
        if (distanciaKm > 2) {
          setResult({
            text: `Estás a ${distanciaKm.toFixed(1)} km de la calle más cercana que cubre el mapa. Se usó «${node.name}» como origen, pero puede no ser preciso.`,
            kind: "warn",
          });
        } else {
          setResult({ text: `Origen fijado en ${node.name}.`, kind: "" });
        }
      } catch (err) {
        setResult({
          text: err instanceof Error ? err.message : "No se pudo ubicar tu posición en el mapa.",
          kind: "error",
        });
      } finally {
        setBusy(false);
      }
    };

    const onFinalError = (err: GeolocationPositionError) => {
      setResult({
        text: ERROR_MESSAGES[err.code] ?? "No se pudo obtener tu ubicación.",
        kind: "error",
      });
      setBusy(false);
    };

    getCurrentPositionWithFallback(onSuccess, onFinalError, () =>
      setResult({ text: "No hay GPS: buscando tu ubicación aproximada por Wi-Fi...", kind: "warn" })
    );
  }

  return { useMyLocation, busy, result };
}
