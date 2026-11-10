import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import {
  toCompareRoutesResult,
  type CompareRoutesResult,
  type CompareRoutesResultV2,
} from "../api/route";
import { LanguageProvider } from "../i18n/LanguageProvider";
import type { Vehicle } from "../api/vehicles";
import { useMapStore } from "./mapStore";
import { TripDashboard } from "./TripDashboard";
import type { LiveTripUi } from "./useLiveTrip";

const BREAKDOWN = {
  energia_kwh: 10,
  tiempo_min: 120,
  trafico_min: 0,
  recarga_min: 0,
  peaje: 0,
  peaje_uyu: 0,
  costo_uyu_energia: 100,
  costo_uyu_total: 100,
};

function resultado(modo?: CompareRoutesResult["modo"]): CompareRoutesResult {
  return {
    origin: { name: "Montevideo" },
    destination: { name: "Punta del Este" },
    modo,
    astar: {
      found: true,
      route_coords: [
        [-34.9, -56.19],
        [-34.96, -54.95],
      ],
      route: [],
      node_coords: [],
      breakdown: BREAKDOWN,
      recharges: [],
    },
    dijkstra: null,
  };
}

const LIVE_TRIP = { ui: { active: false } as LiveTripUi, start: () => {}, cancel: () => {} };

function renderDashboard(r: CompareRoutesResult) {
  useMapStore.setState({ lastResult: r });
  return render(
    <LanguageProvider>
      <TripDashboard liveTrip={LIVE_TRIP} />
    </LanguageProvider>
  );
}

afterEach(() => useMapStore.setState({ lastResult: null }));

describe("Datos del viaje -- tipo de viaje", () => {
  it("dice con qué prioridad se calculó la ruta y qué significó", () => {
    renderDashboard(resultado("economico"));

    expect(screen.getByText("Económico")).toBeInTheDocument();
    expect(screen.getByText("Prioriza gastar menos plata en las recargas.")).toBeInTheDocument();
  });

  it("sin modo (replay del historial) no inventa uno", () => {
    renderDashboard(resultado(undefined));

    expect(screen.queryByText(/Tipo de viaje/)).toBeNull();
    expect(screen.queryByText("Más eficiente")).toBeNull();
  });

  it("el adaptador de /api/route/plan no pierde el modo", () => {
    const v2 = {
      plan_id: "p1",
      modo: "rapido",
      paradas: [],
      astar: { found: true, route_coords: [], breakdown: BREAKDOWN },
      dijkstra: null,
    } as unknown as CompareRoutesResultV2;

    expect(toCompareRoutesResult(v2, "A", "B").modo).toBe("rapido");
  });
});

describe("Datos del viaje -- consumo propio", () => {
  const AUTO = {
    id: 7,
    name: "Auto",
    battery_capacity_kwh: 60,
    consumption_kwh_per_km: 0.2,
    charging_power_kw: 50,
  } as Vehicle;

  afterEach(() => useMapStore.setState({ vehicles: [], selectedVehicleId: null }));

  it("dice con qué consumo se calculó, y los km salen de ese consumo y no del del auto", () => {
    useMapStore.setState({ vehicles: [AUTO], selectedVehicleId: AUTO.id });
    renderDashboard({ ...resultado("eficiente"), consumo_propio_kwh_km: 0.125 });

    expect(
      screen.getByText("Calculado con 0,125 kWh/km, el consumo que pusiste para este viaje.")
    ).toBeInTheDocument();
    // 10 kWh del desglose a 0,125 kWh/km son 80 km. Con el del auto (0,2)
    // se mostrarían 50.
    expect(screen.getByText("80")).toBeInTheDocument();
    expect(screen.queryByText("50")).toBeNull();
  });

  it("sin consumo propio no agrega la línea", () => {
    useMapStore.setState({ vehicles: [AUTO], selectedVehicleId: AUTO.id });
    renderDashboard(resultado("eficiente"));

    expect(screen.queryByText(/el consumo que pusiste/)).toBeNull();
    expect(screen.getByText("50")).toBeInTheDocument();
  });
});
