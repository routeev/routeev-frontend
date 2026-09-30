import { act, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { Station } from "../api/graph";
import type { Vehicle } from "../api/vehicles";
import { LanguageProvider } from "../i18n/LanguageProvider";
import { useMapStore } from "./mapStore";
import { useGoToStation } from "./useGoToStation";

// El nombre del origen se busca en segundo plano contra la API: acá no importa.
vi.mock("./pointName", () => ({ nameInBackground: vi.fn(() => Promise.resolve()) }));

const VEHICLE: Vehicle = {
  id: 1,
  name: "Test EV",
  battery_capacity_kwh: 60,
  consumption_kwh_per_km: 0.17,
  charging_power_kw: 100,
};

const STATION = {
  node_id: "station_ute_ancap_florida",
  nombre: "ANCAP Florida",
  lat: -34.0994,
  lon: -56.2142,
} as Station;

const AQUI = { latitude: -34.9058, longitude: -56.1913 };

function mockGeolocation(resultado: { ok: true } | { ok: false; code: number }) {
  const getCurrentPosition = vi.fn((success, error) => {
    if (resultado.ok) success({ coords: AQUI });
    else
      error({
        code: resultado.code,
        PERMISSION_DENIED: 1,
        POSITION_UNAVAILABLE: 2,
        TIMEOUT: 3,
        message: "",
      });
  });
  vi.stubGlobal("navigator", { ...navigator, geolocation: { getCurrentPosition } });
}

afterEach(() => {
  vi.unstubAllGlobals();
  useMapStore.setState({
    vehicles: [],
    vehiclesLoaded: false,
    selectedVehicleId: null,
    originNode: null,
    destinationNode: null,
    selectedStationId: null,
    lastResult: null,
  });
});

describe("useGoToStation -- ir a una estación desde mi ubicación", () => {
  it("pone mi ubicación de origen, la estación de destino, cierra el detalle y calcula", () => {
    mockGeolocation({ ok: true });
    useMapStore.setState({
      vehicles: [VEHICLE],
      vehiclesLoaded: true,
      selectedVehicleId: VEHICLE.id,
      selectedStationId: STATION.node_id,
    });
    const calculate = vi.fn();
    const { result } = renderHook(() => useGoToStation(calculate), { wrapper: LanguageProvider });

    act(() => result.current.goTo(STATION));

    const s = useMapStore.getState();
    expect(s.originNode).toMatchObject({ lat: AQUI.latitude, lon: AQUI.longitude });
    expect(s.destinationNode).toEqual({
      name: "ANCAP Florida",
      lat: STATION.lat,
      lon: STATION.lon,
    });
    expect(s.selectedStationId).toBeNull();
    expect(calculate).toHaveBeenCalledTimes(1);
    expect(result.current.busy).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it("sin vehículo fija los puntos pero NO calcula: el panel dice qué falta", () => {
    mockGeolocation({ ok: true });
    useMapStore.setState({ vehicles: [], vehiclesLoaded: true, selectedVehicleId: null });
    const calculate = vi.fn();
    const { result } = renderHook(() => useGoToStation(calculate), { wrapper: LanguageProvider });

    act(() => result.current.goTo(STATION));

    expect(useMapStore.getState().destinationNode?.name).toBe("ANCAP Florida");
    expect(calculate).not.toHaveBeenCalled();
  });

  it("con el permiso denegado no toca el viaje y explica por qué", () => {
    mockGeolocation({ ok: false, code: 1 });
    useMapStore.setState({
      vehicles: [VEHICLE],
      vehiclesLoaded: true,
      selectedVehicleId: VEHICLE.id,
    });
    const calculate = vi.fn();
    const { result } = renderHook(() => useGoToStation(calculate), { wrapper: LanguageProvider });

    act(() => result.current.goTo(STATION));

    expect(useMapStore.getState().originNode).toBeNull();
    expect(useMapStore.getState().destinationNode).toBeNull();
    expect(calculate).not.toHaveBeenCalled();
    expect(result.current.error).toMatch(/permiso/i);
    expect(result.current.busy).toBe(false);
  });
});
