import { describe, expect, it } from "vitest";
import type { CompareRoutesResultV2, PlanMultipleResult } from "../api/route";
import type { RoutePoint } from "./routePoint";
import { tramosDeLaRespuesta } from "./viajeUnido";

const punto = (name: string): RoutePoint => ({ name, lat: 0, lon: 0 });
const A = punto("Montevideo");
const P = punto("Durazno");
const B = punto("Rivera");

const plan = (id: string | null): CompareRoutesResultV2 =>
  ({
    plan_id: id,
    modo: "eficiente",
    paradas: [],
    astar: { found: true, route_coords: [[0, 0]], breakdown: {}, recharges: [] },
    dijkstra: null,
  }) as unknown as CompareRoutesResultV2;

const RESUMEN = {
  completo: true,
  tramos_pedidos: 2,
  tramos_calculados: 2,
  tiempo_total_min: 0,
  energia_kwh: 0,
  costo_uyu_total: 0,
  recargas: 0,
  bateria_llegada_kwh: null,
  bateria_llegada_pct: null,
};

const nombres = (t: ReturnType<typeof tramosDeLaRespuesta>) =>
  t.map((x) => `${x.result.origin.name}>${x.result.destination.name}`);

describe("tramosDeLaRespuesta", () => {
  it("con el viaje unido, un viaje con paradas es UNO, de punta a punta, con el plan_id del unido", () => {
    const multiple: PlanMultipleResult = {
      ida_y_vuelta: false,
      tramos: [plan("t0"), plan("t1")],
      resumen: RESUMEN,
      viajes: [{ sentido: "viaje", tramos: [0, 1], completo: true, plan: plan("unido") }],
    };

    const t = tramosDeLaRespuesta(multiple, [A, P, B], false);

    expect(nombres(t)).toEqual(["Montevideo>Rivera"]);
    expect(t[0]!.payload).toEqual({ plan_id: "unido", origin_name: "Montevideo", destination_name: "Rivera" });
  });

  it("con ida y vuelta y una parada, son DOS viajes: la ida de punta a punta y la vuelta de punta a punta", () => {
    const multiple: PlanMultipleResult = {
      ida_y_vuelta: true,
      tramos: [plan("t0"), plan("t1"), plan("t2"), plan("t3")],
      resumen: { ...RESUMEN, tramos_pedidos: 4 },
      viajes: [
        { sentido: "ida", tramos: [0, 1], completo: true, plan: plan("ida") },
        { sentido: "vuelta", tramos: [2, 3], completo: true, plan: plan("vuelta") },
      ],
    };

    const t = tramosDeLaRespuesta(multiple, [A, P, B], true);

    expect(nombres(t)).toEqual(["Montevideo>Rivera", "Rivera>Montevideo"]);
    expect(t.map((x) => x.payload?.plan_id)).toEqual(["ida", "vuelta"]);
  });

  it("un sentido incompleto lleva su nombre de lo que se calculó: la ida llega hasta donde llegó", () => {
    const multiple: PlanMultipleResult = {
      ida_y_vuelta: false,
      tramos: [plan("t0"), plan(null)],
      resumen: { ...RESUMEN, completo: false, tramos_calculados: 1 },
      viajes: [{ sentido: "viaje", tramos: [0], completo: false, plan: plan("unido") }],
    };

    expect(nombres(tramosDeLaRespuesta(multiple, [A, P, B], false))).toEqual(["Montevideo>Durazno"]);
  });

  it("sin el viaje unido (una API anterior) cada tramo es uno, como antes", () => {
    const multiple: PlanMultipleResult = { ida_y_vuelta: false, tramos: [plan("t0"), plan("t1")], resumen: RESUMEN };

    const t = tramosDeLaRespuesta(multiple, [A, P, B], false);

    expect(nombres(t)).toEqual(["Montevideo>Durazno", "Durazno>Rivera"]);
    expect(t.map((x) => x.payload?.plan_id)).toEqual(["t0", "t1"]);
  });

  it("un tramo sin plan_id (sin ruta) no lleva payload, y el consumo propio va en el resultado", () => {
    const multiple: PlanMultipleResult = {
      ida_y_vuelta: false,
      tramos: [plan(null)],
      resumen: RESUMEN,
      viajes: [{ sentido: "viaje", tramos: [0], completo: false, plan: plan(null) }],
    };

    const t = tramosDeLaRespuesta(multiple, [A, B], false, 0.2);

    expect(t[0]!.payload).toBeNull();
    expect(t[0]!.result.consumo_propio_kwh_km).toBe(0.2);
  });
});
