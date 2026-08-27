import { getNearestNode } from "../api/graph";
import { haversineKm } from "../shared/geo";
import { useMapStore, type PickMode } from "./mapStore";
import { pointKey, SNAP_NAME_MAX_KM, type RoutePoint } from "./routePoint";

/**
 * Lo único que quedó del snapping al grafo vial, aislado en un solo archivo a
 * propósito: el día que exista una v2 de `POST /api/route/log-trip` que reciba
 * coordenadas, este módulo se borra entero y con él la última dependencia del
 * grafo semilla de 63.833 nodos.
 *
 * El ruteo NO pasa por acá: `POST /api/route/plan` ya recibe coordenadas
 * crudas. El id del nodo se busca solo para el historial, que sigue siendo v1.
 */

/**
 * Resuelve el nodo más cercano SIN bloquear nada. El punto ya está fijado y
 * dibujado cuando esto arranca; si la respuesta llega, completa el `snapId` y
 * —si el nodo está razonablemente cerca— el nombre de la calle.
 *
 * No se hace `await` de esto en ningún lado: es exactamente lo que sacó la
 * espera de red del camino del toque.
 */
export async function snapInBackground(role: PickMode, lat: number, lon: number): Promise<void> {
  const key = pointKey(lat, lon);
  try {
    const node = await getNearestNode(lat, lon);
    const km = haversineKm(lat, lon, node.lat, node.lon);
    useMapStore.getState().annotateSnap(role, key, {
      // El snapId se acepta SIN tope de distancia, y conviene saber lo que eso
      // implica: el grafo semilla cubre bien las ciudades pero no la campaña,
      // así que desde un punto en campo abierto el cruce más cercano puede
      // estar a kilómetros. Ese nodo lejano es lo único que llega al historial
      // (log-trip v1 lo exige), así que un viaje a una chacra puede quedar
      // guardado con el nombre y la geometría de un cruce que la persona nunca
      // nombró. No se puede arreglar acá: se arregla el día que log-trip
      // reciba coordenadas.
      snapId: node.id,
      // El NOMBRE sí tiene tope, porque es lo único de esto que la persona ve:
      // adoptar el de un cruce a 4 km es mentirle sobre dónde marcó. Más lejos
      // que SNAP_NAME_MAX_KM el campo se queda con la coordenada formateada,
      // que es honesta.
      name: km <= SNAP_NAME_MAX_KM ? node.name : undefined,
    });
  } catch {
    // A propósito en silencio: el punto ya está fijado y la ruta se calcula
    // igual (no depende del id). Si esto falla, ensureSnapIds() lo reintenta
    // al iniciar el viaje, y logCompletedOrPartial una última vez al guardar.
  }
}

/**
 * Segunda oportunidad, al apretar "Iniciar viaje": completa los `snapId` que
 * falten y los baja al seed de log-trip.
 *
 * Se llama SIN await desde useLiveTrip.start() — meterle un await ahí rompe
 * el permiso del sensor de orientación en iOS, que exige colgar del gesto del
 * click de forma síncrona.
 */
export async function ensureSnapIds(): Promise<void> {
  const roles: PickMode[] = ["origin", "destination"];
  await Promise.all(
    roles.map(async (role) => {
      const p = role === "origin" ? useMapStore.getState().originNode : useMapStore.getState().destinationNode;
      if (p == null || p.snapId != null) return;
      await snapInBackground(role, p.lat, p.lon);
    })
  );

  // Bajar al seed los puntos YA anotados (los de recién y los que se hayan
  // anotado en segundo plano desde que se calculó la ruta).
  const s = useMapStore.getState();
  const patch: { origin?: RoutePoint; destination?: RoutePoint } = {};
  if (s.originNode) patch.origin = s.originNode;
  if (s.destinationNode) patch.destination = s.destinationNode;
  s.updateTripSeed(patch);
}
