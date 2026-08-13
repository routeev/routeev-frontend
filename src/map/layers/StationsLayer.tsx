import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { Marker, Popup, useMapEvents } from "react-leaflet";
import { getStations, type Station } from "../../api/graph";
import { listStationReviewSummaries } from "../../api/stationReviews";
import { RatingSummary } from "../RatingSummary";
import { StationDetailRows } from "../StationDetailRows";
import { stationIcon } from "../markerIcons";
import { useMapStore } from "../mapStore";

/**
 * Estaciones que caen dentro del area visible del mapa en este momento --
 * recalcula al terminar cualquier pan/zoom (`moveend`, que en Leaflet cubre
 * ambos). Alejar del todo (pais entero) vuelve a mostrar las ~200+, que es
 * el trade-off aceptado de mostrar "lo que ves" en vez de nada.
 */
function useStationsInView(stations: Station[] | undefined): Set<number> {
  const [ids, setIds] = useState<Set<number>>(() => new Set());

  const map = useMapEvents({
    moveend: recompute,
  });

  function recompute() {
    if (!stations) {
      setIds(new Set());
      return;
    }
    const bounds = map.getBounds();
    const next = new Set<number>();
    for (const st of stations) {
      if (bounds.contains([st.lat, st.lon])) next.add(st.node_id);
    }
    setIds(next);
  }

  useEffect(() => {
    recompute();
    // Tambien hace falta recalcular cuando `stations` llega (carga async) o
    // el propio mapa se resuelve de nuevo, no solo en moveend.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stations, map]);

  return ids;
}

/**
 * Dibuja marcadores de estaciones de carga, pero nunca las ~200+ de una: eso
 * satura el mapa apenas se abre. Se muestran las que caen en el area visible
 * del mapa (arriba) MAS, siempre, las paradas de una ruta ya calculada --
 * esas importan aunque el usuario haya alejado o movido el mapa a otro lado.
 */
export function StationsLayer() {
  const query = useQuery({ queryKey: ["stations"], queryFn: getStations });
  const summariesQuery = useQuery({ queryKey: ["stationReviewSummaries"], queryFn: listStationReviewSummaries });
  const setStations = useMapStore((s) => s.setStations);
  const selectedStationId = useMapStore((s) => s.selectedStationId);
  const lastResult = useMapStore((s) => s.lastResult);

  useEffect(() => {
    if (query.data) setStations(query.data);
  }, [query.data, setStations]);

  const inViewIds = useStationsInView(query.data);

  const visibleIds = useMemo(() => {
    const ids = new Set(inViewIds);
    if (lastResult) {
      const primary = lastResult.astar.found
        ? lastResult.astar
        : (lastResult.dijkstra ?? lastResult.astar);
      for (const rc of primary.recharges) ids.add(rc.node_id);
    }
    if (selectedStationId != null) ids.add(selectedStationId);
    return ids;
  }, [inViewIds, lastResult, selectedStationId]);

  if (!query.data || visibleIds.size === 0) return null;

  return (
    <>
      {query.data
        .filter((st) => visibleIds.has(st.node_id))
        .map((st) => (
          <Marker key={st.node_id} position={[st.lat, st.lon]} icon={stationIcon()}>
            <Popup>
              <b>{st.nombre}</b>
              <br />
              <RatingSummary summary={summariesQuery.data?.[String(st.node_id)]} size={12} />
              <StationDetailRows station={st} />
            </Popup>
          </Marker>
        ))}
    </>
  );
}
