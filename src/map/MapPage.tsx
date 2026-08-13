import { useMemo, useRef, useState } from "react";
import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import { AppTopbar } from "../shared/AppTopbar";
import { Banner } from "../shared/Banner";
import buttons from "../shared/buttons.module.css";
import { IconUser } from "../shared/NavIcons";
import { MapCanvas } from "./MapCanvas";
import { RouteInputPanel } from "./RouteInputPanel";
import { StationsPanel } from "./StationsPanel";
import { TripDashboard } from "./TripDashboard";
import { VehiclePanel } from "./VehiclePanel";
import { calculateGateMissing, useMapStore } from "./mapStore";
import { useCalculateRoute } from "./useCalculateRoute";
import { useLiveTrip } from "./useLiveTrip";
import { useMapLoaders } from "./useMapLoaders";
import { useReplayFromHistory } from "./useReplayFromHistory";
import styles from "./MapPage.module.css";

type MapBanner = { message: string; variant: "error" | "warn" } | null;

// Umbral en px para que un arrastre del handle cuente como swipe (arriba
// muestra, abajo esconde); por debajo de esto se trata como un tap simple
// que alterna el estado, asi el gesto sirve tanto para deslizar como para
// tocar.
const SIDEBAR_SWIPE_THRESHOLD = 30;

export function MapPage() {
  const [mapBanner, setMapBanner] = useState<MapBanner>(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const handleDragStartY = useRef<number | null>(null);
  const handleMapNotice = (msg: string | null, severity: "error" | "warn" = "error") =>
    setMapBanner(msg ? { message: msg, variant: severity } : null);
  const loaders = useMapLoaders();
  const liveTrip = useLiveTrip();
  const calc = useCalculateRoute();
  const vehiclesLoaded = useMapStore((s) => s.vehiclesLoaded);
  const selectedVehicleId = useMapStore((s) => s.selectedVehicleId);
  const originId = useMapStore((s) => s.originId);
  const destinationId = useMapStore((s) => s.destinationId);
  const missing = useMemo(
    () =>
      calculateGateMissing({
        vehiclesLoaded,
        hasSelectedVehicle: !!selectedVehicleId,
        originId,
        destinationId,
      }),
    [vehiclesLoaded, selectedVehicleId, originId, destinationId]
  );
  useReplayFromHistory(vehiclesLoaded);

  // Un error de "Calcular ruta" pisa uno viejo de click-en-el-mapa: es el
  // mas reciente de los dos flujos que escriben este banner.
  const banner: MapBanner = calc.error ? { message: calc.error, variant: "error" } : mapBanner;

  const ready = missing.length === 0;

  function onHandlePointerDown(e: React.PointerEvent<HTMLDivElement>) {
    handleDragStartY.current = e.clientY;
    e.currentTarget.setPointerCapture(e.pointerId);
  }

  function onHandlePointerUp(e: React.PointerEvent<HTMLDivElement>) {
    const startY = handleDragStartY.current;
    handleDragStartY.current = null;
    if (startY == null) return;
    const delta = e.clientY - startY;
    if (delta > SIDEBAR_SWIPE_THRESHOLD) setSidebarCollapsed(true);
    else if (delta < -SIDEBAR_SWIPE_THRESHOLD) setSidebarCollapsed(false);
    else setSidebarCollapsed((v) => !v);
  }

  return (
    <div className={styles.page}>
      <Helmet>
        <title>RouteEV · Mapa</title>
        <meta name="robots" content="noindex" />
      </Helmet>

      <AppTopbar>
        <Link to="/profile" className={buttons.navLink}>
          <IconUser />
          Mi perfil
        </Link>
      </AppTopbar>

      <div className={styles.layout}>
        <aside className={`${styles.sidebar} ${sidebarCollapsed ? styles.collapsed : ""}`}>
          <div
            className={styles.sidebarHandle}
            role="button"
            tabIndex={0}
            aria-label={sidebarCollapsed ? "Mostrar panel" : "Ocultar panel"}
            onPointerDown={onHandlePointerDown}
            onPointerUp={onHandlePointerUp}
            onKeyDown={(e) => {
              if (e.key !== "Enter" && e.key !== " ") return;
              e.preventDefault();
              setSidebarCollapsed((v) => !v);
            }}
          />
          <div className={styles.sidebarScroll}>
            <RouteInputPanel banner={banner} />
            <VehiclePanel />
            <StationsPanel />
            {loaders.failed.length > 0 && (
              <Banner variant="error">
                {`No se pudo cargar: ${loaders.failed.join(", ")}. Revisá tu conexión y volvé a intentar.`}
              </Banner>
            )}
            {loaders.failed.length > 0 && (
              <button type="button" className="ghost small" onClick={loaders.retry}>
                Reintentar carga
              </button>
            )}
          </div>
          <div className={styles.sidebarCta}>
            <button
              type="button"
              className="primary"
              disabled={!ready || calc.isPending}
              onClick={() => {
                setMapBanner(null);
                calc.calculate();
              }}
            >
              {calc.isPending ? "Calculando..." : "Calcular ruta"}
            </button>
            <p className={["hint", ready ? "hint-ok" : ""].join(" ")}>
              {ready ? "Listo para calcular." : `Falta: ${missing.join(", ")}.`}
            </p>
          </div>
        </aside>

        <main className={styles.mainArea}>
          <div className={styles.mapWrap}>
            <MapCanvas liveTripPosition={liveTrip.ui.livePosition} onMapError={handleMapNotice} />
          </div>
          <div className={styles.dashboardWrap}>
            <TripDashboard liveTrip={liveTrip} />
          </div>
        </main>
      </div>
    </div>
  );
}
