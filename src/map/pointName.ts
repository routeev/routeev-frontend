import { getNearestNode } from "../api/graph";
import { haversineKm } from "../shared/geo";
import { useMapStore, type PickMode } from "./mapStore";
import { pointKey, SNAP_NAME_MAX_KM } from "./routePoint";

/**
 * Ponerle un nombre visible al punto que alguien acaba de tocar en el mapa.
 *
 * Esto era `snapPoint.ts`, la última pata del grafo semilla de 63.833 nodos: el
 * toque resolvía el nodo más cercano porque `POST /api/route/log-trip` exigía
 * un id de nodo para guardar el viaje. Ese endpoint ahora recibe coordenadas
 * (`POST /api/route/trip`) y nombra el punto del lado del servidor, así que el
 * id no le hace falta a nadie.
 *
 * Lo que quedó es puramente de PANTALLA: mientras la persona arma el viaje, el
 * campo tiene que decir "Bulevar Artigas y Rivera" y no "-34,9055, -56,1851".
 * Nada de esto afecta el cálculo ni lo que se guarda:
 *
 *   - El ruteo no lo mira: `POST /api/route/plan` recibe la coordenada cruda.
 *   - El historial tampoco: la API vuelve a nombrar el punto al guardar, con
 *     los mismos datos, y este nombre viaja sólo como sugerencia.
 *
 * O sea que si esta llamada falla, no se pierde nada: el campo se queda con la
 * coordenada formateada, que es honesta.
 */
export async function nameInBackground(role: PickMode, lat: number, lon: number): Promise<void> {
  const key = pointKey(lat, lon);
  try {
    const node = await getNearestNode(lat, lon);
    const km = haversineKm(lat, lon, node.lat, node.lon);
    // Con tope de distancia: adoptar el nombre de un cruce que está a 4 km es
    // mentirle a la persona sobre dónde marcó. El grafo cubre bien las ciudades
    // pero no la campaña, así que desde un punto en campo abierto el cruce más
    // cercano puede estar lejísimos.
    if (km > SNAP_NAME_MAX_KM) return;
    // `key` es el punto que se pidió nombrar: si el que hay ahora es otro
    // —porque volvió a tocar, o canceló— la respuesta se descarta sola.
    useMapStore.getState().annotateName(role, key, node.name);
  } catch {
    // A propósito en silencio: el punto ya está fijado, la ruta se calcula
    // igual y el viaje se guarda igual. Lo único que no pasa es que el campo
    // deje de mostrar la coordenada.
  }
}
