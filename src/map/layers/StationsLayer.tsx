import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { Marker, Popup, useMapEvents } from "react-leaflet";
import { getStations, type NodeId, type Station } from "../../api/graph";
import { listStationReviewSummaries } from "../../api/stationReviews";
import { useTranslation } from "../../i18n/LanguageProvider";
import { esPrivada } from "../esPrivada";
import { AUTO_LOCATE_ZOOM } from "../mapConstants";
import { RatingSummary } from "../RatingSummary";
import { stationIcon } from "../markerIcons";
import { useMapStore } from "../mapStore";
import { StationStatusChip } from "../StationStatusChip";
import { useStationStatus } from "../useStationStatus";
import styles from "./StationPopup.module.css";

const STATION_MARKER_ZOOM = 16;

// Tope de marcadores sin ruta calculada. El comentario de arriba (useStationsInView)
// ya decía la intención -- "nunca las ~200+ de una: eso satura el mapa apenas
// se abre" -- pero el filtro por área visible no la cumple solo: alejado del
// todo (país entero), "lo que entra en pantalla" vuelve a ser "todas". Medido
// en vivo (1/sep/2026): a zoom país las ~260 estaciones quedan una arriba de
// otra, un blob ilegible en vez de un mapa -- y son 260 <Marker> de Leaflet
// reales en el DOM, no solo ruido visual. 80 alcanza para que un vistazo de
// ciudad (Montevideo) siga viéndose poblado sin pagar el costo de las 260.
const MAX_STATIONS_SIN_RUTA = 80;

/**
 * Estaciones que caen dentro del area visible del mapa en este momento --
 * recalcula al terminar cualquier pan/zoom (`moveend`, que en Leaflet cubre
 * ambos). Alejar del todo (pais entero) vuelve a mostrar las ~200+, que es
 * el trade-off aceptado de mostrar "lo que ves" en vez de nada.
 */
function useStationsInView(stations: Station[] | undefined): Set<NodeId> {
  const [ids, setIds] = useState<Set<NodeId>>(() => new Set());

  const map = useMapEvents({
    moveend: recompute,
  });

  function recompute() {
    if (!stations) {
      setIds(new Set());
      return;
    }
    const bounds = map.getBounds();
    const next = new Set<NodeId>();
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
 * satura el mapa apenas se abre. Sin una ruta calculada, se muestran las que
 * caen en el área visible del mapa (arriba). Con una ruta ya calculada, el
 * criterio cambia del todo: solo las paradas de carga que el plan realmente
 * usa, ignorando el área visible -- el mapa se encuadra sobre la ruta
 * entera al calcular, y esa área suele traer consigo estaciones que no
 * tienen nada que ver con el viaje (pedido explícito de no mezclarlas).
 */
export function StationsLayer() {
  const { t } = useTranslation();
  // staleTime: Infinity -- catalogo estatico, ver el comentario en
  // useMapLoaders.ts (misma key).
  const query = useQuery({ queryKey: ["stations"], queryFn: getStations, staleTime: Infinity });
  const summariesQuery = useQuery({ queryKey: ["stationReviewSummaries"], queryFn: listStationReviewSummaries });
  const { datos: estadoEnVivo, estadoDe } = useStationStatus();
  const setStations = useMapStore((s) => s.setStations);
  const selectedStationId = useMapStore((s) => s.selectedStationId);
  const selectStation = useMapStore((s) => s.selectStation);
  const leafletMap = useMapStore((s) => s.leafletMap);
  const lastResult = useMapStore((s) => s.lastResult);
  const picking = useMapStore((s) => s.picking);

  useEffect(() => {
    if (query.data) setStations(query.data);
  }, [query.data, setStations]);

  const inViewIds = useStationsInView(query.data);

  const visibleIds = useMemo(() => {
    if (lastResult) {
      // Con una ruta ya calculada, mostrar SOLO los cargadores que el plan
      // realmente usa -- no "los que caen en el área visible" (inViewIds):
      // el mapa se encuadra sobre la ruta entera al calcular, y esa área
      // suele traer consigo decenas de estaciones que no tienen nada que
      // ver con el viaje. Pedido explícito de no mezclarlas.
      const ids = new Set<NodeId>();
      const primary = lastResult.astar.found
        ? lastResult.astar
        : (lastResult.dijkstra ?? lastResult.astar);
      for (const rc of primary.recharges) ids.add(rc.node_id);
      if (selectedStationId != null) ids.add(selectedStationId);
      return ids;
    }
    // Set preserva el orden de inserción (el mismo de query.data, estable
    // entre renders): recortar con slice da un subconjunto determinístico,
    // sin parpadeo por reordenarse solo de un render al siguiente.
    const ids =
      inViewIds.size > MAX_STATIONS_SIN_RUTA
        ? new Set([...inViewIds].slice(0, MAX_STATIONS_SIN_RUTA))
        : new Set(inViewIds);
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
            // El sufijo del key fuerza a Leaflet a rehacer el marcador cuando
            // se entra o se sale del modo "marcar un punto": `interactive` es
            // una opción de construcción del marcador y react-leaflet no la
            // vuelve a aplicar sobre uno ya creado (a diferencia de position,
            // icon u opacity), así que sin remontarlo el cargador seguía
            // comiéndose el toque destinado al mapa.
            key={`${st.node_id}-${picking ? "picking" : "idle"}`}
            position={[st.lat, st.lon]}
            icon={stationIcon(esPrivada(st.operador))}
            // Mientras se está marcando origen/destino, las ~200 chinchetas de
            // carga son estorbo puro: tapan la calle que la persona quiere
            // tocar y se llevan el click. Se atenúan (no se ocultan: siguen
            // sirviendo de referencia de dónde hay cargadores) y dejan pasar
            // el toque al mapa.
            opacity={picking ? 0.3 : 1}
            interactive={!picking}
            // El detalle completo (formulario de reseña, fotos, lista de
            // comentarios) ya no vive en este popup -- clickear el marcador
            // selecciona la estacion, y eso abre StationDetailPanel en el
            // panel, pestaña Estaciones (ver MapPanel), con lugar para todo. El
            // popup queda como un vistazo rapido nomas. Tambien centra el
            // mapa ahi, mismo comportamiento que elegirla desde la lista
            // (StationsList), para que da igual por donde se entre.
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
                <StationStatusChip
                  estado={estadoDe(st.node_id)}
                  actualizado={estadoEnVivo?.actualizado ?? null}
                  fuente={estadoEnVivo?.fuente ?? ""}
                />
                <div className={styles.teaserAddress}>{st.direccion}</div>
                <div className={styles.teaserHint}>{t.map.layers.stationsLayer.detailInMenu}</div>
              </div>
            </Popup>
          </Marker>
        ))}
    </>
  );
}
