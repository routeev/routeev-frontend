import type L from "leaflet";
import { create } from "zustand";
import type { GraphNode, NodeId, Station } from "../api/graph";
import type { CompareRoutesResult, RouteModo } from "../api/route";
import type { EvModel, Vehicle } from "../api/vehicles";
import { haversineKm, normalizeForSearch } from "../shared/geo";
import type { StationFilter } from "./stationFilter";
import { pointKey, SAME_POINT_KM, SAME_SPOT_KM, type RoutePoint, type TripLogSeed } from "./routePoint";

export type SearchableNode = GraphNode & { _norm: string };
export type PickMode = "origin" | "destination";

/**
 * Estado del mapa, portado de js/map/state.js. Único dominio de estado
 * "cliente" realmente complejo del sitio (front2.md, Parte 2): origen/
 * destino, vehículo elegido, resultado de ruta, modo de selección --
 * compartido por ~10 componentes que hoy son 10 módulos.
 *
 * El seguimiento de viaje en vivo (liveTrip) queda AFUERA de este store a
 * propósito: son actualizaciones de GPS varias veces por segundo, y meterlas
 * acá dispararía renders innecesarios en toda la pantalla -- vive en su
 * propio hook (map/useLiveTrip.ts) con refs, igual que el simulador del
 * showroom.
 */
interface MapState {
  // Instancia real de Leaflet, seteada una vez por MapCanvas al montar.
  // Vive en el store (no reactivo via getState(), no via selector) para que
  // hooks como useGeolocation o useGraphLoad puedan llamar
  // map.setView/fitBounds sin ser descendientes de <MapContainer> -- mismo
  // rol que el `export const map` de js/map/mapCore.js.
  leafletMap: L.Map | null;
  setLeafletMap: (map: L.Map | null) => void;

  // Ubicacion real del usuario, resuelta una vez al abrir /app (ver
  // MapCanvas#CaptureMap). Vive en el store -- no solo como estado local de
  // ese componente -- para que otras pantallas puedan volver a centrar el
  // mapa ahi (p. ej. StationDetailPanel: "volver" desde el detalle de una
  // estacion) sin depender de ser descendientes de CaptureMap.
  myPosition: [number, number] | null;
  setMyPosition: (pos: [number, number] | null) => void;

  searchableNodes: SearchableNode[];
  stations: Station[];
  // Estación elegida a mano en StationsList (pestaña "Estaciones") o en el mapa.
  // El mapa no dibuja las 200+ estaciones de una: solo esta, o -- si ya hay
  // una ruta calculada -- las que esa ruta realmente usa (ver StationsLayer).
  // NodeId (string), no number: el id de una estación es el id de su nodo en
  // el grafo, que el backend declara como string. Estaba tipado `number` por
  // el mismo error que `GraphNode.id` (ver api/graph.ts).
  selectedStationId: NodeId | null;
  // Filtro de la pestaña "Estaciones" (todas / rápidas / UTE / privadas). Vive
  // acá y no en StationsList para que el mapa dibuje lo mismo que la lista.
  stationFilter: StationFilter;

  vehicles: Vehicle[];
  vehiclesLoaded: boolean;
  evModels: EvModel[];
  selectedVehicleId: number | null;
  startBatteryPct: number;
  /**
   * ¿Hay dónde enchufar en el destino? Arranca en null, sin responder: el
   * panel la pregunta apenas hay destino y "Calcular ruta" no aparece hasta
   * que se contesta. Antes arrancaba en true (el viaje más frecuente es volver
   * a casa), pero un default silencioso es justo lo que hace que alguien que
   * va a una chacra sin enchufe calcule el viaje sin la reserva que necesita.
   *
   * En false, el margen deja de ser "llegar con algo de colchón" y pasa a ser
   * "llegar pudiendo alcanzar un cargador": el backend sube la reserva a la
   * energía necesaria para moverse hasta la estación más cercana al destino.
   * Llegar con 10% a una casa sin enchufe, con la estación más cercana a 45 km,
   * es quedarse a pie igual, sólo que un día después.
   */
  cargadorEnDestino: boolean | null;

