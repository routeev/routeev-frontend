import { describe, expect, it } from "vitest";
import { buildRouteCumulative, nearestCumulativeDistance, projectOntoRoute } from "./routeProjection";

// Tramo recto de norte a sur en Montevideo, ~1.1km cada segmento.
const ROUTE: [number, number][] = [
  [-34.9, -56.16],
  [-34.91, -56.16],
  [-34.92, -56.16],
];

describe("buildRouteCumulative", () => {
  it("starts at 0 and increases monotonically", () => {
    const cum = buildRouteCumulative(ROUTE);
    expect(cum[0]).toBe(0);
    expect(cum[2]!).toBeGreaterThan(cum[1]!);
  });
});

describe("projectOntoRoute", () => {
  it("reports ~0 offset for a point exactly on the route", () => {
    const cum = buildRouteCumulative(ROUTE);
    const { offRouteM, traveledKm } = projectOntoRoute(ROUTE, cum, -34.905, -56.16);
    expect(offRouteM).toBeLessThan(5);
    expect(traveledKm).toBeGreaterThan(0);
    expect(traveledKm).toBeLessThan(cum[cum.length - 1]!);
  });

  it("reports a large offset for a point far from the route", () => {
    const cum = buildRouteCumulative(ROUTE);
    const { offRouteM } = projectOntoRoute(ROUTE, cum, -34.905, -56.2);
    expect(offRouteM).toBeGreaterThan(1000);
  });

  it("clamps progress to the start of the route for a point behind the origin", () => {
    const cum = buildRouteCumulative(ROUTE);
    const { traveledKm } = projectOntoRoute(ROUTE, cum, -34.89, -56.16);
    expect(traveledKm).toBe(0);
  });
});

describe("nearestCumulativeDistance", () => {
  it("matches the accumulated km of the nearest vertex", () => {
    const cum = buildRouteCumulative(ROUTE);
    const km = nearestCumulativeDistance(ROUTE, cum, -34.91, -56.16);
    expect(km).toBeCloseTo(cum[1]!, 5);
  });
});
