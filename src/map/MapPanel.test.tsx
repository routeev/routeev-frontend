import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Station } from "../api/graph";
import type { CompareRoutesResult } from "../api/route";
import { LanguageProvider } from "../i18n/LanguageProvider";
import { MapPanel } from "./MapPanel";
import { useMapStore } from "./mapStore";
import type { LiveTripUi } from "./useLiveTrip";

// Lo que se prueba es el armazón (qué pestaña y qué vista), no cada vista.
vi.mock("./StationReviews", () => ({ StationReviews: () => null }));
vi.mock("./StationStatusReport", () => ({ StationStatusReport: () => null }));
vi.mock("./useStationStatus", () => ({
  useStationStatus: () => ({ datos: null, estadoDe: () => null }),
}));
vi.mock("../api/stationReviews", () => ({
  listStationReviewSummaries: vi.fn(() => Promise.resolve({})),
}));
vi.mock("../api/graph", () => ({
  getLocalidades: vi.fn(() => Promise.resolve({ localidades: [] })),
  geocode: vi.fn(),
}));

const STATION = {
  node_id: "a",
  nombre: "UTE Paso de los Toros",
  operador: "UTE",
  potencia_kw: 60,
  lat: -32.81,
  lon: -56.51,
  direccion: "Ruta 5 km 252",
  tipo_conector: "CCS2",
  nota: "",
} as Station;

const LIVE = {
  ui: { active: false, finished: false } as LiveTripUi,
  start: () => {},
  cancel: () => {},
};
const CALC = { calculate: () => {}, isPending: false, startedAt: 0, error: null };

function renderPanel() {
  return render(
    <QueryClientProvider client={new QueryClient()}>
      <LanguageProvider>
        <MemoryRouter>
          <MapPanel
            sheet={null}
            liveTrip={LIVE}
            calc={CALC}
            mapNotice={null}
            loaders={{ failed: [], retry: () => {} }}
          />
        </MemoryRouter>
      </LanguageProvider>
    </QueryClientProvider>
  );
}

describe("MapPanel", () => {
  beforeEach(() => {
    localStorage.clear();
    useMapStore.getState().resetTripPlanning();
    useMapStore.setState({ stations: [STATION] });
  });

  it("arranca en Viaje y muestra cuántas estaciones hay en la otra pestaña", () => {
    renderPanel();

    expect(screen.getByRole("tab", { name: /viaje/i })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("tab", { name: /estaciones/i })).toHaveTextContent("1");
    expect(screen.getByPlaceholderText("¿Desde dónde salís?")).toBeInTheDocument();
  });

  it("elegir un cargador en el mapa abre su detalle en Estaciones", () => {
    renderPanel();

    act(() => useMapStore.getState().selectStation("a"));

    expect(screen.getByRole("tab", { name: /estaciones/i })).toHaveAttribute(
      "aria-selected",
      "true"
    );
    expect(screen.getByRole("heading", { name: "UTE Paso de los Toros" })).toBeInTheDocument();

    // Tocar la pestaña estando en el detalle vuelve a la lista.
    fireEvent.click(screen.getByRole("tab", { name: /estaciones/i }));
    expect(useMapStore.getState().selectedStationId).toBeNull();
    expect(screen.getByRole("searchbox")).toBeInTheDocument();
  });

  it("un resultado nuevo se muestra en Viaje aunque se estuviera en otra pestaña", () => {
    renderPanel();
    fireEvent.click(screen.getByRole("tab", { name: /estaciones/i }));

    act(() =>
      useMapStore.getState().setLastResult(
        {
          origin: { name: "Montevideo" },
          destination: { name: "Rivera" },
          astar: {
            found: false,
            route_coords: [],
            route: [],
            node_coords: [],
            breakdown: {},
            recharges: [],
          },
          dijkstra: null,
        } as unknown as CompareRoutesResult,
        null
      )
    );

    expect(screen.getByRole("tab", { name: /viaje/i })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByText("No encontramos una ruta")).toBeInTheDocument();
  });
});
