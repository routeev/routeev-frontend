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
 * `lastRoutePayload` (lo que guarda setLastResult para más abajo) sigue
 * siendo el payload VIEJO, con origin_id/destination_id: eso es lo que
 * useLiveTrip.ts necesita para POST /api/route/log-trip al terminar el
 * viaje, y ese endpoint todavía no tiene una v2 -- sigue validando contra el
 * grafo vial de siempre. state.originId/destinationId (los ids reales, que
 * ClickToPick.tsx sigue resolviendo igual que siempre) no cambiaron en nada
 * de esta migración, así que ese payload sigue siendo válido tal cual.
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
      // Payload "de siempre", para el historial (ver el docstring de arriba)
      // -- no es lo que viaja por la red, es lo que log-trip necesita.
      const legacyPayload = {
        origin_id: state.originId!,
        destination_id: state.destinationId!,
        vehicle_id: state.selectedVehicleId!,
        start_battery_kwh: startBatteryKwh,
        ...(state.cargadorEnDestino ? {} : { cargador_en_destino: false }),
      };

      const v2Result = await planRoute(v2Payload);
      const result = toCompareRoutesResult(v2Result, origin.name, destination.name);
      return { result, payload: legacyPayload };
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
