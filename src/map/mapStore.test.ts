import { beforeEach, describe, expect, it } from "vitest";
import type { CompareRoutesResult } from "../api/route";
import type { Vehicle } from "../api/vehicles";
import {
  calculateGateMissing,
  consumoViajeKwhKm,
  MAX_PARADAS,
  MAX_PARADAS_IDA_Y_VUELTA,
  tramoActivo,
  useMapStore,
  vehicleForResult,
} from "./mapStore";
import { fromCoords, fromNode, pointKey, SAME_POINT_KM, suggestedName } from "./routePoint";

// calculateGateMissing es una función pura exportada: no necesita el store
// ni jsdom.
const MVD = { lat: -34.9055, lon: -56.1851 };
const PDE = { lat: -34.9633, lon: -54.9497 };
const LISTO = { vehiclesLoaded: true, hasSelectedVehicle: true, origin: MVD, destination: PDE, chargerAnswered: true };

describe("calculateGateMissing", () => {
  it("no reporta nada cuando están los dos puntos y el vehículo", () => {
    expect(calculateGateMissing(LISTO)).toEqual([]);
  });

  it("pide un origen cuando falta", () => {
    expect(calculateGateMissing({ ...LISTO, origin: null })).toContain("fijá un origen");
  });

  it("pide un destino cuando falta", () => {
    expect(calculateGateMissing({ ...LISTO, destination: null })).toContain("fijá un destino");
  });

  // La regla dejó de ser "el mismo id" y pasó a ser "más cerca que 50 m":
  // con coordenadas crudas dos toques nunca dan el mismo valor exacto.
  it("rechaza dos puntos a menos de SAME_POINT_KM", () => {
    const aTreintaMetros = { lat: MVD.lat, lon: MVD.lon + 0.0003 };
    expect(calculateGateMissing({ ...LISTO, destination: aTreintaMetros })).toContain(
      "origen y destino están demasiado cerca"
    );
  });

  // El otro lado del umbral: dos puntos cercanos pero distintos son un viaje
  // legítimo. Sin este caso, un umbral demasiado grande pasaría inadvertido.
  it("acepta dos intersecciones adyacentes (~91 m), que son un viaje real", () => {
    const aUnaCuadra = { lat: MVD.lat, lon: MVD.lon + 0.001 };
    expect(calculateGateMissing({ ...LISTO, destination: aUnaCuadra })).not.toContain(
      "origen y destino están demasiado cerca"
    );
  });

  // 50 m y no 100: dos intersecciones reales y adyacentes del centro de
  // Montevideo estan a ~85-100 m y son un viaje legitimo.
  it("SAME_POINT_KM es 50 m", () => {
    expect(SAME_POINT_KM).toBe(0.05);
  });

  it("avisa que faltan vehículos sin culpar al vehículo antes de tiempo", () => {
    expect(calculateGateMissing({ ...LISTO, vehiclesLoaded: false, hasSelectedVehicle: false })).toContain(
      "cargando vehículos..."
    );
    expect(calculateGateMissing({ ...LISTO, hasSelectedVehicle: false })).toContain("elegí o creá un vehículo");
  });

  it("no deja calcular sin responder si hay dónde cargar en el destino", () => {
    expect(calculateGateMissing({ ...LISTO, chargerAnswered: false })).toContain(
      "respondé si podés cargar en el destino"
    );
  });
});

describe("cargadorEnDestino", () => {
  beforeEach(() => useMapStore.getState().resetTripPlanning());

  it("arranca sin responder, y vuelve a sin responder al cancelar el plan", () => {
    expect(useMapStore.getState().cargadorEnDestino).toBeNull();
    useMapStore.getState().setCargadorEnDestino(false);
    useMapStore.getState().resetTripPlanning();
    expect(useMapStore.getState().cargadorEnDestino).toBeNull();
  });
});

