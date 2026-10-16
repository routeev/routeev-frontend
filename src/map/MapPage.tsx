import { Suspense, lazy, useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { Helmet } from "react-helmet-async";
import { useTranslation } from "../i18n/LanguageProvider";
import { LandingHeader } from "../landing/LandingHeader";
import { useMediaQuery } from "../shared/useMediaQuery";
import { MapCanvas } from "./MapCanvas";
import { MapPanel } from "./MapPanel";
import type { NavChargeStop, NavRadar } from "./NavigationMap";
import { useMapStore } from "./mapStore";
import { useBottomSheet } from "./useBottomSheet";
import { useCalculateRoute } from "./useCalculateRoute";
import { useLiveTrip } from "./useLiveTrip";
import { useMapLoaders } from "./useMapLoaders";
import { useReplayFromHistory } from "./useReplayFromHistory";
import styles from "./MapPage.module.css";

// Chunk aparte: MapLibre GL (~800 kB) solo hace falta con un viaje en vivo
// arrancado, la minoría de las visitas a /app. Cargarlo siempre en el bundle
// del mapa penalizaría a todo el mundo por una función que la mayoría nunca
// prende. Mismo patrón que lazyPages.tsx para las pantallas enteras.
// El import de tipos de arriba es `import type` a propósito: se borra al
// compilar, así que no mete el módulo real en este chunk.
const NavigationMap = lazy(() => import("./NavigationMap").then((m) => ({ default: m.NavigationMap })));

// Referencia estable para "sin ruta calculada todavía": un `?? []` inline en
// el selector de Zustand crearía un array NUEVO en cada llamada, y con eso
// useMapStore nunca ve la misma referencia dos veces seguidas -- exactamente
// el patrón que dispara un re-render de más en cada tick del store.
const EMPTY_ROUTE: [number, number][] = [];

/** Mismo corte que el CSS: hasta acá el panel es una hoja inferior. */
const SHEET_QUERY = "(max-width: 860px)";

type MapNotice = { message: string; variant: "error" | "warn" } | null;

export function MapPage() {
  const { t } = useTranslation();
  const mp = t.map.page;
  const [mapNotice, setMapNotice] = useState<MapNotice>(null);
  const handleMapNotice = (msg: string | null, severity: "error" | "warn" = "error") =>
    setMapNotice(msg ? { message: msg, variant: severity } : null);
  const loaders = useMapLoaders();
  const liveTrip = useLiveTrip();
  const calc = useCalculateRoute();
  const layoutRef = useRef<HTMLDivElement | null>(null);
  const isSheet = useMediaQuery(SHEET_QUERY);
  const sheet = useBottomSheet(layoutRef, isSheet);

  // Se selecciona el resultado ENTERO (referencia estable: solo cambia con
  // setLastResult) y lo demás se deriva, en vez de una suscripción por dato.
  const result = useMapStore((s) => s.lastResult);
  const routeCoords = result?.astar.route_coords ?? EMPTY_ROUTE;
  const picking = useMapStore((s) => s.picking);
  const stopPicking = useMapStore((s) => s.stopPicking);

  // Paradas de carga y radares del plan, resueltos a lat/lon para el modo
  // navegación (NavigationMap recibe datos listos, no lee el store). La
  // posición de cada parada: lat/lon directos cuando el resultado vino de
  // planRoute() (v2); para un replay viejo del historial, el mismo fallback
  // por índice de route/node_coords que ya usa useLiveTrip.ts.
  const navChargeStops = useMemo<NavChargeStop[]>(() => {
    if (!result?.astar.found) return [];
    const a = result.astar;
    return a.recharges.flatMap((rc) => {
      const pos: [number, number] | null =
        rc.lat != null && rc.lon != null
          ? [rc.lat, rc.lon]
          : (() => {
              const idx = a.route.indexOf(rc.node_id);
              return idx >= 0 ? (a.node_coords[idx] ?? null) : null;
            })();
      return pos ? [{ lat: pos[0], lon: pos[1], name: rc.station_name }] : [];
    });
  }, [result]);
  const navRadars = useMemo<NavRadar[]>(() => {
    if (!result?.astar.found) return [];
    // radares_puntos: ausente en un backend viejo o en un replay guardado
    // antes de esta versión -- ahí simplemente no hay radares que marcar.
    return (result.astar.breakdown.radares_puntos ?? []).map((r) => ({
      lat: r.lat,
      lon: r.lon,
      name: r.nombre,
      maxspeedKmh: r.maxspeed_kmh,
    }));
  }, [result]);
  const vehiclesLoaded = useMapStore((s) => s.vehiclesLoaded);
  useReplayFromHistory(vehiclesLoaded);

  useEffect(() => {
    // Entrar (o volver) al mapa arranca en blanco -- el store es un
    // singleton de modulo, no se resetea solo al navegar a /profile y
    // volver (React Router remonta MapPage, pero Zustand vive afuera de
    // eso).
    //
    // Salvo si se viene de "Ver en el mapa" un viaje pasado (?viaje=<id>): ahí
    // useReplayFromHistory es la única fuente de verdad para el estado
    // inicial, y puede correr en este mismo commit (con los vehículos ya en
    // el cache de TanStack Query) -- este reset lo pisaría todo de vuelta.
    if (new URLSearchParams(window.location.search).has("viaje")) return;
    useMapStore.getState().resetTripPlanning();
  }, []);

  // El mapa termina donde empieza la hoja inferior (ver MapPage.module.css).
  const layoutStyle = isSheet
    ? ({ "--sheet-h": `${sheet.snappedHeight}px` } as CSSProperties)
    : undefined;

  return (
    <div className={styles.page}>
      <Helmet>
        <title>{mp.title}</title>
        <meta name="robots" content="noindex" />
      </Helmet>

      <LandingHeader loggedIn page="app" />

      <div className={styles.layout} ref={layoutRef} style={layoutStyle}>
        <MapPanel
          sheet={isSheet ? sheet : null}
          liveTrip={liveTrip}
          calc={calc}
          mapNotice={mapNotice}
          loaders={loaders}
        />

        <main className={styles.mainArea}>
          <div className={`${styles.mapWrap} ${picking ? styles.mapWrapPicking : ""}`}>
            {liveTrip.ui.active ? (
              // Modo navegación (cámara en perspectiva, rotando hacia donde
              // se viaja) mientras el viaje está en curso -- Leaflet no tiene
              // noción de inclinación/rotación de cámara, así que este modo
              // usa otro motor de mapa (ver NavigationMap.tsx). Vuelve solo
              // al de planificación cuando el viaje termina o se cancela.
              <Suspense fallback={<div className={styles.navigationMapFallback} />}>
                <NavigationMap
                  position={liveTrip.ui.livePosition}
                  heading={liveTrip.ui.heading}
                  routeCoords={routeCoords}
                  chargeStops={navChargeStops}
                  radars={navRadars}
                />
              </Suspense>
            ) : (
              <MapCanvas liveTripPosition={liveTrip.ui.livePosition} onMapError={handleMapNotice} />
            )}
          </div>
          {picking && (
            // Sobre el mapa y no en el panel: en el celular la hoja puede
            // estar colapsada, y esta píldora es la única señal de que el mapa
            // está esperando un toque. Con salida propia ("Cancelar").
            <div className={styles.pickBar} role="status">
              <div className={styles.pickPill}>
                <span
                  className={`${styles.pickDot} ${picking === "destination" ? styles.pickDotDest : ""}`}
                  aria-hidden="true"
                />
                <span className={styles.pickText}>{mp.tapToMark(picking)}</span>
                <button type="button" className={styles.pickCancel} onClick={() => stopPicking()}>
                  {mp.cancel}
                </button>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
