import { describe, expect, it } from "vitest";
import { makeFormat } from "../showroom/format";
import { consumoDePor100, consumoPor100, consumoTexto } from "./numbers";

// El consumo viaja en kWh/km pero se muestra y se escribe en kWh cada 100 km.
describe("consumo en kWh cada 100 km", () => {
  const es = makeFormat("es");

  it("0,169 kWh/km son 16,9 cada 100 km, sin el ruido de coma flotante", () => {
    // 0,169 * 100 da 16,900000000000002 si no se limpia.
    expect(0.169 * 100).not.toBe(16.9);
    expect(consumoPor100(0.169)).toBe(16.9);
    expect(consumoPor100(0.1455)).toBe(14.55);
  });

  it("la vuelta da el mismo kWh/km, así que guardar sin tocar no cambia el dato", () => {
    for (const kwhKm of [0.169, 0.1455, 0.145, 0.137, 0.2, 0.01, 5]) {
      expect(consumoDePor100(consumoPor100(kwhKm))).toBe(kwhKm);
    }
  });

  it("lo que se escribe en kWh/100 km sale en kWh/km", () => {
    expect(consumoDePor100(16.9)).toBe(0.169);
    expect(consumoDePor100(14.5)).toBe(0.145);
    expect(consumoDePor100(500)).toBe(5);
    expect(consumoDePor100(NaN)).toBeNaN();
  });

  it("se muestra con los decimales que tiene, hasta dos", () => {
    expect(consumoTexto(es.n, 0.169)).toBe("16,9");
    expect(consumoTexto(es.n, 0.2)).toBe("20");
    expect(consumoTexto(es.n, 0.1455)).toBe("14,55");
    expect(consumoTexto(makeFormat("en").n, 0.145)).toBe("14.5");
  });
});