describe("clearResult", () => {
  beforeEach(() => useMapStore.getState().resetTripPlanning());

  it("suelta la ruta calculada pero deja origen, destino y respuestas", () => {
    const s = useMapStore.getState();
    s.setOrigin(fromCoords(MVD.lat, MVD.lon));
    s.setDestination(fromCoords(PDE.lat, PDE.lon));
    s.setCargadorEnDestino(false);
    s.setLastResult({ astar: { found: true } } as unknown as CompareRoutesResult, null);

    useMapStore.getState().clearResult();

    const after = useMapStore.getState();
    expect(after.lastResult).toBeNull();
    expect(after.originNode).not.toBeNull();
    expect(after.destinationNode).not.toBeNull();
    expect(after.cargadorEnDestino).toBe(false);
  });
});

describe("swapEnds", () => {
  // El store es un singleton de módulo: cada caso arranca del estado limpio
  // que MapPage también usa al montar.
  beforeEach(() => useMapStore.getState().resetTripPlanning());

  const origen = fromCoords(-34.9055, -56.1851);
  const destino = fromCoords(-34.9633, -54.9497);

  it("intercambia los dos puntos y sube las dos revisiones", () => {
    const s = useMapStore.getState();
    s.setOrigin(origen);
    s.setDestination(destino);
    const antes = useMapStore.getState();

    antes.swapEnds();

    const despues = useMapStore.getState();
    expect(despues.originNode).toBe(destino);
    expect(despues.destinationNode).toBe(origen);
    // Las revisiones son lo que hace que cada campo suelte el texto tipeado
    // y muestre el nombre del punto que le llegó del otro rol.
    expect(despues.originRevision).toBe(antes.originRevision + 1);
    expect(despues.destinationRevision).toBe(antes.destinationRevision + 1);
  });

  it("mueve un único punto al otro rol y apunta el próximo toque al hueco", () => {
    useMapStore.getState().setOrigin(origen);
    useMapStore.getState().swapEnds();

    const s = useMapStore.getState();
    expect(s.originNode).toBeNull();
    expect(s.destinationNode).toBe(origen);
    // El hueco quedó en el origen: el próximo toque del mapa va ahí, no a
    // pisar el punto recién movido.
    expect(s.pickMode).toBe("origin");
  });

  it("con los dos vacíos no hace nada", () => {
    const antes = useMapStore.getState();
    antes.swapEnds();
    const despues = useMapStore.getState();
    expect(despues.originRevision).toBe(antes.originRevision);
    expect(despues.destinationRevision).toBe(antes.destinationRevision);
  });

  it("invalida la ruta ya calculada: la ida no es la vuelta", () => {
    const s = useMapStore.getState();
    s.setOrigin(origen);
    s.setDestination(destino);
    // Solo la forma que el swap tiene que limpiar: el contenido no se lee.
    s.setLastResult({ origin: { name: "a" }, destination: { name: "b" } } as CompareRoutesResult, {
      plan_id: "p1",
      origin_name: "a",
      destination_name: "b",
    });

    s.swapEnds();

    expect(useMapStore.getState().lastResult).toBeNull();
    expect(useMapStore.getState().lastRoutePayload).toBeNull();
  });
});

