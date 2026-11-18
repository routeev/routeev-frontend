import { describe, expect, it } from "vitest";
import type { RoutePoint } from "./routePoint";
import { etiquetaDeTramo, puntosDelViaje, totalParaRotular, tramosDelViaje } from "./viaje";

const punto = (name: string): RoutePoint => ({ name, lat: 0, lon: 0 });
const A = punto("A");
const P = punto("P");
const Q = punto("Q");
const B = punto("B");
const nombres = (pares: readonly (readonly [RoutePoint, RoutePoint])[]) =>
  pares.map(([d, h]) => `${d.name}>${h.name}`);

describe("puntosDelViaje", () => {
  it("pone las paradas elegidas entre el origen y el destino, y se salta las vacías", () => {
    expect(puntosDelViaje(A, [P, null, Q], B).map((p) => p.name)).toEqual(["A", "P", "Q", "B"]);
    expect(puntosDelViaje(A, [], B).map((p) => p.name)).toEqual(["A", "B"]);
  });
});

describe("tramosDelViaje", () => {
  it("sin paradas ni vuelta es un solo tramo", () => {
    expect(nombres(tramosDelViaje([A, B], false))).toEqual(["A>B"]);
  });

  it("con paradas, un tramo por cada par de puntos seguidos", () => {
    expect(nombres(tramosDelViaje([A, P, Q, B], false))).toEqual(["A>P", "P>Q", "Q>B"]);
  });

  it("ida y vuelta sin paradas: A>B y B>A", () => {
    expect(nombres(tramosDelViaje([A, B], true))).toEqual(["A>B", "B>A"]);
  });

  it("ida y vuelta con una parada vuelve por la misma parada (igual que la API)", () => {
    expect(nombres(tramosDelViaje([A, P, B], true))).toEqual(["A>P", "P>B", "B>P", "P>A"]);
  });

  it("el máximo que entra en un pedido: 4 puntos con ida y vuelta son 6 tramos", () => {
    expect(tramosDelViaje([A, P, Q, B], true)).toHaveLength(6);
    expect(tramosDelViaje([A, P, Q, B, punto("C")], false)).toHaveLength(4);
  });
});

describe("etiquetaDeTramo", () => {
  it("la ida y la vuelta de siempre no llevan número", () => {
    expect(etiquetaDeTramo(0, 2, true)).toEqual({ tipo: "ida", n: null });
    expect(etiquetaDeTramo(1, 2, true)).toEqual({ tipo: "vuelta", n: null });
  });

  it("con paradas y ida y vuelta, cada mitad numera sus tramos", () => {
    const e = [0, 1, 2, 3].map((i) => etiquetaDeTramo(i, 4, true));
    expect(e).toEqual([
      { tipo: "ida", n: 1 },
      { tipo: "ida", n: 2 },
      { tipo: "vuelta", n: 1 },
      { tipo: "vuelta", n: 2 },
    ]);
  });

  it("sin ida y vuelta, son tramos numerados desde 1", () => {
    expect(etiquetaDeTramo(0, 3, false)).toEqual({ tipo: "tramo", n: 1 });
    expect(etiquetaDeTramo(2, 3, false)).toEqual({ tipo: "tramo", n: 3 });
  });
});

describe("totalParaRotular", () => {
  it("con el viaje unido (uno, o dos con ida y vuelta) se rotula sobre los que hay: Ida y Vuelta, sin números", () => {
    // Ida y vuelta con una parada: se pidieron 4 tramos, pero hay DOS viajes.
    expect(totalParaRotular(2, true, 4)).toBe(2);
    expect(etiquetaDeTramo(0, totalParaRotular(2, true, 4), true)).toEqual({ tipo: "ida", n: null });
    expect(etiquetaDeTramo(1, totalParaRotular(2, true, 4), true)).toEqual({ tipo: "vuelta", n: null });
    expect(totalParaRotular(1, false, 3)).toBe(1);
  });

  it("con los tramos sueltos (una API anterior) se cuenta sobre los que se pidieron", () => {
    // Faltó el último tramo de una ida y vuelta con parada: los 3 que volvieron conservan su nombre.
    expect(totalParaRotular(3, true, 4)).toBe(4);
    expect(totalParaRotular(3, false, 3)).toBe(3);
  });

  it("sin el dato de los pedidos, usa los que hay", () => {
    expect(totalParaRotular(3, false, undefined)).toBe(3);
  });
});
