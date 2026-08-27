import { describe, expect, it } from "vitest";
import { calculateGateMissing } from "./mapStore";
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

describe("routePoint", () => {
  it("un toque en el mapa nace sin nodo del grafo", () => {
    const p = fromCoords(-34.9055, -56.1851);
    expect(p.snapId).toBeNull();
    // El nombre provisorio es la coordenada, hasta que llegue el snap.
    expect(p.name).toBe("-34.9055, -56.1851");
  });

  it("un nodo del autocompletado nace con su id puesto", () => {
    const p = fromNode({ id: "n42", name: "18 de Julio y Rivera", lat: -34.9, lon: -56.18 });
    expect(p.snapId).toBe("n42");
    expect(p.name).toBe("18 de Julio y Rivera");
  });

  // pointKey es lo que descarta la respuesta de un snap viejo: dos toques
  // distintos NO pueden compartir clave.
  it("distingue dos toques separados por menos de un metro", () => {
    expect(pointKey(-34.9055, -56.1851)).not.toBe(pointKey(-34.905509, -56.1851));
  });

  it("da la misma clave para el mismo punto", () => {
    expect(pointKey(-34.9055, -56.1851)).toBe(pointKey(-34.9055, -56.1851));
  });
});
