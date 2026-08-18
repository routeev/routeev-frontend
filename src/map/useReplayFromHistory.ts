import { useEffect, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import type { HistoryEntry } from "../api/route";
import { useTranslation } from "../i18n/LanguageProvider";
import { formatDate } from "../shared/format";
import { useMapStore } from "./mapStore";

/**
 * "Ver" un viaje pasado desde /profile (?replay=1 + sessionStorage), portado
 * de js/map/history.js. El historial ya trae el resultado completo (astar/
 * dijkstra) guardado en su momento, así que esto redibuja sin volver a
 * llamar al backend.
 */
export function useReplayFromHistory(ready: boolean) {
  const [searchParams] = useSearchParams();
  const { t } = useTranslation();
  const done = useRef(false);
  const setOrigin = useMapStore((s) => s.setOrigin);
  const setDestination = useMapStore((s) => s.setDestination);
  const selectVehicle = useMapStore((s) => s.selectVehicle);
  const setStartBatteryPct = useMapStore((s) => s.setStartBatteryPct);
  const setLastResult = useMapStore((s) => s.setLastResult);

  useEffect(() => {
    if (!ready || done.current) return;
    done.current = true;
    if (searchParams.get("replay") !== "1") return;

    const raw = sessionStorage.getItem("routeev_replay_trip");
    sessionStorage.removeItem("routeev_replay_trip");
    if (!raw) return;

    let h: HistoryEntry;
    try {
      h = JSON.parse(raw);
    } catch {
      return;
    }
    if (!h.result || (!h.result.astar && !h.result.dijkstra)) return;

    const result = {
      origin: { name: h.origin_name || String(h.origin_id) },
      destination: { name: h.destination_name || String(h.destination_id) },
      dijkstra: h.result.dijkstra,
      astar: h.result.astar,
    };
    const primary = result.astar.found ? result.astar : (result.dijkstra ?? result.astar);

    const vehicles = useMapStore.getState().vehicles;
    const vehicle = vehicles.find((v) => v.id === h.vehicle_id) ?? null;
    if (vehicle) {
      selectVehicle(vehicle.id);
      if (h.start_battery_kwh != null) {
        setStartBatteryPct(Math.round((h.start_battery_kwh / vehicle.battery_capacity_kwh) * 100));
      }
    }

    if (primary.found && primary.route_coords?.length) {
      const coords = primary.route_coords;
      setOrigin({ id: h.origin_id, name: h.origin_name || String(h.origin_id), lat: coords[0]![0], lon: coords[0]![1] });
      setDestination({
        id: h.destination_id,
        name: h.destination_name || String(h.destination_id),
        lat: coords[coords.length - 1]![0],
        lon: coords[coords.length - 1]![1],
      });
    }

    setLastResult(
      result,
      {
        origin_id: h.origin_id,
        destination_id: h.destination_id,
        vehicle_id: h.vehicle_id,
        start_battery_kwh: h.start_battery_kwh ?? undefined,
      },
      t.map.replay.suffix(formatDate(h.created_at))
    );
  }, [ready, searchParams, setOrigin, setDestination, selectVehicle, setStartBatteryPct, setLastResult, t]);
}
