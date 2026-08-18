import L from "leaflet";
import { useCallback, useRef, useState } from "react";
import { logTrip } from "../api/route";
import { bearingDeg, haversineKm, smoothBearingDeg } from "../shared/geo";
import { batteryPctToKwh, selectedVehicle, useMapStore } from "./mapStore";
import { buildRouteCumulative, nearestCumulativeDistance, projectOntoRoute } from "./routeProjection";
import { computeSpeedAdvisory, type SpeedAdvisory } from "./speedAdvisory";

// Umbral minimo de avance real para que un viaje cancelado cuente en el
// historial (filtra el jitter de un GPS quieto en el mismo punto).
const MIN_PROGRESS_TO_LOG_KM = 0.03;
// A partir de esta distancia del destino se considera que el viaje
// realmente arranco (habilita la deteccion de llegada por cercania).
const DEPARTED_FROM_DESTINATION_M = 300;
// Tope de distancia al origen de la ruta para dejar arrancar el viaje.
const MAX_DISTANCE_FROM_ORIGIN_KM = 3;
const FAR_FROM_ROUTE_M = 500;
const ARRIVED_DISTANCE_M = 60;
// Bajo este avance entre dos fixes, calcular rumbo por la diferencia de
// posición es puro ruido de GPS (un auto parado en un semáforo "gira" varios
// grados de fix en fix sin haberse movido un centímetro real) -- se prefiere
// dejar el último rumbo confiable antes que uno inventado.
const MIN_MOVE_FOR_HEADING_M = 8;
// Piso de tiempo entre fixes para el cálculo de velocidad por diferencia de
// posición (fallback cuando pos.coords.speed no viene, que en la práctica es
// seguido en muchos Android/iOS con GPS de baja confianza). El piso viejo
// (2000-30000ms) asumía un intervalo entre fixes mucho más largo que el real:
// con enableHighAccuracy, la mayoría de los celulares dispara watchPosition
// cada 1-3s, por debajo del piso de 2000ms la mayoría de las veces -- el
// resultado en la práctica era rawSpeedKmh en null para siempre en cualquier
// dispositivo sin coords.speed, lo que además dejaba trip.heading trabado en
// null porque MIN_SPEED_FOR_HEADING_KMH nunca se cumplía (el reporte real:
// "la rotación ahora ni siquiera se mueve"). Sigue habiendo un piso (no 0)
// para no dividir por un intervalo casi nulo entre dos eventos pegados.
const MIN_GAP_MS_FOR_SPEED = 400;
// Igual que MIN_MOVE_FOR_HEADING_M pero mirando la velocidad en vez de la
// distancia: el "rumbo" (course-over-ground) que da el propio GPS pierde
// sentido por completo cerca de velocidad cero -- es la fuente concreta del
// primer reporte real de este modo ("tiembla, va atrasada, y a veces rota
// para el lado que no es" probando en un celular): al frenar en el tránsito
// o en un semáforo, cualquier micro-desvío de posición se lee como un giro
// de varios grados, y correjirlo a fuerza de alisado (ver
// HEADING_SMOOTHING_ALPHA) solo cambiaba "tiembla" por "va atrasada" sin
// arreglar la causa. Cortar la actualización del rumbo por completo bajo
// este piso dejó de lado el ruido en la fuente en vez de promediarlo.
const MIN_SPEED_FOR_HEADING_KMH = 8;
// Que tan rápido sigue la cámara del modo navegación al rumbo real. Con el
// piso de velocidad de arriba filtrando el ruido de fondo, el rumbo que
// llega ya es bastante confiable, así que puede seguirlo más de cerca (antes
// 0.3) sin volver a temblar -- 0.3 era, en la práctica, tapar ruido con
// alisado en vez de sacarlo de raíz, y el costo era notarse "atrasado".
const HEADING_SMOOTHING_ALPHA = 0.45;

type RechargeStop = { nodeId: number; cumKm: number; addedKwh: number; stationName: string; applied: boolean };

interface TripRecord {
  watchId: number | null;
  coords: [number, number][];
  cum: number[];
  totalKm: number;
  lastTrustedKm: number;
  hasLeftDestination: boolean;
  rechargeStops: RechargeStop[];
  consumption: number;
  capacityKwh: number;
  batteryStart: number;
  startedRealMs: number;
  destination: [number, number];
  speedKmh: number | null;
  heading: number | null;
  lastFix: { lat: number; lon: number; tMs: number } | null;
}

export type StatusKind = "" | "charging" | "warn" | "done";

