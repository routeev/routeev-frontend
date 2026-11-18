import { toCompareRoutesResult, type PlanMultipleResult } from "../api/route";
import type { RoutePoint } from "./routePoint";
import { suggestedName } from "./routePoint";
import type { TramoViaje } from "./mapStore";
import { tramosDelViaje } from "./viaje";

/**
 * Lo que la pantalla muestra de la respuesta de plan-multiple, como una lista de TramoViaje (cada uno
 * con lo que necesita para mostrarse e iniciarse como un viaje de siempre):
 *
 * - Con `viajes` (la API nueva): UN viaje por sentido. Un viaje con paradas es uno solo, con todas las
 *   paradas de carga juntas; con ida y vuelta son dos, la ida y la vuelta. Su nombre va del primer
 *   punto del sentido al último.
 * - Sin `viajes` (una API anterior): un tramo por cada par de puntos, como antes.
 */
export function tramosDeLaRespuesta(
  multiple: PlanMultipleResult,
  puntos: readonly RoutePoint[],
  idaYVuelta: boolean,
  consumoPropio?: number
): TramoViaje[] {
  const pares = tramosDelViaje(puntos, idaYVuelta);
  const armar = (plan: PlanMultipleResult["tramos"][number], desde: RoutePoint, hasta: RoutePoint): TramoViaje => ({
    result: {
      ...toCompareRoutesResult(plan, desde.name, hasta.name),
      ...(consumoPropio != null ? { consumo_propio_kwh_km: consumoPropio } : {}),
    },
    payload: plan.plan_id
      ? { plan_id: plan.plan_id, origin_name: suggestedName(desde), destination_name: suggestedName(hasta) }
      : null,
  });

  if (multiple.viajes && multiple.viajes.length > 0) {
    return multiple.viajes.map((v) => {
      const primero = pares[v.tramos[0] ?? 0] ?? pares[0]!;
      const ultimo = pares[v.tramos[v.tramos.length - 1] ?? 0] ?? pares[0]!;
      return armar(v.plan, primero[0], ultimo[1]);
    });
  }
  return multiple.tramos.map((plan, i) => {
    const [desde, hasta] = pares[i] ?? pares[0]!;
    return armar(plan, desde, hasta);
  });
}
