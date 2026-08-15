import { describe, expect, it } from "vitest";
import type { ShowroomModel } from "../api/showroom";
import { groupFamilies, versionLabel } from "./modelFamily";

function mk(id: string, marca: string, modelo: string, bateria = 50, autonomia = 300): ShowroomModel {
  return {
    id,
    marca,
    modelo,
    bateria_kwh: bateria,
    consumo_kwh_km: 0.15,
    potencia_carga_kw: 60,
    autonomia_aprox_km: autonomia,
  } as ShowroomModel;
}

describe("groupFamilies", () => {
  it("agrupa las versiones de un mismo auto en una sola familia (el caso ORA 03 de QA)", () => {
    const familias = groupFamilies([
      mk("a", "GWM", "ORA 03 (48 kWh)", 45.4),
      mk("b", "GWM", "ORA 03 (63 kWh)", 59.3),
      mk("c", "GWM", "ORA 03 (GT)", 59.3),
      mk("d", "GWM", "ORA 07 (Pure)", 64.3),
    ]);
    expect(familias).toHaveLength(2);
    expect(familias[0]!.nombre).toBe("ORA 03");
    expect(familias[0]!.versiones.map((v) => v.id)).toEqual(["a", "b", "c"]);
    expect(familias[1]!.nombre).toBe("ORA 07");
  });

  it("Dolphin y DOLPHIN (60.4 kWh) son la misma familia, con el nombre limpio", () => {
    const familias = groupFamilies([
      mk("d1", "BYD", "Dolphin", 44.9),
      mk("d2", "BYD", "DOLPHIN (60.4 kWh)", 60.5),
    ]);
    expect(familias).toHaveLength(1);
    expect(familias[0]!.nombre).toBe("Dolphin");
    expect(familias[0]!.representante.id).toBe("d1");
  });

  it("no mezcla autos distintos aunque compartan tokens de trim (smart #1 vs #3)", () => {
    const familias = groupFamilies([
      mk("s1", "smart", "#1 Brabus", 62),
      mk("s3", "smart", "#3 Brabus", 62),
    ]);
    expect(familias).toHaveLength(2);
  });

  // QA MEDIO 8: la lista de palabras ignoradas venía con "pro"/"plus"/"max"/
  // "base" adentro y agrupaba autos que no tienen nada que ver. Estas cuatro
  // filas son textuales del catálogo que sirve /api/showroom/models.
  it("Yuan Plus y Yuan Pro son autos distintos, no versiones del mismo (el caso reportado)", () => {
    const familias = groupFamilies([
      mk("y1", "BYD", "Yuan Plus (Atto 3)", 60.5),
      mk("y2", "BYD", "Yuan Plus GL", 60.5),
      mk("y3", "BYD", "Yuan Plus GS", 60.5),
      mk("y4", "BYD", "Yuan Pro GS", 45.12),
    ]);
    expect(familias).toHaveLength(2);
    // El Yuan Plus SÍ sigue siendo una sola tarjeta con sus tres versiones...
    expect(familias[0]!.nombre).toBe("Yuan Plus");
    expect(familias[0]!.versiones.map((v) => v.id)).toEqual(["y1", "y2", "y3"]);
    // ...y el Pro deja de estar escondido adentro de ella con el nombre del otro.
    expect(familias[1]!.nombre).toBe("Yuan Pro GS");
    expect(familias[1]!.versiones.map((v) => v.id)).toEqual(["y4"]);
  });

  it("Geely EX5 Pro y EX5 Max tampoco se mezclan (otras dos filas reales)", () => {
    const familias = groupFamilies([
      mk("g1", "Geely", "EX5 Pro", 60.22),
      mk("g2", "Geely", "EX5 Max", 60.22),
    ]);
    expect(familias).toHaveLength(2);
    expect(familias.map((f) => f.nombre)).toEqual(["EX5 Pro", "EX5 Max"]);
  });

  it("los niveles de equipamiento del MISMO auto siguen agrupando (la corrección no se pasó de rosca)", () => {
    // También textuales del catálogo: dos tamaños de batería y una versión
    // deportiva del mismo MG4, que tienen que seguir siendo una sola tarjeta.
    const familias = groupFamilies([
      mk("m1", "MG", "MG4 Electric 51 kWh", 50.8),
      mk("m2", "MG", "MG4 Electric 77 kWh", 74.4),
      mk("m3", "MG", "MG4 Electric XPOWER", 61.7),
    ]);
    expect(familias).toHaveLength(1);
    expect(familias[0]!.nombre).toBe("MG4 Electric");
    expect(familias[0]!.versiones).toHaveLength(3);
  });

  it("el nombre de familia ignora los calificadores entre paréntesis", () => {
    const familias = groupFamilies([
      mk("m1", "Tesla", "Model 3 Standard Range", 57.5),
      mk("m2", "Tesla", "Model 3 (Long Range Dual Motor)", 75),
      mk("m3", "Tesla", "Model 3 (Performance)", 82),
    ]);
    expect(familias).toHaveLength(1);
    expect(familias[0]!.nombre).toBe("Model 3");
  });
});

describe("versionLabel", () => {
  const familias = groupFamilies([
    mk("d1", "BYD", "Dolphin", 44.9),
    mk("d2", "BYD", "DOLPHIN (60.4 kWh)", 60.5),
    mk("m1", "Tesla", "Model 3 Standard Range", 57.5),
    mk("m2", "Tesla", "Model 3 (Performance)", 82),
  ]);
  const dolphin = familias[0]!;
  const model3 = familias[1]!;

  it("es lo que distingue a la versión dentro de la familia", () => {
    expect(versionLabel(dolphin, dolphin.versiones[1]!)).toBe("60.4 kWh");
    expect(versionLabel(model3, model3.versiones[0]!)).toBe("Standard Range");
    expect(versionLabel(model3, model3.versiones[1]!)).toBe("Performance");
  });

  it("queda vacío para la versión a secas (el componente muestra la batería)", () => {
    expect(versionLabel(dolphin, dolphin.versiones[0]!)).toBe("");
  });
});
