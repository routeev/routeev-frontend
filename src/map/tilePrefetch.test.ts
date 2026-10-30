import { afterEach, describe, expect, it, vi } from "vitest";
import { buildRouteCumulative } from "./routeProjection";
import { createRoutePrefetcher, LOOKAHEAD_KM, tileFor, tilesAlongRoute } from "./tilePrefetch";

// Montevideo -> ~100 km al norte, en línea recta: suficiente para que la
// ventana de precarga (LOOKAHEAD_KM) quede bien adentro de la ruta.
const RUTA: [number, number][] = [
  [-34.9, -56.19],
  [-34.45, -56.19],
  [-34.0, -56.19],
];
const CUM = buildRouteCumulative(RUTA);

describe("tileFor", () => {
  it("da el tile XYZ de siempre", () => {
    // Plaza Independencia, Montevideo, a z14 (verificado con la fórmula de OSM
    // en su forma con asinh, y contra el servidor de OpenFreeMap).
    expect(tileFor(-34.9066, -56.2001, 14)).toEqual([5634, 9889]);
  });
});

describe("tilesAlongRoute", () => {
  it("cubre el tramo pedido, empezando por lo más cercano", () => {
    const tiles = tilesAlongRoute(RUTA, CUM, 0, 10);
    expect(tiles.length).toBeGreaterThan(0);
    const [, , yPrimero] = tiles[0]!.split("/").map(Number);
    const [, , yUltimo] = tiles[tiles.length - 1]!.split("/").map(Number);
    // Hacia el norte la y de los tiles baja: el primero es el del origen.
    expect(yPrimero!).toBeGreaterThan(yUltimo!);
    expect(new Set(tiles).size).toBe(tiles.length);
  });

  it("no se pasa del final de la ruta", () => {
    const hastaElFinal = tilesAlongRoute(RUTA, CUM, 0, CUM[CUM.length - 1]!);
    const deMas = tilesAlongRoute(RUTA, CUM, 0, 10_000);
    expect(deMas).toEqual(hastaElFinal);
  });
});

describe("createRoutePrefetcher", () => {
  afterEach(() => vi.unstubAllGlobals());

  function stubFetch() {
    const fetchMock = vi.fn((url: string) =>
      Promise.resolve(
        url.endsWith("/planet")
          ? new Response(JSON.stringify({ tiles: ["https://t.test/v1/{z}/{x}/{y}.pbf"] }))
          : new Response(new ArrayBuffer(8))
      )
    );
    vi.stubGlobal("fetch", fetchMock);
    return fetchMock;
  }
  const tilesPedidos = (f: ReturnType<typeof stubFetch>) =>
    f.mock.calls.map((c) => c[0] as string).filter((u) => u.endsWith(".pbf"));

  it("pide los tiles de la ventana y nunca dos veces el mismo", async () => {
    const f = stubFetch();
    const p = createRoutePrefetcher(RUTA, CUM);

    p.advance(0);
    await vi.waitFor(() => expect(tilesPedidos(f).length).toBe(tilesAlongRoute(RUTA, CUM, 0, LOOKAHEAD_KM).length));
    p.advance(0.1); // menos de un tramo: no recalcula nada
    p.advance(5);
    await vi.waitFor(() => expect(tilesPedidos(f).length).toBe(tilesAlongRoute(RUTA, CUM, 0, 5 + LOOKAHEAD_KM).length));

    const urls = tilesPedidos(f);
    expect(new Set(urls).size).toBe(urls.length);
    expect(urls[0]).toMatch(/^https:\/\/t\.test\/v1\/14\/\d+\/\d+\.pbf$/);
  });

  it("con Save-Data no pide nada", async () => {
    const f = stubFetch();
    vi.stubGlobal("navigator", { ...navigator, connection: { saveData: true } });
    createRoutePrefetcher(RUTA, CUM).advance(0);
    await new Promise((r) => setTimeout(r, 0));
    expect(f).not.toHaveBeenCalled();
  });

  it("después de stop no pide más", async () => {
    const f = stubFetch();
    const p = createRoutePrefetcher(RUTA, CUM);
    p.stop();
    p.advance(0);
    await new Promise((r) => setTimeout(r, 0));
    expect(tilesPedidos(f)).toEqual([]);
  });
});
