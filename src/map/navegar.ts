/**
 * Abrir una coordenada en la app de navegación que la persona ya usa (N1 del
 * plan de cambios). Es el mismo puente que el móvil (routeev-movil
 * src/utils/navegar.ts), por el mismo feedback: "nada nos saca de Waze para el
 * manejo". RouteEV planifica; se maneja con Waze o con Maps.
 *
 * Links https y no esquemas tipo waze://: en el celular abren la app si está
 * instalada y, si no, la web de cada una. En una computadora abren la web, que
 * igual sirve para mandarse el destino al teléfono.
 */
export function urlsParaNavegar(lat: number, lon: number) {
  const destino = `${lat},${lon}`;
  return {
    waze: `https://waze.com/ul?ll=${destino}&navigate=yes`,
    google: `https://www.google.com/maps/dir/?api=1&destination=${destino}`,
    apple: `https://maps.apple.com/?daddr=${destino}`,
  };
}

export interface PuntoNav {
  lat: number;
  lon: number;
}

/**
 * Cuántos puntos intermedios acepta el link de Google Maps. Más allá de esto ignora el
 * resto, y un recorrido al que le faltan paradas de carga es peor que no ofrecerlo.
 */
export const MAX_PARADAS_GOOGLE = 9;

/**
 * La ruta completa -- origen, paradas de carga en orden y destino -- en cada app. Es el mismo
 * criterio que el móvil (routeev-movil src/utils/navegar.ts, urlsRutaCompleta).
 *
 * Solo Google Maps sabe de paradas intermedias (`waypoints`, separados con `|`). Waze y Mapas de
 * Apple toman UN destino en sus links, así que ahí se va hasta la primera parada de carga (o hasta
 * el destino, si el viaje no necesita cargar): al llegar se vuelve a abrir. `google` es null con
 * más paradas de las que acepta Google: ofrecerlo con paradas de menos sacaría a alguien de la ruta
 * planeada.
 *
 * Google elige SU camino entre punto y punto, que puede no ser el del plan (hay diferencias
 * medidas): las paradas son las del plan; el recorrido entre ellas, no necesariamente.
 */
export function urlsRutaCompleta(origen: PuntoNav, paradas: readonly PuntoNav[], destino: PuntoNav) {
  const punto = (p: PuntoNav) => `${p.lat},${p.lon}`;
  const primera = paradas[0] ?? destino;
  const google =
    paradas.length > MAX_PARADAS_GOOGLE
      ? null
      : `https://www.google.com/maps/dir/?api=1&origin=${punto(origen)}&destination=${punto(destino)}` +
        (paradas.length > 0 ? `&waypoints=${paradas.map(punto).join("%7C")}` : "") +
        "&travelmode=driving";
  const hasta = urlsParaNavegar(primera.lat, primera.lon);
  return { google, waze: hasta.waze, apple: hasta.apple };
}

/**
 * Mapas de Apple se ofrece solo en un iPhone, iPad o Mac: en el resto existe
 * nada más como web en beta, y un tercer link que casi nadie va a usar le resta
 * a los dos que sí. iPadOS se presenta como "Macintosh", así que queda adentro.
 */
export function esDispositivoApple(userAgent = typeof navigator === "undefined" ? "" : navigator.userAgent) {
  return /iPhone|iPad|iPod|Macintosh/.test(userAgent);
}