describe("routePoint", () => {
  it("un toque en el mapa se nombra con su coordenada hasta que llegue la calle", () => {
    const p = fromCoords(-34.9055, -56.1851);
    expect(p.name).toBe("-34.9055, -56.1851");
    expect(p.lat).toBe(-34.9055);
    expect(p.lon).toBe(-56.1851);
  });

  it("con etiqueta, muestra la etiqueta y no la coordenada, y no la sugiere al guardar", () => {
    const p = fromCoords(-34.8859, -56.0962, "Tu ubicación");
    expect(p.name).toBe("Tu ubicación");
    expect(suggestedName(p)).toBeUndefined();
  });

  it("cuando llega el nombre de la calle, deja de ser provisorio y se sugiere", () => {
    const s = useMapStore.getState();
    s.setOrigin(fromCoords(-34.8859, -56.0962, "Punto en el mapa"));
    s.annotateName("origin", pointKey(-34.8859, -56.0962), "Avenida Italia, Montevideo");

    const origen = useMapStore.getState().originNode!;
    expect(origen.name).toBe("Avenida Italia, Montevideo");
    expect(suggestedName(origen)).toBe("Avenida Italia, Montevideo");
  });

  it("un punto del autocompletado ya viene nombrado", () => {
    const p = fromNode({ id: "n42", name: "18 de Julio y Rivera", lat: -34.9, lon: -56.18 });
    expect(p.name).toBe("18 de Julio y Rivera");
    // Un punto es una coordenada y un nombre: el id del grafo no viaja con él.
    // Lo único que lo necesitaba era log-trip v1.
    expect("snapId" in p).toBe(false);
  });

  // pointKey es lo que descarta la respuesta de un nombrado viejo: dos toques
  // distintos NO pueden compartir clave.
  it("distingue dos toques separados por menos de un metro", () => {
    expect(pointKey(-34.9055, -56.1851)).not.toBe(pointKey(-34.905509, -56.1851));
  });

  it("da la misma clave para el mismo punto", () => {
    expect(pointKey(-34.9055, -56.1851)).toBe(pointKey(-34.9055, -56.1851));
  });
});

describe("consumo propio del viaje", () => {
  const AUTO = {
    id: 1,
    name: "Auto",
    battery_capacity_kwh: 60,
    consumption_kwh_per_km: 0.18,
    charging_power_kw: 50,
  } as Vehicle;

  beforeEach(() => {
    const s = useMapStore.getState();
    s.resetTripPlanning();
    s.setVehicles([AUTO, { ...AUTO, id: 2, name: "Otro" }]);
    s.selectVehicle(1);
  });

  it("lee el campo con coma o con punto, y vacío es usar el del auto", () => {
    expect(consumoViajeKwhKm("")).toBeNull();
    expect(consumoViajeKwhKm("  ")).toBeNull();
    // La persona escribe kWh cada 100 km; sale en kWh/km, lo que habla la API.
    expect(consumoViajeKwhKm("22")).toBe(0.22);
    expect(consumoViajeKwhKm("22,5")).toBe(0.225);
    expect(consumoViajeKwhKm("22.5")).toBe(0.225);
  });

  // NaN y no null: tratarlo como vacío calcularía con el consumo del auto sin
  // avisar, que es justo lo que la persona quiso cambiar.
  it("lo que no sirve es NaN, con los mismos límites que la API", () => {
    expect(consumoViajeKwhKm("0")).toBeNaN();
    expect(consumoViajeKwhKm("0,5")).toBeNaN();
    expect(consumoViajeKwhKm("500,1")).toBeNaN();
    expect(consumoViajeKwhKm("abc")).toBeNaN();
    expect(consumoViajeKwhKm("1")).toBe(0.01);
    expect(consumoViajeKwhKm("500")).toBe(5);
  });

  it("cambiar de auto lo vacía; volver a elegir el mismo, no", () => {
    useMapStore.getState().setConsumoViaje("20");
    useMapStore.getState().selectVehicle(1);
    expect(useMapStore.getState().consumoViaje).toBe("20");

    useMapStore.getState().selectVehicle(2);
    expect(useMapStore.getState().consumoViaje).toBe("");
  });

  it("«Cancelar» (resetTripPlanning) lo vacía: es de ese viaje", () => {
    useMapStore.getState().setConsumoViaje("20");
    useMapStore.getState().resetTripPlanning();
    expect(useMapStore.getState().consumoViaje).toBe("");
  });

  it("vehicleForResult usa el consumo con que se calculó la ruta", () => {
    expect(vehicleForResult(AUTO, { consumo_propio_kwh_km: 0.12 }).consumption_kwh_per_km).toBe(0.12);
    expect(vehicleForResult(AUTO, {})).toBe(AUTO);
    expect(vehicleForResult(null, { consumo_propio_kwh_km: 0.12 })).toBeNull();
  });
});

