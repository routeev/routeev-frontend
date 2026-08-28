import { describe, expect, it } from "vitest";
import type { RouteBreakdown, RouteResult } from "../api/route";
import { hayPeajeSinMonto, hayPeajes, summarizeTrip } from "./tripStats";

function breakdown(overrides: Partial<RouteBreakdown> = {}): RouteBreakdown {
  return {
    energia_kwh: 60,
    tiempo_min: 120,
    trafico_min: 0,
    recarga_min: 0,
    peaje: 0,
    peaje_uyu: 0,
    costo_uyu_energia: 390,
    costo_uyu_total: 390,
    ...overrides,
  };
}

const VEHICULO = {
  id: 1,
  name: "Kona",
  battery_capacity_kwh: 64,
  consumption_kwh_per_km: 0.15,
  charging_power_kw: 50,
};

function resultado(b: RouteBreakdown): RouteResult {
  return {
    found: true,
    route_coords: [
      [-34.9, -56.2],
      [-34.96, -54.95],
    ],
    route: [],
    node_coords: [],
    breakdown: b,
    recharges: [],
  };
}

describe("hayPeajes", () => {
  it("un viaje sin peajes no tiene peajes", () => {
    expect(hayPeajes(breakdown())).toBe(false);
  });

  it("un viaje con monto de peaje TIENE peajes aunque el penalty esté en cero", () => {
    // Este es el bug que se veía en pantalla: Montevideo-Punta del Este decía
    // "Sin peajes" y "+ peajes $ 0" mientras cruzaba la Interbalnearia, porque
    // la pregunta se le hacía a `peaje` — el penalty en minutos de la función
    // de costo, que en el grafo de estaciones es 0 por construcción.
    expect(
      hayPeajes(
        breakdown({
          peaje: 0,
          peaje_uyu: 393.14,
          peajes_puntos: [
            { lat: -34.78, lon: -55.89, monto_uyu: 196.57, nombre: "Ruta Interbalnearia - Pando (km 32.4)" },
            { lat: -34.78, lon: -55.39, monto_uyu: 196.57, nombre: "Ruta Interbalnearia - Solis (km 81)" },
          ],
        })
      )
    ).toBe(true);
  });

  it("un peaje detectado sin monto conocido también cuenta", () => {
    expect(hayPeajes(breakdown({ peajes_puntos: [{ lat: -34.7, lon: -55.8, monto_uyu: null }] }))).toBe(true);
  });

  it("sigue reconociendo un resultado del motor viejo, que solo trae el penalty", () => {
    // Un viaje del historial calculado contra el grafo semilla: tiene `peaje`
    // en minutos y ningún monto.
    expect(hayPeajes(breakdown({ peaje: 12 }))).toBe(true);
  });
});

describe("hayPeajeSinMonto", () => {
  it("es falso cuando todos los peajes están tarifados", () => {
    expect(
      hayPeajeSinMonto(
        breakdown({ peaje_uyu: 196.57, peajes_puntos: [{ lat: -34.78, lon: -55.89, monto_uyu: 196.57 }] })
      )
    ).toBe(false);
  });

  it("es verdadero cuando el motor marcó un peaje que no se pudo identificar", () => {
    // El total está INCOMPLETO, no en cero: decirlo es mejor que informar un
    // número que se sabe corto.
    expect(hayPeajeSinMonto(breakdown({ peaje_uyu: 196.57, peajes_sin_tarifa: 1 }))).toBe(true);
  });

  it("es verdadero con la forma vieja del mismo problema (monto_uyu null)", () => {
    expect(hayPeajeSinMonto(breakdown({ peajes_puntos: [{ lat: -34.7, lon: -55.8, monto_uyu: null }] }))).toBe(true);
  });
});

describe("summarizeTrip", () => {
  it("cuenta los peajes de la ruta", () => {
    const s = summarizeTrip(
      VEHICULO,
      64,
      resultado(
        breakdown({
          peaje_uyu: 393.14,
          peajes_puntos: [
            { lat: -34.78, lon: -55.89, monto_uyu: 196.57 },
            { lat: -34.78, lon: -55.39, monto_uyu: 196.57 },
          ],
        })
      )
    );
    expect(s!.hasTolls).toBe(true);
    expect(s!.tollCount).toBe(2);
  });

  it("un viaje sin peajes los reporta como cero, no como desconocidos", () => {
    const s = summarizeTrip(VEHICULO, 64, resultado(breakdown()));
    expect(s!.hasTolls).toBe(false);
    expect(s!.tollCount).toBe(0);
  });
});
