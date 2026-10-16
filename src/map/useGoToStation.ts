import { useState } from "react";
import type { Station } from "../api/graph";
import { useTranslation } from "../i18n/LanguageProvider";
import { calculateGateMissing, selectedVehicle, useMapStore } from "./mapStore";
import { nameInBackground } from "./pointName";
import { fromCoords } from "./routePoint";
import { getCurrentPositionWithFallback } from "./useGeolocation";

/**
 * "Ir hasta acá desde mi ubicación", desde el detalle de una estación: la
 * ubicación actual como origen, la estación como destino, y la ruta calculada
 * sin más pasos.
 *
 * La ubicación se pide de nuevo y no se toma `myPosition` del store: esa se
 * resuelve una sola vez al abrir /app, y el origen de un viaje tiene que ser
 * dónde está la persona AHORA (mismo criterio que "Usar mi ubicación", con el
 * mismo reintento sin GPS de getCurrentPositionWithFallback).
 *
 * `calculate` es el del botón "Calcular ruta" de MapPage, no uno propio: así
 * el "Calculando..." y un error del cálculo salen donde siempre. Si todavía
 * no se puede calcular (sin vehículo, o parada encima de la estación), los
 * puntos quedan puestos igual y el paso a seguir de "Tu viaje" dice qué falta.
 */
export function useGoToStation(calculate: () => void, onPointsSet?: () => void) {
  const { t } = useTranslation();
  const geo = t.map.geolocation;
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const ERROR_MESSAGES: Record<number, string> = {
    1: geo.permissionDenied,
    2: geo.unableToDetermine,
    3: geo.timeout,
  };

  function goTo(station: Station) {
    if (busy) return;
    if (!navigator.geolocation) {
      setError(geo.unsupportedBrowser);
      return;
    }
    setBusy(true);
    setError(null);

    getCurrentPositionWithFallback(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        const store = useMapStore.getState();
        store.setOrigin(fromCoords(latitude, longitude));
        store.setDestination({ name: station.nombre, lat: station.lat, lon: station.lon });
        // El destino ES un cargador: la pregunta de "¿tenés dónde cargar en
        // el destino?" ya está contestada, y preguntarla frenaría el cálculo
        // directo que promete este botón.
        store.setCargadorEnDestino(true);
        store.stopPicking();
        // Cierra el detalle (y el popup, si se llegó por el marcador): con
        // origen y destino puestos, lo que la persona quiere ver es su viaje.
        store.selectStation(null);
        store.leafletMap?.closePopup();
        onPointsSet?.();
        setBusy(false);
        void nameInBackground("origin", latitude, longitude);

        const s = useMapStore.getState();
        const missing = calculateGateMissing({
          vehiclesLoaded: s.vehiclesLoaded,
          hasSelectedVehicle: selectedVehicle(s) != null,
          origin: s.originNode,
          destination: s.destinationNode,
          chargerAnswered: s.cargadorEnDestino != null,
        });
        if (missing.length === 0) calculate();
      },
      (err) => {
        setError(ERROR_MESSAGES[err.code] ?? geo.genericError);
        setBusy(false);
      }
    );
  }

  return { goTo, busy, error };
}
