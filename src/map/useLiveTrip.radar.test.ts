import { act, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { CompareRoutesResult } from "../api/route";
import { logTrip } from "../api/route";
import type { Vehicle } from "../api/vehicles";
import { LanguageProvider } from "../i18n/LanguageProvider";
import { haversineKm } from "../shared/geo";
import { useMapStore } from "./mapStore";
import { setRadarVibrationEnabled } from "./radarAlertPrefs";
import { fromCoords } from "./routePoint";
import { useLiveTrip } from "./useLiveTrip";

// La precarga de tiles (tilePrefetch.ts) pide a OpenFreeMap con fetch: en
// estos tests no tiene que salir a la red. Se prueba aparte.
vi.mock("./tilePrefetch", () => ({
  createRoutePrefetcher: () => ({ advance: vi.fn(), stop: vi.fn() }),
}));

/**
 * Aviso de radar en el viaje en vivo (ver useLiveTrip.ts: RADAR_ALERT_*,
 * radarAlertThresholdKm). Mismo patrón de mock de geolocation/mapStore que
 * useLiveTrip.test.ts (permiso denegado), pero acá se simula el trayecto
 * completo llamando directo al callback de watchPosition con fixes
 * fabricados, en vez de solo el arranque.
 */

vi.mock("../api/route", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../api/route")>();
  return {
    ...actual,
    logTrip: vi.fn().mockResolvedValue({
      saved: true,
      duplicado: false,
      arrived: true,
      origen: { nombre: "Origen", fuente: "gps" },
      destino: { nombre: "Destino", fuente: "gps", lat: 0, lon: 0 },
      distance_km: 0,
      recharge_count: 0,
    }),
  };
});

const VEHICLE: Vehicle = {
  id: 1,
  name: "Test EV",
  battery_capacity_kwh: 60,
  consumption_kwh_per_km: 0.17,
  charging_power_kw: 100,
};

// Línea recta este-oeste (misma latitud en los dos extremos): a esta escala
// la interpolación lineal de lat/lon coincide con la distancia geodésica real
// (haversineKm), así que ubicar un punto "al km X del recorrido" es tan
// simple como interpolar por fracción de distancia total.
const ORIGIN: [number, number] = [-34.9, -56.2];
const DESTINATION: [number, number] = [-34.9, -56.15];
const TOTAL_KM = haversineKm(ORIGIN[0], ORIGIN[1], DESTINATION[0], DESTINATION[1]);

// route_coords con un vértice cada 10 m: nearestCumulativeDistance (usada
// para ubicar el radar sobre la ruta, igual que las paradas de recarga) mide
// contra el VÉRTICE más cercano, no proyecta sobre el segmento -- con solo
// los dos extremos (como en useLiveTrip.test.ts) un radar a mitad de camino
// quedaría pegado al origen. Con vértices cada 10 m el error es despreciable
// contra los umbrales de este archivo (cientos de metros).
const STEP_KM = 0.01;
function buildStraightRouteCoords(): [number, number][] {
  const n = Math.round(TOTAL_KM / STEP_KM);
  const coords: [number, number][] = [];
  for (let i = 0; i <= n; i++) {
    const frac = i / n;
    coords.push([ORIGIN[0] + (DESTINATION[0] - ORIGIN[0]) * frac, ORIGIN[1] + (DESTINATION[1] - ORIGIN[1]) * frac]);
  }
  return coords;
}
const ROUTE_COORDS = buildStraightRouteCoords();

/** El punto del recorrido más cercano al kilómetro pedido (cae justo en un vértice de ROUTE_COORDS). */
function pointAtKm(km: number): [number, number] {
  const idx = Math.round(km / STEP_KM);
  return ROUTE_COORDS[Math.max(0, Math.min(ROUTE_COORDS.length - 1, idx))]!;
}

// Radar a los 2 km de un recorrido de ~4,6 km: deja margen de sobra antes y
// después para probar "todavía lejos", "recién entra en umbral" y "ya pasó".
const RADAR_KM = 2.0;
const RADAR_POINT = pointAtKm(RADAR_KM);
const RADAR_NOMBRE = "Ruta 1, km 30";
const RADAR_MAXSPEED = 90;

