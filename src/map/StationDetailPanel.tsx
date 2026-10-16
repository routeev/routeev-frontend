import { useQuery } from "@tanstack/react-query";
import { listStationReviewSummaries } from "../api/stationReviews";
import { useTranslation } from "../i18n/LanguageProvider";
import { AUTO_LOCATE_ZOOM } from "./mapConstants";
import { IconBack, IconNavigate, IconPlug } from "./panelIcons";
import { StationReviews } from "./StationReviews";
import { StationStatusChip } from "./StationStatusChip";
import { StationStatusReport } from "./StationStatusReport";
import { useMapStore } from "./mapStore";
import { useGoToStation } from "./useGoToStation";
import { useStationStatus } from "./useStationStatus";
import ui from "./panel.module.css";
import styles from "./StationDetailPanel.module.css";

interface StationDetailPanelProps {
  /** El "Calcular ruta" de MapPage: lo usa "Ir hasta acá" para calcular apenas fija los puntos. */
  onCalculate: () => void;
  /** Origen y destino ya quedaron puestos: el panel pasa a la pestaña Viaje. */
  onGoTo?: () => void;
}

/**
 * Detalle de la estación elegida, dentro de la pestaña "Estaciones": clickearla
 * en el mapa o en la lista hace lo mismo, selectStation(id). Tiene la pestaña
 * entera para ella, así el formulario de reseña y las fotos tienen lugar.
 */
export function StationDetailPanel({ onCalculate, onGoTo }: StationDetailPanelProps) {
  const { t, lang } = useTranslation();
  const sp = t.map.panel.stations;
  const sd = t.map.stationDetailRows;
  const goToStation = useGoToStation(onCalculate, onGoTo);
  const stations = useMapStore((s) => s.stations);
  const selectedStationId = useMapStore((s) => s.selectedStationId);
  const selectStation = useMapStore((s) => s.selectStation);
  const leafletMap = useMapStore((s) => s.leafletMap);
  const myPosition = useMapStore((s) => s.myPosition);
  const { datos: estadoEnVivo, estadoDe } = useStationStatus();
  const summariesQuery = useQuery({
    queryKey: ["stationReviewSummaries"],
    queryFn: listStationReviewSummaries,
  });

  const station = stations.find((s) => s.node_id === selectedStationId);
  if (!station) return null;

  function goBack() {
    selectStation(null);
    // El mapa quedó centrado en la estación: volver a la lista sin esto lo
    // dejaba mirando ese punto, en vez de la vista con la que se abre /app.
    if (myPosition) leafletMap?.setView(myPosition, AUTO_LOCATE_ZOOM);
    // Si el popup del marcador seguía abierto (se llegó por el mapa), lo
    // cierra también: las dos formas de salir quedan sincronizadas.
    leafletMap?.closePopup();
  }

  const connectors = station.conectores?.length
    ? station.conectores.map((c) => ({
        type: `${c.tipo}${c.con_cable === false ? sd.noCable : ""}`,
        kw: c.potencia_kw,
        count: c.cantidad,
      }))
    : [{ type: station.tipo_conector, kw: station.potencia_kw, count: 1 }];
  const maxKw = Math.max(station.potencia_kw, ...connectors.map((c) => c.kw));
  const totalConnectors = connectors.reduce((sum, c) => sum + c.count, 0);
  const summary = summariesQuery.data?.[String(station.node_id)];
  const ratingText =
    summary && summary.count > 0 && summary.avg_rating != null
      ? `${summary.avg_rating.toLocaleString(lang === "es" ? "es-UY" : "en-US", { minimumFractionDigits: 1, maximumFractionDigits: 1 })} ★`
      : "—";
  const subtitle = [station.departamento, station.operador].filter(Boolean).join(" · ");

  return (
    <>
      <div className={ui.body}>
        <div className={ui.group}>
          <button type="button" className={styles.back} onClick={goBack}>
            <IconBack />
            {sp.back}
          </button>
          <div className={styles.titleBlock}>
            <h2 className={styles.title}>{station.nombre}</h2>
            {subtitle && <p className={styles.subtitle}>{subtitle}</p>}
          </div>
          {/* Lo primero que decide si esta parada sirve. Sin dato no se dibuja
              nada (ver StationStatusChip). */}
          <StationStatusChip
            estado={estadoDe(station.node_id)}
            actualizado={estadoEnVivo?.actualizado ?? null}
            fuente={estadoEnVivo?.fuente ?? ""}
          />
        </div>

        <div className={ui.metrics3}>
          <div className={ui.metric}>
            <span className={ui.metricValue}>
              {maxKw}
              <span className={ui.unit}>kW</span>
            </span>
            <span className={ui.metricLabel}>{sp.maxPower}</span>
          </div>
          <div className={ui.metric}>
            <span className={ui.metricValue}>{totalConnectors}</span>
            <span className={ui.metricLabel}>{sp.connectors}</span>
          </div>
          <div className={ui.metric}>
            <span className={ui.metricValue}>{ratingText}</span>
            <span className={ui.metricLabel}>{sp.rating}</span>
          </div>
        </div>

        <div className={ui.card}>
          <ul className={styles.connectors}>
            {connectors.map((c, i) => (
              <li key={i} className={styles.connector}>
                <span className={styles.connectorIcon}>
                  <IconPlug />
                </span>
                <span className={styles.connectorType}>
                  {c.type}
                  <span className={styles.connectorCount}>×{c.count}</span>
                </span>
                <span className={styles.connectorKw}>
                  {c.kw}
                  <span className={ui.unit}>kW</span>
                </span>
              </li>
            ))}
          </ul>
          <dl className={styles.info}>
            <dt>{sd.address}</dt>
            <dd>{station.direccion}</dd>
            {station.departamento && (
              <>
                <dt>{sd.department}</dt>
                <dd>{station.departamento}</dd>
              </>
            )}
            <dt>{sd.operator}</dt>
            <dd>{station.operador}</dd>
            <dt>{sd.coordinates}</dt>
            <dd className={styles.coords}>
              {station.lat.toFixed(4)}, {station.lon.toFixed(4)}
            </dd>
            {station.nota && (
              <>
                <dt>{sp.note}</dt>
                <dd>{station.nota}</dd>
              </>
            )}
          </dl>
        </div>

        <StationStatusReport nodeId={String(station.node_id)} />
        <StationReviews nodeId={String(station.node_id)} />
      </div>

      <div className={ui.foot}>
        {goToStation.error && (
          <p role="alert" className={ui.alertDanger}>
            <span className={ui.alertText}>{goToStation.error}</span>
          </p>
        )}
        <button
          type="button"
          className={ui.btnPrimary}
          onClick={() => goToStation.goTo(station)}
          disabled={goToStation.busy}
        >
          {goToStation.busy ? <span className={ui.spinner} aria-hidden="true" /> : <IconNavigate />}
          {goToStation.busy ? t.map.stationDetail.locatingYou : t.map.stationDetail.goHere}
        </button>
      </div>
    </>
  );
}
