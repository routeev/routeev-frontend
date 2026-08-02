/**
 * Iniciar viaje: seguimiento de la ubicacion REAL del usuario.
 *
 * No se simula un vehiculo recorriendo la ruta: no tiene sentido animar
 * un auto llegando a destino mientras la persona esta fisicamente en otro
 * lado. En cambio, se pide permiso de geolocalizacion al navegador y se
 * sigue la posicion real (watchPosition), proyectandola sobre la ruta ya
 * calculada para saber cuanto se avanzo, cuanta bateria se uso y si ya se
 * paso por una parada de recarga -- todo en base a datos reales del GPS,
 * no a un cronometro simulado.
 *
 * Incluye tambien el asesor de velocidad recomendada: un modelo puramente
 * informativo (no toca el calculo de la ruta) que compara cuanta bateria
 * hace falta para llegar al ritmo actual contra cuanta queda.
 */

import { state, els, icons } from "./state.js";
import { map } from "./mapCore.js";
import { haversineKmJs } from "./utils.js";
import { selectedVehicle, batteryPctToKwh } from "./vehicles.js";

export const tripEls = {
  control: document.getElementById("trip-control"),
  startBtn: document.getElementById("start-trip-btn"),
  live: document.getElementById("trip-live"),
  distance: document.getElementById("trip-distance"),
  battery: document.getElementById("trip-battery"),
  time: document.getElementById("trip-time"),
  speed: document.getElementById("trip-speed"),
  progressFill: document.getElementById("trip-progress-fill"),
  status: document.getElementById("trip-status"),
  speedAdvisory: document.getElementById("speed-advisory"),
};

// El boton alterna entre arrancar y cancelar, asi que su icono es parte del
// estado: se setean juntos para que no puedan quedar desfasados (un ▶ arriba
// de "Cancelar viaje"). Es innerHTML y no textContent porque el icono es un
// SVG en linea.
export function setStartBtn(kind, label) {
  tripEls.startBtn.innerHTML = (kind === "stop" ? icons.stop : icons.play) + `<span>${label}</span>`;
}

// Umbral minimo de avance real (GPS) para que un viaje cuente en el
// historial: cancelar sin haberse movido no debe dejar nada guardado
// (ruido de GPS quieto en un mismo punto), pero cancelar habiendo
// recorrido una distancia real si tiene que quedar registrado -- con la
// distancia real cubierta, no con los datos de la ruta completa que se
// habia calculado. 30 m alcanza para filtrar el jitter tipico de un GPS
// parado sin descartar un movimiento real corto.
const MIN_PROGRESS_TO_LOG_KM = 0.03;

// Distancia a partir de la cual se considera que el viaje realmente arranco
// (te alejaste del destino). Habilita la deteccion de llegada por cercania,
// que sin este candado registraba como completo un viaje hacia el lugar
// donde uno ya estaba parado. 300 m es holgado frente al error de un GPS
// urbano y frente a la distancia entre cruces del grafo, asi que no puede
// dispararse solo por ruido de medicion.
const DEPARTED_FROM_DESTINATION_M = 300;

// Tope de distancia entre donde esta la persona y el origen de la ruta para
// dejar arrancar el viaje en vivo. Es holgado a proposito: el origen es una
// interseccion del grafo, y fuera de Montevideo el grafo solo tiene vias
// principales, asi que el cruce mas cercano a una casa puede quedar a un par
// de kilometros sin que eso sea un error. Lo que este tope tiene que
// atrapar es el caso claro de "no estoy ni cerca de donde dice que arranco".
const MAX_DISTANCE_FROM_ORIGIN_KM = 3;

