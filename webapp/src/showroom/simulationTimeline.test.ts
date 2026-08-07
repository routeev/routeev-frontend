import { describe, expect, it } from "vitest";
import type { Parada, RouteTramo, SimulateResult } from "../api/showroom";
import { acumular, armarSegmentos, armarTramos, cumKmDePunto, puntoEnKm, segmentoEnTiempo } from "./simulationTimeline";

const IDA_COORDS: [number, number][] = [
  [-34.9, -56.16],
  [-34.5, -56.0],
  [-34.0, -55.8],
];

function tramo(overrides: Partial<RouteTramo> = {}): RouteTramo {
  return {
    tramo: "ida",
    distancia_km: 100,
    conduccion_min: 60,
    trafico_min: 5,
    recarga_min: 0,
    costo_uyu_total: 500,
    costo_uyu_energia: 500,
    energia_kwh: 20,
    route_coords: IDA_COORDS,
    ...overrides,
  };
}

function parada(overrides: Partial<Parada> = {}): Parada {
  return {
    nombre: "Estación X",
    minutos: 20,
    kwh: 15,
    potencia_kw: 50,
    lat: -34.5,
    lon: -56.0,
    tramo: "ida",
    ...overrides,
  };
}

describe("acumular", () => {
  it("starts at 0 and is monotonically increasing", () => {
    const cum = acumular(IDA_COORDS);
    expect(cum[0]).toBe(0);
    expect(cum[1]!).toBeGreaterThan(0);
    expect(cum[2]!).toBeGreaterThan(cum[1]!);
  });
});

describe("puntoEnKm", () => {
  it("returns the first point at km 0", () => {
    const cum = acumular(IDA_COORDS);
    expect(puntoEnKm(IDA_COORDS, cum, 0)).toEqual(IDA_COORDS[0]);
  });

  it("returns the last point at or beyond the total distance", () => {
    const cum = acumular(IDA_COORDS);
    const total = cum[cum.length - 1]!;
    expect(puntoEnKm(IDA_COORDS, cum, total + 50)).toEqual(IDA_COORDS[IDA_COORDS.length - 1]);
  });

  it("interpolates strictly between two points mid-segment", () => {
    const cum = acumular(IDA_COORDS);
    const [lat] = puntoEnKm(IDA_COORDS, cum, cum[1]! / 2);
    expect(lat).toBeGreaterThan(IDA_COORDS[0]![0]);
    expect(lat).toBeLessThan(IDA_COORDS[1]![0]);
  });
});

describe("cumKmDePunto", () => {
  it("finds the accumulated km of the nearest route point", () => {
    const cum = acumular(IDA_COORDS);
    const km = cumKmDePunto(IDA_COORDS, cum, -34.5, -56.0);
    expect(km).toBeCloseTo(cum[1]!, 5);
  });
});

describe("armarTramos + armarSegmentos", () => {
  it("builds a monotonic timeline that ends with a full battery-consistent trip", () => {
    const resultado: SimulateResult = {
      llega: true,
      tiempo_total_min: 90,
      bateria_llegada_pct: 40,
      costo_uyu: 500,
      detalle: { distancia_km: 100, conduccion_min: 60, trafico_min: 5, recarga_min: 20, energia_kwh: 20, costo_uyu_energia: 500, peaje_uyu: 0, tramos: [tramo()] },
      paradas: [parada()],
    };

    const tramosInfo = armarTramos(resultado);
    expect(tramosInfo).toHaveLength(1);
    expect(tramosInfo[0]!.paradas).toHaveLength(1);

    const capacidadKwh = 50;
    const bateriaInicialKwh = capacidadKwh; // sale con 100%
    const { segments, totalMs, totalKm } = armarSegmentos(tramosInfo, bateriaInicialKwh);

    expect(segments.length).toBeGreaterThan(0);
    expect(totalMs).toBeGreaterThan(0);
    expect(totalKm).toBeCloseTo(tramosInfo[0]!.totalKm, 5);

    // startMs es estrictamente creciente y contiguo (sin huecos ni solapes).
    let acc = 0;
    for (const s of segments) {
      expect(s.startMs).toBeCloseTo(acc, 5);
      acc += s.durationMs;
    }
    expect(acc).toBeCloseTo(totalMs, 5);

    // Hay exactamente un segmento de carga (una parada) y el resto son drive.
    expect(segments.filter((s) => s.type === "charge")).toHaveLength(1);

    // El progreso al final del ultimo segmento cae en el destino real.
    const { seg, p } = segmentoEnTiempo(segments, totalMs);
    expect(p).toBe(1);
    expect(seg).toBe(segments[segments.length - 1]);
  });

  it("splits drive time proportionally to distance across two legs", () => {
    const resultado: SimulateResult = {
      llega: true,
      tiempo_total_min: 120,
      bateria_llegada_pct: 50,
      costo_uyu: 800,
      detalle: {
        distancia_km: 200,
        conduccion_min: 100,
        trafico_min: 10,
        recarga_min: 0,
        energia_kwh: 40,
        costo_uyu_energia: 800,
        peaje_uyu: 0,
        tramos: [tramo({ tramo: "ida" }), tramo({ tramo: "vuelta" })],
      },
      paradas: [],
    };

    const tramosInfo = armarTramos(resultado);
    const { segments } = armarSegmentos(tramosInfo, 50);

    // Dos tramos sin paradas: drive(ida) + turn + drive(vuelta).
    expect(segments.map((s) => s.type)).toEqual(["drive", "turn", "drive"]);
  });
});
