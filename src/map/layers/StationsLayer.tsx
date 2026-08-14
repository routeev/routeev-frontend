import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { Marker, Popup, useMapEvents } from "react-leaflet";
import { getStations, type Station } from "../../api/graph";
import { listStationReviewSummaries } from "../../api/stationReviews";
import { AUTO_LOCATE_ZOOM } from "../mapConstants";
import { RatingSummary } from "../RatingSummary";
import { stationIcon } from "../markerIcons";
import { useMapStore } from "../mapStore";
import styles from "./StationPopup.module.css";

const STATION_MARKER_ZOOM = 16;

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
  // staleTime: Infinity -- catalogo estatico, ver el comentario en
  // useMapLoaders.ts (misma key).
  const query = useQuery({ queryKey: ["stations"], queryFn: getStations, staleTime: Infinity });
  const summariesQuery = useQuery({ queryKey: ["stationReviewSummaries"], queryFn: listStationReviewSummaries });
  const setStations = useMapStore((s) => s.setStations);
  const selectedStationId = useMapStore((s) => s.selectedStationId);
  const selectStation = useMapStore((s) => s.selectStation);
  const leafletMap = useMapStore((s) => s.leafletMap);
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
          <Marker
            key={st.node_id}
            position={[st.lat, st.lon]}
            icon={stationIcon()}
            // El detalle completo (formulario de reseña, fotos, lista de
            // comentarios) ya no vive en este popup -- clickear el marcador
            // selecciona la estacion, y eso abre StationDetailPanel en el
            // sidebar (ver MapPage), con lugar de sobra para todo eso. El
            // popup queda como un vistazo rapido nomas. Tambien centra el
            // mapa ahi, mismo comportamiento que elegirla desde la lista
            // (StationsPanel), para que da igual por donde se entre.
            eventHandlers={{
              click: () => {
                selectStation(st.node_id);
                leafletMap?.setView([st.lat, st.lon], STATION_MARKER_ZOOM);
              },
              // Cerrar el popup (la x, tocar otro punto del mapa, Escape)
              // saca tambien el detalle del sidebar y vuelve a mostrar el
              // menu completo -- son la misma seleccion, cerrar una cosa
              // cierra la otra. El chequeo de selectedStationId es porque
              // abrir OTRO marcador cierra este popup como efecto colateral
              // (autoClose de Leaflet): sin el, ese cierre borraria la
              // seleccion nueva que el click del otro marcador acaba de
              // hacer, no importa el orden en que lleguen los dos eventos.
              popupclose: () => {
                const state = useMapStore.getState();
                if (state.selectedStationId !== st.node_id) return;
                state.selectStation(null);
                if (state.myPosition) state.leafletMap?.setView(state.myPosition, AUTO_LOCATE_ZOOM);
              },
            }}
          >
            <Popup minWidth={200} maxWidth={260}>
              <div className={styles.teaser}>
                <b className={styles.teaserName}>{st.nombre}</b>
                <RatingSummary summary={summariesQuery.data?.[String(st.node_id)]} size={12} />
                <div className={styles.teaserMeta}>
                  <span className="mono-num">{st.potencia_kw} kW</span>
                  <span>{st.operador}</span>
                </div>
                <div className={styles.teaserAddress}>{st.direccion}</div>
                <div className={styles.teaserHint}>Detalle completo y reseñas en el menú.</div>
              </div>
            </Popup>
          </Marker>
        ))}
    </>
  );
}
