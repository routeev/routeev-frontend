import { beforeEach, describe, expect, it } from "vitest";
import type { CompareRoutesResult } from "../api/route";
import { calculateGateMissing, useMapStore } from "./mapStore";
import { fromCoords, fromNode, pointKey, SAME_POINT_KM } from "./routePoint";

// calculateGateMissing es una función pura exportada: no necesita el store
// ni jsdom.
const MVD = { lat: -34.9055, lon: -56.1851 };
const PDE = { lat: -34.9633, lon: -54.9497 };
const LISTO = { vehiclesLoaded: true, hasSelectedVehicle: true, origin: MVD, destination: PDE };

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
