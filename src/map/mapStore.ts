import type L from "leaflet";
import { create } from "zustand";
import type { GraphNode, Station } from "../api/graph";
import type { CompareRoutesPayload, CompareRoutesResult } from "../api/route";
import type { EvModel, Vehicle } from "../api/vehicles";
import { normalizeForSearch } from "../shared/geo";

export type SearchableNode = GraphNode & { _norm: string };
export type PickMode = "origin" | "destination";

/**
 * Un click del mapa que SI se resolvió, pero a un nodo del grafo lejos de
 * donde la persona realmente tocó (ver IMPRECISE_CLICK_KM en ClickToPick).
 *
 * Se guarda el punto tocado ADEMAS del nodo elegido a proposito: con los dos
 * se puede dibujar en el mapa la linea entre "donde tocaste" y "donde quedó"
 * (ImprecisePickLink) y ofrecer aceptar o volver a marcar. Antes esto era un
 * banner de texto y nada mas -- el usuario leia "a 3,4 km de donde tocaste"
 * sin ninguna forma de ver hacia donde, ni de deshacerlo.
 */
export interface ImprecisePick {
  role: PickMode;
  node: GraphNode;
  clickLat: number;
  clickLon: number;
  distanceKm: number;
}

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

  nodesById: Map<number, GraphNode>;
  searchableNodes: SearchableNode[];
  stations: Station[];
  // Estación elegida a mano en StationsPanel (lista "todas las estaciones").
  // El mapa no dibuja las 200+ estaciones de una: solo esta, o -- si ya hay
  // una ruta calculada -- las que esa ruta realmente usa (ver StationsLayer).
  selectedStationId: number | null;

  vehicles: Vehicle[];
  vehiclesLoaded: boolean;
  evModels: EvModel[];
  selectedVehicleId: number | null;
  startBatteryPct: number;
  /**
   * ¿Hay dónde enchufar en el destino? Arranca en true porque el viaje más
   * frecuente es volver a casa, donde uno ya sabe que tiene el cargador.
   *
   * En false, el margen deja de ser "llegar con algo de colchón" y pasa a ser
   * "llegar pudiendo alcanzar un cargador": el backend sube la reserva a la
   * energía necesaria para moverse hasta la estación más cercana al destino.
   * Llegar con 10% a una casa sin enchufe, con la estación más cercana a 45 km,
   * es quedarse a pie igual, sólo que un día después.
   */
  cargadorEnDestino: boolean;

  originId: number | null;
  originNode: GraphNode | null;
  destinationId: number | null;
  destinationNode: GraphNode | null;
  pickMode: PickMode;

  // pickMode SIEMPRE vale "origin" o "destination" -- es "a cuál de los dos le
  // toca el próximo toque", no "estoy eligiendo un punto ahora". Sin distinguir
  // las dos cosas no habia forma de que nada reaccionara a "la persona apretó
  // el botón de chincheta y está esperando tocar el mapa": los cargadores
  // seguian dibujados encima justo cuando estorban, el cursor no cambiaba y
  // nada le avisaba que el mapa la estaba esperando. `picking` es esa señal, y
  // es null la mayor parte del tiempo. NO es una compuerta: tocar el mapa fija
  // el punto igual con picking en null, como siempre.
  picking: PickMode | null;
  imprecisePick: ImprecisePick | null;

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
  lastRoutePayload: CompareRoutesPayload | null;
  // Sufijo " · viaje del <fecha>" cuando lastResult viene de un replay del
  // historial (useReplayFromHistory) en vez de un calculo nuevo.
  replaySuffix: string | undefined;

  addNode: (node: GraphNode) => void;
  addNodes: (nodes: GraphNode[]) => void;
  setSearchableNodes: (nodes: GraphNode[]) => void;
  setStations: (stations: Station[]) => void;
  selectStation: (id: number | null) => void;

  setVehicles: (vehicles: Vehicle[]) => void;
  addVehicle: (vehicle: Vehicle) => void;
  removeVehicle: (id: number) => void;
  setEvModels: (models: EvModel[]) => void;
  selectVehicle: (id: number | null) => void;
  setStartBatteryPct: (pct: number) => void;
  setCargadorEnDestino: (tiene: boolean) => void;

  setOrigin: (node: GraphNode) => void;
  setDestination: (node: GraphNode) => void;
  clearOrigin: () => void;
  clearDestination: () => void;
  setPickMode: (mode: PickMode) => void;
  startPicking: (mode: PickMode) => void;
  stopPicking: () => void;
  setImprecisePick: (pick: ImprecisePick) => void;
  clearImprecisePick: () => void;

  setLastResult: (
    result: CompareRoutesResult | null,
    payload: CompareRoutesPayload | null,
    replaySuffix?: string
  ) => void;
  resetTripPlanning: () => void;
}

