import type L from "leaflet";
import { create } from "zustand";
import type { GraphNode, Station } from "../api/graph";
import type { CompareRoutesPayload, CompareRoutesResult } from "../api/route";
import type { EvModel, Vehicle } from "../api/vehicles";
import { normalizeForSearch } from "../shared/geo";

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

  originId: number | null;
  originNode: GraphNode | null;
  destinationId: number | null;
  destinationNode: GraphNode | null;
  pickMode: PickMode;

  lastResult: CompareRoutesResult | null;
  lastRoutePayload: CompareRoutesPayload | null;
  // Sufijo " · viaje del <fecha>" cuando lastResult viene de un replay del
  // historial (useReplayFromHistory) en vez de un calculo nuevo.
  replaySuffix: string | undefined;

  addNode: (node: GraphNode) => void;
  setSearchableNodes: (nodes: GraphNode[]) => void;
  setStations: (stations: Station[]) => void;
  selectStation: (id: number | null) => void;

  setVehicles: (vehicles: Vehicle[]) => void;
  addVehicle: (vehicle: Vehicle) => void;
  removeVehicle: (id: number) => void;
  setEvModels: (models: EvModel[]) => void;
  selectVehicle: (id: number | null) => void;
  setStartBatteryPct: (pct: number) => void;

  setOrigin: (node: GraphNode) => void;
  setDestination: (node: GraphNode) => void;
  setPickMode: (mode: PickMode) => void;

  setLastResult: (
    result: CompareRoutesResult | null,
    payload: CompareRoutesPayload | null,
    replaySuffix?: string
  ) => void;
}

export const useMapStore = create<MapState>((set, get) => ({
  leafletMap: null,
  setLeafletMap: (map) => set({ leafletMap: map }),

  nodesById: new Map(),
  searchableNodes: [],
  stations: [],
  selectedStationId: null,

  vehicles: [],
  vehiclesLoaded: false,
  evModels: [],
  selectedVehicleId: null,
  startBatteryPct: 100,

  originId: null,
  originNode: null,
  destinationId: null,
  destinationNode: null,
  pickMode: "origin",

  lastResult: null,
  lastRoutePayload: null,
  replaySuffix: undefined,

  addNode: (node) =>
    set((s) => {
      s.nodesById.set(node.id, node);
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
        ...(changed ? { lastResult: null, lastRoutePayload: null, replaySuffix: undefined } : {}),
      };
    }),
  setPickMode: (mode) => set({ pickMode: mode }),

  setLastResult: (result, payload, replaySuffix) =>
    set({ lastResult: result, lastRoutePayload: payload, replaySuffix, selectedStationId: null }),
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