// --- Velocidad recomendada durante el viaje en vivo --------------------------
//
// El consumo del vehiculo en toda esta app (ver Vehicle.energy_for_distance
// en ev_logic.py) es una constante kWh/km fija por vehiculo, independiente
// de la velocidad -- necesaria para que Dijkstra/A* tengan un costo de
// arista bien definido y la heuristica de A* siga siendo admisible (ver el
// docstring de astar.py). Pero en la realidad ir mas rapido consume mas
// energia por km (mas resistencia aerodinamica), y ese margen es
// justamente lo que permite, yendo mas lento, estirar la bateria y evitar
// una parada de carga.
//
// Como el motor de ruteo no modela esa relacion, esta seccion NO toca el
// calculo de la ruta: es un asesor puramente informativo durante el
// seguimiento en vivo, con un modelo simplificado (no calibrado con datos
// reales de ningun vehiculo) que asume que el consumo informado del
// vehiculo corresponde a un ritmo de referencia de 90 km/h -- similar al
// placeholder documentado para el monto de los peajes (ver README).
const REFERENCE_SPEED_KMH = 90;
const LOW_SPEED_FACTOR_FLOOR = 0.55; // a velocidad casi nula el consumo no cae a 0: queda el auxiliar/rozamiento
const MIN_SUGGESTED_SPEED_KMH = 40; // por debajo de esto la sugerencia deja de ser un consejo practico de manejo

// Margen = (bateria que te podes permitir gastar por km) / (lo que estas
// gastando por km al ritmo actual). 1.0 es "llegas justo, sin nada de
// colchon" -- cualquier viento en contra, aire acondicionado o desvio te
// deja corto. Por eso hay dos umbrales en vez de uno solo:
//   - por debajo de SAFE_MARGIN: al ritmo actual NO llegas.
//   - entre SAFE_MARGIN y COMFORTABLE_MARGIN: llegas, pero raspando --
//     vale la pena avisarlo aunque tecnicamente "alcance", en vez de
//     esperar a que el margen real se coma con el trafico o el clima.
//   - por encima de COMFORTABLE_MARGIN: margen de sobra, sin matices.
const SAFE_MARGIN = 1.0;
const COMFORTABLE_MARGIN = 1.15;

/** Factor multiplicativo sobre el consumo nominal (kWh/km) a una velocidad dada. */
function speedConsumptionFactor(speedKmh) {
  const v = Math.max(5, Math.min(160, speedKmh));
  const r = v / REFERENCE_SPEED_KMH;
  return v <= REFERENCE_SPEED_KMH ? LOW_SPEED_FACTOR_FLOOR + (1 - LOW_SPEED_FACTOR_FLOOR) * r * r : r * r;
}

/**
 * Inversa de speedConsumptionFactor, con la misma quiebre en
 * REFERENCE_SPEED_KMH que la funcion original (factor 1.0 ahi). Sin las
 * dos ramas, un factor objetivo por encima de 1 (tipico al pedir bajar
 * desde una velocidad ya mayor a la de referencia, p.ej. de 110 a "lo
 * necesario") se resolvia con la formula de la rama baja y devolvia una
 * velocidad MAYOR a la actual -- una "sugerencia" de ir mas rapido para
 * gastar menos, que es exactamente al reves de lo que se esta pidiendo.
 */
function speedForConsumptionFactor(factor) {
  if (factor >= 1) return REFERENCE_SPEED_KMH * Math.sqrt(factor);
  const clamped = Math.max(LOW_SPEED_FACTOR_FLOOR, factor);
  return REFERENCE_SPEED_KMH * Math.sqrt((clamped - LOW_SPEED_FACTOR_FLOOR) / (1 - LOW_SPEED_FACTOR_FLOOR));
}

/**
 * Velocidad a la que habria que ir para que el margen pase de `margin`
 * (al ritmo actual, speedKmh) a `targetMargin`. Se despeja de que el
 * consumo necesario es inversamente proporcional al margen: si el margen
 * actual es la mitad del buscado, hace falta la mitad del factor de
 * consumo actual.
 */
function speedForTargetMargin(speedKmh, margin, targetMargin) {
  const targetFactor = speedConsumptionFactor(speedKmh) * (margin / targetMargin);
  return speedForConsumptionFactor(targetFactor);
}

/**
 * Compara cuanta bateria hace falta para llegar a destino al ritmo actual
 * contra cuanta queda, y arma la sugerencia (o el aviso de que no alcanza)
 * a mostrar en el panel del viaje. Devuelve null si todavia no hay
 * suficiente informacion (sin velocidad confiable, o ya casi se llego).
 */
