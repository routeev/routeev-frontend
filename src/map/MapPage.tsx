import { Suspense, lazy, useEffect, useMemo, useRef, useState } from "react";
import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import { useTranslation } from "../i18n/LanguageProvider";
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
import { nextTripStep } from "./nextStep";
import { useCalculateRoute } from "./useCalculateRoute";
import { useLiveTrip } from "./useLiveTrip";
import { useMapLoaders } from "./useMapLoaders";
import { useReplayFromHistory } from "./useReplayFromHistory";
import styles from "./MapPage.module.css";

// Chunk aparte: MapLibre GL (~800 kB) solo hace falta con un viaje en vivo
// arrancado, la minoría de las visitas a /app. Cargarlo siempre en el bundle
// del mapa penalizaría a todo el mundo por una función que la mayoría nunca
// prende. Mismo patrón que lazyPages.tsx para las pantallas enteras.
const NavigationMap = lazy(() => import("./NavigationMap").then((m) => ({ default: m.NavigationMap })));

// Referencia estable para "sin ruta calculada todavía": un `?? []` inline en
// el selector de Zustand crearía un array NUEVO en cada llamada, y con eso
// useMapStore nunca ve la misma referencia dos veces seguidas -- exactamente
// el patrón que dispara un re-render de más en cada tick del store.
const EMPTY_ROUTE: [number, number][] = [];

type MapBanner = { message: string; variant: "error" | "warn" } | null;

// Umbral en px para que un arrastre de CUALQUIERA de los dos handles (el del
// sidebar de planificación, el de "Datos del viaje") cuente como swipe
// (arriba muestra, abajo esconde); por debajo de esto se trata como un tap
// simple que alterna el estado, asi el gesto sirve tanto para deslizar como
// para tocar.
const SWIPE_THRESHOLD_PX = 30;

// Cuánto hay que bajar dentro del panel para que el mapa chico se corra, y
// cuánto hay que volver a subir para que vuelva solo. Son dos números y no uno
// a propósito (histéresis): con un único umbral, el mapa parpadeaba entrando y
// saliendo con el rebote del scroll inercial de iOS.
const MAP_COLLAPSE_SCROLL_PX = 48;
const MAP_RESTORE_SCROLL_PX = 8;

