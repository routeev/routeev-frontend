import { useMemo, useState } from "react";
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

export function MapPage() {
  const [mapError, setMapError] = useState<string | null>(null);
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
  const routeError = calc.error ?? mapError;

  const ready = missing.length === 0;

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
        <aside className={styles.sidebar}>
          <div className={styles.sidebarScroll}>
            <RouteInputPanel routeError={routeError} />
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
                setMapError(null);
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
            <MapCanvas liveTripPosition={liveTrip.ui.livePosition} onMapError={setMapError} />
          </div>
          <div className={styles.dashboardWrap}>
            <TripDashboard liveTrip={liveTrip} />
          </div>
        </main>
      </div>
    </div>
  );
}