// 72 km/h constante (20 m/s): con RADAR_ALERT_LOOKAHEAD_SEC=15s (ver
// useLiveTrip.ts) el umbral de aviso es 72*15/3600 = 0.3 km = 300 m.
const SPEED_MS = 20;
const SPEED_KMH = SPEED_MS * 3.6;
const ALERT_THRESHOLD_KM = (SPEED_KMH * 15) / 3600;

function buildResult(): CompareRoutesResult {
  return {
    origin: { name: "Origen" },
    destination: { name: "Destino" },
    astar: {
      found: true,
      route_coords: ROUTE_COORDS,
      route: [],
      node_coords: [],
      breakdown: {
        energia_kwh: 10,
        tiempo_min: 20,
        trafico_min: 0,
        recarga_min: 0,
        peaje: 0,
        peaje_uyu: 0,
        costo_uyu_energia: 100,
        costo_uyu_total: 100,
        radares_puntos: [{ lat: RADAR_POINT[0], lon: RADAR_POINT[1], maxspeed_kmh: RADAR_MAXSPEED, nombre: RADAR_NOMBRE }],
      },
      recharges: [],
    },
    dijkstra: null,
  };
}

/** GeolocationPosition con velocidad fija (m/s) -- así trip.speedKmh es constante desde el primer fix, sin depender de timestamps entre llamadas. */
function fixAt([lat, lon]: [number, number]): GeolocationPosition {
  return {
    coords: { latitude: lat, longitude: lon, accuracy: 5, speed: SPEED_MS } as GeolocationCoordinates,
    timestamp: Date.now(),
  } as GeolocationPosition;
}

function prepararStoreConRutaCalculada() {
  useMapStore.setState({
    vehicles: [VEHICLE],
    selectedVehicleId: VEHICLE.id,
    startBatteryPct: 100,
    originNode: fromCoords(ORIGIN[0], ORIGIN[1]),
    destinationNode: fromCoords(DESTINATION[0], DESTINATION[1]),
    lastResult: buildResult(),
    lastRoutePayload: { plan_id: "plan-test", origin_name: "Origen", destination_name: "Destino" },
  });
}

/**
 * navigator.geolocation mockeado con éxito: getCurrentPosition confirma que
 * se está en el origen y arranca watchPosition, cuyo callback se devuelve acá
 * para poder invocarlo a mano con cada fix simulado del recorrido.
 */
function mockGeolocationConRuta() {
  const vibrate = vi.fn();
  const clearWatch = vi.fn();
  const watchPosition = vi.fn();
  const getCurrentPosition = vi.fn((success: PositionCallback) => success(fixAt(ORIGIN)));
  vi.stubGlobal("navigator", {
    ...navigator,
    geolocation: { getCurrentPosition, watchPosition, clearWatch },
    vibrate,
  });
  return { watchPosition, clearWatch, vibrate };
}

Object.defineProperty(window, "isSecureContext", { value: true, configurable: true });

afterEach(() => {
  vi.unstubAllGlobals();
  vi.clearAllMocks();
  window.localStorage.clear();
  useMapStore.setState({
    vehicles: [],
    selectedVehicleId: null,
    originNode: null,
    destinationNode: null,
    lastResult: null,
    lastRoutePayload: null,
  });
});

