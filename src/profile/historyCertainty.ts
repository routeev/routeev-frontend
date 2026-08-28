import type { RouteResult } from "../api/route";
import { buildRouteCumulative, nearestCumulativeDistance } from "../map/routeProjection";
import type { CertaintyPoint } from "../shared/CertaintyLine";

/**
 * Perfil batería-vs-distancia de un viaje YA guardado en el historial, para
 * la escala "micro" del elemento de firma (front2.md 3.4).
 *
 * A diferencia del showroom, acá no hay línea de tiempo animable: el
 * historial guarda el resultado completo (route_coords, recharges,
 * breakdown), así que el perfil se reconstruye asumiendo consumo uniforme
 * por km -- que es exactamente lo que asume el motor de ruteo (una constante
 * kWh/km fija por vehículo, ver el docstring de liveTrip.js).
 */
export function certaintyPointsFromRoute(
  result: RouteResult,
  startBatteryKwh: number,
  capacityKwh: number
): CertaintyPoint[] {
  if (!result.found || !result.route_coords?.length || capacityKwh <= 0) return [];

  const coords = result.route_coords;
  const cum = buildRouteCumulative(coords);
  const totalKm = cum[cum.length - 1]!;
  if (totalKm <= 0) return [];

  const ratePerKm = result.breakdown.energia_kwh / totalKm;
  const pct = (kwh: number) => Math.max(0, Math.min(100, (kwh / capacityKwh) * 100));

  // Cada recarga cae en el km acumulado del punto donde ocurrió.
  //
  // `rc.lat/lon`: presentes en los viajes guardados por `POST /api/route/trip`.
  // Ahí NO hay alternativa — un resultado de esa era se guarda con `route: []`
  // y `node_coords: []`, porque sus ids eran de un grafo efímero que ya no
  // existe. Buscar el índice devolvería -1 y TODAS las recargas terminarían en
  // el km 0, sin ningún error: la curva mostraría el auto cargando a full en la
  // salida y llegando vacío. Es la rotura más silenciosa de la migración.
  //
  // Los viajes v1 no traen lat/lon, pero sí traen route/node_coords completos,
  // que es de donde salía la posición antes.
  const stops = result.recharges
    .map((rc) => {
      const latLng: [number, number] | null =
        rc.lat != null && rc.lon != null
          ? [rc.lat, rc.lon]
          : (() => {
              const idx = result.route.indexOf(rc.node_id);
              return idx >= 0 ? (result.node_coords[idx] ?? null) : null;
            })();
      const cumKm = latLng ? nearestCumulativeDistance(coords, cum, latLng[0], latLng[1]) : 0;
      return { cumKm, addedKwh: rc.added_kwh, name: rc.station_name };
    })
    .sort((a, b) => a.cumKm - b.cumKm);

  const points: CertaintyPoint[] = [];
  let battery = startBatteryKwh;
  let km = 0;
  points.push({ km: 0, batteryPct: pct(battery) });

  for (const stop of stops) {
    battery -= ratePerKm * (stop.cumKm - km);
    km = stop.cumKm;
    points.push({ km, batteryPct: pct(battery) });
    battery += stop.addedKwh;
    points.push({ km, batteryPct: pct(battery), chargeStop: true, label: stop.name });
  }

  battery -= ratePerKm * (totalKm - km);
  points.push({ km: totalKm, batteryPct: pct(battery) });
  return points;
}
