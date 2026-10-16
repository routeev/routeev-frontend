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
 * QA MEDIO 8 (el Yuan Pro escondido dentro del Yuan Plus) NO se arregla acá.
 * Se intentó, sacando "pro", "plus", "max" y "base" de esta lista, y estuvo
 * mal: contra el catálogo REAL, esas palabras son equipamiento del mismo auto
 * mucho más seguido de lo que son un modelo distinto. Sacarlas partía el Geely
 * EX2 Pro / EX2 Max y el EX5 Pro / EX5 Max en tarjetas duplicadas idénticas
 * -- misma batería, mismo consumo, misma potencia de carga, y el propio
 * catálogo anotándolas como "versión full del EX2" -- para arreglar un caso,
 * el de BYD.
 *
 * Ese caso se arregla con dato y no con heurística: familyKey usa el campo
 * `linea` que ahora manda el backend, que dice explícitamente que "Yuan Pro
 * GS" es de la línea Yuan Pro y "EX5 Max" es de la línea EX5. Esta lista
 * quedó como el respaldo para el backend que todavía está en producción, y
 * como respaldo tiene que hacer lo que hacía antes: agrupar.
 *
 * El criterio general sigue siendo el que dejó escrito familyKey más abajo:
 * una tarjeta de más es molesta, una tarjeta que esconde otro auto es
 * información equivocada. Pero cuando la única herramienta es adivinar sobre
 * el nombre, agrupar de más es el error barato y separar de más es el caro:
 * el usuario ve dos tarjetas idénticas y no entiende cuál es su auto.
 */
const IGNORAR = new Set([
  // trim / equipamiento
  "active", "boost", "comfort", "design", "excellence", "standard", "premium", "flair", "pure",
  "range", "long", "extended", "sr", "lr", "awd", "rwd", "fwd",
  "pro", "plus", "max", "base",
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
