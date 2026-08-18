import L from "leaflet";
import { useCallback, useRef, useState } from "react";
import { logTrip } from "../api/route";
import { computeCompassHeading, haversineKm, smoothBearingDeg } from "../shared/geo";
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
// Un fix con esta precisión o peor no es una lectura confiable del chip GPS
// -- en la práctica suele venir de un fallback por wifi/antena celular
// cuando no hay buena vista del cielo (túnel, entre edificios altos, etc.),
// y usarlo tal cual movía la posición mostrada (y con ella distancia y
// batería) de un salto grande que se corregía recién en el próximo fix
// bueno -- el reporte real: "la posición se va a la mierda a veces". Se
// descarta entero en vez de dejarlo corromper nada.
const GPS_HARD_REJECT_ACCURACY_M = 300;
// Con qué peso entra cada fix nuevo a la posición mostrada, según su propia
// precisión (pos.coords.accuracy): un fix muy preciso pesa cerca del máximo
// (se confía casi entero), uno impreciso pesa poco y solo corrige de a poco
// -- así un fix puntualmente malo (que no llega a ser tan malo como para el
// piso de arriba) no se ve como un salto en el mapa, sin dejar de seguir el
// movimiento real cuando la señal es buena.
const GPS_SMOOTH_REFERENCE_ACCURACY_M = 15;
const GPS_SMOOTH_MIN_WEIGHT = 0.15;
const GPS_SMOOTH_MAX_WEIGHT = 1;

/**
 * Alisa un fix de GPS nuevo contra la última posición ya alisada, pesado por
 * la precisión que reporta el propio GPS -- ver los tres constantes de
 * arriba. Sin `prev` (primer fix del viaje) no hay nada contra qué alisar.
 */
function smoothGpsFix(
  prev: { lat: number; lon: number } | null,
  lat: number,
  lon: number,
  accuracyM: number | null
): { lat: number; lon: number } {
  if (!prev) return { lat, lon };
  const accuracy = accuracyM ?? GPS_SMOOTH_REFERENCE_ACCURACY_M;
  const weight = Math.min(GPS_SMOOTH_MAX_WEIGHT, Math.max(GPS_SMOOTH_MIN_WEIGHT, GPS_SMOOTH_REFERENCE_ACCURACY_M / accuracy));
  return { lat: prev.lat + weight * (lat - prev.lat), lon: prev.lon + weight * (lon - prev.lon) };
}

// Piso de tiempo entre fixes para el cálculo de velocidad por diferencia de
// posición (fallback cuando pos.coords.speed no viene, que en la práctica es
// seguido en muchos Android/iOS con GPS de baja confianza). El piso viejo
// (2000-30000ms) asumía un intervalo entre fixes mucho más largo que el real:
// con enableHighAccuracy, la mayoría de los celulares dispara watchPosition
// cada 1-3s, por debajo del piso de 2000ms la mayoría de las veces -- el
// resultado en la práctica era rawSpeedKmh en null para siempre en cualquier
// dispositivo sin coords.speed. Sigue habiendo un piso (no 0) para no
// dividir por un intervalo casi nulo entre dos eventos pegados.
const MIN_GAP_MS_FOR_SPEED = 400;
// El rumbo del modo navegación pasó por dos versiones antes de esta: primero
// coords.heading (chip GPS), después course-over-ground por diferencia de
// posición entre fixes consecutivos. Las dos dependían de que el AUTO se
// estuviera moviendo, y con la precisión real de un GPS de celular (±30-50m
// medida en un viaje real) el desplazamiento entre dos fixes casi nunca supera
// ese ruido -- el rumbo quedaba trabado la mayor parte del manejo en ciudad,
// que es exactamente lo que se reportó ("sigue sin generar rotación"). Lo que
// la persona esperaba en realidad -- confirmado explícitamente -- es que el
// puntero gire como una brújula real, hacia donde apunta el CELULAR en ese
// momento, no hacia donde se está moviendo el auto: una fuente de datos
// totalmente distinta (DeviceOrientationEvent, sensor de orientación/
// magnetómetro) que no depende en absoluto de la posición ni de la
// velocidad. Ver attachDeviceOrientation más abajo.
const COMPASS_UPDATE_INTERVAL_MS = 200;
// Alisado angular del rumbo de brújula: el magnetómetro de un celular es
// bastante más ruidoso adentro de un auto (el chasis metálico distorsiona el
// campo magnético) que la lectura ya integrada de coords.speed, así que
// sigue haciendo falta algo de filtro para no temblar -- pero mucho menos
// que antes: acá se aplica cada COMPASS_UPDATE_INTERVAL_MS (200ms) en vez de
// cada varios segundos (el intervalo real entre fixes de GPS), así que
// converge a la orientación real mucho más rápido en tiempo real.
const COMPASS_SMOOTHING_ALPHA = 0.35;

