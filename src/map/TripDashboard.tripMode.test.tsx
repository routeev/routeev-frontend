import { fireEvent, render, screen } from "@testing-library/react";
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

  // El aviso de "sin ruta" de un GB/T lee el conector del resultado ADAPTADO, no
  // del de la API: si el adaptador lo pierde, el aviso no sale nunca aunque la
  // API lo mande bien.
  it("el adaptador de /api/route/plan no pierde el conector del auto", () => {
    const v2 = {
      plan_id: null,
      conector: "gbt",
      paradas: [],
      astar: { found: false, route_coords: [], breakdown: {} },
      dijkstra: null,
    } as unknown as CompareRoutesResultV2;

    expect(toCompareRoutesResult(v2, "A", "B").conector).toBe("gbt");
    expect(toCompareRoutesResult({ ...v2, conector: undefined }, "A", "B").conector).toBeUndefined();
  });

  // Mismo motivo que el conector: el aviso de "sin ruta" lee el resultado adaptado.
  it("el adaptador de /api/route/plan no pierde si se calculó sin cable Tipo 2", () => {
    const v2 = {
      plan_id: null,
      cable_tipo2: false,
      paradas: [],
      astar: { found: false, route_coords: [], breakdown: {} },
      dijkstra: null,
    } as unknown as CompareRoutesResultV2;

    expect(toCompareRoutesResult(v2, "A", "B").cable_tipo2).toBe(false);
    expect(toCompareRoutesResult({ ...v2, cable_tipo2: true }, "A", "B").cable_tipo2).toBe(true);
    expect(
      toCompareRoutesResult({ ...v2, cable_tipo2: undefined }, "A", "B").cable_tipo2
    ).toBeUndefined();
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
      screen.getByText("Calculado con 12,5 kWh/100 km, el consumo que pusiste para este viaje.")
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

describe("Datos del viaje -- ida y vuelta", () => {
  const RESUMEN = {
    completo: true,
    tramos_pedidos: 2,
    tramos_calculados: 2,
    tiempo_total_min: 310,
    energia_kwh: 80,
    costo_uyu_total: 1500,
    recargas: 2,
    bateria_llegada_kwh: 12,
    bateria_llegada_pct: 20,
  };
  const ida = {
    result: resultado("eficiente"),
    payload: { plan_id: "p1", origin_name: "Montevideo", destination_name: "Punta del Este" },
  };
  const vuelta = {
    result: { ...resultado("eficiente"), origin: { name: "Punta del Este" }, destination: { name: "Montevideo" } },
    payload: { plan_id: "p2", origin_name: "Punta del Este", destination_name: "Montevideo" },
  };

  function renderViaje(live: typeof LIVE_TRIP = LIVE_TRIP, resumen = RESUMEN) {
    useMapStore.setState({ idaYVuelta: true });
    useMapStore.getState().setTramos([ida, vuelta], resumen);
    return render(
      <LanguageProvider>
        <TripDashboard liveTrip={live} />
      </LanguageProvider>
    );
  }

  afterEach(() =>
    useMapStore.setState({ lastResult: null, lastRoutePayload: null, tramos: null, resumenViaje: null, idaYVuelta: false })
  );

  it("muestra Ida y Vuelta, arranca en la ida y resume el viaje entero", () => {
    renderViaje();

    expect(screen.getByRole("radiogroup", { name: "Tramo del viaje" })).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: "Ida" })).toHaveAttribute("aria-checked", "true");
    expect(screen.getByRole("radio", { name: "Vuelta" })).toHaveAttribute("aria-checked", "false");
    expect(screen.getByText(/Ida y vuelta: 5 h 10 min · 2 recargas · /)).toBeInTheDocument();
    expect(screen.getByText("Cada tramo se inicia por separado: al llegar, pasá al siguiente.")).toBeInTheDocument();
  });

  it("pasar a la Vuelta muestra el tramo de vuelta, con el origen y el destino al revés", () => {
    const { container } = renderViaje();
    const titulo = () => container.querySelector("h2")!.textContent ?? "";
    expect(titulo()).toMatch(/^Montevideo\s*→\s*Punta del Este/);

    fireEvent.click(screen.getByRole("radio", { name: "Vuelta" }));

    expect(screen.getByRole("radio", { name: "Vuelta" })).toHaveAttribute("aria-checked", "true");
    expect(titulo()).toMatch(/^Punta del Este\s*→\s*Montevideo/);
    // Lo que se inicia ahora es el plan de la vuelta.
    expect(useMapStore.getState().lastRoutePayload?.plan_id).toBe("p2");
  });

  it("con el viaje en marcha no deja cambiar de tramo", () => {
    const enMarcha = {
      active: true,
      finished: false,
      livePosition: null,
      distanceKm: 10,
      totalKm: 100,
      batteryKwh: 30,
      capacityKwh: 60,
      elapsedMin: 12,
      speedKmh: 90,
      heading: null,
      statusText: "",
      statusKind: "",
      advisory: null,
      radarAlert: null,
      gpsAccuracyM: null,
      gpsGapMs: null,
      saveError: null,
    } as LiveTripUi;
    renderViaje({ ...LIVE_TRIP, ui: enMarcha });

    expect(screen.getByRole("radio", { name: "Vuelta" })).toBeDisabled();
  });

  it("si no se pudo calcular todo, lo dice en vez de un resumen", () => {
    renderViaje(LIVE_TRIP, { ...RESUMEN, completo: false, tramos_calculados: 1 });

    expect(screen.getByText(/No pudimos calcular el viaje completo/)).toBeInTheDocument();
    expect(screen.queryByText(/Ida y vuelta: /)).toBeNull();
  });

  it("un viaje de un solo tramo no muestra el selector", () => {
    useMapStore.setState({ tramos: null, resumenViaje: null });
    renderDashboard(resultado("eficiente"));

    expect(screen.queryByRole("radiogroup", { name: "Tramo del viaje" })).toBeNull();
  });
});

