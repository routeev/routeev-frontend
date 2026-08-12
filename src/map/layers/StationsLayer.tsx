import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo } from "react";
import { Marker, Popup } from "react-leaflet";
import { getStations } from "../../api/graph";
import { StationDetailRows } from "../StationDetailRows";
import { stationIcon } from "../markerIcons";
import { useMapStore } from "../mapStore";

/**
 * Dibuja marcadores de estaciones de carga, pero nunca las ~200+ de una: eso
 * satura el mapa apenas se abre. Reglas (pedido del usuario):
 *  - Sin ruta calculada: solo la estación elegida a mano en StationsPanel
 *    (selectedStationId), si hay alguna.
 *  - Con ruta calculada: solo las paradas de recarga que esa ruta realmente
 *    usa (lastResult.*.recharges), nada más -- la selección manual del panel
 *    queda de lado (mapStore.setLastResult la limpia).
 */
export function StationsLayer() {
  const query = useQuery({ queryKey: ["stations"], queryFn: getStations });
  const setStations = useMapStore((s) => s.setStations);
  const selectedStationId = useMapStore((s) => s.selectedStationId);
  const lastResult = useMapStore((s) => s.lastResult);

  useEffect(() => {
    if (query.data) setStations(query.data);
  }, [query.data, setStations]);

  const visibleIds = useMemo(() => {
    if (lastResult) {
      const primary = lastResult.astar.found ? lastResult.astar : (lastResult.dijkstra ?? lastResult.astar);
      return new Set(primary.recharges.map((rc) => rc.node_id));
    }
    if (selectedStationId != null) return new Set([selectedStationId]);
    return null;
  }, [lastResult, selectedStationId]);

  if (!query.data || !visibleIds || visibleIds.size === 0) return null;

  return (
    <>
      {query.data
        .filter((st) => visibleIds.has(st.node_id))
        .map((st) => (
          <Marker key={st.node_id} position={[st.lat, st.lon]} icon={stationIcon()}>
            <Popup>
              <b>{st.nombre}</b>
              <br />
              <StationDetailRows station={st} />
            </Popup>
          </Marker>
        ))}
    </>
  );
}