export function MapPage() {
  const { t } = useTranslation();
  const mp = t.map.page;
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
  // "Datos del viaje" (el resultado calculado, no el formulario) colapsado
  // en pantalla angosta -- mismo patrón que sidebarCollapsed/handleDragStartY
  // de arriba, pero para el panel de resultado en vez del de planificación:
  // pedido explícito para poder deslizarlo hacia abajo y ver el mapa/
  // recorrido completo, y volver a subirlo cuando haga falta.
  const [dashboardCollapsed, setDashboardCollapsed] = useState(false);
  const dashboardHandleDragStartY = useRef<number | null>(null);
  const handleMapNotice = (msg: string | null, severity: "error" | "warn" = "error") =>
    setMapBanner(msg ? { message: msg, variant: severity } : null);
  const loaders = useMapLoaders();
  const liveTrip = useLiveTrip();
  const calc = useCalculateRoute();
  const routeCoords = useMapStore((s) => s.lastResult?.astar.route_coords ?? EMPTY_ROUTE);
  const hasResult = useMapStore((s) => s.lastResult != null);
  const vehiclesLoaded = useMapStore((s) => s.vehiclesLoaded);
  const selectedVehicleId = useMapStore((s) => s.selectedVehicleId);
  // Se selecciona el RoutePoint entero, no lat/lon por separado: la referencia
  // que guarda el store es estable (zustand compara con Object.is y solo
  // cambia cuando corre setOrigin/annotateSnap/clearOrigin), así que sirve
  // tal cual como dep de los useMemo de abajo. Lo que NO se puede hacer es
  // usar calculateGateMissing como selector, porque arma un array nuevo en
  // cada llamada -- eso es lo que documenta su comentario en mapStore.ts, y
  // es un problema distinto de este.
  const origin = useMapStore((s) => s.originNode);
  const destination = useMapStore((s) => s.destinationNode);
  const selectedStationId = useMapStore((s) => s.selectedStationId);
  const picking = useMapStore((s) => s.picking);
  const stopPicking = useMapStore((s) => s.stopPicking);
  const missing = useMemo(
    () =>
      calculateGateMissing({
        vehiclesLoaded,
        hasSelectedVehicle: !!selectedVehicleId,
        origin,
        destination,
      }),
    [vehiclesLoaded, selectedVehicleId, origin, destination]
  );
  // El mismo gate, pero redactado como UN paso a seguir en vez de un inventario
  // de faltantes: es lo único que le queda al panel para decir qué hacer, ahora
  // que la barra de "Calcular ruta" no existe hasta que se puede calcular.
  const step = useMemo(
    () =>
      nextTripStep(
        {
          vehiclesLoaded,
          hasSelectedVehicle: !!selectedVehicleId,
          origin,
          destination,
        },
        t.map.nextStep
      ),
    [vehiclesLoaded, selectedVehicleId, origin, destination, t]
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

  useEffect(() => {
    // Mismo criterio que arriba: un resultado nuevo (recién calculado, o
    // recalculado con otro vehículo/batería) tiene que mostrarse solo, no
    // quedar escondido si el panel ya estaba colapsado de un viaje anterior.
    //
    // scrolledPastMap también se resetea acá, no solo dashboardCollapsed:
    // BUG REAL encontrado en vivo (mobile) -- si scrolledPastMap seguía en
    // true desde ANTES de calcular (bajaste dentro de "Tu viaje" para llegar
    // al botón "Calcular ruta"), mapCollapsed más abajo no tenía forma de
    // enterarse de que ya no aplica: .mainArea (que en mobile contiene el
    // mapa Y "Datos del viaje") se quedaba con flex:0 0 0 + overflow:hidden
    // (ver .mapCollapsed .mainArea en el CSS) justo cuando el sidebar
    // también se esconde entero (.sidebarReplaced, hasResult=true) -- las
    // dos únicas cosas en pantalla desaparecían a la vez, pantalla negra.
    return useMapStore.subscribe((state, prev) => {
      if (state.lastResult != null && state.lastResult !== prev.lastResult) {
        setDashboardCollapsed(false);
        setScrolledPastMap(false);
      }
    });
  }, []);

  // Derivado y no un estado propio con efectos que lo corrigan: cada una de
  // estas condiciones es un caso en el que esconder el mapa sería un error, y
  // como valor derivado no puede quedar "pegado" en el estado equivocado.
  //   - Sin origen y destino puestos, el mapa ES la herramienta para ponerlos.
  //   - Marcando un punto, esconderlo no explicaría nada.
  //   - Con el panel ya colapsado por el handle, esconder también el mapa deja
  //     la pantalla entera en blanco: son las dos únicas cosas que hay.
  //   - Con un resultado ya calculado, "Tu viaje" (el formulario que
  //     scrolledPastMap le hacía lugar) ni se muestra -- lo reemplazó "Datos
  //     del viaje" (ver el ternario de sidebarScroll), que tiene su PROPIO
  //     colapsable (dashboardCollapsed/dashboardHandle). El reset de arriba ya
  //     deja scrolledPastMap en false apenas llega un resultado nuevo, pero
  //     esto es la misma garantía como valor derivado, no solo como efecto:
  //     no hay forma de que mapCollapsed quede "pegado" en true mientras haya
  //     un resultado en pantalla.
  const mapCollapsed =
    scrolledPastMap &&
    !sidebarCollapsed &&
    !hasResult &&
    picking == null &&
    origin != null &&
    destination != null;

  // Un error de "Calcular ruta" pisa uno de auto-localización (CaptureMap en
  // MapCanvas.tsx, el único otro flujo que escribe acá): es el más reciente de
  // los dos. Tocar el mapa ya no puede fallar -- fija el punto sin red de por
  // medio -- así que ese tercer flujo dejó de existir.
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
    if (delta > SWIPE_THRESHOLD_PX) collapseSidebar(true);
    else if (delta < -SWIPE_THRESHOLD_PX) collapseSidebar(false);
    else collapseSidebar(!sidebarCollapsed);
  }

  function onDashboardHandlePointerDown(e: React.PointerEvent<HTMLDivElement>) {
    dashboardHandleDragStartY.current = e.clientY;
    e.currentTarget.setPointerCapture(e.pointerId);
  }

  function onDashboardHandlePointerUp(e: React.PointerEvent<HTMLDivElement>) {
    const startY = dashboardHandleDragStartY.current;
    dashboardHandleDragStartY.current = null;
    if (startY == null) return;
    const delta = e.clientY - startY;
    if (delta > SWIPE_THRESHOLD_PX) setDashboardCollapsed(true);
    else if (delta < -SWIPE_THRESHOLD_PX) setDashboardCollapsed(false);
    else setDashboardCollapsed((v) => !v);
  }

  function onSidebarScroll(e: React.UIEvent<HTMLDivElement>) {
    // Solo una vez que los dos puntos están puestos: antes de eso el mapa es
    // la herramienta principal, no un adorno que estorba.
    if (origin == null || destination == null) return;
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
        <title>{mp.title}</title>
        <meta name="robots" content="noindex" />
      </Helmet>

      {/* mobileOnlyChildren, no children: en escritorio "Mi perfil" ya lo
          cubre el menú de usuario nuevo (avatar + nombre) -- mostrarlo
          también acá sería un duplicado. En el menú hamburguesa de mobile,
          que no tiene ese menú, sigue haciendo falta. */}
      <AppTopbar
        mobileOnlyChildren={
          <Link to="/profile" className={buttons.navLink}>
            <IconUser />
            {t.nav.myProfile}
          </Link>
        }
      />

      <div className={`${styles.layout} ${mapCollapsed ? styles.mapCollapsed : ""}`}>
        <aside
          className={`${styles.sidebar} ${sidebarCollapsed ? styles.collapsed : ""} ${hasResult ? styles.sidebarReplaced : ""}`}
        >
          <div
            className={styles.sidebarHandle}
            role="button"
            tabIndex={0}
            aria-label={sidebarCollapsed ? mp.showPanel : mp.hidePanel}
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
              {mp.viewMap}
            </button>
          )}
          <div
            className={`${styles.sidebarScroll} ${ready ? "" : styles.sidebarScrollNoCta} ${
              hasResult ? styles.sidebarScrollDashboard : ""
            }`}
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
                <Banner variant="error">{mp.loadFailed(loaders.failed.join(", "))}</Banner>
                <button type="button" className="ghost small full-width" onClick={loaders.retry}>
                  {mp.retryLoad}
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
            ) : hasResult ? (
              // Mismo reemplazo que en pantalla angosta (.sidebarReplaced +
              // .dashboardWrap, ver el CSS), pero adentro del panel fijo de
              // escritorio en vez de un panel flotante aparte: con un
              // resultado calculado, "Tu viaje" (el formulario) deja de
              // aportar nada -- lo unico que queda por hacer es arrancar el
              // viaje o cancelar el plan, y las dos vivven en TripDashboard.
              // Cancelar el plan (boton adentro de TripDashboard) es lo
              // unico que trae de vuelta el formulario.
              <TripDashboard liveTrip={liveTrip} />
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
              (RouteInputPanel), donde la persona ya está mirando. Tambien
              desaparece con un resultado ya calculado: sin origen/destino a
              la vista (RouteInputPanel esta reemplazado por TripDashboard,
              arriba) "Calcular ruta" quedaria suelto sin nada que lo explique
              -- arrancar/cancelar el viaje vive ahora en TripDashboard. */}
          {ready && !hasResult && (
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
                {calc.isPending ? mp.calculating : mp.calculateRoute}
              </button>
              <p className="hint hint-ok">{mp.readyToCalculate}</p>
            </div>
          )}
        </aside>

        <main className={styles.mainArea}>
          <div className={`${styles.mapWrap} ${picking ? styles.mapWrapPicking : ""}`}>
            {liveTrip.ui.active ? (
              // Modo navegación (cámara en perspectiva, rotando hacia donde
              // se viaja) mientras el viaje está en curso -- Leaflet
              // (MapCanvas) no tiene noción de inclinación/rotación de
              // cámara, así que este modo usa un motor de mapa distinto (ver
              // NavigationMap.tsx). Vuelve solo al mapa de planificación
              // cuando el viaje termina o se cancela (ui.active pasa a
              // false), sin que haga falta un botón de "salir" aparte.
              <Suspense fallback={<div className={styles.navigationMapFallback} />}>
                <NavigationMap
                  position={liveTrip.ui.livePosition}
                  heading={liveTrip.ui.heading}
                  routeCoords={routeCoords}
                />
              </Suspense>
            ) : (
              <MapCanvas liveTripPosition={liveTrip.ui.livePosition} onMapError={handleMapNotice} />
            )}
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
                <span className={styles.pickText}>{mp.tapToMark(picking)}</span>
                <button type="button" className={styles.pickCancel} onClick={() => stopPicking()}>
                  {mp.cancel}
                </button>
              </div>
            )}
          </div>
          <div
            className={`${styles.dashboardWrap} ${
              hasResult ? (dashboardCollapsed ? styles.collapsed : styles.expanded) : ""
            }`}
          >
            {/* Solo con un resultado calculado: sin esto habría un handle
                arrastrable sin nada que mostrar/esconder debajo. Solo se ve
                en pantalla angosta (CSS) -- en el split de escritorio
                "Datos del viaje" flota sobre el mapa sin taparlo entero, no
                hace falta poder colapsarlo. */}
            {hasResult && (
              <div
                className={styles.dashboardHandle}
                role="button"
                tabIndex={0}
                aria-label={dashboardCollapsed ? mp.showDashboard : mp.hideDashboard}
                onPointerDown={onDashboardHandlePointerDown}
                onPointerUp={onDashboardHandlePointerUp}
                onKeyDown={(e) => {
                  if (e.key !== "Enter" && e.key !== " ") return;
                  e.preventDefault();
                  setDashboardCollapsed((v) => !v);
                }}
              />
            )}
            <TripDashboard liveTrip={liveTrip} />
          </div>
        </main>
      </div>
    </div>
  );
}
