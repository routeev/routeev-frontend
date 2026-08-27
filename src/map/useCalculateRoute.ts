import { useMutation } from "@tanstack/react-query";
import { planRoute, toCompareRoutesResult } from "../api/route";
import { batteryPctToKwh, selectedVehicle, useMapStore } from "./mapStore";

/**
 * Botón "Calcular ruta", portado de js/map/routeCalc.js.
 *
 * Llama a planRoute() (v2, ver VALHALLA.md §9) en vez de compareRoutes():
 * origen/destino viajan como coordenadas, no como ids del grafo propio. El
 * resultado se adapta con toCompareRoutesResult a la MISMA forma que ya
 * consume el resto de la interfaz -- ver ese helper para el porqué.
 *
 * `lastRoutePayload` (lo que guarda setLastResult para más abajo) es el seed
 * de log-trip: guarda los PUNTOS enteros, no ids. `POST /api/route/log-trip`
 * todavía es v1 y valida contra el grafo vial, así que va a necesitar un id
 * de nodo — pero ese id puede no existir todavía cuando se calcula la ruta,
 * porque el toque en el mapa ahora fija una coordenada cruda y el nodo se
 * resuelve en segundo plano (ver snapPoint.ts). Guardar el punto y no el id
 * deja que se complete solo por el camino; useLiveTrip lo resuelve recién al
 * guardar el viaje.
 */
export function useCalculateRoute() {
  const setLastResult = useMapStore((s) => s.setLastResult);

  const mutation = useMutation({
    mutationFn: async () => {
      const state = useMapStore.getState();
      const vehicle = selectedVehicle(state);
      const origin = state.originNode!;
      const destination = state.destinationNode!;
      const startBatteryKwh = vehicle ? batteryPctToKwh(vehicle, state.startBatteryPct) : undefined;

      const v2Payload = {
        origen: { lat: origin.lat, lon: origin.lon },
        destino: { lat: destination.lat, lon: destination.lon },
        vehicle_id: state.selectedVehicleId!,
        start_battery_kwh: startBatteryKwh,
        ...(state.cargadorEnDestino ? {} : { cargador_en_destino: false }),
      };
      // Lo que log-trip va a necesitar cuando el viaje termine. Guarda los
      // PUNTOS enteros, no ids: su `snapId` puede completarse más tarde (ver
      // snapPoint.ts) y useLiveTrip lo resuelve recién al guardar.
      const tripSeed = {
        origin,
        destination,
        vehicle_id: state.selectedVehicleId!,
        start_battery_kwh: startBatteryKwh,
        ...(state.cargadorEnDestino ? {} : { cargador_en_destino: false }),
      };

      const v2Result = await planRoute(v2Payload);
      const result = toCompareRoutesResult(v2Result, origin.name, destination.name);
      return { result, payload: tripSeed };
    },
    onSuccess: ({ result, payload }) => {
      setLastResult(result, payload);
    },
  });

  return {
    calculate: () => mutation.mutate(),
    isPending: mutation.isPending,
    error: mutation.error instanceof Error ? mutation.error.message : null,
  };
}