function computeSpeedAdvisory({ speedKmh, batteryKwh, consumptionKwhKm, remainingKm, pendingRecharge }) {
  if (speedKmh == null || remainingKm < 0.15) return null;

  const affordableRate = batteryKwh / remainingKm; // kWh/km que te podes permitir hasta destino
  const neededRateNow = consumptionKwhKm * speedConsumptionFactor(speedKmh);
  const margin = affordableRate / neededRateNow;

  if (margin >= COMFORTABLE_MARGIN) {
    return {
      kind: "ok",
      text: pendingRecharge
        ? "A este ritmo estas gastando menos de lo previsto: es posible que no necesites la parada de carga planeada."
        : "Vas a llegar con margen de bateria a este ritmo.",
    };
  }

  if (margin >= SAFE_MARGIN) {
    // Tecnicamente llega, pero con menos de un 15% de colchon: se avisa
    // igual, en vez de esperar a que el margen real (que no controlamos:
    // viento, trafico, clima) se lo coma.
    const suggestedSpeed = speedForTargetMargin(speedKmh, margin, COMFORTABLE_MARGIN);
    const vale = suggestedSpeed >= MIN_SUGGESTED_SPEED_KMH && suggestedSpeed < speedKmh - 3;
    return {
      kind: "tight",
      text:
        `Vas a llegar, pero muy justo de bateria (te sobraria apenas ${Math.max(0, Math.round((margin - 1) * 100))}% a este ritmo).` +
        (vale ? ` Bajando a ~${Math.round(suggestedSpeed)} km/h tendrias mas margen.` : " Mantene este ritmo, sin acelerar."),
    };
  }

  const suggestedSpeed = speedForTargetMargin(speedKmh, margin, 1.05); // apuntar a 1.05, no a 1.0 exacto: sin colchon cero
  if (suggestedSpeed >= MIN_SUGGESTED_SPEED_KMH && suggestedSpeed < speedKmh - 3) {
    return {
      kind: "warn",
      text:
        `Al ritmo actual (~${Math.round(speedKmh)} km/h) no te alcanza la bateria para llegar. Bajando a ~${Math.round(suggestedSpeed)} km/h deberias llegar con lo que te queda` +
        (pendingRecharge ? ", sin necesidad de la parada de carga planeada." : "."),
    };
  }

  return {
    kind: "danger",
    text: pendingRecharge
      ? "No te alcanza la bateria aunque bajes la velocidad: segui el plan y para en la proxima estacion de carga."
      : "No te alcanza la bateria para llegar aunque bajes la velocidad.",
  };
}

// Guarda en el historial el tramo REAL de un viaje en vivo (llegada a
// destino, o cancelacion habiendo avanzado). No bloquea la UI de
// "llegaste"/"viaje cancelado" si falla: el seguimiento en si ya termino,
// y perder el guardado del historial no deberia impedir cerrar el viaje.
async function logCompletedOrPartialTrip(trip, traveledKmOverride) {
  const payload = state.lastRoutePayload;
  if (!payload) return;
  const traveledKm = traveledKmOverride != null ? traveledKmOverride : trip.lastTrustedKm;
  try {
    await api.logTrip({
      origin_id: payload.origin_id,
      destination_id: payload.destination_id,
      vehicle_id: payload.vehicle_id,
      start_battery_kwh: payload.start_battery_kwh,
      traveled_km: traveledKm,
      recharge_node_ids: trip.rechargeStops.filter((r) => r.applied).map((r) => r.nodeId),
    });
  } catch (e) {
    console.warn("No se pudo guardar el viaje en el historial:", e.message);
  }
}

function formatBattery(kwh, capacityKwh) {
  const pct = Math.max(0, Math.min(100, (kwh / capacityKwh) * 100));
  return `${pct.toFixed(0)}% (${kwh.toFixed(1)} kWh)`;
}

// Distancia acumulada (km) desde el inicio de la ruta hasta cada punto de
// coords -- coords ya viene con el detalle de forma real de la calle
// (route_coords), asi que esta acumulada representa la distancia real de
// manejo, no la linea recta entre nodos.
function buildRouteCumulative(coords) {
  const cum = [0];
  for (let i = 1; i < coords.length; i++) {
    cum.push(cum[i - 1] + haversineKmJs(coords[i - 1][0], coords[i - 1][1], coords[i][0], coords[i][1]));
  }
  return cum;
}

