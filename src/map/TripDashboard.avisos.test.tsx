import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import type { CompareRoutesResult } from "../api/route";
import { LanguageProvider } from "../i18n/LanguageProvider";
import { useMapStore } from "./mapStore";
import { TripDashboard } from "./TripDashboard";
import type { LiveTripUi } from "./useLiveTrip";

const BASE = {
  energia_kwh: 10,
  tiempo_min: 120,
  trafico_min: 0,
  recarga_min: 40,
  peaje: 0,
  peaje_uyu: 0,
  costo_uyu_energia: 100,
  costo_uyu_total: 100,
};

const AVISO_30KW = /Equipo de 30 kW: carga lenta/;

/** Un viaje con dos paradas; `avisos` es breakdown.recargas_avisos tal cual lo manda la API. */
function resultado(avisos?: string[][]): CompareRoutesResult {
  return {
    origin: { name: "Montevideo" },
    destination: { name: "Rivera" },
    astar: {
      found: true,
      route_coords: [
        [-34.9, -56.19],
        [-30.9, -55.55],
      ],
      route: [],
      node_coords: [],
      breakdown: { ...BASE, ...(avisos ? { recargas_avisos: avisos } : {}) },
      recharges: [
        { node_id: "a", station_name: "Estación Uno", added_kwh: 20, time_min: 40 },
        { node_id: "b", station_name: "Estación Dos", added_kwh: 15, time_min: 30 },
      ],
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

describe("Datos del viaje -- avisos por parada", () => {
  it("avisa en la parada que tiene el aviso y solo en esa", () => {
    renderDashboard(resultado([["equipo_30kw"], []]));

    // Una sola vez: la segunda parada no lo tiene.
    expect(screen.getAllByText(AVISO_30KW)).toHaveLength(1);
    expect(screen.getByText("Ojo")).toBeInTheDocument();
  });

  it("avisa en las dos si las dos son de 30 kW", () => {
    renderDashboard(resultado([["equipo_30kw"], ["equipo_30kw"]]));

    expect(screen.getAllByText(AVISO_30KW)).toHaveLength(2);
  });

  it("sin avisos no agrega nada (backend viejo, replay del historial, o paradas normales)", () => {
    renderDashboard(resultado(undefined));
    expect(screen.queryByText(AVISO_30KW)).toBeNull();
    expect(screen.queryByText("Ojo")).toBeNull();
  });

  it("paradas sin aviso: filas vacías no muestran nada", () => {
    renderDashboard(resultado([[], []]));
    expect(screen.queryByText("Ojo")).toBeNull();
  });

  it("un código que la interfaz no conoce se ignora en vez de mostrarse crudo", () => {
    renderDashboard(resultado([["algo_nuevo_de_una_api_mas_reciente"], []]));
    expect(screen.queryByText(/algo_nuevo/)).toBeNull();
    expect(screen.queryByText("Ojo")).toBeNull();
  });

  it("si la lista no coincide con las paradas no se adivina a cuál va cada aviso", () => {
    renderDashboard(resultado([["equipo_30kw"]]));
    expect(screen.queryByText(AVISO_30KW)).toBeNull();
  });
});
