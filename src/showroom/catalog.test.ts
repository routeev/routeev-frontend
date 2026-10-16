import { describe, expect, it } from "vitest";
import type { ShowroomModel } from "../api/showroom";
import {
  brandHref,
  buildCatalog,
  featuredBrands,
  searchCatalog,
  slugify,
  sortLines,
} from "./catalog";

function model(
  overrides: Partial<ShowroomModel> & Pick<ShowroomModel, "id" | "marca" | "modelo">
): ShowroomModel {
  return {
    bateria_kwh: 50,
    autonomia_aprox_km: 300,
    potencia_carga_kw: 100,
    consumo_kwh_km: 0.16,
    fuente: "catalogo",
    linea: overrides.modelo,
    version: "",
    ...overrides,
  };
}

const MODELS: ShowroomModel[] = [
  model({
    id: "byd-dolphin",
    marca: "BYD",
    modelo: "Dolphin",
    linea: "Dolphin",
    autonomia_aprox_km: 266,
    nombres_locales: ["E2"],
  }),
  model({
    id: "byd-dolphin-60",
    marca: "BYD",
    modelo: "DOLPHIN (60.4 kWh)",
    linea: "Dolphin",
    version: "60,4 kWh",
    bateria_kwh: 60.4,
    autonomia_aprox_km: 350,
    foto_url: "https://example.com/dolphin.jpg",
  }),
  model({
    id: "byd-seal",
    marca: "BYD",
    modelo: "Seal",
    autonomia_aprox_km: 410,
    potencia_carga_kw: 150,
  }),
  model({
    id: "byd-atto-3",
    marca: "BYD",
    modelo: "ATTO 3",
    linea: "Yuan Plus",
    nombres_locales: ["Yuan Plus", "Atto 3"],
  }),
  model({ id: "egol", marca: "e.GO", modelo: "Life", potencia_carga_kw: 11, consumo_kwh_km: 0.12 }),
  model({ id: "citroen-e-c4", marca: "Citroën", modelo: "ë-C4", autonomia_aprox_km: 280 }),
  model({ id: "rr-spectre", marca: "Rolls-Royce", modelo: "Spectre", autonomia_aprox_km: 480 }),
];

describe("slugify", () => {
  it("minúsculas, sin tildes y lo que no es letra o número pasa a guion", () => {
    expect(slugify("e.GO")).toBe("e-go");
    expect(slugify("Q4 Sportback e-tron")).toBe("q4-sportback-e-tron");
    expect(slugify("Citroën")).toBe("citroen");
    expect(slugify("  ë-C4 (2024) ")).toBe("e-c4-2024");
  });
});

