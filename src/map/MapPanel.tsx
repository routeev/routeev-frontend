import { useEffect, useRef, useState, type CSSProperties } from "react";
import { useTranslation } from "../i18n/LanguageProvider";
import { formatDuration } from "../shared/format";
import { batteryPctToKwh, selectedVehicle, useMapStore } from "./mapStore";
import { IconBolt, IconRoute } from "./panelIcons";
import { PlanView } from "./PlanView";
import { StationDetailPanel } from "./StationDetailPanel";
import { StationsList } from "./StationsList";
import { summarizeTrip } from "./tripStats";
import { TripDashboard } from "./TripDashboard";
import type { BottomSheet } from "./useBottomSheet";
import type { LiveTripUi } from "./useLiveTrip";
import ui from "./panel.module.css";
import styles from "./MapPanel.module.css";

type Tab = "trip" | "stations";

/** Mismo texto que arma useMapLoaders para la carga de estaciones. */
const STATIONS_LOADER = "estaciones";

interface MapPanelProps {
  /** null en escritorio: ahí el panel flota sobre el mapa y no se arrastra. */
  sheet: BottomSheet | null;
  liveTrip: { ui: LiveTripUi; start: () => void; cancel: () => void };
  calc: { calculate: () => void; isPending: boolean; startedAt: number; error: string | null };
  mapNotice: { message: string; variant: "error" | "warn" } | null;
  loaders: { failed: string[]; retry: () => void };
}

/**
 * El panel de /app: dos pestañas (Viaje y Estaciones) que separan dos tareas
 * que antes competían en el mismo scroll. En escritorio flota a la izquierda
 * del mapa; en pantalla angosta es una hoja inferior con tres alturas.
 *
 * Cada vista trae su cuerpo con scroll y su pie fijo (ver panel.module.css):
 * acá solo se elige cuál se muestra.
 */
export function MapPanel({ sheet, liveTrip, calc, mapNotice, loaders }: MapPanelProps) {
  const { t } = useTranslation();
  const mp = t.map.panel;
  const [tab, setTab] = useState<Tab>("trip");
  const stations = useMapStore((s) => s.stations);
  const selectedStationId = useMapStore((s) => s.selectedStationId);
  const selectStation = useMapStore((s) => s.selectStation);
  const result = useMapStore((s) => s.lastResult);
  const vehicle = useMapStore(selectedVehicle);
  const startBatteryPct = useMapStore((s) => s.startBatteryPct);

  // La hoja cambia de objeto en cada render; las suscripciones de abajo se
  // arman una sola vez y leen la última por acá.
  const sheetRef = useRef(sheet);
  useEffect(() => {
    sheetRef.current = sheet;
  });

  useEffect(() => {
    const reveal = () => {
      const s = sheetRef.current;
      if (s && s.position === "min") s.setPosition("mid");
    };
    // Suscripción al store y no un efecto sobre selectedStationId/lastResult
    // con el setState adentro: eso es justo un render en cascada. Acá el
    // setState vive en el callback de un sistema externo.
    return useMapStore.subscribe((state, prev) => {
      // Elegir un cargador en el mapa abre su detalle en la pestaña
      // Estaciones, y con la hoja a la vista: si quedaba colapsada, tocar el
      // marcador parecía no hacer nada.
      if (state.selectedStationId != null && state.selectedStationId !== prev.selectedStationId) {
        setTab("stations");
        reveal();
      }
      // Un resultado nuevo (calculado, o un replay del historial) se muestra
      // solo, no queda escondido detrás de otra pestaña o de la hoja cerrada.
      if (state.lastResult != null && state.lastResult !== prev.lastResult) {
        setTab("trip");
        reveal();
      }
    });
  }, []);

  const min = sheet != null && !sheet.dragging && sheet.position === "min";

  let summaryText = mp.sheetPlan;
  if (min && tab === "trip" && result) {
    const primary = result.astar.found ? result.astar : (result.dijkstra ?? result.astar);
    const s = summarizeTrip(
      vehicle,
      vehicle ? batteryPctToKwh(vehicle, startBatteryPct) : 0,
      primary
    );
    if (s)
      summaryText = mp.sheetSummary(
        result.origin.name,
        result.destination.name,
        formatDuration(s.timeMin)
      );
  }

  const stationsFailed = loaders.failed.includes(STATIONS_LOADER);
  const otherFailures = loaders.failed.filter((l) => l !== STATIONS_LOADER);

  let view;
  if (tab === "stations") {
    view =
      selectedStationId != null ? (
        <StationDetailPanel
          key={selectedStationId}
          onCalculate={calc.calculate}
          onGoTo={() => setTab("trip")}
        />
      ) : (
        <StationsList loadFailed={stationsFailed} onRetry={loaders.retry} />
      );
  } else {
    view = result ? (
      <TripDashboard liveTrip={liveTrip} />
    ) : (
      <PlanView
        calc={calc}
        mapNotice={mapNotice}
        loadFailed={otherFailures}
        onRetryLoad={loaders.retry}
      />
    );
  }

  const panelStyle = sheet
    ? ({
        height: sheet.height,
        "--panel-foot-pad": "calc(16px + env(safe-area-inset-bottom))",
      } as CSSProperties)
    : undefined;

  return (
    <section
      className={[
        styles.panel,
        sheet ? styles.sheet : styles.floating,
        sheet?.dragging ? styles.dragging : "",
      ].join(" ")}
      style={panelStyle}
      aria-label={mp.ariaLabel}
    >
      {sheet && (
        <button
          type="button"
          className={styles.handle}
          {...sheet.handleProps}
          aria-label={min ? t.map.page.showPanel : t.map.page.hidePanel}
          aria-expanded={!min}
        >
          <span className={styles.grip} aria-hidden="true" />
          {min && <span className={styles.summary}>{summaryText}</span>}
        </button>
      )}

      {!min && (
        <>
          <div className={styles.tabsWrap}>
            <div
              role="tablist"
              aria-label={mp.ariaLabel}
              className={[ui.segmented, styles.tabs].join(" ")}
            >
              <button
                type="button"
                role="tab"
                aria-selected={tab === "trip"}
                className={styles.tab}
                onClick={() => setTab("trip")}
              >
                <IconRoute />
                {mp.tabTrip}
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={tab === "stations"}
                className={styles.tab}
                onClick={() => {
                  // Tocar "Estaciones" estando en un detalle vuelve a la lista.
                  if (tab === "stations" && selectedStationId != null) selectStation(null);
                  else setTab("stations");
                }}
              >
                <IconBolt />
                {mp.tabStations}
                {stations.length > 0 && <span className={styles.tabCount}>{stations.length}</span>}
              </button>
            </div>
          </div>
          <div role="tabpanel" className={styles.view}>
            {view}
          </div>
        </>
      )}
    </section>
  );
}
