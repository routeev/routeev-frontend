import { describe, expect, it } from "vitest";
import { nextTripStep } from "./nextStep";

const LISTO = { vehiclesLoaded: true, hasSelectedVehicle: true, originId: 1, destinationId: 2 };

describe("nextTripStep", () => {
  it("asks for the origin first", () => {
    const step = nextTripStep({ ...LISTO, originId: null, destinationId: null });
    expect(step.done).toBe(false);
    expect(step.text).toMatch(/desde dónde salís/i);
  });

  // El pedido textual del usuario: que el panel diga "Elegí a dónde vas" en
  // lugar de una instrucción generica, cuando eso es lo que falta.
  it("asks for the destination once the origin is set", () => {
    const step = nextTripStep({ ...LISTO, destinationId: null });
    expect(step.done).toBe(false);
    expect(step.text).toMatch(/a dónde vas/i);
  });

  it("asks for a vehicle only after both points are set", () => {
    const step = nextTripStep({ ...LISTO, hasSelectedVehicle: false });
    expect(step.done).toBe(false);
    expect(step.text).toMatch(/agregá un vehículo/i);
  });

  it("does not blame the vehicle while the points are still missing", () => {
    const step = nextTripStep({ ...LISTO, hasSelectedVehicle: false, originId: null });
    expect(step.text).toMatch(/desde dónde salís/i);
  });

  it("flags origin and destination being the same point", () => {
    const step = nextTripStep({ ...LISTO, destinationId: LISTO.originId });
    expect(step.done).toBe(false);
    expect(step.text).toMatch(/mismo punto/i);
  });

  it("waits quietly while the vehicles are still loading", () => {
    const step = nextTripStep({ ...LISTO, vehiclesLoaded: false, hasSelectedVehicle: false });
    expect(step.done).toBe(false);
    expect(step.text).toMatch(/cargando tus vehículos/i);
  });

  // done es lo unico que decide si la barra de "Calcular ruta" existe en el
  // DOM (ver MapPage.tsx): tiene que ser true exactamente cuando se puede.
  it("is done only when nothing is missing", () => {
    expect(nextTripStep(LISTO).done).toBe(true);
    expect(nextTripStep(LISTO).text).toMatch(/calcular ruta/i);
  });
});
