import { describe, expect, it } from "vitest";
import type { RouteResult } from "../api/route";
import { certaintyPointsFromRoute } from "./historyCertainty";

const COORDS: [number, number][] = [
  [-34.9, -56.16],
  [-34.5, -56.0],
  [-34.0, -55.8],
];

function route(overrides: Partial<RouteResult> = {}): RouteResult {
  return {
    found: true,
    route_coords: COORDS,
    route: ["n1", "n2", "n3"],
    node_coords: COORDS,
    breakdown: {
      energia_kwh: 20,
      tiempo_min: 60,
      trafico_min: 5,
      recarga_min: 0,
      peaje: 0,
      peaje_uyu: 0,
      costo_uyu_energia: 500,
      costo_uyu_total: 500,
    },
    recharges: [],
    ...overrides,
  };
}

describe("certaintyPointsFromRoute", () => {
  it("returns an empty profile when the route was not found", () => {
    expect(certaintyPointsFromRoute(route({ found: false }), 50, 50)).toEqual([]);
  });

  it("returns an empty profile without a known battery capacity", () => {
    expect(certaintyPointsFromRoute(route(), 50, 0)).toEqual([]);
  });

  it("drops monotonically from start to destination without recharges", () => {
    const points = certaintyPointsFromRoute(route(), 50, 50);
    expect(points).toHaveLength(2);
    expect(points[0]!.km).toBe(0);
    expect(points[0]!.batteryPct).toBe(100);
    expect(points[1]!.batteryPct).toBeLessThan(points[0]!.batteryPct);
  });

  it("adds a vertical jump at each recharge stop", () => {
    const points = certaintyPointsFromRoute(
      route({ recharges: [{ node_id: "n2", added_kwh: 15, time_min: 20, station_name: "Estación X" }] }),
      50,
      50
    );

    const stop = points.find((p) => p.chargeStop);
    expect(stop).toBeDefined();
    expect(stop!.label).toBe("Estación X");

    // El par de puntos de la recarga comparte km (salto vertical) y sube.
    const stopIdx = points.findIndex((p) => p.chargeStop);
    expect(points[stopIdx - 1]!.km).toBeCloseTo(points[stopIdx]!.km, 5);
    expect(points[stopIdx]!.batteryPct).toBeGreaterThan(points[stopIdx - 1]!.batteryPct);
  });

  it("clamps battery percentage into 0-100 when the trip overdraws the battery", () => {
    const points = certaintyPointsFromRoute(route({ breakdown: { ...route().breakdown, energia_kwh: 999 } }), 50, 50);
    for (const p of points) {
      expect(p.batteryPct).toBeGreaterThanOrEqual(0);
      expect(p.batteryPct).toBeLessThanOrEqual(100);
    }
  });
});
