import { describe, expect, it } from "vitest";
import { map } from "../i18n/dictionaries/es/map";
import { nextTripStep } from "./nextStep";

// Montevideo y Punta del Este: dos puntos reales bien separados.
const MVD = { lat: -34.9055, lon: -56.1851 };
const PDE = { lat: -34.9633, lon: -54.9497 };
const LISTO = { vehiclesLoaded: true, hasSelectedVehicle: true, origin: MVD, destination: PDE, chargerAnswered: true };
const t = map.nextStep;

describe("nextTripStep", () => {
  it("asks for the origin first", () => {
    const step = nextTripStep({ ...LISTO, origin: null, destination: null }, t);
    expect(step.done).toBe(false);
    expect(step.text).toMatch(/desde dónde salís/i);
  });

  // El pedido textual del usuario: que el panel diga "Elegí a dónde vas" en
  // lugar de una instrucción generica, cuando eso es lo que falta.
  it("asks for the destination once the origin is set", () => {
    const step = nextTripStep({ ...LISTO, destination: null }, t);
    expect(step.done).toBe(false);
    expect(step.text).toMatch(/a dónde vas/i);
  });

  it("asks for a vehicle only after both points are set", () => {
    const step = nextTripStep({ ...LISTO, hasSelectedVehicle: false }, t);
    expect(step.done).toBe(false);
    expect(step.text).toMatch(/agregá un auto/i);
  });

  it("does not blame the vehicle while the points are still missing", () => {
    const step = nextTripStep({ ...LISTO, hasSelectedVehicle: false, origin: null }, t);
    expect(step.text).toMatch(/desde dónde salís/i);
  });

  // Ya no es "el mismo id" sino "mas cerca que SAME_POINT_KM" (50 m):
  // con coordenadas crudas dos toques nunca dan el mismo valor exacto.
  it("flags origin and destination being too close together", () => {
    const aTreintaMetros = { lat: MVD.lat, lon: MVD.lon + 0.0003 };
    const step = nextTripStep({ ...LISTO, destination: aTreintaMetros }, t);
    expect(step.done).toBe(false);
    expect(step.text).toMatch(/demasiado cerca/i);
  });

  // Control del umbral por el otro lado: dos puntos cercanos pero a mas de
  // 50 m son un viaje legitimo y NO tienen que disparar la regla.
  it("does not flag two adjacent intersections (~91 m), a real trip", () => {
    const aUnaCuadra = { lat: MVD.lat, lon: MVD.lon + 0.001 };
    const step = nextTripStep({ ...LISTO, destination: aUnaCuadra }, t);
    expect(step.text).not.toMatch(/demasiado cerca/i);
  });

  it("waits quietly while the vehicles are still loading", () => {
    const step = nextTripStep({ ...LISTO, vehiclesLoaded: false, hasSelectedVehicle: false }, t);
    expect(step.done).toBe(false);
    expect(step.text).toMatch(/cargando tus vehículos/i);
  });

  // La pregunta del cargador en el destino ya no tiene respuesta por defecto
  // (ver cargadorEnDestino en mapStore.ts): sin contestarla no se calcula.
  it("asks about charging at the destination after the vehicle", () => {
    const step = nextTripStep({ ...LISTO, chargerAnswered: false }, t);
    expect(step.done).toBe(false);
    expect(step.text).toMatch(/dónde cargar al llegar/i);
    expect(nextTripStep({ ...LISTO, chargerAnswered: false, hasSelectedVehicle: false }, t).text).toMatch(/un auto/i);
  });

  it("numbers the steps for the circle next to the text", () => {
    expect(nextTripStep({ ...LISTO, origin: null, destination: null }, t).num).toBe(1);
    expect(nextTripStep({ ...LISTO, destination: null }, t).num).toBe(2);
    expect(nextTripStep({ ...LISTO, chargerAnswered: false }, t).num).toBe(3);
    expect(nextTripStep(LISTO, t).num).toBe(4);
  });

  // done es lo unico que decide si el pie de "Calcular ruta" existe en el DOM
  // (ver PlanView.tsx): tiene que ser true exactamente cuando se puede.
  it("is done only when nothing is missing", () => {
    expect(nextTripStep(LISTO, t).done).toBe(true);
    expect(nextTripStep(LISTO, t).text).toMatch(/calcular ruta/i);
  });
});
