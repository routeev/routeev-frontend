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

const ESTACION = {
  direccion: null,
  departamento: null,
  ciudad: null,
  operador: "UTE",
  potencia_kw: 50,
  energia_estimada_kwh: 2,
  cubierto_por_la_reserva: false,
  demasiado_lejos: false,
};

function resultado(): CompareRoutesResult {
  return {
    origin: { name: "Montevideo" },
    destination: { name: "Chuy" },
    modo: "eficiente",
    cargador_destino: {
      ...ESTACION,
      node_id: "n9",
      nombre: "UTE Chuy",
      lat: -33.69,
      lon: -53.46,
      distancia_km_recta: 3.2,
      cubierto_por_la_reserva: true,
    },
    respaldo_paradas: {
      cubierto: true,
      paradas: [
        {
          node_id: "n1",
          estacion: "UTE San Carlos",
          respaldo: { ...ESTACION, node_id: "n2", nombre: "UTE Maldonado", lat: -34.9, lon: -54.95, distancia_km_recta: 14.2 },
        },
      ],
    },
    astar: {
      found: true,
      route_coords: [
        [-34.9, -56.19],
        [-33.69, -53.46],
      ],
      route: [],
      node_coords: [],
      breakdown: BREAKDOWN,
      recharges: [{ node_id: "n1", added_kwh: 20, time_min: 25, station_name: "UTE San Carlos", lat: -34.79, lon: -54.92 }],
    },
    dijkstra: null,
  };
}

const LIVE_TRIP = { ui: { active: false } as LiveTripUi, start: () => {}, cancel: () => {} };

afterEach(() => useMapStore.setState({ lastResult: null }));

describe("Datos del viaje -- cómo llegar (N1)", () => {
  it("cada parada, su respaldo y el cargador del destino se abren en Waze", () => {
    useMapStore.setState({ lastResult: resultado() });
    render(
      <LanguageProvider>
        <TripDashboard liveTrip={LIVE_TRIP} />
      </LanguageProvider>
    );

    const href = (lugar: string) =>
      screen.getByRole("link", { name: `Cómo llegar a ${lugar} con Waze (se abre aparte)` }).getAttribute("href");
    expect(href("UTE San Carlos")).toBe("https://waze.com/ul?ll=-34.79,-54.92&navigate=yes");
    expect(href("UTE Maldonado")).toBe("https://waze.com/ul?ll=-34.9,-54.95&navigate=yes");
    expect(href("UTE Chuy")).toBe("https://waze.com/ul?ll=-33.69,-53.46&navigate=yes");
  });

  it("una parada sin coordenadas (replay viejo) no muestra links rotos", () => {
    const r = resultado();
    r.astar.recharges = [{ node_id: "n1", added_kwh: 20, time_min: 25, station_name: "UTE San Carlos" }];
    useMapStore.setState({ lastResult: r });
    render(
      <LanguageProvider>
        <TripDashboard liveTrip={LIVE_TRIP} />
      </LanguageProvider>
    );

    expect(screen.queryByRole("link", { name: /a UTE San Carlos con Waze/ })).toBeNull();
    // El respaldo trae su propia coordenada, así que ese sigue.
    expect(screen.getByRole("link", { name: /a UTE Maldonado con Waze/ })).toBeTruthy();
  });
});
