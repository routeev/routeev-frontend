import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import { getHistory, type HistoryEntry } from "../api/route";
import { useTranslation } from "../i18n/LanguageProvider";
import { formatDate } from "../shared/format";
import { useMapStore } from "./mapStore";

/**
 * "Ver en el mapa" un viaje pasado desde /profile: `/app?viaje=<id>`, portado
 * de js/map/history.js. El historial ya trae el resultado completo (astar/
 * dijkstra) guardado en su momento, así que esto redibuja sin volver a
 * calcular. Sale del cache si el perfil ya lo pidió; si no (link abierto en
 * otra pestaña, o la página recargada), se pide.
 */
export function useReplayFromHistory(ready: boolean) {
  const [searchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const { t } = useTranslation();
  const done = useRef(false);
  const setOrigin = useMapStore((s) => s.setOrigin);
  const setDestination = useMapStore((s) => s.setDestination);
  const selectVehicle = useMapStore((s) => s.selectVehicle);
  const setStartBatteryPct = useMapStore((s) => s.setStartBatteryPct);
  const setLastResult = useMapStore((s) => s.setLastResult);

  useEffect(() => {
    if (!ready || done.current) return;
    const id = Number(searchParams.get("viaje"));
    if (!id) return;

    // Sin cancelar al desmontar a propósito: en desarrollo React monta dos
    // veces, y la que llega primero es la que dibuja (ver `done`).
    void queryClient
      .fetchQuery({ queryKey: ["history"], queryFn: getHistory, staleTime: 60_000 })
      .then((entries) => {
        const h = entries.find((e) => e.id === id);
        if (!h || done.current) return;
        done.current = true;
        replay(h);
      })
      .catch(() => {
        /* sin el historial, el mapa queda como siempre */
      });

    function replay(h: HistoryEntry) {
      if (!h.result || (!h.result.astar && !h.result.dijkstra)) return;

      const result = {
        origin: { name: h.origin_name || String(h.origin_id ?? "") },
        destination: { name: h.destination_name || String(h.destination_id ?? "") },
        dijkstra: h.result.dijkstra,
        astar: h.result.astar,
      };
      const primary = result.astar.found ? result.astar : (result.dijkstra ?? result.astar);

      const vehicles = useMapStore.getState().vehicles;
      const vehicle = vehicles.find((v) => v.id === h.vehicle_id) ?? null;
      if (vehicle) {
        selectVehicle(vehicle.id);
        if (h.start_battery_kwh != null) {
          setStartBatteryPct(
            Math.round((h.start_battery_kwh / vehicle.battery_capacity_kwh) * 100)
          );
        }
      }

      // Los extremos del recorrido, para que el mapa quede con los pines puestos
      // y "Calcular ruta" pueda partir de ahí. Un viaje de la era v2 trae sus
      // coordenadas en columnas propias; uno v1 no, y ahí se leen de la
      // geometría guardada, que es de donde salían antes.
      const coords = primary.found ? primary.route_coords : null;
      const origenLatLon =
        h.origin_lat != null && h.origin_lon != null
          ? ([h.origin_lat, h.origin_lon] as const)
          : coords?.[0];
      const destinoLatLon =
        h.destination_lat != null && h.destination_lon != null
          ? ([h.destination_lat, h.destination_lon] as const)
          : coords?.[coords.length - 1];

      if (origenLatLon && destinoLatLon) {
        setOrigin({ name: result.origin.name, lat: origenLatLon[0], lon: origenLatLon[1] });
        setDestination({
          name: result.destination.name,
          lat: destinoLatLon[0],
          lon: destinoLatLon[1],
        });
      }

      // Seed en null: un viaje reproducido NO se puede volver a guardar tal cual.
      // El plan que lo calculó se consumió cuando se guardó (y venció a las 24 h),
      // y `POST /api/route/trip` guarda contra un plan, no contra una ruta suelta.
      // Para registrar un viaje nuevo por este mismo camino hay que apretar
      // "Calcular ruta" — los dos pines ya quedaron puestos arriba. useLiveTrip
      // lo avisa al arrancar, no después de manejarlo.
      setLastResult(result, null, t.map.replay.suffix(formatDate(h.created_at)));
    }
  }, [
    ready,
    searchParams,
    queryClient,
    setOrigin,
    setDestination,
    selectVehicle,
    setStartBatteryPct,
    setLastResult,
    t,
  ]);
}
