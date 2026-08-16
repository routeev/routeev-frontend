import { useEffect, useMemo, useRef, useState } from "react";
import { Helmet } from "react-helmet-async";
import { AppTopbar } from "../shared/AppTopbar";
import { Banner } from "../shared/Banner";
import { MapCanvas } from "./MapCanvas";
import { RouteInputPanel } from "./RouteInputPanel";
import { StationDetailPanel } from "./StationDetailPanel";
import { StationsPanel } from "./StationsPanel";
import { TripDashboard } from "./TripDashboard";
import { VehiclePanel } from "./VehiclePanel";
import { calculateGateMissing, useMapStore } from "./mapStore";
import { nextTripStep } from "./nextStep";
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

// Cuánto hay que bajar dentro del panel para que el mapa chico se corra, y
// cuánto hay que volver a subir para que vuelva solo. Son dos números y no uno
// a propósito (histéresis): con un único umbral, el mapa parpadeaba entrando y
// saliendo con el rebote del scroll inercial de iOS.
const MAP_COLLAPSE_SCROLL_PX = 48;
const MAP_RESTORE_SCROLL_PX = 8;

export function MapPage() {
  const [mapBanner, setMapBanner] = useState<MapBanner>(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  // "El usuario bajó lo suficiente dentro del panel". Solo tiene efecto en
  // pantalla angosta (ver MapPage.module.css): es la respuesta al reporte de
  // que el mapa chico y la barra de "Calcular ruta" son dos cajas fijas que a
  // veces no aportan nada y dejan al panel sin lugar. En el split de
  // escritorio el mapa es la pantalla, no estorba nada.
  const [scrolledPastMap, setScrolledPastMap] = useState(false);
  const handleDragStartY = useRef<number | null>(null);
  const sidebarScrollRef = useRef<HTMLDivElement | null>(null);
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
  const picking = useMapStore((s) => s.picking);
  const stopPicking = useMapStore((s) => s.stopPicking);
  const imprecisePick = useMapStore((s) => s.imprecisePick);
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
  // El mismo gate, pero redactado como UN paso a seguir en vez de un inventario
  // de faltantes: es lo único que le queda al panel para decir qué hacer, ahora
  // que la barra de "Calcular ruta" no existe hasta que se puede calcular.
  const step = useMemo(
    () =>
      nextTripStep({
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
  }, []);

  useEffect(() => {
    // Clickear un cargador en el mapa mientras el bottom sheet esta
    // colapsado (mobile) no serviria de nada si el detalle que se acaba de
    // abrir queda escondido debajo -- se lo revela solo, nunca al reves (no
    // se colapsa cuando se deselecciona, eso lo decide el usuario).
    //
    // Suscripcion al store y no `useEffect(..., [selectedStationId])` con el
    // setState adentro: eso es justo lo que dispara renders en cascada (una
    // seleccion de estacion => render => efecto => otro render), y el propio
    // React lo desaconseja. Acá el setState vive en el callback de un sistema
    // externo -- que es el caso para el que los efectos existen.
    return useMapStore.subscribe((state, prev) => {
      if (state.selectedStationId != null && state.selectedStationId !== prev.selectedStationId) {
        setSidebarCollapsed(false);
      }
    });
  }, []);

  // Derivado y no un estado propio con efectos que lo corrigan: cada una de
  // estas condiciones es un caso en el que esconder el mapa sería un error, y
  // como valor derivado no puede quedar "pegado" en el estado equivocado.
  //   - Sin origen y destino puestos, el mapa ES la herramienta para ponerlos.
  //   - Marcando un punto, o con el aviso de "quedó lejos de donde tocaste"
  //     (que dibuja la distancia SOBRE el mapa), esconderlo no explicaría nada.
  //   - Con el panel ya colapsado por el handle, esconder también el mapa deja
  //     la pantalla entera en blanco: son las dos únicas cosas que hay.
  const mapCollapsed =
    scrolledPastMap &&
    !sidebarCollapsed &&
    picking == null &&
    imprecisePick == null &&
    originId != null &&
    destinationId != null;

  // Un error de "Calcular ruta" pisa uno viejo de click-en-el-mapa: es el
  // mas reciente de los dos flujos que escriben este banner.
  const banner: MapBanner = calc.error ? { message: calc.error, variant: "error" } : mapBanner;

  const ready = missing.length === 0;

  function collapseSidebar(next: boolean) {
    setSidebarCollapsed(next);
    // Bajar el panel para mirar el mapa también olvida el scroll: si no, al
    // volver a subir el panel el mapa se escondía de nuevo solo, y desde
    // afuera se lee como que el gesto no funcionó.
    if (next) setScrolledPastMap(false);
  }

  function onHandlePointerDown(e: React.PointerEvent<HTMLDivElement>) {
    handleDragStartY.current = e.clientY;
    e.currentTarget.setPointerCapture(e.pointerId);
  }

  function onHandlePointerUp(e: React.PointerEvent<HTMLDivElement>) {
    const startY = handleDragStartY.current;
    handleDragStartY.current = null;
    if (startY == null) return;
    const delta = e.clientY - startY;
    if (delta > SIDEBAR_SWIPE_THRESHOLD) collapseSidebar(true);
    else if (delta < -SIDEBAR_SWIPE_THRESHOLD) collapseSidebar(false);
    else collapseSidebar(!sidebarCollapsed);
  }

  function onSidebarScroll(e: React.UIEvent<HTMLDivElement>) {
    // Solo una vez que los dos puntos están puestos: antes de eso el mapa es
    // la herramienta principal, no un adorno que estorba.
    if (originId == null || destinationId == null) return;
    const top = e.currentTarget.scrollTop;
    if (top > MAP_COLLAPSE_SCROLL_PX) setScrolledPastMap(true);
    else if (top <= MAP_RESTORE_SCROLL_PX) setScrolledPastMap(false);
  }

  function showMapAgain() {
    setScrolledPastMap(false);
    // Volver arriba del panel además de mostrar el mapa: si no, el scroll
    // sigue pasado el umbral y el próximo movimiento del dedo lo vuelve a
    // esconder, que se siente como que el botón no funcionó.
    sidebarScrollRef.current?.scrollTo({ top: 0 });
  }

  return (
    <div className={styles.page}>
      <Helmet>
        <title>RouteEV · Mapa</title>
        <meta name="robots" content="noindex" />
      </Helmet>

      {/* Sin children: "Mi perfil" quedaba duplicado con "Ir a mi perfil" en
          el menú de usuario nuevo (avatar + nombre, ver AppTopbar.tsx). */}
      <AppTopbar />

      <div className={`${styles.layout} ${mapCollapsed ? styles.mapCollapsed : ""}`}>
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
              collapseSidebar(!sidebarCollapsed);
            }}
          />
          {mapCollapsed && (
            // La vuelta atrás del punto (b) del reporte: el mapa se corrió
            // solo al scrollear, así que tiene que haber un botón que lo
            // traiga, visible sin scrollear y con nombre completo -- no un
            // icono que haya que adivinar. Solo existe en pantalla angosta
            // (el CSS lo esconde en el split de escritorio).
            <button type="button" className={styles.showMap} onClick={showMapAgain}>
              <svg className="btn-icon" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M9 4 3 6.4v13.2L9 17l6 2.6 6-2.4V4l-6 2.4L9 4Z" />
                <path d="M9 4v13M15 6.4v13.2" />
              </svg>
              Ver el mapa
            </button>
          )}
          <div
            className={`${styles.sidebarScroll} ${ready ? "" : styles.sidebarScrollNoCta}`}
            ref={sidebarScrollRef}
            onScroll={onSidebarScroll}
          >
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
                <RouteInputPanel banner={banner} step={step} />
                <VehiclePanel />
                <StationsPanel />
              </>
            )}
          </div>
          {/* La barra entera desaparece cuando todavía no se puede calcular, no
              se queda con el botón gris: pedido textual del usuario ("no solo
              que se desactive el botón"). En pantalla angosta esa franja fija
              se comía lugar del panel para no ofrecer nada. Lo que falta lo
              dice ahora el paso a seguir dentro de "Tu viaje"
              (RouteInputPanel), donde la persona ya está mirando. */}
          {ready && (
            <div className={styles.sidebarCta}>
              <button
                type="button"
                className="primary"
                disabled={calc.isPending}
                onClick={() => {
                  setMapBanner(null);
                  calc.calculate();
                }}
              >
                {calc.isPending ? "Calculando..." : "Calcular ruta"}
              </button>
              <p className="hint hint-ok">Listo para calcular.</p>
            </div>
          )}
        </aside>

        <main className={styles.mainArea}>
          <div className={`${styles.mapWrap} ${picking ? styles.mapWrapPicking : ""}`}>
            <MapCanvas liveTripPosition={liveTrip.ui.livePosition} onMapError={handleMapNotice} />
            {picking && (
              // Sobre el mapa y no en el panel: en pantalla angosta el panel
              // puede estar bajo el pliegue o colapsado, y este cartel es la
              // única señal de que el sistema está esperando un toque. Con
              // salida propia ("Cancelar"), que antes no existía: una vez que
              // se apretaba la chincheta no había forma de arrepentirse.
              <div className={styles.pickBar} role="status">
                <span
                  className={`${styles.pickDot} ${picking === "destination" ? styles.pickDotDest : ""}`}
                  aria-hidden="true"
                />
                <span className={styles.pickText}>
                  Tocá el mapa para marcar {picking === "origin" ? "el origen" : "el destino"}
                </span>
                <button type="button" className={styles.pickCancel} onClick={() => stopPicking()}>
                  Cancelar
                </button>
              </div>
            )}
          </div>
          <div className={styles.dashboardWrap}>
            <TripDashboard liveTrip={liveTrip} />
          </div>
        </main>
      </div>
    </div>
  );
}
