import type { ShowroomModel } from "../api/showroom";

/**
 * Agrupa el catálogo por "auto" (marca + nombre base del modelo) para que la
 * grilla muestre UNA tarjeta por auto y la ficha ofrezca elegir la versión —
 * en vez de cinco tarjetas con la misma foto ("ORA 03 (48 kWh)", "ORA 03
 * (63 kWh)", "ORA 03 (GT)"...). Misma normalización que usa el dedup del
 * catálogo en routeev-api: se ignoran los paréntesis, los tamaños de batería
 * y las palabras de trim/deportivas, así "Dolphin" y "DOLPHIN (60.4 kWh)"
 * caen en la misma familia.
 */
export interface ModelFamily {
  key: string;
  marca: string;
  /** Nombre para mostrar: el modelo más corto de la familia (el más limpio). */
  nombre: string;
  versiones: ShowroomModel[];
  representante: ShowroomModel;
}

const IGNORAR = new Set([
  // trim / equipamiento
  "active", "boost", "comfort", "design", "excellence", "standard", "premium", "flair", "pure",
  "range", "long", "extended", "sr", "lr", "awd", "rwd", "fwd", "pro", "max", "plus", "base",
  "gl", "gs", "skin", "dual", "motor", "single", "ah", "kw", "ac", "ch", "edition", "launch", "series",
  // deportivas
  "sport", "performance", "plaid", "brabus", "xpower", "amg", "gts", "turbo", "vz", "rs", "gt",
  "scorpionissima", "ludicrous",
]);

function normalize(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();
}

function baseName(marca: string, modelo: string): string {
  const marcaTok = normalize(marca).replace(/[^a-z0-9]+/g, "");
  return normalize(modelo)
    .replace(/\([^)]*\)/g, " ")
    .replace(/\b\d+([.,]\d+)?\s*kwh\b/g, " ")
    .replace(/\bkwh\b/g, " ")
    .replace(/[^a-z0-9]+/g, " ")
    .split(" ")
    .filter((t) => t && t !== marcaTok && !IGNORAR.has(t))
    .join(" ");
}

export function familyKey(model: ShowroomModel): string {
  // Sin nombre base (filas raras tipo "63kwh"), cada fila es su propia
  // familia: mejor una tarjeta de más que agrupar autos distintos.
  const base = baseName(model.marca, model.modelo);
  return base ? `${normalize(model.marca)}|${base}` : `${normalize(model.marca)}|id:${model.id}`;
}

/** "Model 3 (Performance)" → "Model 3": lo que va antes del calificador. */
function displayName(modelo: string): string {
  return modelo.replace(/\s*\([^)]*\)\s*/g, " ").replace(/\s+/g, " ").trim() || modelo;
}

/** Agrupa preservando el orden de aparición (la lista ya viene ordenada). */
export function groupFamilies(models: ShowroomModel[]): ModelFamily[] {
  const byKey = new Map<string, ModelFamily>();
  for (const model of models) {
    const key = familyKey(model);
    const family = byKey.get(key);
    const nombre = displayName(model.modelo);
    if (!family) {
      byKey.set(key, {
        key,
        marca: model.marca,
        nombre,
        versiones: [model],
        representante: model,
      });
    } else {
      family.versiones.push(model);
      // El más corto gana; a igual largo, el escrito "normal" ("Dolphin")
      // le gana al que viene a los gritos del dataset ("DOLPHIN").
      const gritos = (s: string) => (s.match(/[A-Z]/g) ?? []).length;
      if (
        nombre.length < family.nombre.length ||
        (nombre.length === family.nombre.length && gritos(nombre) < gritos(family.nombre))
      ) {
        family.nombre = nombre;
      }
    }
  }
  return [...byKey.values()];
}

/**
 * Lo que distingue a esta versión dentro de su familia: "Dolphin" y
 * "DOLPHIN (60.4 kWh)" → "" y "60.4 kWh". Vacío cuando el nombre no agrega
 * nada (la versión "a secas"); el componente muestra la batería en ese caso.
 */
export function versionLabel(family: ModelFamily, model: ShowroomModel): string {
  const nombreNorm = normalize(family.nombre);
  let label = normalize(model.modelo) === nombreNorm ? "" : model.modelo;
  if (label) {
    const idx = normalize(label).indexOf(nombreNorm);
    if (idx >= 0) {
      label = (label.slice(0, idx) + label.slice(idx + nombreNorm.length)).trim();
    }
    label = label.replace(/^[(\s·-]+|[)\s·-]+$/g, "").trim();
  }
  return label;
}