  /**
   * "eficiente" (default): el algoritmo también pesa el ahorro de batería,
   * no solo el tiempo -- puede preferir una estación más lenta si queda más
   * cerca. "rapido": ese peso pasa a 0, dispuesto a gastar más batería
   * (nunca por debajo del margen pedido) con tal de llegar antes.
   */
  routeMode: RouteModo;

  // Origen y destino son RoutePoint, no GraphNode: un punto puede ser una
  // coordenada cruda de un toque en el mapa y no corresponder a ningún nodo
  // del grafo (ver routePoint.ts). Los campos originId/destinationId que
  // vivían acá se borraron a propósito en vez de dejarlos en null, para que
  // el type-check enumerara a sus consumidores en vez de dejarlos compilando
  // y rotos en silencio.
  originNode: RoutePoint | null;
  destinationNode: RoutePoint | null;
  pickMode: PickMode;

  // pickMode SIEMPRE vale "origin" o "destination" -- es "a cuál de los dos le
  // toca el próximo toque", no "estoy eligiendo un punto ahora". Sin distinguir
  // las dos cosas no habia forma de que nada reaccionara a "la persona apretó
  // el botón de chincheta y está esperando tocar el mapa": los cargadores
  // seguian dibujados encima justo cuando estorban, el cursor no cambiaba y
  // nada le avisaba que el mapa la estaba esperando. `picking` es esa señal, y
  // es null la mayor parte del tiempo.
  //
  // SÍ es una compuerta (pedido explícito, cambio de comportamiento a
  // propósito): ClickToPick.tsx ignora cualquier toque mientras picking sea
  // null. Antes cualquier click en el mapa fijaba el punto igual, chincheta
  // apretada o no -- eso hacía que mirar de cerca un tramo de la ruta, o
  // tocar cerca de una estación, corriera el riesgo de mover el origen o el
  // destino sin que la persona lo pidiera. Ahora hace falta apretar la
  // chincheta primero, siempre.
  picking: PickMode | null;

  // Suben con CADA escritura del punto (incluso si vuelve a caer en el mismo
  // nodo). Es lo que le permite a RouteAutocompleteField soltar el texto
  // tipeado a medias cuando el punto se fijó desde afuera del input: mirar
  // solo el id no alcanzaba, porque un click en el mapa cerca del punto ya
  // elegido resuelve al MISMO nodo -- el id no cambiaba, el texto viejo
  // quedaba pegado en el campo, y encima la chincheta del mapa sí se movía
  // (el nodo es el mismo, pero la persona no lo sabe). Ver el bug reportado
  // en destino.
  originRevision: number;
  destinationRevision: number;

  lastResult: CompareRoutesResult | null;
  lastRoutePayload: TripLogSeed | null;
  // Sufijo " · viaje del <fecha>" cuando lastResult viene de un replay del
  // historial (useReplayFromHistory) en vez de un calculo nuevo.
  replaySuffix: string | undefined;

  setSearchableNodes: (nodes: GraphNode[]) => void;
  setStations: (stations: Station[]) => void;
  selectStation: (id: NodeId | null) => void;
  setStationFilter: (filter: StationFilter) => void;

  setVehicles: (vehicles: Vehicle[]) => void;
  addVehicle: (vehicle: Vehicle) => void;
  removeVehicle: (id: number) => void;
  setEvModels: (models: EvModel[]) => void;
  selectVehicle: (id: number | null) => void;
  setStartBatteryPct: (pct: number) => void;
  setCargadorEnDestino: (tiene: boolean) => void;
  setRouteMode: (modo: RouteModo) => void;

  setOrigin: (p: RoutePoint) => void;
  setDestination: (p: RoutePoint) => void;
  /**
   * Invierte origen y destino tal cual estén (funciona también con uno solo
   * puesto: lo mueve al otro rol). Con los dos vacíos no hace nada.
   */
  swapEnds: () => void;
  clearOrigin: () => void;
  clearDestination: () => void;
  setPickMode: (mode: PickMode) => void;
  startPicking: (mode: PickMode) => void;
  stopPicking: () => void;

