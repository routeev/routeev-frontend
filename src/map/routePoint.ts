import type { GraphNode, NodeId } from "../api/graph";

/**
 * Un origen o un destino, venga de donde venga: un toque en el mapa, el
 * autocompletado, la geocodificación de una dirección, el GPS o un replay del
 * historial.
 *
 * Antes esto era un `GraphNode`, o sea que TODO punto tenía que ser un nodo
 * del grafo vial — por eso el toque en el mapa llamaba a `/api/graph/nearest`
 * y "saltaba" al cruce más cercano, que en ruta abierta puede estar a
 * kilómetros. Como `POST /api/route/plan` ya recibe coordenadas (la migración
 * a Valhalla), ese salto no le aporta nada al ruteo: solo degrada el punto que
 * se manda.
 *
 * `snapId` es lo único que quedó de aquello: el nodo del grafo más cercano,
 * que NO se usa para calcular la ruta sino solo para `POST /api/route/log-trip`,
 * que sigue siendo v1 y valida contra el grafo semilla. Arranca en null y se
 * completa en segundo plano (ver snapPoint.ts). El día que exista una v2 de
 * log-trip por coordenadas, se borra este campo y snapPoint.ts entero.
 */
export interface RoutePoint {
  /** Nodo del grafo más cercano. Solo para el historial; null hasta que llegue el snap. */
  snapId: NodeId | null;
  name: string;
  lat: number;
  lon: number;
}

/** Cuatro decimales ≈ 11 m: suficiente para reconocer el lugar, sin ruido. */
export function formatCoords(lat: number, lon: number): string {
  return `${lat.toFixed(4)}, ${lon.toFixed(4)}`;
}

/**
 * Identidad exacta de un punto, para saber si la respuesta del snap todavía
 * corresponde al punto que está fijado. Seis decimales ≈ 0,1 m: dos toques
 * distintos nunca colisionan, y el mismo punto siempre da la misma clave.
 *
 * Reemplaza al par seqRef/vigenteRef que ClickToPick usaba para descartar
 * respuestas viejas, y además cubre un caso que aquello no cubría: cancelar y
 * volver a tocar antes de que llegue la respuesta anterior.
 */
export function pointKey(lat: number, lon: number): string {
  return `${lat.toFixed(6)},${lon.toFixed(6)}`;
}

/** Un punto que YA es un nodo del grafo: autocompletado, geocodificación, replay. */
export function fromNode(n: GraphNode): RoutePoint {
  return { snapId: n.id, name: n.name, lat: n.lat, lon: n.lon };
}

/** Un punto que es solo una coordenada: toque en el mapa o GPS. */
export function fromCoords(lat: number, lon: number): RoutePoint {
  return { snapId: null, name: formatCoords(lat, lon), lat, lon };
}

/**
 * 10 m. Por debajo de esto se considera que el punto NO cambió, así que una
 * ruta ya calculada no se invalida.
 *
 * Antes esto era `node.id !== s.originId`, que con coordenadas crudas no tiene
 * equivalente: un id sintético constante nunca invalidaría la ruta, y uno
 * único por toque la invalidaría siempre, incluso al re-elegir el mismo punto.
 * La distancia acierta en los dos extremos — volver a elegir el mismo nodo del
 * autocompletado da exactamente 0 km.
 */
export const SAME_SPOT_KM = 0.01;

/**
 * 50 m. Por debajo de esto, origen y destino están demasiado cerca como para
 * que calcular una ruta signifique algo, y no se deja.
 *
 * Antes la regla era `originId === destinationId`, binaria y definida por el
 * grafo. Con coordenadas hay que elegir un umbral, y este está elegido a mano
 * con un techo concreto: dos intersecciones REALES y adyacentes del centro de
 * Montevideo están a unos 85-100 m, y son un viaje legítimo que se tiene que
 * poder calcular. Con 100 m quedaban bloqueadas.
 *
 * Ojo con lo que este umbral NO garantiza: que los dos puntos caigan en nodos
 * distintos del grafo semilla, que es lo que `POST /api/route/log-trip` (v1)
 * necesita para guardar el viaje. El grafo no tiene un nodo cada 50 m — en
 * zona mal cubierta el cruce más cercano puede estar a kilómetros — así que
 * dos puntos bien separados igual pueden colisionar en el mismo nodo. Eso se
 * detecta al guardar, en useLiveTrip.ts, no acá.
 */
export const SAME_POINT_KM = 0.05;

/**
 * 2 km. Más lejos que esto NO se adopta el nombre del nodo snapeado.
 *
 * Si alguien toca en medio del campo y el cruce más cercano está a 4 km,
 * poner ese nombre en el campo es mentirle sobre dónde marcó. Mismo umbral
 * que ya usa `/api/graph/geocode` (distance_to_node_km > 2) para el aviso
 * equivalente al buscar una dirección escrita.
 */
export const SNAP_NAME_MAX_KM = 2;

/**
 * Lo que `POST /api/route/log-trip` necesita para guardar el viaje recorrido.
 * Se arma al calcular la ruta y se guarda en el store hasta que el viaje
 * termina — los `snapId` de sus puntos pueden completarse por el camino.
 */
export interface TripLogSeed {
  origin: RoutePoint;
  destination: RoutePoint;
  vehicle_id: number;
  start_battery_kwh?: number;
  cargador_en_destino?: boolean;
}
