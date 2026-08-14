import { describe, expect, it } from "vitest";
import { esPrivada } from "./esPrivada";

describe("esPrivada", () => {
  it("las de UTE no son privadas, con o sin sufijo", () => {
    expect(esPrivada("UTE Mueve")).toBe(false);
    expect(esPrivada("UTE")).toBe(false);
    expect(esPrivada("ute mueve")).toBe(false);
  });

  it("los operadores privados relevados sí lo son", () => {
    for (const operador of ["eONE", "DISA EVE Move", "Mobility Recharge", "DMC Mobility", "Evergo", "Privado"]) {
      expect(esPrivada(operador)).toBe(true);
    }
  });

  it("un operador nuevo que nadie codificó todavía cuenta como privado", () => {
    // El punto de decidirlo por lo negativo: sale un operador nuevo y se
    // muestra como privado (que es lo correcto) en vez de colarse como UTE.
    expect(esPrivada("Cargadores del Futuro S.A.")).toBe(true);
  });

  it("sin operador no se asume que sea de UTE", () => {
    expect(esPrivada(undefined)).toBe(true);
    expect(esPrivada(null)).toBe(true);
    expect(esPrivada("")).toBe(true);
  });
});
