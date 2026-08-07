import { useMutation } from "@tanstack/react-query";
import { compareRoutes } from "../api/route";
import { batteryPctToKwh, selectedVehicle, useMapStore } from "./mapStore";

/** Botón "Calcular ruta", portado de js/map/routeCalc.js. */
export function useCalculateRoute() {
  const setLastResult = useMapStore((s) => s.setLastResult);

  const mutation = useMutation({
    mutationFn: async () => {
      const state = useMapStore.getState();
      const vehicle = selectedVehicle(state);
      const payload = {
        origin_id: state.originId!,
        destination_id: state.destinationId!,
        vehicle_id: state.selectedVehicleId!,
        start_battery_kwh: vehicle ? batteryPctToKwh(vehicle, state.startBatteryPct) : undefined,
      };
      const result = await compareRoutes(payload);
      return { result, payload };
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