// A que distancia acumulada de la ruta cae un punto dado (usado para ubicar
// las paradas de recarga -- que son nodos puntuales -- dentro de la
// acumulada de route_coords): se busca el punto de la ruta mas cercano y se
// toma su acumulada. Solo se llama una vez por parada al iniciar el viaje.
function nearestCumulativeDistance(coords, cum, lat, lon) {
  let bestIdx = 0;
  let bestD = Infinity;
  for (let i = 0; i < coords.length; i++) {
    const d = haversineKmJs(coords[i][0], coords[i][1], lat, lon);
    if (d < bestD) {
      bestD = d;
      bestIdx = i;
    }
  }
  return cum[bestIdx];
}

// Proyecta la posicion real del GPS sobre el segmento mas cercano de la
// ruta (no solo el vertice mas cercano, para que el avance sea suave), en
// metros planos aproximados (equirectangular alrededor de la latitud
// actual -- suficiente precision a la escala de una ruta interurbana).
// Devuelve la distancia recorrida sobre la ruta y que tan lejos esta el GPS
// de la ruta (para avisar si la persona se desvio).
function projectOntoRoute(coords, cum, lat, lon) {
  const R = 6371008.8;
  const latRad0 = (lat * Math.PI) / 180;
  const cosLat0 = Math.cos(latRad0);
  const toXY = (la, lo) => [((lo * Math.PI) / 180) * cosLat0 * R, (la * Math.PI) / 180 * R];
  const [px, py] = toXY(lat, lon);

  let bestDist = Infinity;
  let bestCum = 0;
  for (let i = 0; i < coords.length - 1; i++) {
    const [ax, ay] = toXY(coords[i][0], coords[i][1]);
    const [bx, by] = toXY(coords[i + 1][0], coords[i + 1][1]);
    const dx = bx - ax;
    const dy = by - ay;
    const lenSq = dx * dx + dy * dy;
    let t = lenSq > 0 ? ((px - ax) * dx + (py - ay) * dy) / lenSq : 0;
    t = Math.max(0, Math.min(1, t));
    const cx = ax + dx * t;
    const cy = ay + dy * t;
    const dist = Math.hypot(px - cx, py - cy);
    if (dist < bestDist) {
      bestDist = dist;
      bestCum = cum[i] + (cum[i + 1] - cum[i]) * t;
    }
  }
  return { traveledKm: bestCum, offRouteM: bestDist };
}

let liveTrip = null; // ver startLiveTrip() -- null cuando no se esta siguiendo activamente
let liveMarker = null; // separado de liveTrip: al llegar a destino se deja el marcador puesto
let liveAccuracyCircle = null;

function removeLiveMarker() {
  if (liveMarker) {
    map.removeLayer(liveMarker);
    liveMarker = null;
  }
  if (liveAccuracyCircle) {
    map.removeLayer(liveAccuracyCircle);
    liveAccuracyCircle = null;
  }
}

// Corta el seguimiento (cancelar, error de permiso, o antes de arrancar un
// viaje nuevo) y borra el marcador -- a diferencia de una llegada exitosa,
// aca no hay "donde llegaste" que mostrar.
export function endLiveTrip() {
  if (liveTrip && liveTrip.watchId != null) navigator.geolocation.clearWatch(liveTrip.watchId);
  liveTrip = null;
  removeLiveMarker();
  tripEls.startBtn.disabled = false;
  setStartBtn("play", "Iniciar viaje");
  tripEls.speedAdvisory.classList.add("hidden");
}

function handleLiveError(err) {
  const isPermission = err.code === err.PERMISSION_DENIED;
  let msg;
  if (isPermission) {
    msg = "Permiso de ubicacion denegado: activalo en la configuracion del navegador para seguir el viaje en vivo.";
  } else if (err.code === err.TIMEOUT) {
    msg = "Buscando senal de GPS...";
  } else {
    msg = "No se pudo obtener tu ubicacion por el momento.";
  }
  tripEls.live.classList.remove("hidden");
  tripEls.status.textContent = msg;
  tripEls.status.classList.remove("charging", "done");
  tripEls.status.classList.toggle("warn", isPermission);
  // Un timeout o senal debil pasajera no debe matar el viaje -- el
  // navegador sigue reintentando watchPosition solo. Un permiso denegado
  // si es terminal: no hay forma de recuperarse sin que el usuario
  // reactive el permiso a mano, asi que ahi se corta el seguimiento.
  if (isPermission) endLiveTrip();
}