describe("viaje de varios tramos (ida y vuelta)", () => {
  const resultado = (origen: string, destino: string) =>
    ({ origin: { name: origen }, destination: { name: destino }, astar: { found: true } }) as unknown as CompareRoutesResult;
  const RESUMEN = {
    completo: true,
    tramos_pedidos: 2,
    tramos_calculados: 2,
    tiempo_total_min: 300,
    energia_kwh: 80,
    costo_uyu_total: 1500,
    recargas: 2,
    bateria_llegada_kwh: 12,
    bateria_llegada_pct: 20,
  };
  const ida = { result: resultado("A", "B"), payload: { plan_id: "p1", origin_name: "A", destination_name: "B" } };
  const vuelta = { result: resultado("B", "A"), payload: { plan_id: "p2", origin_name: "B", destination_name: "A" } };

  beforeEach(() => useMapStore.getState().resetTripPlanning());

  it("guardar los tramos deja el primero a la vista, con su plan_id", () => {
    useMapStore.getState().setTramos([ida, vuelta], RESUMEN);

    const s = useMapStore.getState();
    expect(s.lastResult).toBe(ida.result);
    expect(s.lastRoutePayload?.plan_id).toBe("p1");
    expect(tramoActivo(s.tramos, s.lastResult)).toBe(0);
  });

  it("cambiar de tramo cambia lo que ve (y lo que se inicia) sin tocar el resto", () => {
    useMapStore.getState().setTramos([ida, vuelta], RESUMEN);

    useMapStore.getState().selectTramo(1);

    const s = useMapStore.getState();
    expect(s.lastResult).toBe(vuelta.result);
    expect(s.lastRoutePayload?.plan_id).toBe("p2");
    expect(tramoActivo(s.tramos, s.lastResult)).toBe(1);
    // Un tramo que no existe no cambia nada.
    s.selectTramo(5);
    expect(useMapStore.getState().lastResult).toBe(vuelta.result);
  });

  it("si el resultado se limpia, los tramos guardados dejan de valer", () => {
    useMapStore.getState().setTramos([ida, vuelta], RESUMEN);

    useMapStore.getState().clearResult();

    const s = useMapStore.getState();
    expect(tramoActivo(s.tramos, s.lastResult)).toBe(-1);
  });

  it("pasar de solo ida a ida y vuelta invalida la ruta calculada, como cambiar el modo", () => {
    useMapStore.getState().setLastResult(resultado("A", "B"), null);

    useMapStore.getState().setIdaYVuelta(true);

    expect(useMapStore.getState().idaYVuelta).toBe(true);
    expect(useMapStore.getState().lastResult).toBeNull();
    // Elegir lo mismo que ya estaba no la borra.
    useMapStore.getState().setLastResult(resultado("A", "B"), null);
    useMapStore.getState().setIdaYVuelta(true);
    expect(useMapStore.getState().lastResult).not.toBeNull();
  });

  it("empezar un viaje nuevo vuelve a solo ida y suelta los tramos", () => {
    useMapStore.getState().setIdaYVuelta(true);
    useMapStore.getState().setTramos([ida, vuelta], RESUMEN);

    useMapStore.getState().resetTripPlanning();

    const s = useMapStore.getState();
    expect(s.idaYVuelta).toBe(false);
    expect(s.tramos).toBeNull();
    expect(s.resumenViaje).toBeNull();
  });
});

