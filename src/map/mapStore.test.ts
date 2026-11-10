import { beforeEach, describe, expect, it } from "vitest";
import type { CompareRoutesResult } from "../api/route";
import type { Vehicle } from "../api/vehicles";
import { calculateGateMissing, consumoViajeKwhKm, useMapStore, vehicleForResult } from "./mapStore";
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
    expect(consumoViajeKwhKm("0,22")).toBe(0.22);
    expect(consumoViajeKwhKm("0.22")).toBe(0.22);
  });

  // NaN y no null: tratarlo como vacío calcularía con el consumo del auto sin
  // avisar, que es justo lo que la persona quiso cambiar.
  it("lo que no sirve es NaN, con los mismos límites que la API", () => {
    expect(consumoViajeKwhKm("0")).toBeNaN();
    expect(consumoViajeKwhKm("0,005")).toBeNaN();
    expect(consumoViajeKwhKm("5,1")).toBeNaN();
    expect(consumoViajeKwhKm("abc")).toBeNaN();
    expect(consumoViajeKwhKm("5")).toBe(5);
  });

  it("cambiar de auto lo vacía; volver a elegir el mismo, no", () => {
    useMapStore.getState().setConsumoViaje("0,2");
    useMapStore.getState().selectVehicle(1);
    expect(useMapStore.getState().consumoViaje).toBe("0,2");

    useMapStore.getState().selectVehicle(2);
    expect(useMapStore.getState().consumoViaje).toBe("");
  });

  it("«Cancelar» (resetTripPlanning) lo vacía: es de ese viaje", () => {
    useMapStore.getState().setConsumoViaje("0,2");
    useMapStore.getState().resetTripPlanning();
    expect(useMapStore.getState().consumoViaje).toBe("");
  });

  it("vehicleForResult usa el consumo con que se calculó la ruta", () => {
    expect(vehicleForResult(AUTO, { consumo_propio_kwh_km: 0.12 }).consumption_kwh_per_km).toBe(0.12);
    expect(vehicleForResult(AUTO, {})).toBe(AUTO);
    expect(vehicleForResult(null, { consumo_propio_kwh_km: 0.12 })).toBeNull();
  });
});