describe("Datos del viaje -- paradas intermedias", () => {
  const resumen = (pedidos: number) => ({
    completo: true,
    tramos_pedidos: pedidos,
    tramos_calculados: pedidos,
    tiempo_total_min: 420,
    energia_kwh: 100,
    costo_uyu_total: 1800,
    recargas: 3,
    bateria_llegada_kwh: 10,
    bateria_llegada_pct: 15,
  });
  const tramo = (i: number) => ({
    result: { ...resultado("eficiente"), origin: { name: `P${i}` }, destination: { name: `P${i + 1}` } },
    payload: { plan_id: `p${i}`, origin_name: `P${i}`, destination_name: `P${i + 1}` },
  });
  const PARADA = { key: 1, point: { name: "Durazno", lat: -33.38, lon: -56.52 }, revision: 0 };

  function renderViaje(tramos: ReturnType<typeof tramo>[], pedidos: number) {
    useMapStore.getState().setTramos(tramos, resumen(pedidos));
    return render(
      <LanguageProvider>
        <TripDashboard liveTrip={LIVE_TRIP} />
      </LanguageProvider>
    );
  }

  afterEach(() =>
    useMapStore.setState({
      lastResult: null,
      lastRoutePayload: null,
      tramos: null,
      resumenViaje: null,
      paradas: [],
      idaYVuelta: false,
    })
  );

  it("sin ida y vuelta, son Tramo 1, 2 y 3, y el resumen habla del viaje completo", () => {
    useMapStore.setState({ paradas: [PARADA], idaYVuelta: false });
    renderViaje([tramo(1), tramo(2), tramo(3)], 3);

    expect(screen.getAllByRole("radio").map((r) => r.textContent)).toEqual(["Tramo 1", "Tramo 2", "Tramo 3"]);
    expect(screen.getByText(/Viaje completo: 7 h 0 min · 3 recargas · /)).toBeInTheDocument();
  });

  it("con ida y vuelta y una parada, las mitades numeran sus tramos", () => {
    useMapStore.setState({ paradas: [PARADA], idaYVuelta: true });
    renderViaje([tramo(1), tramo(2), tramo(3), tramo(4)], 4);

    expect(screen.getAllByRole("radio").map((r) => r.textContent)).toEqual(["Ida 1", "Ida 2", "Vuelta 1", "Vuelta 2"]);
  });

  it("si un tramo no tuvo ruta, los que volvieron conservan su nombre dentro del viaje pedido", () => {
    useMapStore.setState({ paradas: [PARADA], idaYVuelta: true });
    renderViaje([tramo(1), tramo(2), tramo(3)], 4);

    expect(screen.getAllByRole("radio").map((r) => r.textContent)).toEqual(["Ida 1", "Ida 2", "Vuelta 1"]);
  });

  it("pasar de tramo muestra el tramo con su origen y destino", () => {
    useMapStore.setState({ paradas: [PARADA], idaYVuelta: false });
    const { container } = renderViaje([tramo(1), tramo(2)], 2);

    fireEvent.click(screen.getByRole("radio", { name: "Tramo 2" }));

    expect(container.querySelector("h2")!.textContent).toMatch(/^P2\s*→\s*P3/);
    expect(useMapStore.getState().lastRoutePayload?.plan_id).toBe("p2");
  });
});
