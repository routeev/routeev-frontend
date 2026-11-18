import type { RoutePoint } from "./routePoint";

/**
 * Lo que la pantalla y la API tienen que ver igual de un viaje de varios tramos: por qué puntos
 * pasa y qué tramos salen. `tramosDelViaje` es el espejo de `tramos_de` de routeev-api
 * (app/plan_multiple.py): si cambia uno, cambia el otro, porque el cliente le pone nombre a cada
 * tramo que vuelve por la posición.
 */

/** Origen, paradas elegidas (en orden, sin las vacías) y destino. */
export function puntosDelViaje(
  origen: RoutePoint,
  paradas: readonly (RoutePoint | null)[],
  destino: RoutePoint
): RoutePoint[] {
  return [origen, ...paradas.filter((p): p is RoutePoint => p != null), destino];
}

/**
 * Los pares (desde, hasta) de cada tramo. Con ida y vuelta se vuelve por los mismos puntos, al
 * revés: A, P, B da A→P, P→B, B→P, P→A.
 */
export function tramosDelViaje(
  puntos: readonly RoutePoint[],
  idaYVuelta: boolean
): readonly (readonly [RoutePoint, RoutePoint])[] {
  const recorrido = idaYVuelta ? [...puntos, ...puntos.slice(0, -1).reverse()] : [...puntos];
  return recorrido.slice(1).map((hasta, i) => [recorrido[i]!, hasta] as const);
}

export interface EtiquetaDeTramo {
  tipo: "ida" | "vuelta" | "tramo";
  /** Número dentro de su tipo; null si es el único (la «Ida» y la «Vuelta» de siempre). */
  n: number | null;
}

/**
 * Cómo se llama el tramo `i` de `total` en el selector. Con ida y vuelta, la primera mitad es la
 * ida y la segunda la vuelta; sin ella, son tramos del viaje y listo.
 */
export function etiquetaDeTramo(i: number, total: number, idaYVuelta: boolean): EtiquetaDeTramo {
  if (!idaYVuelta || total < 2) return { tipo: "tramo", n: i + 1 };
  const mitad = total / 2;
  const tipo = i < mitad ? "ida" : "vuelta";
  return { tipo, n: mitad > 1 ? (i % mitad) + 1 : null };
}

/**
 * El total sobre el que se numeran las etiquetas del selector. Con el viaje unido hay a lo sumo uno
 * por sentido (uno, o dos con ida y vuelta), y se rotulan sobre los que hay: «Ida» y «Vuelta». Con los
 * tramos sueltos (una API anterior, que no manda el viaje unido) hay uno por tramo, y se cuentan sobre
 * los que se pidieron: si un tramo no tuvo ruta, los demás conservan su nombre.
 */
export function totalParaRotular(tramosMostrados: number, idaYVuelta: boolean, tramosPedidos: number | undefined): number {
  return tramosMostrados <= (idaYVuelta ? 2 : 1) ? tramosMostrados : (tramosPedidos ?? tramosMostrados);
}
