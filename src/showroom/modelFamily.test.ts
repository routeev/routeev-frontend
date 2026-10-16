import { describe, expect, it } from "vitest";
import type { ShowroomModel } from "../api/showroom";
import { groupFamilies } from "./modelFamily";

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

  // QA MEDIO 8 (el Yuan Pro escondido dentro del Yuan Plus) NO se arregla con
  // la heurística. Se probó sacando "pro"/"plus"/"max"/"base" de IGNORAR y el
  // remedio salía peor que la enfermedad: partía en dos tarjetas idénticas
  // pares que el propio catálogo anota como versiones del mismo auto. La
  // heurística tiene que AGRUPAR; separar bien es trabajo de `linea`, que es
  // dato curado (ver el bloque de tests de más abajo).
  it("sin `linea`, dos versiones del mismo auto no se parten en tarjetas duplicadas", () => {
    // Filas textuales del catálogo: mismo kWh, mismo consumo, misma potencia.
    // El catálogo las anota como "versión full del EX5".
    const familias = groupFamilies([
      mk("g1", "Geely", "EX5 Pro", 60.22),
      mk("g2", "Geely", "EX5 Max", 60.22),
    ]);
    expect(familias).toHaveLength(1);
    expect(familias[0]!.versiones).toHaveLength(2);
  });

  it("los niveles de equipamiento del MISMO auto agrupan, incluso los que suenan a modelo", () => {
    const familias = groupFamilies([
      mk("y1", "BYD", "Yuan Plus (Atto 3)", 60.5),
      mk("y2", "BYD", "Yuan Plus GL", 60.5),
      mk("y3", "BYD", "Yuan Plus GS", 60.5),
    ]);
    expect(familias).toHaveLength(1);
    expect(familias[0]!.nombre).toBe("Yuan Plus");
    expect(familias[0]!.versiones).toHaveLength(3);
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

describe("groupFamilies con `linea` del backend", () => {
  function conLinea(id: string, marca: string, modelo: string, linea: string, bateria: number): ShowroomModel {
    return { ...mk(id, marca, modelo, bateria), linea } as ShowroomModel;
  }

  it("agrupa por la linea curada y no por lo que diga el nombre del modelo", () => {
    // Las cuatro filas reales de BYD. Por heuristica de strings, "Yuan Pro GS"
    // y "Yuan Plus GS" se parecen muchisimo; por `linea` son dos autos y punto.
    const familias = groupFamilies([
      conLinea("byd-yuan-plus", "BYD", "Yuan Plus (Atto 3)", "Yuan Plus", 60.5),
      conLinea("byd-yuan-plus-gl", "BYD", "Yuan Plus GL", "Yuan Plus", 60.5),
      conLinea("byd-yuan-plus-gs", "BYD", "Yuan Plus GS", "Yuan Plus", 60.5),
      conLinea("byd-yuan-pro-gs", "BYD", "Yuan Pro GS", "Yuan Pro", 45.12),
    ]);

    expect(familias).toHaveLength(2);
    expect(familias.map((f) => f.nombre)).toEqual(["Yuan Plus", "Yuan Pro"]);
    expect(familias[0]!.versiones).toHaveLength(3);
    expect(familias[1]!.versiones.map((v) => v.id)).toEqual(["byd-yuan-pro-gs"]);
  });

  it("el titulo de la tarjeta sale de la linea, no de la primera version que aparezca", () => {
    // Sin esto, la tarjeta se titulaba con el nombre de la fila que viniera
    // primera y podia contradecir el rango de bateria que mostraba debajo.
    const familias = groupFamilies([
      conLinea("mg4-77", "MG", "MG4 Electric 77 kWh", "MG4 Electric", 74.4),
      conLinea("mg4-51", "MG", "MG4 Electric 51 kWh", "MG4 Electric", 50.8),
    ]);

    expect(familias).toHaveLength(1);
    expect(familias[0]!.nombre).toBe("MG4 Electric");
  });

  it("una linea distinta con el mismo nombre base no se mezcla entre marcas", () => {
    const familias = groupFamilies([
      conLinea("a", "BYD", "Seagull EV300", "Seagull", 30.08),
      conLinea("b", "BYD", "Seagull EV380", "Seagull", 38),
      conLinea("c", "Otra", "Seagull", "Seagull", 30),
    ]);

    expect(familias).toHaveLength(2);
    expect(familias[0]!.marca).toBe("BYD");
    expect(familias[0]!.versiones).toHaveLength(2);
  });

  it("si el backend no manda linea, sigue valiendo la heuristica de siempre", () => {
    const familias = groupFamilies([mk("a", "GWM", "ORA 03 (48 kWh)", 45.4), mk("b", "GWM", "ORA 03 (63 kWh)", 59.3)]);

    expect(familias).toHaveLength(1);
    expect(familias[0]!.nombre).toBe("ORA 03");
  });
});
