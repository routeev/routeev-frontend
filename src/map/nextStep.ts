import type { map as enMap } from "../i18n/dictionaries/en/map";
import { haversineKm } from "../shared/geo";
import { SAME_POINT_KM } from "./routePoint";

/**
 * "¿Qué me toca hacer ahora?" en una sola frase, para el panel de /app.
 *
 * Nace de una devolución muy concreta de un usuario sobre la vista logueada en
 * pantalla angosta: la barra de "Calcular ruta" y el mapa chico son dos cajas
 * fijas que "por momentos no aportan nada", y eso "es lo que hace que una
 * persona mayor diga cierro esto, no lo puedo usar cómodo". La barra ahora
 * directamente NO se muestra hasta que se puede calcular ("no solo que se
 * desactive el botón", textual) -- y si no está, algo tiene que decir qué
 * falta. Eso es esto.
 *
 * Es deliberadamente distinto de calculateGateMissing (mapStore.ts): esa
 * enumera TODO lo que falta, en el orden del gate original, para el cartelito
 * "Falta: a, b, c." de al lado del botón. Acá se elige UN solo paso, el
 * primero, redactado como una instrucción y no como un inventario -- si a
 * alguien le cuesta la app, tres cosas a la vez son tres cosas para
 * abandonar.
 *
 * El orden sigue el de lectura del panel (origen, destino, y recién después el
 * vehículo, que vive en la sección de abajo), no el de calculateGateMissing:
 * el paso que se nombra tiene que estar cerca de donde se mira.
 */
export interface TripStep {
  text: string;
  /** true solo cuando ya no falta nada y se puede calcular. */
  done: boolean;
}

export function nextTripStep(
  params: {
    vehiclesLoaded: boolean;
    hasSelectedVehicle: boolean;
    origin: { lat: number; lon: number } | null;
    destination: { lat: number; lon: number } | null;
  },
  t: (typeof enMap)["nextStep"]
): TripStep {
  const { vehiclesLoaded, hasSelectedVehicle, origin, destination } = params;

  if (origin == null) {
    return { text: t.chooseOrigin, done: false };
  }
  if (destination == null) {
    return { text: t.chooseDestination, done: false };
  }
  // Antes era `originId === destinationId`: con coordenadas crudas dos toques
  // nunca dan el mismo valor exacto, así que la regla pasa a ser por distancia
  // (ver SAME_POINT_KM en routePoint.ts).
  if (haversineKm(origin.lat, origin.lon, destination.lat, destination.lon) < SAME_POINT_KM) {
    return { text: t.samePoint, done: false };
  }
  if (!vehiclesLoaded) {
    return { text: t.loadingVehicles, done: false };
  }
  if (!hasSelectedVehicle) {
    return { text: t.addVehicle, done: false };
  }
  return { text: t.readyToCalculate, done: true };
}
