import { useEffect, useMemo, useRef, useState } from "react";
import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import { AppTopbar } from "../shared/AppTopbar";
import { Banner } from "../shared/Banner";
import buttons from "../shared/buttons.module.css";
import { IconUser } from "../shared/NavIcons";
import { MapCanvas } from "./MapCanvas";
import { RouteInputPanel } from "./RouteInputPanel";
import { StationDetailPanel } from "./StationDetailPanel";
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
  const selectedStationId = useMapStore((s) => s.selectedStationId);
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

  useEffect(() => {
    // Entrar (o volver) al mapa arranca en blanco -- el store es un
    // singleton de modulo, no se resetea solo al navegar a /profile y
    // volver (React Router remonta MapPage, pero Zustand vive afuera de
    // eso). Sin esto, origen/destino/resultado de la visita anterior
    // seguian ahi.
    //
    // Salvo si se viene de "Ver" un viaje pasado (?replay=1): el comentario
    // original acá asumía que este reset SIEMPRE corre antes de que
    // useReplayFromHistory (arriba) haga algo, porque ese efecto "recién
    // hace algo cuando vehiclesLoaded pasa a true, en un render posterior".
    // Eso es cierto solo si vehiclesLoaded arranca en false -- pero "Ver"
    // navega player desde /profile, que ya pidió los vehículos (misma
    // queryKey, TanStack Query los sirve del cache), así que vehiclesLoaded
    // puede llegar en true YA en el primer render. Ahí los dos efectos
    // corren en el mismo commit, en el orden en que aparecen abajo en el
    // código -- useReplayFromHistory primero (arma origen/destino/
    // resultado), este reset después, pisándolo todo de vuelta a blanco.
    // Confirmado en vivo: navegar /app (carga fría) -> "Mi perfil" (SPA) ->
    // "Ver" reproduce el mapa vacío que reportó el usuario. Con replay=1 en
    // la URL, useReplayFromHistory es la única fuente de verdad para el
    // estado inicial -- este efecto no tiene nada que limpiar.
    if (new URLSearchParams(window.location.search).get("replay") === "1") return;
    useMapStore.getState().resetTripPlanning();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    // Clickear un cargador en el mapa mientras el bottom sheet esta
    // colapsado (mobile) no serviria de nada si el detalle que se acaba de
    // abrir queda escondido debajo -- se lo revela solo, nunca al reves (no
    // se colapsa cuando se deselecciona, eso lo decide el usuario).
    if (selectedStationId != null) setSidebarCollapsed(false);
  }, [selectedStationId]);

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
            {loaders.failed.length > 0 && (
              // Arriba de todo, no al final: con ~200 estaciones en la
              // lista, este banner quedaba escondido bien abajo del scroll y
              // solo se notaba "de golpe" al elegir una estacion (el panel
              // se achica y el banner, que ya estaba ahi, entra en vista) --
              // parecia que clickear un cargador CAUSABA el error, cuando en
              // realidad ya habia fallado antes.
              <>
                <Banner variant="error">
                  {`No se pudo cargar: ${loaders.failed.join(", ")}. Revisá tu conexión y volvé a intentar.`}
                </Banner>
                <button type="button" className="ghost small full-width" onClick={loaders.retry}>
                  Reintentar carga
                </button>
              </>
            )}
            {selectedStationId != null ? (
              // Seccion propia, no una mas al lado de las demas: elegir un
              // cargador tapa "Tu viaje"/"Vehiculo" en vez de compartir
              // espacio con ellas, para que el detalle + reseñas tengan
              // lugar de sobra. El boton "volver" de StationDetailPanel
              // (selectStation(null)) es lo unico que las trae de vuelta.
              <StationDetailPanel />
            ) : (
              <>
                <RouteInputPanel banner={banner} />
                <VehiclePanel />
                <StationsPanel />
              </>
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