  /**
   * Le pone el nombre de la calle a un punto ya fijado, cuando vuelve la
   * resolución en segundo plano de pointName.ts.
   *
   * `key` es el pointKey del punto que se pidió nombrar: si el punto que hay
   * ahora es otro — porque la persona volvió a tocar, o canceló — la respuesta
   * se descarta en silencio. Eso reemplaza al par seqRef/vigenteRef que vivía
   * en ClickToPick.
   *
   * NO sube originRevision ni toca lastResult: ponerle nombre no es "se movió
   * el punto". Si subiera la revisión, RouteAutocompleteField le borraría a la
   * persona el texto que esté tipeando ~300 ms después de tocar el mapa.
   */
  annotateName: (role: PickMode, key: string, name: string) => void;

  setLastResult: (
    result: CompareRoutesResult | null,
    payload: TripLogSeed | null,
    replaySuffix?: string
  ) => void;
  /**
   * "Editar" desde Datos del viaje: vuelve al formulario con origen, destino y
   * respuestas como estaban. Solo suelta la ruta calculada, a diferencia de
   * resetTripPlanning, que es "Cancelar" y empieza de cero.
   */
  clearResult: () => void;
  resetTripPlanning: () => void;
}

export const useMapStore = create<MapState>((set, get) => ({
  leafletMap: null,
  setLeafletMap: (map) => set({ leafletMap: map }),

  myPosition: null,
  setMyPosition: (pos) => set({ myPosition: pos }),

  searchableNodes: [],
  stations: [],
  selectedStationId: null,
  stationFilter: "all",

  vehicles: [],
  vehiclesLoaded: false,
  evModels: [],
  selectedVehicleId: null,
  startBatteryPct: 100,
  cargadorEnDestino: null,
  routeMode: "eficiente",

  originNode: null,
  destinationNode: null,
  pickMode: "origin",
  picking: null,
  originRevision: 0,
  destinationRevision: 0,

  lastResult: null,
  lastRoutePayload: null,
  replaySuffix: undefined,

  setSearchableNodes: (nodes) => {
    const withNorm = nodes.map((n) => ({ ...n, _norm: normalizeForSearch(n.name) }));
    set({ searchableNodes: withNorm });
  },

  setStations: (stations) => set({ stations }),
  selectStation: (id) => set({ selectedStationId: id }),
  setStationFilter: (filter) => set({ stationFilter: filter }),

  setVehicles: (vehicles) =>
    set(() => ({
      vehicles,
      vehiclesLoaded: true,
      selectedVehicleId: vehicles.length ? (get().selectedVehicleId ?? vehicles[0]!.id) : null,
    })),
  addVehicle: (vehicle) =>
    set((s) => ({ vehicles: [...s.vehicles, vehicle], selectedVehicleId: vehicle.id })),
  removeVehicle: (id) =>
    set((s) => {
      const vehicles = s.vehicles.filter((v) => v.id !== id);
      return {
        vehicles,
        selectedVehicleId:
          s.selectedVehicleId === id ? (vehicles[0]?.id ?? null) : s.selectedVehicleId,
      };
    }),
  setEvModels: (evModels) => set({ evModels }),
  selectVehicle: (id) => set({ selectedVehicleId: id }),
  setStartBatteryPct: (pct) => set({ startBatteryPct: pct }),
  // Cambiar la respuesta invalida el resultado anterior, igual que cambiar el
  // origen o el destino: la ruta que hay en pantalla se calculó con la otra
  // respuesta, así que su tarjeta de "dónde cargar al llegar" y su frase sobre
  // la reserva describirían algo que el usuario ya cambió.
  setCargadorEnDestino: (tiene) =>
    set((s) =>
      s.cargadorEnDestino === tiene
        ? { cargadorEnDestino: tiene }
        : { cargadorEnDestino: tiene, lastResult: null, lastRoutePayload: null, replaySuffix: undefined }
    ),
  // Mismo criterio que setCargadorEnDestino: cambiar el modo invalida la
  // ruta ya calculada, porque el algoritmo puede haber elegido otras
  // paradas con el modo anterior.
  setRouteMode: (modo) =>
    set((s) =>
      s.routeMode === modo
        ? { routeMode: modo }
        : { routeMode: modo, lastResult: null, lastRoutePayload: null, replaySuffix: undefined }
    ),

  setOrigin: (p) =>
    set((s) => {
      // Cambiar el origen invalida cualquier ruta ya calculada: sin esto,
      // la polyline vieja (y sus paradas de recarga) quedaban dibujadas
      // sobre un origen/destino que ya no corresponden hasta el próximo
      // "Calcular ruta". Solo se limpia si el punto realmente cambió, para
      // no pisar un resultado válido si se re-selecciona el mismo lugar.
      //
      // "Cambió" se mide por DISTANCIA y no por id: con coordenadas crudas no
      // hay id que comparar (ver SAME_SPOT_KM en routePoint.ts).
      const prev = s.originNode;
      const changed = prev == null || haversineKm(prev.lat, prev.lon, p.lat, p.lon) > SAME_SPOT_KM;
      return {
        originNode: p,
        // Sube SIEMPRE, aunque sea el mismo punto: es "hubo una escritura",
        // no "cambió el punto" (ver el comentario de originRevision arriba).
        originRevision: s.originRevision + 1,
        ...(changed ? { lastResult: null, lastRoutePayload: null, replaySuffix: undefined } : {}),
      };
    }),
  setDestination: (p) =>
    set((s) => {
      const prev = s.destinationNode;
      const changed = prev == null || haversineKm(prev.lat, prev.lon, p.lat, p.lon) > SAME_SPOT_KM;
      return {
        destinationNode: p,
        destinationRevision: s.destinationRevision + 1,
        ...(changed ? { lastResult: null, lastRoutePayload: null, replaySuffix: undefined } : {}),
      };
    }),

  swapEnds: () =>
    set((s) => {
      if (s.originNode == null && s.destinationNode == null) return {};
      const nextOrigin = s.destinationNode;
      const nextDestination = s.originNode;
      return {
        originNode: nextOrigin,
        destinationNode: nextDestination,
        // Las dos revisiones suben: cada campo tiene que soltar el texto
        // tipeado a medias y mostrar el nombre del punto que le llegó del
        // otro rol (ver el comentario de originRevision arriba).
        originRevision: s.originRevision + 1,
        destinationRevision: s.destinationRevision + 1,
        // Con un solo punto puesto, el swap lo mueve al otro rol y deja este
        // vacío: el próximo toque del mapa tiene que ir al hueco, no pisar el
        // punto que se acaba de mover -- mismo criterio que clearOrigin/
        // clearDestination.
        pickMode: nextOrigin == null ? "origin" : nextDestination == null ? "destination" : s.pickMode,
        // Invertir el sentido invalida la ruta calculada, igual que mover
        // cualquiera de los dos puntos: la ida no es la vuelta (paradas de
        // carga y consumo cambian con la pendiente y el punto de partida).
        lastResult: null,
        lastRoutePayload: null,
        replaySuffix: undefined,
      };
    }),

  annotateName: (role, key, name) =>
    set((s) => {
      const cur = role === "origin" ? s.originNode : s.destinationNode;
      // El punto que hay ahora no es el que se pidió nombrar: la persona
      // volvió a tocar (o canceló) mientras la respuesta venía en camino.
      if (cur == null || pointKey(cur.lat, cur.lon) !== key) return {};
      const next: RoutePoint = { ...cur, name };
      return role === "origin" ? { originNode: next } : { destinationNode: next };
    }),

  // El "x" para borrar un pin ya elegido: vuelve a pickMode a ese rol para
  // que el proximo click en el mapa lo fije de nuevo, mismo criterio que
  // setOrigin ya usa para AVANZAR el pickMode al elegir (ver arriba).
  clearOrigin: () =>
    set((s) => ({
      originNode: null,
      pickMode: "origin",
      originRevision: s.originRevision + 1,
      ...(s.originNode != null ? { lastResult: null, lastRoutePayload: null, replaySuffix: undefined } : {}),
    })),
  clearDestination: () =>
    set((s) => ({
      destinationNode: null,
      pickMode: "destination",
      destinationRevision: s.destinationRevision + 1,
      ...(s.destinationNode != null ? { lastResult: null, lastRoutePayload: null, replaySuffix: undefined } : {}),
    })),
  setPickMode: (mode) => set({ pickMode: mode }),

  // startPicking es lo que hacen los botones de chincheta del panel: además de
  // decir "el próximo toque va a este rol" (pickMode), enciende la señal de
  // "te estoy esperando" (banner sobre el mapa, cursor de mira, cargadores
  // atenuados).
  startPicking: (mode) => set({ picking: mode, pickMode: mode }),
  stopPicking: () => set({ picking: null }),

  setLastResult: (result, payload, replaySuffix) =>
    set({ lastResult: result, lastRoutePayload: payload, replaySuffix, selectedStationId: null }),
  clearResult: () => set({ lastResult: null, lastRoutePayload: null, replaySuffix: undefined }),

  // El store es un singleton a nivel de modulo: no se resetea solo al
  // navegar entre /app y /profile (React Router desmonta/remonta las
  // paginas, pero Zustand vive afuera de eso) -- sin esto, volver al mapa
  // seguia mostrando el origen/destino/resultado de la visita anterior.
  // Se llama al montar MapPage (ver MapPage.tsx). No toca vehiculo ni
  // bateria elegidos: eso es mas "preferencia de la sesion" que "busqueda
  // de este viaje puntual", y perderlo cada vez que se entra al mapa
  // seria mas molesto que util.
  resetTripPlanning: () =>
    set({
      originNode: null,
      destinationNode: null,
      pickMode: "origin",
      picking: null,
      originRevision: 0,
      destinationRevision: 0,
      lastResult: null,
      lastRoutePayload: null,
      replaySuffix: undefined,
      selectedStationId: null,
      // Se resetea junto con el destino, a diferencia del vehículo y la
      // batería: la respuesta es sobre ESE destino, no una preferencia de la
      // sesión. Dejarla puesta hacía que planificar la vuelta a casa después
      // de un viaje a una chacra sin enchufe se calculara con la reserva
      // inflada del viaje anterior, y hasta metiera una parada de carga que no
      // hacía falta.
      cargadorEnDestino: null,
    }),
}));