type RechargeStop = { nodeId: number; cumKm: number; addedKwh: number; stationName: string; applied: boolean };

// iOS no expone alpha/beta/gamma "en crudo" de forma confiable para brújula
// -- en cambio da esta propiedad no estándar, ya compensada por Apple según
// la inclinación real del celular y la orientación de pantalla. Cuando está
// presente hay que usarla tal cual, sin aplicarle ninguna corrección propia
// encima.
interface DeviceOrientationEventWithCompass extends DeviceOrientationEvent {
  webkitCompassHeading?: number;
}

// El permiso de sensores de movimiento/orientación en iOS 13+ (Safari y
// cualquier navegador basado en WebKit) no está en el lib.dom.d.ts estándar
// -- es una extensión propia de Apple.
interface DeviceOrientationEventConstructorWithPermission {
  requestPermission?: () => Promise<"granted" | "denied">;
}

/**
 * Rumbo de brújula (0-360°, 0=norte) a partir de un evento de orientación
 * del celular. En iOS usa webkitCompassHeading directo (ya viene compensado
 * por inclinación); en el resto, la fórmula tilt-compensated de geo.ts sobre
 * alpha/beta/gamma, ajustada por la orientación de pantalla (si el celular
 * está en horizontal en el pie del auto, alpha solo no alcanza).
 */
function normalizeOrientationHeading(event: DeviceOrientationEvent): number | null {
  const webkitHeading = (event as DeviceOrientationEventWithCompass).webkitCompassHeading;
  if (typeof webkitHeading === "number" && !Number.isNaN(webkitHeading)) {
    return webkitHeading;
  }
  if (event.alpha == null || event.beta == null || event.gamma == null) return null;
  const heading = computeCompassHeading(event.alpha, event.beta, event.gamma);
  const screenAngle = typeof screen !== "undefined" ? (screen.orientation?.angle ?? 0) : 0;
  return (heading + screenAngle + 360) % 360;
}

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
  // Posición alisada por precisión (ver smoothGpsFix) -- es lo que de verdad
  // se usa para todo (posición mostrada, distancia, batería, cercanía al
  // destino), nunca el lat/lon crudo de un fix individual.
  smoothedFix: { lat: number; lon: number } | null;
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
  // Rumbo de brújula actual (0-360°, 0=norte), para el modo navegación
  // (NavigationMap) -- viene del sensor de orientación del celular
  // (attachDeviceOrientation), no de la posición GPS: null hasta el primer
  // evento de orientación, o para siempre si el permiso se negó.
  heading: number | null;
  statusText: string;
  statusKind: StatusKind;
  advisory: SpeedAdvisory | null;
  // TEMP DEBUG, revert junto con el bloque que lo muestra en TripDashboard:
  // diagnóstico para el próximo viaje real (precisión que reporta el propio
  // GPS del celular, y cada cuánto llega un fix nuevo) -- sin esto, cada
  // reporte de "la posición es imprecisa" o "el refresco es lento" es una
  // conjetura más sobre qué está pasando en un dispositivo que no puedo ver.
  gpsAccuracyM: number | null;
  gpsGapMs: number | null;
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
  gpsAccuracyM: null,
  gpsGapMs: null,
};

