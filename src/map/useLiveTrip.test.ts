import { act, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { CompareRoutesResult } from "../api/route";
import type { Vehicle } from "../api/vehicles";
import { LanguageProvider } from "../i18n/LanguageProvider";
import { useMapStore } from "./mapStore";
import { fromCoords } from "./routePoint";
import { useLiveTrip } from "./useLiveTrip";

/**
 * Regresión del bug reportado: "cuando me pide ubicación y le doy que no al
 * iniciar el viaje se bugea". start() pedía la posición inicial (para
 * confirmar que el usuario está parado en el origen) ANTES de arrancar el
 * seguimiento en vivo -- si el permiso se niega, handleError llamaba
 * setUi(...) con el mensaje de "permiso denegado" y DESPUÉS end(), que
 * reseteaba TODO a initialUi (menos `finished`) en el mismo tick. React
 * batchea los dos setUi de un mismo handler, así que el mensaje se pisaba
 * antes de llegar a pintarse: el viaje terminaba en silencio, sin decir por
 * qué -- lo que se veía como "se bugea".
 */

const VEHICLE: Vehicle = {
  id: 1,
  name: "Test EV",
  battery_capacity_kwh: 60,
  consumption_kwh_per_km: 0.17,
  charging_power_kw: 100,
};

const ORIGIN: [number, number] = [-34.9058, -56.1913];
const DESTINATION: [number, number] = [-34.461, -57.8443];

const RESULT: CompareRoutesResult = {
  origin: { name: "Montevideo" },
  destination: { name: "Colonia" },
  astar: {
    found: true,
    route_coords: [ORIGIN, DESTINATION],
    route: [],
    node_coords: [],
    breakdown: {
      energia_kwh: 10,
      tiempo_min: 120,
      trafico_min: 0,
      recarga_min: 0,
      peaje: 0,
      peaje_uyu: 0,
      costo_uyu_energia: 100,
      costo_uyu_total: 100,
    },
    recharges: [],
  },
  dijkstra: null,
};

function prepararStoreConRutaCalculada() {
  useMapStore.setState({
    vehicles: [VEHICLE],
    selectedVehicleId: VEHICLE.id,
    startBatteryPct: 100,
    originNode: fromCoords(ORIGIN[0], ORIGIN[1]),
    destinationNode: fromCoords(DESTINATION[0], DESTINATION[1]),
    lastResult: RESULT,
    lastRoutePayload: null,
  });
}

/** navigator.geolocation mockeado: getCurrentPosition invoca SIEMPRE el error callback con el código pedido (1 = PERMISSION_DENIED, ver GeolocationPositionError). */
function mockGeolocationDenegada() {
  const error = { code: 1, PERMISSION_DENIED: 1, POSITION_UNAVAILABLE: 2, TIMEOUT: 3, message: "denied" };
  const getCurrentPosition = vi.fn((_success, errorCb) => errorCb(error));
  vi.stubGlobal("navigator", {
    ...navigator,
    geolocation: { getCurrentPosition, watchPosition: vi.fn(), clearWatch: vi.fn() },
  });
  return getCurrentPosition;
}

// jsdom sirve las pruebas desde un origen no seguro: start() corta antes de
// pedir geolocalización si window.isSecureContext es false (mismo chequeo
// que hace en producción). Sin esto ningún test de este archivo llega a
// probar lo que le pasa al permiso.
Object.defineProperty(window, "isSecureContext", { value: true, configurable: true });

afterEach(() => {
  vi.unstubAllGlobals();
  useMapStore.setState({
    vehicles: [],
    selectedVehicleId: null,
    originNode: null,
    destinationNode: null,
    lastResult: null,
    lastRoutePayload: null,
  });
});

describe("useLiveTrip -- permiso de ubicación denegado al iniciar viaje", () => {
  it("vuelve a inactivo y MUESTRA el motivo, en vez de quedar en silencio", () => {
    mockGeolocationDenegada();
    const { result } = renderHook(() => useLiveTrip(), { wrapper: LanguageProvider });

    prepararStoreConRutaCalculada();
    act(() => result.current.start());

    expect(result.current.ui.active).toBe(false);
    expect(result.current.ui.statusText).toBe(
      "Permiso de ubicación denegado: activalo en la configuración del navegador para seguir el viaje en vivo."
    );
    expect(result.current.ui.statusKind).toBe("warn");
  });

  it("el botón queda disponible para reintentar (no se traba en 'Cancelar viaje')", () => {
    mockGeolocationDenegada();
    const { result } = renderHook(() => useLiveTrip(), { wrapper: LanguageProvider });

    prepararStoreConRutaCalculada();
    act(() => result.current.start());

    // finished:false + active:false es exactamente lo que TripDashboard.tsx
    // usa para decidir mostrar el botón "Iniciar viaje" (no "Cancelar viaje").
    expect(result.current.ui.finished).toBe(false);
    expect(result.current.ui.active).toBe(false);
  });
});