export function selectedVehicle(state: MapState): Vehicle | null {
  return state.vehicles.find((v) => v.id === state.selectedVehicleId) ?? null;
}

export function batteryPctToKwh(vehicle: Vehicle, pct: number): number {
  return (pct / 100) * vehicle.battery_capacity_kwh;
}

export function vehicleAutonomyKm(vehicle: Vehicle): number {
  return vehicle.battery_capacity_kwh / vehicle.consumption_kwh_per_km;
}

/**
 * Falta para poder calcular una ruta, en el mismo orden que calculateGate.js.
 *
 * Toma primitivos sueltos, no el MapState entero, a propósito: arma un array
 * nuevo en cada llamada (por diseño, es una lista de strings derivada), así
 * que usarla directo como selector de Zustand (`useMapStore(calculateGateMissing)`)
 * le devuelve a React una referencia distinta en cada chequeo aunque nada
 * haya cambiado -- exactamente el patrón que dispara un loop de renders
 * infinito ("Maximum update depth exceeded"). El llamador selecciona los
 * primitivos individualmente y memoiza el resultado (ver MapPage.tsx).
 */
export function calculateGateMissing(params: {
  vehiclesLoaded: boolean;
  hasSelectedVehicle: boolean;
  origin: { lat: number; lon: number } | null;
  destination: { lat: number; lon: number } | null;
  /** cargadorEnDestino ya tiene respuesta (no es null). */
  chargerAnswered: boolean;
}): string[] {
  const { vehiclesLoaded, hasSelectedVehicle, origin, destination, chargerAnswered } = params;
  const missing: string[] = [];
  if (!vehiclesLoaded) missing.push("cargando vehículos...");
  else if (!hasSelectedVehicle) missing.push("elegí o creá un vehículo");
  // `== null` y no `!`: un punto en el ecuador o en Greenwich tiene lat/lon 0,
  // y aunque en Uruguay no pase, la versión con `!` ya contradecía a
  // nextStep.ts, que siempre usó `== null`.
  if (origin == null) missing.push("fijá un origen");
  if (destination == null) missing.push("fijá un destino");
  // Antes era `originId === destinationId`, binario porque lo definía el
  // grafo. Con coordenadas hay que elegir un umbral: ver SAME_POINT_KM.
  if (origin && destination && haversineKm(origin.lat, origin.lon, destination.lat, destination.lon) < SAME_POINT_KM) {
    missing.push("origen y destino están demasiado cerca");
  }
  if (!chargerAnswered) missing.push("respondé si podés cargar en el destino");
  return missing;
}
