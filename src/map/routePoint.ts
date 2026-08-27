import type { GraphNode } from "../api/graph";

/**
 * Un origen o un destino, venga de donde venga: un toque en el mapa, el
 * autocompletado, la geocodificación de una dirección, el GPS o un replay del
 * historial.
 *
 * Antes esto era un `GraphNode`, o sea que TODO punto tenía que ser un nodo
 * del grafo vial — por eso el toque en el mapa llamaba a `/api/graph/nearest`
 * y "saltaba" al cruce más cercano, que en ruta abierta puede estar a
 * kilómetros.
 *
 * Ya no queda nada de aquello: un punto es una coordenada y un nombre, y las
 * dos cosas que le pedíamos al grafo se resolvieron en otro lado. El ruteo
 * recibe coordenadas (`POST /api/route/plan`) y el historial también
 * (`POST /api/route/trip`), que además nombra el punto del lado del servidor,
 * con los mismos datos y sin una llamada de red en el peor momento posible.
 *
 * El `name` de acá es sólo lo que se MUESTRA en el campo mientras se arma el
 * viaje. Se manda como sugerencia al guardar, pero quien decide el nombre que
 * queda en el historial es la API.
 */
export interface RoutePoint {
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

/** Un punto elegido del autocompletado o de la geocodificación, que ya trae nombre. */
export function fromNode(n: GraphNode): RoutePoint {
  return { name: n.name, lat: n.lat, lon: n.lon };
}

/** Un punto que es solo una coordenada: toque en el mapa o GPS. */
export function fromCoords(lat: number, lon: number): RoutePoint {
  return { name: formatCoords(lat, lon), lat, lon };
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
 * Mismo valor que `SAME_POINT_KM` en la API (app/config.py): los dos lados
 * tienen que coincidir o el cliente deja pedir algo que el servidor rechaza.
 */
export const SAME_POINT_KM = 0.05;

/**
 * 2 km. Más lejos que esto NO se adopta el nombre de la calle más cercana para
 * mostrar en el campo (ver pointName.ts).
 *
 * Si alguien toca en medio del campo y el cruce más cercano está a 4 km,
 * poner ese nombre en el campo es mentirle sobre dónde marcó. Mismo umbral
 * que ya usa `/api/graph/geocode` (distance_to_node_km > 2) para el aviso
 * equivalente al buscar una dirección escrita, y el mismo CALLE_MAX_KM que
 * usa la API para nombrar el punto al guardar el viaje (app/nombres.py).
 */
export const SNAP_NAME_MAX_KM = 2;

/**
 * Lo que hay que recordar de un cálculo de ruta para poder guardar el viaje
 * cuando termine. Se arma al calcular y vive en el store hasta entonces.
 *
 * Antes esto llevaba los dos puntos enteros, el vehículo y la batería inicial,
 * porque `POST /api/route/log-trip` recalculaba la ruta al guardar y necesitaba
 * todos los ingredientes. Ahora el plan ya está guardado del lado del servidor
 * y lo único que hace falta para nombrarlo es su id. Lo que queda son los dos
 * nombres, que el servidor NO puede saber: son las etiquetas que la persona vio
 * en pantalla al elegir los puntos.
 */
export interface TripLogSeed {
  plan_id: string;
  origin_name: string;
  destination_name: string;
}