describe("buildCatalog", () => {
  const catalog = buildCatalog(MODELS);

  it("agrupa las versiones de cada línea dentro de su marca", () => {
    const byd = catalog.brandBySlug.get("byd")!;
    expect(byd.lines.map((l) => l.name)).toEqual(["Dolphin", "Seal", "Yuan Plus"]);
    expect(byd.versionCount).toBe(4);
    expect(catalog.lineCount).toBe(6);
    expect(catalog.versionCount).toBe(7);
  });

  it("ordena las marcas de la A a la Z sin importar mayúsculas", () => {
    expect(catalog.brands.map((b) => b.name)).toEqual(["BYD", "Citroën", "e.GO", "Rolls-Royce"]);
    expect(catalog.brandBySlug.get("e-go")!.letter).toBe("E");
  });

  it("la versión por defecto es la de más autonomía, y la foto sale de cualquier versión", () => {
    const dolphin = catalog.lineByPath.get("byd/dolphin")!;
    expect(dolphin.main.id).toBe("byd-dolphin-60");
    expect(dolphin.photo?.url).toBe("https://example.com/dolphin.jpg");
    expect(dolphin.minRange).toBe(266);
    expect(dolphin.maxRange).toBe(350);
    expect(dolphin.aliases).toEqual(["E2"]);
  });

  it("si ninguna versión trae foto no inventa una: la tarjeta la pide por nombre", () => {
    expect(catalog.lineByPath.get("byd/seal")!.photo).toBeUndefined();
  });

  it("no repite como nombre local el nombre del propio modelo", () => {
    expect(catalog.lineByPath.get("byd/yuan-plus")!.aliases).toEqual(["Atto 3"]);
  });

  it("resuelve los links viejos ?modelo=<id> a su línea", () => {
    expect(catalog.lineByModelId.get("byd-dolphin")?.slug).toBe("dolphin");
    expect(catalog.lineByModelId.get("byd-atto-3")?.slug).toBe("yuan-plus");
  });

  it("una marca con un solo modelo lleva directo a la ficha", () => {
    expect(brandHref(catalog.brandBySlug.get("rolls-royce")!)).toBe(
      "/showroom/rolls-royce/spectre"
    );
    expect(brandHref(catalog.brandBySlug.get("byd")!)).toBe("/showroom/byd");
  });

  it("dos líneas con el mismo slug no se pisan", () => {
    const c = buildCatalog([
      model({ id: "a", marca: "X", modelo: "Uno", linea: "Uno" }),
      model({ id: "b", marca: "X", modelo: "UNO!", linea: "Uno!" }),
    ]);
    expect([...c.lineByPath.keys()]).toEqual(["x/uno", "x/uno-2"]);
  });
});

describe("featuredBrands", () => {
  it("solo las que tienen el mínimo de modelos, de más a menos", () => {
    const catalog = buildCatalog(MODELS);
    expect(featuredBrands(catalog, 2).map((b) => b.name)).toEqual(["BYD"]);
  });
});

describe("sortLines", () => {
  const lines = buildCatalog(MODELS).brandBySlug.get("byd")!.lines;

  it("autonomía, batería y carga de mayor a menor", () => {
    expect(sortLines(lines, "range").map((l) => l.name)).toEqual(["Seal", "Dolphin", "Yuan Plus"]);
    expect(sortLines(lines, "charging")[0]!.name).toBe("Seal");
    expect(sortLines(lines, "battery")[0]!.name).toBe("Dolphin");
  });

  it("consumo de menor a mayor", () => {
    const all = buildCatalog(MODELS).brands.flatMap((b) => b.lines);
    expect(sortLines(all, "consumption")[0]!.name).toBe("Life");
  });
});

describe("searchCatalog", () => {
  const catalog = buildCatalog(MODELS);

  it("todas las palabras, en cualquier orden, sin tildes ni mayúsculas", () => {
    expect(searchCatalog(catalog, "dolphin byd").lines.map((l) => l.name)).toEqual(["Dolphin"]);
    expect(searchCatalog(catalog, "CITROEN").lines.map((l) => l.name)).toEqual(["ë-C4"]);
  });

  it("encuentra el auto por el nombre con el que se lo conoce acá", () => {
    expect(searchCatalog(catalog, "e2").lines.map((l) => l.name)).toEqual(["Dolphin"]);
  });

  it("encuentra la línea por una de sus versiones", () => {
    expect(searchCatalog(catalog, "60,4").lines.map((l) => l.name)).toEqual(["Dolphin"]);
  });

  it("si coincide con una marca la ofrece arriba, y trae sus modelos", () => {
    const result = searchCatalog(catalog, "byd");
    expect(result.brands.map((b) => b.name)).toEqual(["BYD"]);
    expect(result.lines).toHaveLength(3);
  });

  it("primero lo que empieza con lo escrito", () => {
    // "s" está en Seal, Spectre, Yuan Plus... pero Seal y Spectre empiezan con s.
    const names = searchCatalog(catalog, "s").lines.map((l) => l.name);
    expect(names.slice(0, 2)).toEqual(["Spectre", "Seal"]);
  });

  it("sin texto no hay resultados", () => {
    expect(searchCatalog(catalog, "   ")).toEqual({ brands: [], lines: [] });
  });
});
