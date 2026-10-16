import type { PhotoCredit, ShowroomModel } from "../api/showroom";
import { normalizeForSearch } from "../shared/geo";
import { familyAliases } from "./modelAlias";
import { groupFamilies } from "./modelFamily";

/**
 * El catálogo del showroom ordenado como lo piensa la gente: marca → modelo
 * (la "línea": Dolphin, Kwid E-Tech) → versión (60,4 kWh, GT). El backend
 * manda una fila por versión; acá se agrupa una sola vez cuando llega y todo
 * lo demás (índice de marcas, búsqueda, orden, cambiar de marca) se resuelve
 * en el navegador sin volver a pedir nada.
 */

export interface CatalogLine {
  /** "dolphin": el segmento de la URL /showroom/byd/dolphin. */
  slug: string;
  brandSlug: string;
  brand: string;
  name: string;
  /** En el orden del catálogo. */
  versions: ShowroomModel[];
  /**
   * La versión que se muestra cuando la URL no dice cuál (sin ?v=): la de
   * más autonomía, que es la que el showroom viejo abría primero (ordenaba
   * por autonomía) y la que el prototipo marca como elegida.
   */
  main: ShowroomModel;
  aliases: string[];
  photo?: { url: string; credito?: PhotoCredit };
  ai: boolean;
  minRange: number;
  maxRange: number;
  minBattery: number;
  maxBattery: number;
  minCharge: number;
  maxCharge: number;
  /** kWh/100 km de la versión más eficiente. */
  minConsumption: number;
  /** Marca + modelo + nombres locales + cada versión, sin tildes ni mayúsculas. */
  haystack: string;
  /** Contra qué se mide el "empieza con" del orden de los resultados. */
  starts: string[];
}

export interface CatalogBrand {
  slug: string;
  name: string;
  lines: CatalogLine[];
  versionCount: number;
  /** Letra del índice A–Z. */
  letter: string;
}

export interface Catalog {
  /** De la A a la Z. */
  brands: CatalogBrand[];
  brandBySlug: Map<string, CatalogBrand>;
  /** "byd/dolphin" → línea. */
  lineByPath: Map<string, CatalogLine>;
  /** El id de cada versión → su línea (para los links viejos ?modelo=<id>). */
  lineByModelId: Map<string, CatalogLine>;
  lineCount: number;
  versionCount: number;
}

