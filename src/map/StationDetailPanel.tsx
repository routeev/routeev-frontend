import { useTranslation } from "../i18n/LanguageProvider";
import { AUTO_LOCATE_ZOOM } from "./mapConstants";
import { StationDetailRows } from "./StationDetailRows";
import { StationReviews } from "./StationReviews";
import { StationStatusChip } from "./StationStatusChip";
import { StationStatusReport } from "./StationStatusReport";
import { useMapStore } from "./mapStore";
import { useGoToStation } from "./useGoToStation";
import { useStationStatus } from "./useStationStatus";
import styles from "./StationDetailPanel.module.css";

/**
 * Reemplaza a StationsPanel (la lista) mientras haya una estación elegida --
 * clickearla en el mapa o en la lista hace lo mismo: selectStation(id). Antes
 * el detalle + reseñas se metían inline adentro de la fila de la lista
 * (empujando el resto de las 200+ hacia abajo); esta es una sección propia,
 * a pantalla completa del sidebar, para que el formulario de reseña y las
 * fotos tengan lugar de verdad.
 *
 * `onCalculate` es el "Calcular ruta" de MapPage: lo usa "Ir hasta acá desde
 * mi ubicación" (ver useGoToStation) para calcular apenas fija los puntos.
 */
export function StationDetailPanel({ onCalculate }: { onCalculate: () => void }) {
  const { t } = useTranslation();
  const goToStation = useGoToStation(onCalculate);
  const stations = useMapStore((s) => s.stations);
  const selectedStationId = useMapStore((s) => s.selectedStationId);
  const selectStation = useMapStore((s) => s.selectStation);
  const leafletMap = useMapStore((s) => s.leafletMap);
  const myPosition = useMapStore((s) => s.myPosition);
  const { datos: estadoEnVivo, estadoDe } = useStationStatus();

  const station = stations.find((s) => s.node_id === selectedStationId);
  if (!station) return null;

  function goBack() {
    selectStation(null);
    // El mapa quedo centrado/zoomeado en la estacion (StationsLayer/
    // StationsPanel ya lo llevan ahi al elegirla) -- volver a la lista sin
    // esto lo dejaria mirando ese punto para siempre, en vez de la vista con
    // la que se abre /app normalmente.
    if (myPosition) leafletMap?.setView(myPosition, AUTO_LOCATE_ZOOM);
    // Si el popup del marcador seguia abierto (se llego aca por el marcador,
    // no por la lista), lo cierra tambien -- las dos formas de "salir" del
    // detalle de una estacion quedan sincronizadas entre si.
    leafletMap?.closePopup();
  }

  return (
    <section className="panel">
      <button type="button" className={styles.back} onClick={goBack}>
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M15 5 8 12l7 7" />
        </svg>
        {t.map.stationsPanel.title}
      </button>
      <h2>{station.nombre}</h2>
      {/* Arriba de la ficha y no adentro: el estado es lo primero que decide
          si esta parada sirve, y ademas es lo unico de esta pantalla que
          puede no estar -- si se mezclara entre las filas, su ausencia
          quedaria como un hueco raro en el medio de la tabla. */}
      <StationStatusChip
        estado={estadoDe(station.node_id)}
        actualizado={estadoEnVivo?.actualizado ?? null}
        fuente={estadoEnVivo?.fuente ?? ""}
      />
      <button
        type="button"
        className="primary small full-width"
        onClick={() => goToStation.goTo(station)}
        disabled={goToStation.busy}
      >
        <svg className="btn-icon" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M3 11 21 3l-8 18-2-8-8-2Z" />
        </svg>
        {goToStation.busy ? t.map.stationDetail.locatingYou : t.map.stationDetail.goHere}
      </button>
      {goToStation.error && (
        <div className="address-result" role="alert">
          <span className="error">{goToStation.error}</span>
        </div>
      )}
      <StationDetailRows station={station} />
      <StationStatusReport nodeId={String(station.node_id)} />
      <StationReviews nodeId={String(station.node_id)} />
    </section>
  );
}
