import type { Station } from "../api/graph";
import { esPrivada } from "./esPrivada";

export type StationFilter = "all" | "fast" | "ute" | "priv";

/** "Rápidas": desde acá una parada de carga deja de ser de media hora larga. */
export const FAST_KW = 50;

/**
 * Un solo criterio para la lista de la pestaña "Estaciones" y para los
 * marcadores del mapa: si cada uno lo repitiera por su lado, el filtro "Solo
 * UTE" podía dejar la lista de una forma y el mapa de otra.
 */
export function matchesStationFilter(s: Station, filter: StationFilter): boolean {
  if (filter === "fast") return s.potencia_kw >= FAST_KW;
  if (filter === "ute") return !esPrivada(s.operador);
  if (filter === "priv") return esPrivada(s.operador);
  return true;
}