function handleLivePosition(pos) {
  if (!liveTrip) return;
  const { latitude, longitude, accuracy } = pos.coords;

  if (!liveMarker) {
    liveMarker = L.marker([latitude, longitude], {
      icon: L.divIcon({
        className: "",
        html:
          `<div class="live-location-marker"><div class="live-location-pulse"></div><div class="live-location-dot"></div><div class="live-location-car">${icons.car}</div></div>`,
        iconSize: [30, 30],
        iconAnchor: [15, 15],
      }),
      zIndexOffset: 1000,
    }).addTo(map);
    liveAccuracyCircle = L.circle([latitude, longitude], {
      radius: accuracy || 0,
      color: "#3aa0ff",
      weight: 1,
      fillColor: "#3aa0ff",
      fillOpacity: 0.12,
    }).addTo(map);
    map.setView([latitude, longitude], Math.max(map.getZoom(), 15));
    liveTrip.startedRealMs = Date.now();
  } else {
    liveMarker.setLatLng([latitude, longitude]);
    liveAccuracyCircle.setLatLng([latitude, longitude]);
    liveAccuracyCircle.setRadius(accuracy || 0);
  }

  const { traveledKm, offRouteM } = projectOntoRoute(liveTrip.coords, liveTrip.cum, latitude, longitude);
  // El punto "mas cercano" de una curva a una posicion lejana sigue siendo
  // UN punto de la curva, aunque este a cientos de km -- si el usuario esta
  // en Montevideo probando una ruta que va por el interior, ese punto mas
  // cercano puede caer, por pura geometria, justo cerca del extremo del
  // destino, y sin este chequeo eso se leia como "ya llegaste". Mas alla de
  // esta distancia, la proyeccion ya no dice nada sobre "cuanto avanzaste
  // en ESTE viaje": se ignora para progreso/bateria/recargas/llegada, y se
  // lo dice explicitamente en vez de mostrar un numero inventado.
  const FAR_FROM_ROUTE_M = 500;
  const onRoute = offRouteM <= FAR_FROM_ROUTE_M;
  if (onRoute) {
    liveTrip.lastTrustedKm = Math.max(0, Math.min(liveTrip.totalKm, traveledKm));
  }
  const clampedKm = liveTrip.lastTrustedKm;

  let newlyArrivedStation = null;
  if (onRoute) {
    for (const rc of liveTrip.rechargeStops) {
      if (!rc.applied && clampedKm >= rc.cumKm) {
        rc.applied = true;
        newlyArrivedStation = rc.stationName;
      }
    }
  }
  const appliedKwh = liveTrip.rechargeStops.filter((r) => r.applied).reduce((s, r) => s + r.addedKwh, 0);
  const battery = Math.max(0, liveTrip.batteryStart - clampedKm * liveTrip.consumption + appliedKwh);
  const elapsedMin = (Date.now() - liveTrip.startedRealMs) / 60000;

  tripEls.distance.textContent = `${clampedKm.toFixed(1)} / ${liveTrip.totalKm.toFixed(1)} km`;
  tripEls.battery.textContent = formatBattery(battery, liveTrip.capacityKwh);
  tripEls.time.textContent = `${elapsedMin.toFixed(0)} min`;
  tripEls.progressFill.style.width = Math.min(100, (clampedKm / Math.max(0.001, liveTrip.totalKm)) * 100).toFixed(1) + "%";

  // Velocidad actual: se prefiere pos.coords.speed (m/s, del propio chip
  // GPS) cuando el navegador lo entrega -- mas preciso que derivarla
  // nosotros. Si no esta disponible (comun fuera de movil), se calcula a
  // partir de la posicion anterior, pero solo con la brecha entre fixes
  // en un rango razonable: menos de 2s y el ruido de posicion del GPS se
  // traduce en saltos de velocidad sin sentido (una diferencia de 3m en
  // 0.5s ya "es" 21 km/h de ruido puro); mas de 30s (pantalla apagada,
  // tunel, celular en el bolsillo sin señal) y el promedio deja de decir
  // algo sobre el ritmo ACTUAL -- puede incluir una parada entera y salir
  // artificialmente bajo justo al recuperar señal. Fuera de ese rango se
  // prefiere no actualizar (mantener el ultimo valor suavizado) antes que
  // mostrar un numero calculado sobre una brecha que no representa nada.
  const now = Date.now();
  let rawSpeedKmh = null;
  if (typeof pos.coords.speed === "number" && pos.coords.speed >= 0) {
    rawSpeedKmh = pos.coords.speed * 3.6;
  } else if (liveTrip.lastFix) {
    const gapMs = now - liveTrip.lastFix.tMs;
    if (gapMs >= 2000 && gapMs <= 30000) {
      const dKm = haversineKmJs(liveTrip.lastFix.lat, liveTrip.lastFix.lon, latitude, longitude);
      rawSpeedKmh = (dKm / gapMs) * 3600000;
    }
  }
  if (rawSpeedKmh != null) {
    liveTrip.speedKmh = liveTrip.speedKmh == null ? rawSpeedKmh : liveTrip.speedKmh * 0.7 + rawSpeedKmh * 0.3;
  }
  liveTrip.lastFix = { lat: latitude, lon: longitude, tMs: now };
  tripEls.speed.textContent = liveTrip.speedKmh != null ? `${Math.round(liveTrip.speedKmh)} km/h` : "-";

  const distToDestM = haversineKmJs(latitude, longitude, liveTrip.destination[0], liveTrip.destination[1]) * 1000;

  // Estar lejos del destino es la prueba de que el viaje todavia no termino.
  // Se recuerda porque habilita la deteccion de llegada por cercania de
  // abajo: sin este candado, arrancar un viaje HACIA donde uno ya esta
  // parado (poner la casa de destino estando en casa) se registraba al
  // instante como viaje completo, sumando al historial kilometros que nadie
  // manejo. Estar pegado al destino prueba que estas ahi, no que llegaste
  // manejando.
  if (distToDestM > DEPARTED_FROM_DESTINATION_M) {
    liveTrip.hasLeftDestination = true;
  }

  // "Llegaste" tiene dos formas validas de detectarse:
  //   1. Estar fisicamente pegado al destino DESPUES de haberte alejado de
  //      el. No depende de la proyeccion sobre la ruta, asi que sigue
  //      funcionando si el ultimo tramo (entrar a una cochera) se sale del
  //      camino calculado.
  //   2. Haber recorrido toda la ruta segun la proyeccion -- pero eso solo
  //      cuenta estando sobre la ruta (onRoute), si no cualquier posicion
  //      lejana con proyeccion "casi al final" dispara una llegada falsa.
  const arrived =
    (liveTrip.hasLeftDestination && distToDestM < 60) || (onRoute && liveTrip.totalKm - clampedKm < 0.05);

  if (arrived) {
    tripEls.progressFill.classList.remove("charging");
    tripEls.progressFill.style.width = "100%";
    tripEls.status.textContent = "Llegaste a destino";
    tripEls.status.classList.remove("charging", "warn");
    tripEls.status.classList.add("done");
    // Se corta el seguimiento pero se deja el marcador puesto (a
    // diferencia de cancelar): mostrar donde llegaste tiene sentido.
    if (liveTrip.watchId != null) navigator.geolocation.clearWatch(liveTrip.watchId);
    // Se guarda el viaje completo (distancia total planeada, no solo lo
    // que la proyeccion onRoute alcanzo a confirmar): llegar fisicamente
    // al destino ya prueba que se hizo el recorrido entero, aunque el
    // ultimo tramo (p.ej. entrando a una cochera) no haya quedado sobre
    // la ruta calculada.
    logCompletedOrPartialTrip(liveTrip, liveTrip.totalKm);
    liveTrip = null;
    tripEls.startBtn.disabled = false;
    setStartBtn("play", "Iniciar viaje de nuevo");
    tripEls.speedAdvisory.classList.add("hidden");
    return;
  }

  if (!onRoute) {
    tripEls.status.textContent = `Estas a ${(offRouteM / 1000).toFixed(1)} km de la ruta calculada: el progreso no se puede seguir hasta que estes sobre ella.`;
    tripEls.status.classList.remove("charging", "done");
    tripEls.status.classList.add("warn");
  } else if (newlyArrivedStation) {
    tripEls.status.textContent = `Pasaste por ${newlyArrivedStation}: bateria actualizada`;
    tripEls.status.classList.remove("warn");
    tripEls.status.classList.add("charging");
  } else if (offRouteM > 150) {
    tripEls.status.textContent = "Te alejaste de la ruta calculada";
    tripEls.status.classList.remove("charging");
    tripEls.status.classList.add("warn");
  } else {
    tripEls.status.textContent = "En ruta...";
    tripEls.status.classList.remove("charging", "warn");
  }

  // Aviso de velocidad recomendada: solo tiene sentido estando sobre la
  // ruta (offRoute ya invalida clampedKm/remainingKm) y con una lectura de
  // velocidad ya estabilizada (liveTrip.speedKmh sigue null hasta el
  // segundo fix confiable).
  //
  // El margen se calcula contra la PROXIMA parada de recarga pendiente, no
  // contra el destino final: la bateria actual (batteryKwh) todavia no
  // incluye la energia de esa parada (se suma recien al pasar por ahi, ver
  // appliedKwh arriba), asi que medirla contra el total del viaje
  // subestima sistematicamente el margen real -- avisaria "no llegas" con
  // el viaje yendo perfecto, apenas porque falta pasar por la estacion ya
  // planeada.
  const nextPendingStop = liveTrip.rechargeStops.find((r) => !r.applied);
  const advisory = onRoute
    ? computeSpeedAdvisory({
        speedKmh: liveTrip.speedKmh,
        batteryKwh: battery,
        consumptionKwhKm: liveTrip.consumption,
        remainingKm: (nextPendingStop ? nextPendingStop.cumKm : liveTrip.totalKm) - clampedKm,
        pendingRecharge: !!nextPendingStop,
      })
    : null;
  if (advisory) {
    tripEls.speedAdvisory.textContent = advisory.text;
    tripEls.speedAdvisory.classList.remove("hidden", "ok", "tight", "warn", "danger");
    tripEls.speedAdvisory.classList.add(advisory.kind);
  } else {
    tripEls.speedAdvisory.classList.add("hidden");
  }
}