describe("paradas intermedias", () => {
  const DURAZNO = { name: "Durazno", lat: -33.38, lon: -56.52 };
  const TACUAREMBO = { name: "Tacuarembó", lat: -31.71, lon: -55.98 };
  const resultado = { astar: { found: true } } as unknown as CompareRoutesResult;

  beforeEach(() => useMapStore.getState().resetTripPlanning());

  it("agregar una parada deja un lugar vacío y respeta el máximo", () => {
    for (let i = 0; i < MAX_PARADAS + 2; i++) useMapStore.getState().addParada();

    const { paradas } = useMapStore.getState();
    expect(paradas).toHaveLength(MAX_PARADAS);
    expect(paradas.every((p) => p.point == null)).toBe(true);
    expect(new Set(paradas.map((p) => p.key)).size).toBe(MAX_PARADAS);
  });

  it("con ida y vuelta entran menos paradas: la vuelta pasa por las mismas", () => {
    useMapStore.getState().setIdaYVuelta(true);
    for (let i = 0; i < MAX_PARADAS; i++) useMapStore.getState().addParada();

    expect(useMapStore.getState().paradas).toHaveLength(MAX_PARADAS_IDA_Y_VUELTA);
  });

  it("no se puede pasar a ida y vuelta con más paradas de las que entran", () => {
    for (let i = 0; i < MAX_PARADAS_IDA_Y_VUELTA + 1; i++) useMapStore.getState().addParada();

    useMapStore.getState().setIdaYVuelta(true);

    expect(useMapStore.getState().idaYVuelta).toBe(false);
  });

  it("elegir una parada guarda el punto, sube su revisión y suelta la ruta calculada", () => {
    useMapStore.getState().addParada();
    const { key } = useMapStore.getState().paradas[0]!;
    useMapStore.getState().setLastResult(resultado, null);

    useMapStore.getState().setParada(key, DURAZNO);

    const p = useMapStore.getState().paradas[0]!;
    expect(p.point).toEqual(DURAZNO);
    expect(p.revision).toBe(1);
    expect(useMapStore.getState().lastResult).toBeNull();
  });

  it("volver a elegir el mismo lugar no suelta la ruta, pero sí sube la revisión", () => {
    useMapStore.getState().addParada();
    const { key } = useMapStore.getState().paradas[0]!;
    useMapStore.getState().setParada(key, DURAZNO);
    useMapStore.getState().setLastResult(resultado, null);

    useMapStore.getState().setParada(key, { ...DURAZNO });

    expect(useMapStore.getState().lastResult).toBe(resultado);
    expect(useMapStore.getState().paradas[0]!.revision).toBe(2);
  });

  it("sacar una parada elegida suelta la ruta; sacar una vacía no", () => {
    useMapStore.getState().addParada();
    useMapStore.getState().addParada();
    const [vacia, elegida] = useMapStore.getState().paradas;
    useMapStore.getState().setParada(elegida!.key, DURAZNO);
    useMapStore.getState().setLastResult(resultado, null);

    useMapStore.getState().removeParada(vacia!.key);
    expect(useMapStore.getState().lastResult).toBe(resultado);

    useMapStore.getState().removeParada(elegida!.key);
    expect(useMapStore.getState().paradas).toHaveLength(0);
    expect(useMapStore.getState().lastResult).toBeNull();
  });

  it("invertir el viaje invierte el orden de las paradas, y cada una conserva su llave", () => {
    useMapStore.getState().setOrigin(fromCoords(-34.9, -56.18));
    useMapStore.getState().setDestination(fromCoords(-30.9, -55.55));
    useMapStore.getState().addParada();
    useMapStore.getState().addParada();
    const [a, b] = useMapStore.getState().paradas;
    useMapStore.getState().setParada(a!.key, DURAZNO);
    useMapStore.getState().setParada(b!.key, TACUAREMBO);

    useMapStore.getState().swapEnds();

    const despues = useMapStore.getState().paradas;
    expect(despues.map((p) => p.point?.name)).toEqual(["Tacuarembó", "Durazno"]);
    expect(despues.map((p) => p.key)).toEqual([b!.key, a!.key]);
  });

  it("empezar un viaje nuevo vacía las paradas", () => {
    useMapStore.getState().addParada();

    useMapStore.getState().resetTripPlanning();

    expect(useMapStore.getState().paradas).toEqual([]);
  });

  it("una parada sin elegir impide calcular", () => {
    const listo = {
      vehiclesLoaded: true,
      hasSelectedVehicle: true,
      origin: { lat: -34.9, lon: -56.18 },
      destination: { lat: -30.9, lon: -55.55 },
      chargerAnswered: true,
    };
    expect(calculateGateMissing(listo)).toEqual([]);
    expect(calculateGateMissing({ ...listo, paradasSinPunto: 1 })).toEqual(["elegí las paradas o quitalas"]);
  });
});
