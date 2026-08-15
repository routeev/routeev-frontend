import { describe, expect, it } from "vitest";
import type { ShowroomModel } from "../api/showroom";
import { familyAliases, modelAliases } from "./modelAlias";

function mk(nombres_locales?: unknown): ShowroomModel {
  return { id: "x", marca: "BYD", modelo: "Yuan Plus", nombres_locales } as ShowroomModel;
}

describe("modelAliases", () => {
  it("un backend sin el campo (el que hay hoy en producción) no rompe nada", () => {
    expect(modelAliases(mk())).toEqual([]);
    expect(modelAliases(mk(null))).toEqual([]);
    expect(modelAliases(undefined)).toEqual([]);
  });

  it("acepta el alias como string suelto o como lista", () => {
    expect(modelAliases(mk("Atto 3"))).toEqual(["Atto 3"]);
    expect(modelAliases(mk(["Atto 3", "Yuan"]))).toEqual(["Atto 3", "Yuan"]);
  });

  it("descarta la basura de la lista en vez de propagarla a la búsqueda", () => {
    expect(modelAliases(mk(["Atto 3", "", "   ", null, 42, "atto 3"]))).toEqual(["Atto 3"]);
  });
});

describe("familyAliases", () => {
  it("junta los alias de todas las versiones del auto, sin repetir", () => {
    const versiones = [mk("Atto 3"), mk(["Atto 3", "Yuan Plus EV"]), mk()];
    expect(familyAliases(versiones)).toEqual(["Atto 3", "Yuan Plus EV"]);
  });
});