/** Seguimiento de la ubicación REAL durante "Iniciar viaje", portado de js/map/liveTrip.js. */
export function useLiveTrip() {
  const [ui, setUi] = useState<LiveTripUi>(initialUi);
  const tripRef = useRef<TripRecord | null>(null);
  // Última lectura del sensor de orientación, actualizada por el listener de
  // attachDeviceOrientation en cuanto llega cada evento (mucho más seguido
  // que los fixes de GPS) -- el intervalo de abajo la vuelca a trip.heading
  // ya alisada, a un ritmo fijo en vez de en cada evento crudo.
  const deviceHeadingRef = useRef<number | null>(null);
  const orientationCleanupRef = useRef<(() => void) | null>(null);

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
    orientationCleanupRef.current?.();
    orientationCleanupRef.current = null;
    deviceHeadingRef.current = null;
    setUi((u) => ({ ...initialUi, finished: u.finished }));
  }, []);

  // Prende el sensor de orientación del celular para que el modo navegación
  // gire como una brújula real. En iOS 13+ el sensor está detrás de un
  // permiso explícito que solo se puede pedir dentro de un gesto del
  // usuario -- por eso esta función se llama sincrónicamente desde start(),
  // que a su vez cuelga directo del onClick de "Iniciar viaje"
  // (TripDashboard.tsx), sin ningún await de por medio que pierda ese
  // contexto. Si el permiso se niega (o el navegador no tiene el sensor),
  // deviceHeadingRef se queda en null para siempre: el puntero simplemente
  // no gira, sin romper el resto del seguimiento en vivo.
  const attachDeviceOrientation = useCallback(() => {
    const startListening = () => {
      const eventName = "ondeviceorientationabsolute" in window ? "deviceorientationabsolute" : "deviceorientation";
      const handler = (event: Event) => {
        const h = normalizeOrientationHeading(event as DeviceOrientationEvent);
        if (h != null) deviceHeadingRef.current = h;
      };
      window.addEventListener(eventName, handler);

      const intervalId = window.setInterval(() => {
        const trip = tripRef.current;
        if (!trip || deviceHeadingRef.current == null) return;
        trip.heading = smoothBearingDeg(trip.heading, deviceHeadingRef.current, COMPASS_SMOOTHING_ALPHA);
        setUi((u) => (u.active ? { ...u, heading: trip.heading } : u));
      }, COMPASS_UPDATE_INTERVAL_MS);

      orientationCleanupRef.current = () => {
        window.removeEventListener(eventName, handler);
        window.clearInterval(intervalId);
      };
    };

    const DOE = window.DeviceOrientationEvent as unknown as DeviceOrientationEventConstructorWithPermission | undefined;
    if (DOE && typeof DOE.requestPermission === "function") {
      DOE.requestPermission()
        .then((state) => {
          if (state === "granted") startListening();
        })
        .catch(() => {});
    } else if (typeof DeviceOrientationEvent !== "undefined") {
      startListening();
    }
  }, []);

  const handlePosition = useCallback(
    (pos: GeolocationPosition) => {
      const trip = tripRef.current;
      if (!trip) return;
      const accuracyM = pos.coords.accuracy ?? null;

      // Fix demasiado impreciso: se descarta entero antes de tocar nada del
      // estado del viaje, en vez de dejarlo mover la posición mostrada (y
      // con ella distancia/batería) de un salto que recién se corregiría en
      // el próximo fix bueno. Sigue publicando el número de precisión (el
      // renglón de diagnóstico lo necesita para mostrar que esto está
      // pasando), pero nada más cambia.
      if (accuracyM != null && accuracyM > GPS_HARD_REJECT_ACCURACY_M) {
        setUi((u) => (u.active ? { ...u, gpsAccuracyM: accuracyM } : u));
        return;
      }

      const { lat: latitude, lon: longitude } = smoothGpsFix(trip.smoothedFix, pos.coords.latitude, pos.coords.longitude, accuracyM);
      trip.smoothedFix = { lat: latitude, lon: longitude };
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
      // Se calcula una sola vez y se reusa para el piso de movimiento del
      // rumbo de mas abajo: ver el comentario ahi de por que no puede seguir
      // siendo un metraje fijo.
      const gapMs = trip.lastFix ? now - trip.lastFix.tMs : null;

      let rawSpeedKmh: number | null = null;
      if (typeof pos.coords.speed === "number" && pos.coords.speed >= 0) {
        rawSpeedKmh = pos.coords.speed * 3.6;
      } else if (trip.lastFix && gapMs != null && gapMs >= MIN_GAP_MS_FOR_SPEED && gapMs <= 30000) {
        const dKm = haversineKm(trip.lastFix.lat, trip.lastFix.lon, latitude, longitude);
        rawSpeedKmh = (dKm / gapMs) * 3600000;
      }
      if (rawSpeedKmh != null) {
        trip.speedKmh = trip.speedKmh == null ? rawSpeedKmh : trip.speedKmh * 0.7 + rawSpeedKmh * 0.3;
      }

      // trip.heading ya NO se toca acá: lo mantiene al día el intervalo de
      // attachDeviceOrientation (sensor de orientación del celular), a su
      // propio ritmo, independiente de cuándo llega cada fix de GPS. Esta
      // función solo lo lee (más abajo, al armar el setUi) para publicarlo
      // junto con el resto del estado del viaje.
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
          gpsAccuracyM: accuracyM,
          gpsGapMs: gapMs,
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
        gpsAccuracyM: accuracyM,
        gpsGapMs: gapMs,
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

    // Sincrónico acá a propósito: ver el comentario de attachDeviceOrientation
    // sobre por qué el permiso de iOS necesita seguir colgando del gesto de
    // este click sin ningún await de por medio.
    attachDeviceOrientation();

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
      smoothedFix: null,
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
  }, [end, handlePosition, handleError, attachDeviceOrientation]);

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