export const useMapStore = create<MapState>((set, get) => ({
  leafletMap: null,
  setLeafletMap: (map) => set({ leafletMap: map }),

  myPosition: null,
  setMyPosition: (pos) => set({ myPosition: pos }),

  nodesById: new Map(),
  searchableNodes: [],
  stations: [],
  selectedStationId: null,

  vehicles: [],
  vehiclesLoaded: false,
  evModels: [],
  selectedVehicleId: null,
  startBatteryPct: 100,
  cargadorEnDestino: true,

  originId: null,
  originNode: null,
  destinationId: null,
  destinationNode: null,
  pickMode: "origin",
  picking: null,
  imprecisePick: null,
  originRevision: 0,
  destinationRevision: 0,

  lastResult: null,
  lastRoutePayload: null,
  replaySuffix: undefined,

  addNode: (node) =>
    set((s) => {
      s.nodesById.set(node.id, node);
      return { nodesById: s.nodesById };
    }),
  // Variante en bloque para GraphLayer: el grafo trae ~63.800 nodos, y
  // llamar addNode() uno por uno significaba 63.800 set() de Zustand
  // seguidos apenas cargaba el mapa (cada uno arma un nuevo objeto de
  // estado y recorre la lista de listeners) -- un tranco real y evitable
  // en el momento mas sensible (la primera carga). Una sola llamada, un
  // solo set().
  addNodes: (nodes) =>
    set((s) => {
      for (const n of nodes) s.nodesById.set(n.id, n);
      return { nodesById: s.nodesById };
    }),

  setSearchableNodes: (nodes) => {
    const withNorm = nodes.map((n) => ({ ...n, _norm: normalizeForSearch(n.name) }));
    set((s) => {
      for (const n of withNorm) s.nodesById.set(n.id, n);
      return { searchableNodes: withNorm, nodesById: s.nodesById };
    });
  },

  setStations: (stations) => {
    set((s) => {
      for (const st of stations) {
        s.nodesById.set(st.node_id, {
          id: st.node_id,
          name: st.nombre,
          lat: st.lat,
          lon: st.lon,
          is_charging_station: true,
        });
      }
      return { stations, nodesById: s.nodesById };
    });
  },
  selectStation: (id) => set({ selectedStationId: id }),

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
  setCargadorEnDestino: (tiene) => set({ cargadorEnDestino: tiene }),

  setOrigin: (node) =>
    set((s) => {
      s.nodesById.set(node.id, node);
      // Cambiar el origen invalida cualquier ruta ya calculada: sin esto,
      // la polyline vieja (y sus paradas de recarga) quedaban dibujadas
      // sobre un origen/destino que ya no corresponden hasta el próximo
      // "Calcular ruta". Solo se limpia si el punto realmente cambió, para
      // no pisar un resultado válido si se re-selecciona el mismo nodo.
      const changed = node.id !== s.originId;
      return {
        originId: node.id,
        originNode: node,
        nodesById: s.nodesById,
        // Sube SIEMPRE, aunque el nodo sea el mismo: es "hubo una escritura",
        // no "cambió el punto" (ver el comentario de originRevision arriba).
        originRevision: s.originRevision + 1,
        // Un aviso de "quedó lejos de donde tocaste" que era del origen deja
        // de tener sentido apenas el origen se vuelve a fijar por cualquier
        // vía. ClickToPick escribe el suyo DESPUES de este setOrigin, así que
        // el suyo sobrevive.
        ...(s.imprecisePick?.role === "origin" ? { imprecisePick: null } : {}),
        ...(changed ? { lastResult: null, lastRoutePayload: null, replaySuffix: undefined } : {}),
      };
    }),
  setDestination: (node) =>
    set((s) => {
      s.nodesById.set(node.id, node);
      const changed = node.id !== s.destinationId;
      return {
        destinationId: node.id,
        destinationNode: node,
        nodesById: s.nodesById,
        destinationRevision: s.destinationRevision + 1,
        ...(s.imprecisePick?.role === "destination" ? { imprecisePick: null } : {}),
        ...(changed ? { lastResult: null, lastRoutePayload: null, replaySuffix: undefined } : {}),
      };
    }),
  // El "x" para borrar un pin ya elegido: vuelve a pickMode a ese rol para
  // que el proximo click en el mapa lo fije de nuevo, mismo criterio que
  // setOrigin ya usa para AVANZAR el pickMode al elegir (ver arriba).
  clearOrigin: () =>
    set((s) => ({
      originId: null,
      originNode: null,
      pickMode: "origin",
      originRevision: s.originRevision + 1,
      ...(s.imprecisePick?.role === "origin" ? { imprecisePick: null } : {}),
      ...(s.originId != null ? { lastResult: null, lastRoutePayload: null, replaySuffix: undefined } : {}),
    })),
  clearDestination: () =>
    set((s) => ({
      destinationId: null,
      destinationNode: null,
      pickMode: "destination",
      destinationRevision: s.destinationRevision + 1,
      ...(s.imprecisePick?.role === "destination" ? { imprecisePick: null } : {}),
      ...(s.destinationId != null ? { lastResult: null, lastRoutePayload: null, replaySuffix: undefined } : {}),
    })),
  setPickMode: (mode) => set({ pickMode: mode }),

  // startPicking es lo que hacen los botones de chincheta del panel: además de
  // decir "el próximo toque va a este rol" (pickMode), enciende la señal de
  // "te estoy esperando" (banner sobre el mapa, cursor de mira, cargadores
  // atenuados). Limpia el aviso de imprecisión porque un intento nuevo
  // reemplaza al anterior -- si no, la tarjeta de "quedó lejos" seguía ahí
  // hablando de un punto que la persona ya decidió volver a marcar.
  startPicking: (mode) => set({ picking: mode, pickMode: mode, imprecisePick: null }),
  stopPicking: () => set({ picking: null }),
  setImprecisePick: (pick) => set({ imprecisePick: pick }),
  clearImprecisePick: () => set({ imprecisePick: null }),

  setLastResult: (result, payload, replaySuffix) =>
    set({ lastResult: result, lastRoutePayload: payload, replaySuffix, selectedStationId: null }),

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
      originId: null,
      originNode: null,
      destinationId: null,
      destinationNode: null,
      pickMode: "origin",
      picking: null,
      imprecisePick: null,
      originRevision: 0,
      destinationRevision: 0,
      lastResult: null,
      lastRoutePayload: null,
      replaySuffix: undefined,
      selectedStationId: null,
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
  originId: number | null;
  destinationId: number | null;
}): string[] {
  const { vehiclesLoaded, hasSelectedVehicle, originId, destinationId } = params;
  const missing: string[] = [];
  if (!vehiclesLoaded) missing.push("cargando vehículos...");
  else if (!hasSelectedVehicle) missing.push("elegí o creá un vehículo");
  if (!originId) missing.push("fijá un origen");
  if (!destinationId) missing.push("fijá un destino");
  if (originId && destinationId && originId === destinationId) {
    missing.push("origen y destino no pueden ser el mismo punto");
  }
  return missing;
}
