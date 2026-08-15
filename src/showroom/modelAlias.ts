import type { ShowroomModel } from "../api/showroom";

/**
 * Nombres locales de un modelo: cómo se lo conoce acá, que muchas veces no es
 * como lo bautizó la fábrica ni como figura en el catálogo.
 *
 * QA MEDIO 9: alguien busca el auto por el nombre con el que se lo vende en
 * Uruguay y el showroom le contesta que no existe. El backend está agregando
 * ese dato en paralelo a este cambio, así que acá todo es defensivo a
 * propósito: el campo puede no venir todavía (backend viejo en producción),
 * puede venir como un string suelto o como una lista, y puede traer basura
 * adentro (null, número, string vacío) si la fuente de datos es sucia. Nada de
 * eso puede romper la grilla, así que se lee como `unknown` y se normaliza a
 * una lista de strings limpios -- si no hay nada utilizable, lista vacía y el
 * resto de la app sigue funcionando exactamente como antes.
 */
export function modelAliases(model: ShowroomModel | null | undefined): string[] {
  const raw: unknown = model?.alias;
  if (!raw) return [];
  const lista: unknown[] = Array.isArray(raw) ? raw : [raw];

  const vistos = new Set<string>();
  const out: string[] = [];
  for (const item of lista) {
    if (typeof item !== "string") continue;
    const limpio = item.trim();
    if (!limpio) continue;
    // Sin repetir, comparando sin mayúsculas: el mismo alias puede venir
    // escrito distinto en dos versiones del mismo auto.
    const clave = limpio.toLowerCase();
    if (vistos.has(clave)) continue;
    vistos.add(clave);
    out.push(limpio);
  }
  return out;
}

/**
 * Los nombres locales de TODAS las versiones de una familia, sin repetir: la
 * tarjeta de la grilla es una sola por auto, y el alias puede venir cargado en
 * cualquiera de sus versiones.
 */
export function familyAliases(versiones: readonly ShowroomModel[]): string[] {
  const vistos = new Set<string>();
  const out: string[] = [];
  for (const version of versiones) {
    for (const alias of modelAliases(version)) {
      const clave = alias.toLowerCase();
      if (vistos.has(clave)) continue;
      vistos.add(clave);
      out.push(alias);
    }
  }
  return out;
}