export interface LiveTripUi {
  active: boolean;
  finished: boolean;
  livePosition: [number, number] | null;
  distanceKm: number;
  totalKm: number;
  batteryKwh: number;
  capacityKwh: number;
  elapsedMin: number;
  speedKmh: number | null;
  // Rumbo actual (0-360°, 0=norte), para el modo navegación (NavigationMap):
  // null hasta que hay suficiente movimiento real para calcularlo (ver
  // MIN_MOVE_FOR_HEADING_M) -- no tiene sentido "mirar hacia" un rumbo
  // inventado con el auto parado.
  heading: number | null;
  statusText: string;
  statusKind: StatusKind;
  advisory: SpeedAdvisory | null;
}

const initialUi: LiveTripUi = {
  active: false,
  finished: false,
  livePosition: null,
  distanceKm: 0,
  totalKm: 0,
  batteryKwh: 0,
  capacityKwh: 0,
  elapsedMin: 0,
  speedKmh: null,
  heading: null,
  statusText: "",
  statusKind: "",
  advisory: null,
};

/** Seguimiento de la ubicación REAL durante "Iniciar viaje", portado de js/map/liveTrip.js. */
export function useLiveTrip() {
  const [ui, setUi] = useState<LiveTripUi>(initialUi);
  const tripRef = useRef<TripRecord | null>(null);

  const logCompletedOrPartial = useCallback((trip: TripRecord, traveledKmOverride?: number) => {
    const payload = useMapStore.getState().lastRoutePayload;
    if (!payload) return;
    const traveledKm = traveledKmOverride ?? trip.lastTrustedKm;
    logTrip({
      origin_id: payload.origin_id,
      destination_id: payload.destination_id,
      vehicle_id: payload.vehicle_id,
      start_battery_kwh: payload.start_battery_kwh,
      traveled_km: traveledKm,
      recharge_node_ids: trip.rechargeStops.filter((r) => r.applied).map((r) => r.nodeId),
    }).catch((e) => console.warn("No se pudo guardar el viaje en el historial:", e instanceof Error ? e.message : e));
  }, []);

  const end = useCallback(() => {
    const trip = tripRef.current;
    if (trip?.watchId != null) navigator.geolocation.clearWatch(trip.watchId);
    tripRef.current = null;
    setUi((u) => ({ ...initialUi, finished: u.finished }));
  }, []);

  const handlePosition = useCallback(
    (pos: GeolocationPosition) => {
      const trip = tripRef.current;
      if (!trip) return;
      const { latitude, longitude } = pos.coords;
      if (trip.startedRealMs === 0) trip.startedRealMs = Date.now();

      const { traveledKm, offRouteM } = projectOntoRoute(trip.coords, trip.cum, latitude, longitude);
      const onRoute = offRouteM <= FAR_FROM_ROUTE_M;
      if (onRoute) trip.lastTrustedKm = Math.max(0, Math.min(trip.totalKm, traveledKm));
      const clampedKm = trip.lastTrustedKm;

      let newlyArrivedStation: string | null = null;
      if (onRoute) {
        // Reconstruye el array en vez de mutar cada parada in-place: la
        // regla de inmutabilidad de eslint-plugin-react-hooks no deja
        // modificar un objeto anidado dentro de algo leido de un ref.
        trip.rechargeStops = trip.rechargeStops.map((rc) => {
          if (!rc.applied && clampedKm >= rc.cumKm) {
            newlyArrivedStation = rc.stationName;
            return { ...rc, applied: true };
          }
          return rc;
        });
      }
      const appliedKwh = trip.rechargeStops.filter((r) => r.applied).reduce((s, r) => s + r.addedKwh, 0);
      const battery = Math.max(0, trip.batteryStart - clampedKm * trip.consumption + appliedKwh);
      const elapsedMin = (Date.now() - trip.startedRealMs) / 60000;

      const now = Date.now();
      let rawSpeedKmh: number | null = null;
      if (typeof pos.coords.speed === "number" && pos.coords.speed >= 0) {
        rawSpeedKmh = pos.coords.speed * 3.6;
      } else if (trip.lastFix) {
        const gapMs = now - trip.lastFix.tMs;
        if (gapMs >= MIN_GAP_MS_FOR_SPEED && gapMs <= 30000) {
          const dKm = haversineKm(trip.lastFix.lat, trip.lastFix.lon, latitude, longitude);
          rawSpeedKmh = (dKm / gapMs) * 3600000;
        }
      }
      if (rawSpeedKmh != null) {
        trip.speedKmh = trip.speedKmh == null ? rawSpeedKmh : trip.speedKmh * 0.7 + rawSpeedKmh * 0.3;
      }

      // Se prefirio en un primer intento usar coords.heading (lo da el propio
      // chip GPS) cuando estaba disponible, con el calculo por diferencia de
      // posicion solo de respaldo -- se sacó probando en un celular real: la
      // combinacion de las dos fuentes es exactamente lo que se sentia
      // "tiembla, va atrasada, y a veces rota para el lado que no es". Course
      // (direccion de desplazamiento) y heading de compas/orientacion del
      // telefono no son la misma cosa, y coords.heading no distingue una de
      // la otra de forma consistente entre navegadores/dispositivos -- con el
      // telefono en cualquier posicion que no sea "mirando derecho para
      // adelante" (en un pie de auto, por ejemplo), esa fuente apunta para
      // cualquier lado. El calculo por diferencia de posicion consecutiva es
      // la unica de las dos que SIEMPRE mide lo mismo (direccion real de
      // desplazamiento), asi que es la unica que queda.
      let rawHeading: number | null = null;
      if (trip.lastFix && trip.speedKmh != null && trip.speedKmh >= MIN_SPEED_FOR_HEADING_KMH) {
        const movedM = haversineKm(trip.lastFix.lat, trip.lastFix.lon, latitude, longitude) * 1000;
        if (movedM >= MIN_MOVE_FOR_HEADING_M) {
          rawHeading = bearingDeg(trip.lastFix.lat, trip.lastFix.lon, latitude, longitude);
        }
      }
      if (rawHeading != null) {
        trip.heading = smoothBearingDeg(trip.heading, rawHeading, HEADING_SMOOTHING_ALPHA);
      }

      trip.lastFix = { lat: latitude, lon: longitude, tMs: now };

      const distToDestM = haversineKm(latitude, longitude, trip.destination[0], trip.destination[1]) * 1000;
      if (distToDestM > DEPARTED_FROM_DESTINATION_M) trip.hasLeftDestination = true;

      const arrived = (trip.hasLeftDestination && distToDestM < ARRIVED_DISTANCE_M) || (onRoute && trip.totalKm - clampedKm < 0.05);

      if (arrived) {
        if (trip.watchId != null) navigator.geolocation.clearWatch(trip.watchId);
        logCompletedOrPartial(trip, trip.totalKm);
        tripRef.current = null;
        setUi({
          ...initialUi,
          finished: true,
          livePosition: [latitude, longitude],
          distanceKm: trip.totalKm,
          totalKm: trip.totalKm,
          batteryKwh: battery,
          capacityKwh: trip.capacityKwh,
          heading: trip.heading,
          statusText: "Llegaste a destino",
          statusKind: "done",
        });
        return;
      }

      let statusText: string;
      let statusKind: StatusKind;
      if (!onRoute) {
        statusText = `Estás a ${(offRouteM / 1000).toFixed(1)} km de la ruta calculada: el progreso no se puede seguir hasta que estés sobre ella.`;
        statusKind = "warn";
      } else if (newlyArrivedStation) {
        statusText = `Pasaste por ${newlyArrivedStation}: batería actualizada`;
        statusKind = "charging";
      } else if (offRouteM > 150) {
        statusText = "Te alejaste de la ruta calculada";
        statusKind = "warn";
      } else {
        statusText = "En ruta...";
        statusKind = "";
      }

      const nextPendingStop = trip.rechargeStops.find((r) => !r.applied);
      const advisory = onRoute
        ? computeSpeedAdvisory({
            speedKmh: trip.speedKmh,
            batteryKwh: battery,
            consumptionKwhKm: trip.consumption,
            remainingKm: (nextPendingStop ? nextPendingStop.cumKm : trip.totalKm) - clampedKm,
            pendingRecharge: Boolean(nextPendingStop),
          })
        : null;

      setUi({
        active: true,
        finished: false,
        livePosition: [latitude, longitude],
        distanceKm: clampedKm,
        totalKm: trip.totalKm,
        batteryKwh: battery,
        capacityKwh: trip.capacityKwh,
        elapsedMin,
        speedKmh: trip.speedKmh,
        heading: trip.heading,
        statusText,
        statusKind,
        advisory,
      });
    },
    [logCompletedOrPartial]
  );

  const handleError = useCallback(
    (err: GeolocationPositionError) => {
      const isPermission = err.code === err.PERMISSION_DENIED;
      const text = isPermission
        ? "Permiso de ubicación denegado: activalo en la configuración del navegador para seguir el viaje en vivo."
        : err.code === err.TIMEOUT
          ? "Buscando señal de GPS..."
          : "No se pudo obtener tu ubicación por el momento.";
      setUi((u) => ({ ...u, active: true, statusText: text, statusKind: isPermission ? "warn" : u.statusKind }));
      // Un timeout pasajero no mata el viaje (el navegador reintenta watchPosition
      // solo); un permiso denegado es terminal.
      if (isPermission) end();
    },
    [end]
  );

  const start = useCallback(() => {
    end();
    const result = useMapStore.getState().lastResult;
    if (!result?.astar.found) return;
    const vehicle = selectedVehicle(useMapStore.getState());
    if (!vehicle) return;
    const startBatteryKwh = batteryPctToKwh(vehicle, useMapStore.getState().startBatteryPct);

    // Zoom al recorrido completo apenas se arranca el viaje -- para este
    // momento el mapa puede estar centrado en cualquier lado (mirando una
    // estacion, explorando el area, etc.), no necesariamente mostrando la
    // ruta que se acaba de empezar a seguir.
    const leafletMap = useMapStore.getState().leafletMap;
    if (leafletMap) {
      leafletMap.fitBounds(L.latLngBounds(result.astar.route_coords), { padding: [40, 40] });
    }

    // active: false en los tres rechazos de abajo (acá y en el chequeo de
    // distancia al origen más abajo) a propósito: tripRef.current nunca
    // llega a asignarse, así que cancel() no tendría nada que cancelar --
    // poner active:true dejaría el botón trabado en "Cancelar viaje" para
    // siempre, sin ningún evento que lo vuelva a "Iniciar viaje". El texto
    // se muestra igual (ver el bloque de advertencia en TripDashboard).
    if (!navigator.geolocation) {
      setUi({ ...initialUi, statusText: "Tu navegador no soporta geolocalización: no se puede seguir el viaje en vivo.", statusKind: "warn" });
      return;
    }
    if (!window.isSecureContext) {
      setUi({ ...initialUi, statusText: "El seguimiento en vivo necesita una conexión segura (HTTPS).", statusKind: "warn" });
      return;
    }

    const coords = result.astar.route_coords;
    const nodeIds = result.astar.route;
    const nodeCoords = result.astar.node_coords;
    const cum = buildRouteCumulative(coords);
    const totalKm = cum[cum.length - 1]!;

    const rechargeStops: RechargeStop[] = result.astar.recharges
      .map((rc) => {
        const idx = nodeIds.indexOf(rc.node_id);
        const nodeLatLng = idx >= 0 ? nodeCoords[idx] : null;
        const cumKm = nodeLatLng ? nearestCumulativeDistance(coords, cum, nodeLatLng[0], nodeLatLng[1]) : 0;
        return { nodeId: rc.node_id, cumKm, addedKwh: rc.added_kwh, stationName: rc.station_name, applied: false };
      })
      .sort((a, b) => a.cumKm - b.cumKm);

    const trip: TripRecord = {
      watchId: null,
      coords,
      cum,
      totalKm,
      lastTrustedKm: 0,
      hasLeftDestination: false,
      rechargeStops,
      consumption: vehicle.consumption_kwh_per_km,
      capacityKwh: vehicle.battery_capacity_kwh,
      batteryStart: startBatteryKwh,
      startedRealMs: 0,
      destination: coords[coords.length - 1]!,
      speedKmh: null,
      heading: null,
      lastFix: null,
    };
    tripRef.current = trip;

    setUi({
      ...initialUi,
      active: true,
      totalKm,
      batteryKwh: startBatteryKwh,
      capacityKwh: trip.capacityKwh,
      statusText: "Buscando tu ubicación...",
    });

    // Antes de arrancar el seguimiento hay que confirmar que la persona esta
    // efectivamente en el origen: un viaje en vivo mide lo que se recorre
    // DESDE el origen.
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const distanciaAlOrigenKm = haversineKm(pos.coords.latitude, pos.coords.longitude, coords[0]![0], coords[0]![1]);
        if (distanciaAlOrigenKm > MAX_DISTANCE_FROM_ORIGIN_KM) {
          tripRef.current = null;
          setUi({
            ...initialUi,
            statusText: `No se puede iniciar el viaje: estás a ${distanciaAlOrigenKm.toFixed(1)} km del origen de la ruta. Acercate al origen, o recalculá la ruta desde donde estás ahora (podés usar "Usar mi ubicación como origen").`,
            statusKind: "warn",
          });
          return;
        }
        setUi((u) => ({ ...u, statusText: "En ruta...", statusKind: "" }));
        trip.watchId = navigator.geolocation.watchPosition(handlePosition, handleError, {
          enableHighAccuracy: true,
          maximumAge: 4000,
          timeout: 15000,
        });
      },
      handleError,
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 60000 }
    );
  }, [end, handlePosition, handleError]);

  const cancel = useCallback(() => {
    const trip = tripRef.current;
    if (!trip) return;
    if (trip.lastTrustedKm >= MIN_PROGRESS_TO_LOG_KM) {
      logCompletedOrPartial(trip);
    }
    end();
  }, [end, logCompletedOrPartial]);

  return { ui, start, cancel, end };
}