function startLiveTrip(result, vehicle, startBatteryKwh) {
  endLiveTrip();

  tripEls.live.classList.remove("hidden");
  tripEls.status.classList.remove("done", "charging", "warn");

  if (!navigator.geolocation) {
    tripEls.status.textContent = "Tu navegador no soporta geolocalizacion: no se puede seguir el viaje en vivo.";
    tripEls.status.classList.add("warn");
    return;
  }
  if (!window.isSecureContext) {
    tripEls.status.textContent = "El seguimiento en vivo necesita una conexion segura (HTTPS).";
    tripEls.status.classList.add("warn");
    return;
  }

  const coords = result.astar.route_coords;
  const nodeIds = result.astar.route;
  const nodeCoords = result.astar.node_coords;
  const cum = buildRouteCumulative(coords);
  const totalKm = cum[cum.length - 1];

  const rechargeStops = result.astar.recharges
    .map((rc) => {
      const idx = nodeIds.indexOf(rc.node_id);
      const nodeLatLng = idx >= 0 ? nodeCoords[idx] : null;
      const cumKm = nodeLatLng ? nearestCumulativeDistance(coords, cum, nodeLatLng[0], nodeLatLng[1]) : 0;
      return { nodeId: rc.node_id, cumKm, addedKwh: rc.added_kwh, stationName: rc.station_name, applied: false };
    })
    .sort((a, b) => a.cumKm - b.cumKm);

  liveTrip = {
    watchId: null,
    coords,
    cum,
    totalKm,
    lastTrustedKm: 0,
    // ¿Se alejo alguna vez del destino? Ver el chequeo de "arrived" mas
    // abajo: sin esto, arrancar un viaje estando ya parado en el destino se
    // registraba al instante como viaje completo.
    hasLeftDestination: false,
    rechargeStops,
    consumption: vehicle.consumption_kwh_per_km,
    capacityKwh: vehicle.battery_capacity_kwh,
    batteryStart: startBatteryKwh,
    startedRealMs: Date.now(),
    destination: coords[coords.length - 1],
    speedKmh: null, // se estabiliza en el segundo fix del GPS, ver handleLivePosition
    lastFix: null,
  };

  setStartBtn("stop", "Cancelar viaje");
  tripEls.status.textContent = "Buscando tu ubicacion...";
  tripEls.progressFill.classList.remove("charging");
  tripEls.progressFill.style.width = "0%";
  tripEls.distance.textContent = `0.0 / ${totalKm.toFixed(1)} km`;
  tripEls.battery.textContent = formatBattery(startBatteryKwh, vehicle.battery_capacity_kwh);
  tripEls.time.textContent = "0 min";
  tripEls.speed.textContent = "-";
  tripEls.speedAdvisory.classList.add("hidden");

  // Antes de arrancar el seguimiento hay que confirmar que la persona esta
  // efectivamente en el origen. Un viaje en vivo mide lo que se recorre
  // DESDE el origen: si se arranca estando en cualquier otro lado, todo lo
  // que se mida despues es sobre una ruta que no se esta haciendo, y termina
  // guardado en el historial como si se hubiera manejado.
  navigator.geolocation.getCurrentPosition(
    (pos) => {
      const distanciaAlOrigenKm = haversineKmJs(pos.coords.latitude, pos.coords.longitude, coords[0][0], coords[0][1]);
      if (distanciaAlOrigenKm > MAX_DISTANCE_FROM_ORIGIN_KM) {
        liveTrip = null;
        setStartBtn("play", "Iniciar viaje");
        tripEls.startBtn.disabled = false;
        tripEls.live.classList.add("hidden");
        tripEls.status.textContent =
          `No se puede iniciar el viaje: estas a ${distanciaAlOrigenKm.toFixed(1)} km del origen de la ruta. ` +
          `Acercate al origen, o recalcula la ruta desde donde estas ahora (podes usar "Usar mi ubicacion como origen").`;
        tripEls.status.classList.remove("charging", "done");
        tripEls.status.classList.add("warn");
        return;
      }

      tripEls.status.textContent = "En ruta...";
      tripEls.status.classList.remove("warn", "charging", "done");
      liveTrip.watchId = navigator.geolocation.watchPosition(handleLivePosition, handleLiveError, {
        enableHighAccuracy: true,
        maximumAge: 4000,
        timeout: 15000,
      });
    },
    handleLiveError,
    { enableHighAccuracy: true, timeout: 15000, maximumAge: 60000 }
  );
}

tripEls.startBtn.addEventListener("click", () => {
  if (liveTrip) {
    const trip = liveTrip;
    // Si no avanzaste nada de verdad (GPS quieto en el mismo punto), no
    // queda nada guardado -- solo cancelar una intencion, no un viaje. Si
    // avanzaste una distancia real, se guarda el tramo recorrido antes de
    // cortar el seguimiento (por eso se decide con el estado ANTES de
    // endLiveTrip(), que resetea liveTrip a null).
    if (trip.lastTrustedKm >= MIN_PROGRESS_TO_LOG_KM) {
      tripEls.status.textContent = `Viaje cancelado y guardado (${trip.lastTrustedKm.toFixed(1)} km recorridos).`;
      logCompletedOrPartialTrip(trip);
    } else {
      tripEls.status.textContent = "Viaje cancelado.";
    }
    tripEls.status.classList.remove("charging", "done", "warn");
    endLiveTrip();
    return;
  }
  if (!state.lastResult || !state.lastResult.astar.found) return;
  const vehicle = selectedVehicle();
  if (!vehicle) return;
  const startBatteryKwh = batteryPctToKwh(vehicle, Number(els.startBattery.value));
  startLiveTrip(state.lastResult, vehicle, startBatteryKwh);
});
