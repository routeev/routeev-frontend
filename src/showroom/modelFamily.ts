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

/**
 * Palabras que NO distinguen un auto de otro: sacarlas es lo que hace que
 * "Dolphin" y "DOLPHIN (60.4 kWh)" caigan en la misma tarjeta.
 *
 * QA MEDIO 8: esta lista tenía adentro "pro", "plus", "max" y "base", que en
 * el mercado que cubre el catálogo no son niveles de equipamiento sino
 * NOMBRES DE MODELO distintos. Con "pro" y "plus" ignorados, las cuatro filas
 * que el catálogo tiene de BYD -- "Yuan Plus (Atto 3)", "Yuan Plus GL", "Yuan
 * Plus GS" y "Yuan Pro GS" -- caían todas en la misma clave y la grilla
 * mostraba UNA tarjeta "Yuan Plus" de 45,1 a 60,5 kWh: el Yuan Pro, que es
 * otro auto (otro tamaño de batería, otra autonomía, otro precio), quedaba
 * escondido adentro y bajo el nombre equivocado. Lo mismo con Geely EX5
 * Pro / EX5 Max. Sacadas de acá, cada línea vuelve a tener su tarjeta.
 *
 * "gs" y "gl" sí se quedan, aunque el bug los mencione de pasada: en el
 * catálogo real solo aparecen como sufijo de equipamiento del mismo auto
 * ("Yuan Plus" / "Yuan Plus GL" / "Yuan Plus GS", los tres de 60,5 kWh), o
 * sea que son de la misma familia que "gt" o "gts", que ya estaban acá.
 * Sacarlos habría partido el Yuan Plus en tres tarjetas idénticas.
 *
 * Las demás que quedan también son equipamiento del MISMO auto y tienen que
 * seguir agrupando: Model 3 Standard Range / Long Range / Performance es un
 * solo Model 3. El criterio, cuando hay duda, es el que ya dejó escrito
 * familyKey más abajo: una tarjeta de más es molesta, una tarjeta que esconde
 * otro auto es información equivocada.
 */
const IGNORAR = new Set([
  // trim / equipamiento
  "active", "boost", "comfort", "design", "excellence", "standard", "premium", "flair", "pure",
  "range", "long", "extended", "sr", "lr", "awd", "rwd", "fwd",
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
  // Si el backend ya separó la línea del modelo, se usa eso y no se adivina.
  // Es dato curado contra heurística de strings: `linea` dice explícitamente
  // que "Yuan Pro GS" es de la línea Yuan Pro y no de Yuan Plus, mientras que
  // acá abajo eso hay que deducirlo de una lista de palabras a ignorar que
  // nunca va a estar completa. Todo lo que sigue queda como respaldo para el
  // backend que está hoy en producción, que todavía no manda el campo.
  const linea = model.linea?.trim();
  if (linea) return `${normalize(model.marca)}|linea:${normalize(linea)}`;

  // Sin nombre base (filas raras tipo "63kwh"), cada fila es su propia
  // familia: mejor una tarjeta de más que agrupar autos distintos.
  const base = baseName(model.marca, model.modelo);
  return base ? `${normalize(model.marca)}|${base}` : `${normalize(model.marca)}|id:${model.id}`;
}

/**
 * "Model 3 (Performance)" → "Model 3": lo que va antes del calificador.
 *
 * El tamaño de batería suelto también se saca, no solo el que está entre
 * paréntesis: el catálogo trae "MG4 Electric 51 kWh" y "MG4 Electric 77 kWh"
 * como dos filas de la MISMA familia, y sin esto la tarjeta terminaba
 * titulada "MG4 Electric 51 kWh" mientras abajo, en sus propios datos, decía
 * "50,8–74,4 kWh". Un título que se contradice con la ficha que tiene debajo
 * es la misma clase de error que el Yuan Plus tragándose al Yuan Pro: la
 * tarjeta dice ser algo más chico de lo que en realidad agrupa.
 */
function displayName(model: ShowroomModel): string {
  // Mismo criterio que familyKey: si el backend ya sabe cómo se llama la
  // línea, ese es el título de la tarjeta. Evita que el nombre salga de la
  // primera versión que aparezca en la lista.
  const linea = model.linea?.trim();
  if (linea) return linea;

  return (
    model.modelo
      .replace(/\s*\([^)]*\)\s*/g, " ")
      .replace(/\s*\b\d+([.,]\d+)?\s*kwh\b/gi, " ")
      .replace(/\s+/g, " ")
      .trim() || model.modelo
  );
}

/** Agrupa preservando el orden de aparición (la lista ya viene ordenada). */
export function groupFamilies(models: ShowroomModel[]): ModelFamily[] {
  const byKey = new Map<string, ModelFamily>();
  for (const model of models) {
    const key = familyKey(model);
    const family = byKey.get(key);
    const nombre = displayName(model);
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
