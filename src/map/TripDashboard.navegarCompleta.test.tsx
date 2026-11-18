import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import type { CompareRoutesResult } from "../api/route";
import { LanguageProvider } from "../i18n/LanguageProvider";
import { useMapStore } from "./mapStore";
import { TripDashboard } from "./TripDashboard";
import type { LiveTripUi } from "./useLiveTrip";

const BREAKDOWN = {
  energia_kwh: 30,
  tiempo_min: 180,
  trafico_min: 0,
  recarga_min: 25,
  peaje: 0,
  peaje_uyu: 0,
  costo_uyu_energia: 300,
  costo_uyu_total: 300,
};

const PARADA = { node_id: "n1", added_kwh: 20, time_min: 25, station_name: "UTE San Carlos", lat: -34.79, lon: -54.92 };

function resultado(recharges: CompareRoutesResult["astar"]["recharges"]): CompareRoutesResult {
  return {
    origin: { name: "Montevideo" },
    destination: { name: "Chuy" },
    modo: "eficiente",
    astar: {
      found: true,
      route_coords: [
        [-34.9, -56.19],
        [-34.0, -55.0],
        [-33.69, -53.46],
      ],
      route: [],
      node_coords: [],
      breakdown: BREAKDOWN,
      recharges,
    },
    dijkstra: null,
  };
}

const LIVE_TRIP = { ui: { active: false } as LiveTripUi, start: () => {}, cancel: () => {} };

function renderPanel(r: CompareRoutesResult) {
  useMapStore.setState({ lastResult: r });
  return render(
    <LanguageProvider>
      <TripDashboard liveTrip={LIVE_TRIP} />
    </LanguageProvider>
  );
}

afterEach(() => useMapStore.setState({ lastResult: null }));

describe("Datos del viaje -- navegar la ruta completa (E2)", () => {
  it("Google Maps abre el recorrido entero con las paradas; Waze, hasta la primera", () => {
    renderPanel(resultado([PARADA]));

    expect(screen.getByText("Navegar la ruta completa")).toBeInTheDocument();
    const google = screen.getByRole("link", { name: "Navegar con Google Maps: todo el recorrido (se abre aparte)" });
    expect(google.getAttribute("href")).toBe(
      "https://www.google.com/maps/dir/?api=1&origin=-34.9,-56.19&destination=-33.69,-53.46&waypoints=-34.79,-54.92&travelmode=driving"
    );
    const waze = screen.getByRole("link", { name: "Navegar con Waze: hasta la primera parada (se abre aparte)" });
    expect(waze.getAttribute("href")).toBe("https://waze.com/ul?ll=-34.79,-54.92&navigate=yes");
    expect(screen.getByText(/puede elegir otro camino entre ellas/)).toBeInTheDocument();
  });

  it("un viaje sin paradas de carga abre el destino en las dos apps", () => {
    renderPanel(resultado([]));

    const waze = screen.getByRole("link", { name: "Navegar con Waze: todo el recorrido (se abre aparte)" });
    expect(waze.getAttribute("href")).toBe("https://waze.com/ul?ll=-33.69,-53.46&navigate=yes");
    expect(screen.getByText(/Este viaje no necesita cargar/)).toBeInTheDocument();
  });

  it("con una parada sin coordenadas (replay viejo) no se ofrece: no sería el recorrido del plan", () => {
    renderPanel(resultado([{ ...PARADA, lat: undefined, lon: undefined }]));

    expect(screen.queryByText("Navegar la ruta completa")).toBeNull();
  });
});
