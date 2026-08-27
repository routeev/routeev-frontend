import { useTranslation } from "../i18n/LanguageProvider";
import { formatDuration, formatUyu } from "../shared/format";
import { AUTO_LOCATE_ZOOM } from "./mapConstants";
import { useMapStore, selectedVehicle, batteryPctToKwh } from "./mapStore";
import { findStationDetail, pctOfCapacity, hayPeajeSinMonto, summarizeTrip } from "./tripStats";
import type { LiveTripUi } from "./useLiveTrip";
import styles from "./TripDashboard.module.css";

const BOLT_PATH = "M13.2 2 4.5 13.4h6.1L10.2 22l8.9-11.6h-6.3L13.2 2Z";
const PLAY_PATH = "M8 5.2v13.6L19 12 8 5.2Z";

// Precio unitario ($/min) con dos decimales es-UY. El mapa no importa nada del
// showroom (donde vive num()) y no vale la pena cruzar módulos por una línea:
// mismo criterio de formato, helper local.
function precioUnitario(valor: number): string {
  return valor.toLocaleString("es-UY", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// "Tiempo estimado" era un solo numero (manejo + trafico + carga sumados)
// aunque el backend ya los manda separados -- esto arma el desglose como
// sub-texto. Si un viaje tiene un solo componente real (lo mas comun: sin
// trafico ni recargas), mostrar el desglose no aporta nada sobre el numero
// grande de arriba, asi que se omite.
function formatTimeBreakdown(
  drivingMin: number,
  trafficMin: number,
  chargingMin: number,
  t: { driving: (min: string) => string; traffic: (min: string) => string; charging: (min: string) => string }
): string | null {
  const parts: string[] = [];
  if (drivingMin > 0.5) parts.push(t.driving(formatDuration(drivingMin)));
  if (trafficMin > 0.5) parts.push(t.traffic(formatDuration(trafficMin)));
  if (chargingMin > 0.5) parts.push(t.charging(formatDuration(chargingMin)));
  return parts.length > 1 ? parts.join(" + ") : null;
}

function TripStatCard({ label, value, sub, large }: { label: string; value: string; sub?: string | null; large?: boolean }) {
  return (
    <div className={styles.stat}>
      <div className={styles.statLabel}>{label}</div>
      <div className={["mono-num", styles.statValue, large ? styles.statValueLarge : ""].join(" ")}>{value}</div>
      {sub && <div className={["mono-num", styles.statSub].join(" ")}>{sub}</div>}
    </div>
  );
}

interface TripDashboardProps {
  liveTrip: { ui: LiveTripUi; start: () => void; cancel: () => void };
}

export function TripDashboard({ liveTrip }: TripDashboardProps) {
  const { t } = useTranslation();
  const td = t.map.tripDashboard;
  const result = useMapStore((s) => s.lastResult);
  const replaySuffix = useMapStore((s) => s.replaySuffix);
  const stations = useMapStore((s) => s.stations);
  const startBatteryPct = useMapStore((s) => s.startBatteryPct);
  const vehicle = useMapStore(selectedVehicle);

  if (!result) return null;

  const primary = result.astar.found ? result.astar : (result.dijkstra ?? result.astar);
  const startBatteryKwh = vehicle ? batteryPctToKwh(vehicle, startBatteryPct) : 0;
  const summary = summarizeTrip(vehicle, startBatteryKwh, primary);
  const routeLabel = `${result.origin.name} → ${result.destination.name}${replaySuffix ?? ""}`;

  // Semáforo del margen de batería (viene del backend; ausente en replays de
  // rutas guardadas antes de esta versión). Crítico < 5% SIEMPRE, aunque el
  // margen esté desactivado; "bajo" entre 5% y el margen configurado.
  const bateria = result.bateria ?? null;
  const llegadaPct = bateria?.llegada_pct ?? null;
  const marginTone =
    llegadaPct === null ? null : llegadaPct < 5 ? "danger" : llegadaPct < (bateria?.margen_pct ?? 0) ? "warn" : "ok";
  const showMarginBanner = marginTone !== null && !(marginTone === "ok" && (bateria?.margen_pct ?? 0) === 0);
  // marginTone === null (bateria ausente, p. ej. en todo replay desde el
  // historial: el backend nunca guarda "bateria" en result_json, solo astar/
  // dijkstra) cae en este mismo "else" -- sin el chequeo explicito de "ok" acá
  // abajo, el ! de llegadaPct explotaba con "Cannot read properties of null"
  // aunque showMarginBanner ya fuera false y este texto nunca se mostrara.
  const marginText =
    marginTone === "danger"
      ? td.margin.critical(llegadaPct!.toFixed(1))
      : marginTone === "warn"
        ? td.margin.low(llegadaPct!.toFixed(1), bateria?.margen_pct ?? 0)
        : marginTone === "ok"
          ? td.margin.ok(llegadaPct!.toFixed(1), bateria?.margen_pct ?? 0)
          : "";
  const marginFallbackText =
    bateria && !bateria.margen_alcanzado && llegadaPct !== null ? td.margin.noPlanFallback : "";
  // Cuando la reserva subió porque el destino no tiene enchufe, decirlo: si no,
  // el número del margen no cierra con el 10% que la persona cree que rige y
  // parece un error de la app en vez de la decisión que ella misma tomó.
  const reserva = bateria?.reserva ?? null;
  // `reserva` es la que se PIDIÓ, no la que se logró: el backend la arma antes
  // de buscar, y search_with_reserve reintenta con 0 cuando con esa reserva no
  // existe ningún plan (ver route_routes.py y margen_alcanzado). Sin este
  // chequeo, un viaje que no la respeta mostraba las dos frases juntas: "no hay
  // plan de cargas que respete ese margen" seguido de "el viaje se calculó
  // guardando un 22% para que puedas llegar hasta un cargador". La segunda es
  // una promesa de seguridad que la ruta devuelta no cumple, que es la peor
  // clase de error que puede cometer esta pantalla.
  const reservaAplicada = reserva?.motivo === "cargador_destino" && bateria?.margen_alcanzado === true;
  const reservaText = reservaAplicada
    ? td.margin.reserveApplied(reserva!.pct.toFixed(0))
    : reserva?.motivo === "cargador_destino"
      ? td.margin.reserveNotEnough
      : "";

  // El cargador del destino: sólo viene cuando se pidió la ruta declarando que
  // allá no hay dónde enchufar. Contesta la pregunta que sigue a "¿llego?".
  const cargador = result.cargador_destino ?? null;

  // Respaldo por parada. Alineado 1 a 1 con recharges igual que los costos, con
  // el node_id de respaldo por si los largos no coinciden (una API vieja no
  // manda nada y esto queda en undefined, que la fila entiende como "no mostrar").
  const respaldos = result.respaldo_paradas?.paradas;
  const respaldoDe = (i: number, nodeId: number | string) => {
    const fila =
      respaldos && respaldos.length === primary.recharges.length
        ? respaldos[i]
        : respaldos?.find((p) => p.node_id === String(nodeId));
    return fila?.respaldo ?? null;
  };

  // Desglose del costo. El texto de peajes es el mismo de siempre (con o sin
  // montos desconocidos); lo que cambia con el backend nuevo es la energía:
  // costo_uyu_recargas presente significa que costo_uyu_energia es SOLO lo
  // cargado en casa y las recargas en ruta van cotizadas aparte, con el
  // tarifario de cada operador. Backend viejo: un solo renglón de energía.
  const bd = primary.breakdown;
  const peajesSub = hayPeajeSinMonto(bd)
    ? bd.peaje_uyu > 0
      ? td.cost.tollsPartialAmount(formatUyu(bd.peaje_uyu))
      : td.cost.tollsNoAmount
    : formatUyu(bd.peaje_uyu);
  const sinTarifa = bd.recargas_sin_tarifa ?? 0;
  const costoSub =
    bd.costo_uyu_recargas != null
      ? td.cost.homeAndRoute(formatUyu(bd.costo_uyu_energia), formatUyu(bd.costo_uyu_recargas), peajesSub) +
        (sinTarifa > 0 ? td.cost.withoutTariff(sinTarifa) : "")
      : td.cost.homeOnly(formatUyu(bd.costo_uyu_energia), peajesSub);

  const timeBreakdown = summary
    ? formatTimeBreakdown(summary.drivingMin, summary.trafficMin, summary.chargingMin, td.timeBreakdown)
    : null;
  // Igual que costoSub arriba: energia_recargada_kwh > 0 es la señal de que
  // hubo carga en ruta ademas de la de casa (backend nuevo). Sin eso, el
  // desglose casa/ruta seria identico al numero de arriba, redundante.
  const energySub = !summary
    ? null
    : summary.publicEnergyKwh != null && summary.publicEnergyKwh > 0
      ? td.energyBreakdown.homeAndRoute(
          summary.consumedKwh.toFixed(2),
          summary.homeEnergyKwh?.toFixed(2) ?? "0.00",
          summary.publicEnergyKwh.toFixed(2)
        )
      : summary.consumedPct !== null
        ? `${summary.consumedKwh.toFixed(2)} kWh`
        : null;

  return (
    <section className={styles.dashboard}>
      <div className={styles.header}>
        <div>
          <h2>{td.title}</h2>
          <div className={styles.routeLabel}>{routeLabel}</div>
        </div>
      </div>

      {!summary ? (
        <div className={styles.stat} style={{ gridColumn: "1 / -1" }}>
          <div className={[styles.statValue, styles.notFound].join(" ")}>{td.noRouteFound}</div>
        </div>
      ) : liveTrip.ui.active ? null : (
        // Con el viaje en curso, todo este bloque (margen, cargador del
        // destino, la grilla completa de estadisticas planificadas y las
        // paradas de carga) es info de planificacion que ya cumplio su
        // proposito -- lo que importa mientras se maneja es el bloque .live
        // de mas abajo. Misma condicion que el boton de cerrar arriba: vuelve
        // a mostrarse en cuanto el viaje termina o se cancela.
        <>
          {showMarginBanner && (
            <div
              className={[
                styles.advisory,
                marginTone === "danger" ? styles.advisoryDanger : marginTone === "warn" ? styles.advisoryWarn : styles.advisoryOk,
              ].join(" ")}
              style={{ marginTop: 0, marginBottom: 10 }}
            >
              {marginText}
              {marginFallbackText}
              {reservaText}
            </div>
          )}
          {cargador && (
            <div className={styles.cargadorDestino}>
              <p className={styles.cargadorDestinoTitulo}>{td.destinationCharger.title}</p>
              <p className={styles.cargadorDestinoNombre}>{cargador.nombre}</p>
              <p className={styles.cargadorDestinoDato}>
                {td.destinationCharger.distance(cargador.distancia_km_recta.toFixed(1))}
                {cargador.potencia_kw ? ` · ${Math.round(cargador.potencia_kw)} kW` : ""}
                {cargador.operador ? ` · ${cargador.operador}` : ""}
                {cargador.direccion ? ` · ${cargador.direccion}` : ""}
              </p>
              {cargador.demasiado_lejos ? (
                // No se disimula: si el cargador más cercano está a esa
                // distancia, el problema no es el margen, es que ahí no hay
                // infraestructura, y la persona tiene que poder decidir con eso.
                <p className={styles.cargadorDestinoAviso}>{td.destinationCharger.tooFar}</p>
              ) : null}
            </div>
          )}
          <div className={styles.stats}>
            <TripStatCard label={td.stats.distance} value={`${summary.distanceKm.toFixed(1)} km`} large />
            <TripStatCard label={td.stats.estimatedTime} value={formatDuration(summary.timeMin)} sub={timeBreakdown} large />
            {summary.avgSpeedKmh !== null && (
              <TripStatCard label={td.stats.avgSpeed} value={`${Math.round(summary.avgSpeedKmh)} km/h`} />
            )}
            <TripStatCard
              label={td.stats.batteryConsumed}
              value={summary.consumedPct !== null ? `${summary.consumedPct.toFixed(0)}%` : `${summary.consumedKwh.toFixed(2)} kWh`}
              sub={energySub}
            />
            <TripStatCard
              label={td.stats.batteryOnArrival}
              value={summary.arrivalPct !== null ? `${summary.arrivalPct.toFixed(0)}%` : `${summary.arrivalKwh.toFixed(1)} kWh`}
              sub={summary.arrivalPct !== null ? `${summary.arrivalKwh.toFixed(1)} kWh` : null}
            />
            <TripStatCard label={td.stats.rechargeStops} value={String(summary.rechargeCount)} />
            <TripStatCard label={td.stats.estimatedCost} value={formatUyu(summary.costUyu)} sub={costoSub} />
            <TripStatCard
              label={td.stats.tolls}
              value={summary.hasTolls ? td.tolls.count(summary.tollCount) : td.tolls.none}
              sub={
                summary.hasTolls
                  ? hayPeajeSinMonto(primary.breakdown)
                    ? primary.breakdown.peaje_uyu > 0
                      ? td.cost.tollsPartialAmount(formatUyu(primary.breakdown.peaje_uyu))
                      : td.tolls.amountUnavailable
                    : formatUyu(primary.breakdown.peaje_uyu)
                  : null
              }
            />
          </div>

          <div className={styles.chargingStops}>
            {primary.recharges.length === 0 ? (
              <p className="hint" style={{ margin: "8px 0 0" }}>
                {td.noRechargeStops}
              </p>
            ) : (
              <>
                <h3>{td.chargingStopsTitle}</h3>
                {primary.recharges.map((rc, i) => {
                  const detail = findStationDetail(stations, rc.node_id);
                  const addedPct = pctOfCapacity(rc.added_kwh, vehicle);
                  // recargas_costos viene alineado 1 a 1 con recharges, y la
                  // misma estación puede aparecer dos veces (ida y vuelta):
                  // por eso el índice es el criterio primario y el node_id
                  // queda de fallback por si los largos no coinciden.
                  const costos = bd.recargas_costos;
                  const rcTarifa =
                    costos && costos.length === primary.recharges.length
                      ? costos[i]
                      : costos?.find((c) => c.node_id === String(rc.node_id));
                  return (
                    <div className={styles.stopCard} key={i}>
                      <div className={styles.stopHeader}>
                        <svg viewBox="0 0 24 24" aria-hidden="true">
                          <path d={BOLT_PATH} />
                        </svg>
                        {rc.station_name}
                      </div>
                      <div className={styles.stopRow}>
                        <span>{td.stopCard.batteryAdded}</span>
                        <b>{addedPct !== null ? `+${addedPct.toFixed(0)}% (+${rc.added_kwh.toFixed(1)} kWh)` : `+${rc.added_kwh.toFixed(1)} kWh`}</b>
                      </div>
                      <div className={styles.stopRow}>
                        <span>{td.stopCard.chargingTime}</span>
                        <b>{rc.time_min.toFixed(1)} min</b>
                      </div>
                      {rcTarifa && (
                        <div className={styles.stopRow}>
                          <span>{td.stopCard.cost}</span>
                          <b>{rcTarifa.costo_uyu != null ? formatUyu(rcTarifa.costo_uyu) : td.stopCard.unpublishedRate}</b>
                        </div>
                      )}
                      {/* Ocupación: informativa (corre si te quedás enchufado
                          sin cargar), por eso no está sumada en ningún costo. */}
                      {rcTarifa?.tarifa_conocida &&
                        rcTarifa.ocupacion_uyu_min != null &&
                        rcTarifa.ocupacion_tolerancia_min != null && (
                          <div className={styles.stopRow}>
                            <span>{td.stopCard.occupation}</span>
                            <b>
                              {td.stopCard.occupationValue(precioUnitario(rcTarifa.ocupacion_uyu_min), rcTarifa.ocupacion_tolerancia_min)}
                            </b>
                          </div>
                        )}
                      {detail && (
                        <div className={styles.stopRow}>
                          <span>{td.stopCard.address}</span>
                          <b>{detail.direccion}</b>
                        </div>
                      )}
                      {detail && (
                        <div className={styles.stopRow}>
                          <span>{td.stopCard.availablePower}</span>
                          <b>{detail.potencia_kw} kW max</b>
                        </div>
                      )}
                      {detail && (
                        <div className={styles.stopRow}>
                          <span>{td.stopCard.connectors}</span>
                          <b>{detail.tipo_conector}</b>
                        </div>
                      )}
                      {/* Si este cargador no funciona, ¿a dónde se va? Es la
                          pregunta que aparece recién cuando ya estás ahí, y
                          para entonces es tarde para decidir con la batería
                          en el margen. */}
                      {respaldoDe(i, rc.node_id) && (
                        <div className={styles.stopRow}>
                          <span>{td.stopCard.backup}</span>
                          <b>
                            {td.stopCard.backupValue(
                              respaldoDe(i, rc.node_id)!.nombre,
                              respaldoDe(i, rc.node_id)!.distancia_km_recta,
                              respaldoDe(i, rc.node_id)!.demasiado_lejos
                            )}
                          </b>
                        </div>
                      )}
                    </div>
                  );
                })}
              </>
            )}
          </div>
        </>
      )}

      {result.astar.found && vehicle && (
        <div className={styles.control}>
          <div className={styles.controlActions}>
            {!liveTrip.ui.active ? (
              <button type="button" className={["primary", styles.startBtn].join(" ")} onClick={liveTrip.start}>
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d={PLAY_PATH} />
                </svg>
                <span>{liveTrip.ui.finished ? td.startTripAgain : td.startTrip}</span>
              </button>
            ) : (
              <button type="button" className={["primary", styles.startBtn].join(" ")} onClick={liveTrip.cancel}>
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <rect x="6.5" y="6.5" width="11" height="11" rx="1.6" />
                </svg>
                <span>{td.cancelTrip}</span>
              </button>
            )}
            {!liveTrip.ui.active && (
              // Reemplaza la "x" que antes vivía en el header (misma acción:
              // resetTripPlanning, no solo limpiar el resultado calculado,
              // asi origen/destino ya fijados en "Tu viaje" tambien se
              // sueltan y no quedan listos para recalcular la misma ruta por
              // accidente). Pedido explicito: un boton de texto al lado de
              // "Iniciar viaje" en vez del icono suelto en la esquina.
              <button
                type="button"
                className={["ghost", styles.cancelPlanBtn].join(" ")}
                onClick={() => {
                  const state = useMapStore.getState();
                  state.resetTripPlanning();
                  // Mismo criterio que el popupclose de StationsLayer: sin
                  // esto la cámara se quedaba mirando fija donde estaba el
                  // viaje anterior -- volver a la ubicación real es lo que
                  // de verdad se siente como "arrancar de nuevo".
                  if (state.myPosition) state.leafletMap?.setView(state.myPosition, AUTO_LOCATE_ZOOM);
                }}
              >
                {td.cancelPlan}
              </button>
            )}
          </div>

          {/* "Iniciar viaje" puede rechazarse sin llegar a arrancar el
              seguimiento en vivo (lejos del origen, sin GPS, sin HTTPS) --
              ese rechazo deja active/finished en false a propósito (no hay
              nada que cancelar), pero el motivo hay que mostrarlo igual: sin
              esto, tocar el botón parecía no hacer nada. */}
          {!liveTrip.ui.active && !liveTrip.ui.finished && liveTrip.ui.statusText && (
            <div className={[styles.advisory, styles.advisoryWarn].join(" ")} style={{ marginTop: 10 }}>
              {liveTrip.ui.statusText}
            </div>
          )}

          {/* El viaje terminó pero no se pudo guardar en el historial. Antes
              esto era un console.warn: la persona veía "Llegaste" y el viaje
              desaparecía sin más. Es dato real de un recorrido que ya ocurrió
              y no se puede volver a producir, así que se dice. */}
          {liveTrip.ui.saveError && (
            <div
              className={[styles.advisory, styles.advisoryDanger].join(" ")}
              style={{ marginTop: 10 }}
              role="alert"
            >
              {liveTrip.ui.saveError}
            </div>
          )}

          {(liveTrip.ui.active || liveTrip.ui.finished) && (
            <div className={styles.live}>
              <div className={styles.liveRow}>
                <div className={styles.liveItem}>
                  <span className={styles.liveLabel}>{td.live.distance}</span>
                  <span className={["mono-num", styles.liveValue].join(" ")}>
                    {liveTrip.ui.distanceKm.toFixed(1)} / {liveTrip.ui.totalKm.toFixed(1)} km
                  </span>
                </div>
                <div className={styles.liveItem}>
                  <span className={styles.liveLabel}>{td.live.battery}</span>
                  <span className={["mono-num", styles.liveValue].join(" ")}>
                    {Math.max(0, Math.min(100, (liveTrip.ui.batteryKwh / Math.max(0.001, liveTrip.ui.capacityKwh)) * 100)).toFixed(0)}% (
                    {liveTrip.ui.batteryKwh.toFixed(1)} kWh)
                  </span>
                </div>
                <div className={styles.liveItem}>
                  <span className={styles.liveLabel}>{td.live.tripTime}</span>
                  <span className={["mono-num", styles.liveValue].join(" ")}>{liveTrip.ui.elapsedMin.toFixed(0)} min</span>
                </div>
                <div className={styles.liveItem}>
                  <span className={styles.liveLabel}>{td.live.speed}</span>
                  <span className={["mono-num", styles.liveValue].join(" ")}>
                    {liveTrip.ui.speedKmh != null ? `${Math.round(liveTrip.ui.speedKmh)} km/h` : "-"}
                  </span>
                </div>
              </div>
              <div className={styles.progressTrack}>
                <div
                  className={[styles.progressFill, liveTrip.ui.statusKind === "charging" ? styles.progressFillCharging : ""].join(" ")}
                  style={{ width: `${Math.min(100, (liveTrip.ui.distanceKm / Math.max(0.001, liveTrip.ui.totalKm)) * 100)}%` }}
                />
              </div>
              <div
                className={[
                  styles.status,
                  liveTrip.ui.statusKind === "charging" ? styles.statusCharging : "",
                  liveTrip.ui.statusKind === "done" ? styles.statusDone : "",
                  liveTrip.ui.statusKind === "warn" ? styles.statusWarn : "",
                ].join(" ")}
              >
                {liveTrip.ui.statusText}
              </div>
              {liveTrip.ui.advisory && (
                <div
                  className={[
                    styles.advisory,
                    liveTrip.ui.advisory.kind === "ok" ? styles.advisoryOk : "",
                    liveTrip.ui.advisory.kind === "tight" ? styles.advisoryTight : "",
                    liveTrip.ui.advisory.kind === "warn" ? styles.advisoryWarn : "",
                    liveTrip.ui.advisory.kind === "danger" ? styles.advisoryDanger : "",
                  ].join(" ")}
                >
                  {liveTrip.ui.advisory.text}
                </div>
              )}
              {/* TEMP DEBUG, revertir junto con gpsAccuracyM/gpsGapMs en
                  useLiveTrip.ts: diagnóstico para el próximo viaje real. */}
              {liveTrip.ui.active && (
                <div className="hint" style={{ marginTop: 8 }}>
                  {td.live.gpsDebug(
                    liveTrip.ui.gpsAccuracyM != null ? String(Math.round(liveTrip.ui.gpsAccuracyM)) : "?",
                    liveTrip.ui.gpsGapMs != null ? (liveTrip.ui.gpsGapMs / 1000).toFixed(1) : "?"
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </section>
  );
}
