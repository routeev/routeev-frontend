import { useMutation } from "@tanstack/react-query";
import { planRoute, toCompareRoutesResult } from "../api/route";
import { batteryPctToKwh, selectedVehicle, useMapStore } from "./mapStore";
import { suggestedName } from "./routePoint";

/**
 * Botón "Calcular ruta", portado de js/map/routeCalc.js.
 *
 * Llama a planRoute() (v2, ver VALHALLA.md §9) en vez de compareRoutes():
 * origen/destino viajan como coordenadas, no como ids del grafo propio. El
 * resultado se adapta con toCompareRoutesResult a la MISMA forma que ya
 * consume el resto de la interfaz -- ver ese helper para el porqué.
 *
 * `lastRoutePayload` (lo que guarda setLastResult para más abajo) es el seed
 * del viaje: el `plan_id` que la API acaba de guardar, más los dos nombres que
 * la persona tiene en pantalla. Nada más — el vehículo, la batería inicial, el
 * origen y el destino ya viven en el plan del lado del servidor, así que al
 * terminar el viaje no hay que volver a mandarlos (ni se puede: el cliente no
 * tiene por qué poder reescribir con qué auto se hizo un viaje).
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
        ...(state.cargadorEnDestino === false ? { cargador_en_destino: false } : {}),
        ...(state.routeMode === "eficiente" ? {} : { modo: state.routeMode }),
      };
      const v2Result = await planRoute(v2Payload);
      const result = toCompareRoutesResult(v2Result, origin.name, destination.name);
      // Sin plan_id no hay viaje que guardar, y eso es lo correcto: la API sólo
      // guarda el plan cuando encontró una ruta.
      const payload = v2Result.plan_id
        ? {
            plan_id: v2Result.plan_id,
            origin_name: suggestedName(origin),
            destination_name: suggestedName(destination),
          }
        : null;
      return { result, payload };
    },
    onSuccess: ({ result, payload }) => {
      setLastResult(result, payload);
    },
  });

  return {
    calculate: () => mutation.mutate(),
    isPending: mutation.isPending,
    // Cuándo arrancó el cálculo en curso: el aviso de "está tardando" se ata a
    // este valor y no a un booleano, así un cálculo nuevo no hereda el aviso
    // encendido del anterior.
    startedAt: mutation.submittedAt,
    error: mutation.error instanceof Error ? mutation.error.message : null,
  };
}
