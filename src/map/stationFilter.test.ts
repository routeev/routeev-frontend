import { describe, expect, it } from "vitest";
import type { Station } from "../api/graph";
import { matchesStationFilter } from "./stationFilter";

const st = (operador: string, potencia_kw: number) => ({ operador, potencia_kw }) as Station;

describe("matchesStationFilter", () => {
  const ute = st("UTE", 22);
  const uteRapida = st("UTE", 150);
  const privada = st("eONE", 60);

  it("'all' deja pasar todas", () => {
    expect([ute, uteRapida, privada].every((s) => matchesStationFilter(s, "all"))).toBe(true);
  });

  it("'ute' deja solo las de UTE", () => {
    expect([ute, uteRapida, privada].map((s) => matchesStationFilter(s, "ute"))).toEqual([true, true, false]);
  });

  it("'priv' deja solo las privadas", () => {
    expect([ute, uteRapida, privada].map((s) => matchesStationFilter(s, "priv"))).toEqual([false, false, true]);
  });

  it("'fast' deja las de 50 kW o más, sin importar el operador", () => {
    expect([ute, uteRapida, privada].map((s) => matchesStationFilter(s, "fast"))).toEqual([false, true, true]);
  });
});
