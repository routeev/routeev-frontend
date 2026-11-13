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

/**
 * Mapas de Apple se ofrece solo en un iPhone, iPad o Mac: en el resto existe
 * nada más como web en beta, y un tercer link que casi nadie va a usar le resta
 * a los dos que sí. iPadOS se presenta como "Macintosh", así que queda adentro.
 */
export function esDispositivoApple(userAgent = typeof navigator === "undefined" ? "" : navigator.userAgent) {
  return /iPhone|iPad|iPod|Macintosh/.test(userAgent);
}