/** "e.GO" → "e-go", "Q4 Sportback e-tron" → "q4-sportback-e-tron", "Citroën" → "citroen". */
export function slugify(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export function linePath(line: Pick<CatalogLine, "brandSlug" | "slug">): string {
  return `/showroom/${line.brandSlug}/${line.slug}`;
}

/**
 * Adónde lleva una marca desde el índice y la búsqueda: si tiene un solo
 * modelo, directo a su ficha (una página con una sola tarjeta es un paso de
 * más); si no, a la página de la marca.
 */
export function brandHref(brand: CatalogBrand): string {
  const only = brand.lines.length === 1 ? brand.lines[0] : undefined;
  return only ? linePath(only) : `/showroom/${brand.slug}`;
}

function photoOf(versions: ShowroomModel[], main: ShowroomModel) {
  const withPhoto = main.foto_url ? main : versions.find((v) => v.foto_url);
  return withPhoto?.foto_url
    ? { url: withPhoto.foto_url, credito: withPhoto.foto_credito }
    : undefined;
}

function letterOf(name: string): string {
  const first = normalizeForSearch(name).charAt(0).toUpperCase();
  return first >= "A" && first <= "Z" ? first : "#";
}

export function buildCatalog(models: ShowroomModel[]): Catalog {
  const brandBySlug = new Map<string, CatalogBrand>();
  const lineByPath = new Map<string, CatalogLine>();
  const lineByModelId = new Map<string, CatalogLine>();

  for (const family of groupFamilies(models)) {
    const brandSlug = slugify(family.marca) || "marca";
    let brand = brandBySlug.get(brandSlug);
    if (!brand) {
      brand = {
        slug: brandSlug,
        name: family.marca,
        lines: [],
        versionCount: 0,
        letter: letterOf(family.marca),
      };
      brandBySlug.set(brandSlug, brand);
    }

    const versions = family.versiones;
    const main = versions.reduce((best, v) =>
      v.autonomia_aprox_km > best.autonomia_aprox_km ? v : best
    );
    // Dos líneas de la misma marca con el mismo slug no pasan con el catálogo
    // de hoy, pero si pasara la segunda no puede pisar a la primera: se le
    // agrega un sufijo y las dos siguen teniendo su URL.
    const base = slugify(family.nombre) || slugify(main.id) || "modelo";
    let slug = base;
    for (let i = 2; lineByPath.has(`${brandSlug}/${slug}`); i++) slug = `${base}-${i}`;

    // Un nombre local igual al del modelo no dice nada ("Yuan Plus: acá, Yuan Plus").
    const aliases = familyAliases(versions).filter(
      (a) => normalizeForSearch(a) !== normalizeForSearch(family.nombre)
    );
    const ranges = versions.map((v) => v.autonomia_aprox_km);
    const batteries = versions.map((v) => v.bateria_kwh);
    const charges = versions.map((v) => v.potencia_carga_kw);
    const line: CatalogLine = {
      slug,
      brandSlug,
      brand: brand.name,
      name: family.nombre,
      versions,
      main,
      aliases,
      photo: photoOf(versions, main),
      ai: versions.some((v) => v.fuente === "ia"),
      minRange: Math.min(...ranges),
      maxRange: Math.max(...ranges),
      minBattery: Math.min(...batteries),
      maxBattery: Math.max(...batteries),
      minCharge: Math.min(...charges),
      maxCharge: Math.max(...charges),
      minConsumption: Math.min(...versions.map((v) => v.consumo_kwh_km * 100)),
      haystack: normalizeForSearch(
        [
          brand.name,
          family.nombre,
          ...aliases,
          ...versions.flatMap((v) => [v.modelo, v.version ?? ""]),
        ].join(" ")
      ),
      starts: [family.nombre, ...aliases].map(normalizeForSearch),
    };

    brand.lines.push(line);
    brand.versionCount += versions.length;
    lineByPath.set(`${brandSlug}/${slug}`, line);
    for (const v of versions) lineByModelId.set(v.id, line);
  }

  const brands = [...brandBySlug.values()].sort((a, b) =>
    a.name.localeCompare(b.name, "es", { sensitivity: "base" })
  );
  return {
    brands,
    brandBySlug,
    lineByPath,
    lineByModelId,
    lineCount: lineByPath.size,
    versionCount: models.length,
  };
}

/** Las marcas grandes, a un clic desde el índice: 8 modelos o más, de más a menos. */
export function featuredBrands(catalog: Catalog, minLines = 8): CatalogBrand[] {
  return catalog.brands
    .filter((b) => b.lines.length >= minLines)
    .sort((a, b) => b.lines.length - a.lines.length || a.name.localeCompare(b.name, "es"));
}

export type SortKey = "range" | "battery" | "charging" | "consumption";

const SORTS: Record<SortKey, (a: CatalogLine, b: CatalogLine) => number> = {
  range: (a, b) => b.maxRange - a.maxRange,
  battery: (a, b) => b.maxBattery - a.maxBattery,
  charging: (a, b) => b.maxCharge - a.maxCharge,
  // El único que va de menor a mayor: gastar menos es lo mejor.
  consumption: (a, b) => a.minConsumption - b.minConsumption,
};

export function sortLines(lines: readonly CatalogLine[], key: SortKey): CatalogLine[] {
  return [...lines].sort((a, b) => SORTS[key](a, b) || a.name.localeCompare(b.name, "es"));
}

/** Carga rápida: acepta 50 kW o más en un cargador DC (alguna de sus versiones). */
export const FAST_CHARGE_KW = 50;

export function hasFastCharge(line: CatalogLine): boolean {
  return line.maxCharge >= FAST_CHARGE_KW;
}

export interface SearchResult {
  /** Marcas cuyo nombre coincide, para ofrecer "Ver la marca" arriba (hasta 3). */
  brands: CatalogBrand[];
  lines: CatalogLine[];
}

/**
 * Todas las palabras tienen que aparecer, en cualquier orden y sin importar
 * tildes ni mayúsculas ("leaf nissan" encuentra lo mismo que "Nissan Leaf"),
 * sobre marca + modelo + nombres locales + versiones. Primero lo que EMPIEZA
 * con lo escrito; dentro de cada grupo, más autonomía primero.
 */
export function searchCatalog(catalog: Catalog, query: string): SearchResult {
  const q = normalizeForSearch(query.trim()).replace(/\s+/g, " ");
  const tokens = q ? q.split(" ") : [];
  if (!tokens.length) return { brands: [], lines: [] };

  const brands = catalog.brands
    .filter((b) => {
      const name = normalizeForSearch(b.name);
      return tokens.every((t) => name.includes(t));
    })
    .slice(0, 3);

  const startsWith = (line: CatalogLine) =>
    Number(line.haystack.startsWith(q) || line.starts.some((s) => s.startsWith(q)));
  const lines = catalog.brands
    .flatMap((b) => b.lines)
    .filter((line) => tokens.every((t) => line.haystack.includes(t)))
    .sort((a, b) => startsWith(b) - startsWith(a) || b.maxRange - a.maxRange);

  return { brands, lines };
}
