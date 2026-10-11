import { describe, expect, it } from "vitest";
import type { Localidad } from "../api/graph";
import { sugerirLugares } from "./lugares";

const loc = (nombre: string, departamento: string, extra: Partial<Localidad> = {}): Localidad => ({
  nombre,
  departamento,
  alias: [],
  lat: -34,
  lon: -56,
  ...extra,
});

const LOCALIDADES: Localidad[] = [
  loc("Rivera", "Rivera", { es_capital: true }),
  loc("Tranqueras", "Rivera"),
  loc("Mercedes", "Soriano", { es_capital: true }),
  loc("Villa Soriano", "Soriano"),
  loc("Montevideo", "Montevideo", { es_capital: true }),
  loc("Paso de los Toros", "Tacuarembó"),
  loc("Tacuarembó", "Tacuarembó", { es_capital: true }),
  loc("San José de Mayo", "San José", { es_capital: true }),
];

const resumen = (q: string) =>
  sugerirLugares(q, LOCALIDADES).map((s) =>
    s.type === "departamento" ? `depto:${s.departamento}` : `ciudad:${s.localidad.nombre}`
  );

describe("sugerirLugares", () => {
  it("el departamento va primero, y despues la ciudad del mismo nombre", () => {
    expect(resumen("rivera")).toEqual(["depto:Rivera", "ciudad:Rivera"]);
  });

  it("un departamento lleva a su capital, aunque se llame distinto", () => {
    const [primera] = sugerirLugares("soriano", LOCALIDADES);
    expect(primera).toMatchObject({ type: "departamento", departamento: "Soriano" });
    expect(primera?.type === "departamento" && primera.capital.nombre).toBe("Mercedes");
    // Villa Soriano sigue apareciendo, pero como ciudad.
    expect(resumen("soriano")).toContain("ciudad:Villa Soriano");
  });

  it("'departamento de' y 'depto' buscan solo departamentos", () => {
    expect(resumen("departamento de rivera")).toEqual(["depto:Rivera"]);
    expect(resumen("Depto Montevideo")).toEqual(["depto:Montevideo"]);
  });

  it("sin tildes y por cualquier palabra del nombre", () => {
    expect(resumen("tacuarembo")).toEqual(["depto:Tacuarembó", "ciudad:Tacuarembó"]);
    expect(resumen("toros")).toEqual(["ciudad:Paso de los Toros"]);
    expect(resumen("jose")).toEqual(["depto:San José", "ciudad:San José de Mayo"]);
  });

  it("una letra suelta en el medio de una palabra no cuenta", () => {
    expect(resumen("ivera")).toEqual([]);
  });

  it("sin consulta, nada", () => {
    expect(resumen("   ")).toEqual([]);
    expect(resumen("departamento de ")).toEqual([]);
  });
});