describe("useLiveTrip -- aviso de radar", () => {
  it("avisa cuando el radar más cercano adelante entra en el umbral de tiempo, no antes", () => {
    const { watchPosition, vibrate } = mockGeolocationConRuta();
    const { result } = renderHook(() => useLiveTrip(), { wrapper: LanguageProvider });

    prepararStoreConRutaCalculada();
    act(() => result.current.start());
    const handlePosition = watchPosition.mock.calls[0]![0] as PositionCallback;

    // A 350 m del radar (por encima del umbral de 300 m a 72 km/h): todavía nada.
    act(() => handlePosition(fixAt(pointAtKm(RADAR_KM - 0.35))));
    expect(result.current.ui.radarAlert).toBeNull();
    expect(vibrate).not.toHaveBeenCalled();

    // A 250 m (por debajo del umbral): se dispara el aviso.
    act(() => handlePosition(fixAt(pointAtKm(RADAR_KM - 0.25))));
    expect(result.current.ui.radarAlert).toEqual({ nombre: RADAR_NOMBRE, maxspeedKmh: RADAR_MAXSPEED });
    expect(vibrate).toHaveBeenCalledTimes(1);

    expect(ALERT_THRESHOLD_KM).toBeCloseTo(0.3, 5);
  });

  it("no repite el aviso para el mismo radar mientras se sigue cerca, y desaparece solo al pasarlo", () => {
    const { watchPosition, vibrate } = mockGeolocationConRuta();
    const { result } = renderHook(() => useLiveTrip(), { wrapper: LanguageProvider });

    prepararStoreConRutaCalculada();
    act(() => result.current.start());
    const handlePosition = watchPosition.mock.calls[0]![0] as PositionCallback;

    act(() => handlePosition(fixAt(pointAtKm(RADAR_KM - 0.25))));
    expect(result.current.ui.radarAlert).not.toBeNull();
    expect(vibrate).toHaveBeenCalledTimes(1);

    // Sigue cerca (todavía no llegó al radar): mismo aviso, ningún vibrate nuevo.
    act(() => handlePosition(fixAt(pointAtKm(RADAR_KM - 0.1))));
    expect(result.current.ui.radarAlert).toEqual({ nombre: RADAR_NOMBRE, maxspeedKmh: RADAR_MAXSPEED });
    expect(vibrate).toHaveBeenCalledTimes(1);

    // Pasó el radar (más el colchón de 50 m): el aviso se va solo.
    act(() => handlePosition(fixAt(pointAtKm(RADAR_KM + 0.1))));
    expect(result.current.ui.radarAlert).toBeNull();

    // Y no vuelve a aparecer más adelante, aunque siga "cerca" en línea recta
    // (el radar ya quedó atrás -- avisado en true lo saca de los candidatos).
    act(() => handlePosition(fixAt(pointAtKm(RADAR_KM + 0.5))));
    expect(result.current.ui.radarAlert).toBeNull();
    expect(vibrate).toHaveBeenCalledTimes(1);
  });

  it("no molesta con la vibración cuando la preferencia está apagada, pero el aviso visual sigue", () => {
    setRadarVibrationEnabled(false);
    const { watchPosition, vibrate } = mockGeolocationConRuta();
    const { result } = renderHook(() => useLiveTrip(), { wrapper: LanguageProvider });

    prepararStoreConRutaCalculada();
    act(() => result.current.start());
    const handlePosition = watchPosition.mock.calls[0]![0] as PositionCallback;

    act(() => handlePosition(fixAt(pointAtKm(RADAR_KM - 0.25))));
    expect(result.current.ui.radarAlert).not.toBeNull();
    expect(vibrate).not.toHaveBeenCalled();
  });

  it("no rompe el resto del viaje en vivo: se llega a destino con normalidad después de pasar el radar", async () => {
    const { watchPosition } = mockGeolocationConRuta();
    const { result } = renderHook(() => useLiveTrip(), { wrapper: LanguageProvider });

    prepararStoreConRutaCalculada();
    act(() => result.current.start());
    const handlePosition = watchPosition.mock.calls[0]![0] as PositionCallback;

    act(() => handlePosition(fixAt(pointAtKm(RADAR_KM - 0.25))));
    expect(result.current.ui.radarAlert).not.toBeNull();
    act(() => handlePosition(fixAt(pointAtKm(RADAR_KM + 0.1))));
    expect(result.current.ui.radarAlert).toBeNull();

    act(() => handlePosition(fixAt(DESTINATION)));

    expect(result.current.ui.finished).toBe(true);
    expect(result.current.ui.active).toBe(false);
    expect(result.current.ui.statusKind).toBe("done");
    expect(result.current.ui.radarAlert).toBeNull();

    // logTrip es async: deja correr el microtask antes de comprobar que se llamó.
    await act(async () => {
      await Promise.resolve();
    });
    expect(logTrip).toHaveBeenCalledTimes(1);
  });
});
