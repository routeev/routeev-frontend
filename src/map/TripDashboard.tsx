import { useState } from "react";
import type { EstacionPoi } from "../api/route";
import { useTranslation } from "../i18n/LanguageProvider";
import { Checkbox } from "../shared/Checkbox";
import { formatDuration, formatUyu } from "../shared/format";
import { AUTO_LOCATE_ZOOM } from "./mapConstants";
import { useMapStore, selectedVehicle, batteryPctToKwh } from "./mapStore";
import {
  IconAlert,
  IconBlocked,
  IconBolt,
  IconCheck,
  IconChevronDown,
  IconClose,
  IconEdit,
  IconNavigate,
} from "./panelIcons";
import { getRadarVibrationEnabled, setRadarVibrationEnabled } from "./radarAlertPrefs";
import { findStationDetail, pctOfCapacity, hayPeajeSinMonto, summarizeTrip } from "./tripStats";
import type { LiveTripUi } from "./useLiveTrip";
import ui from "./panel.module.css";
import styles from "./TripDashboard.module.css";

// Precio unitario ($/min) con dos decimales es-UY. El mapa no importa nada del
// showroom (donde vive num()) y no vale la pena cruzar módulos por una línea:
// mismo criterio de formato, helper local.
function precioUnitario(valor: number): string {
  return valor.toLocaleString("es-UY", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/**
 * Margen al llegar, con umbrales fijos: menos de 5 % es crítico siempre, menos
 * de 15 % es poco. Fijos a propósito, y no el margen de seguridad que haya
 * pedido el backend: la etiqueta tiene que significar lo mismo en todos los
 * viajes para que alguien aprenda a leerla de un vistazo.
 */
type Tone = "ok" | "low" | "crit";
function toneFor(pct: number): Tone {
  return pct >= 15 ? "ok" : pct >= 5 ? "low" : "crit";
}

interface TripDashboardProps {
  liveTrip: { ui: LiveTripUi; start: () => void; cancel: () => void };
}

/**
 * La pestaña "Viaje" con una ruta calculada: lo que la persona viene a
 * preguntar ("¿llego, con cuánto?") primero y en grande, después tiempo y
 * costo (con su desglose a un toque), y las paradas. Iniciar o cancelar viven
 * en el pie fijo.
 */
export function TripDashboard({ liveTrip }: TripDashboardProps) {
  const { t, lang } = useTranslation();
  const td = t.map.tripDashboard;
  const pt = t.map.panel.trip;
  const result = useMapStore((s) => s.lastResult);
  const replaySuffix = useMapStore((s) => s.replaySuffix);
  const stations = useMapStore((s) => s.stations);
  const startBatteryPct = useMapStore((s) => s.startBatteryPct);
  const clearResult = useMapStore((s) => s.clearResult);
  const vehicle = useMapStore(selectedVehicle);
  // Lazy init: lee localStorage una sola vez al montar, no en cada render.
  const [radarVibrationEnabled, setRadarVibrationEnabledState] = useState(getRadarVibrationEnabled);

  if (!result) return null;

  const live = liveTrip.ui;
  const primary = result.astar.found ? result.astar : (result.dijkstra ?? result.astar);
  const startBatteryKwh = vehicle ? batteryPctToKwh(vehicle, startBatteryPct) : 0;
  const summary = summarizeTrip(vehicle, startBatteryKwh, primary);
  const locale = lang === "es" ? "es-UY" : "en-US";
  const num = (n: number, decimals = 0) =>
    n.toLocaleString(locale, { minimumFractionDigits: decimals, maximumFractionDigits: decimals });

  // Batería al llegar: la del backend cuando viene (ya cuenta la reserva
  // pedida); si no, la estimada acá. Los replays del historial no la traen.
  const bateria = result.bateria ?? null;
  const arrivalPct = bateria?.llegada_pct ?? summary?.arrivalPct ?? null;
  const tone = arrivalPct != null ? toneFor(arrivalPct) : null;
  const toneText = { ok: ui.textAccent, low: ui.textWarn, crit: ui.textDanger };
  const toneBar = { ok: ui.toneAccent, low: ui.toneWarn, crit: ui.toneDanger };
  const toneSoft = { ok: styles.adviceOk, low: styles.adviceLow, crit: styles.adviceCrit };

  // Las notas del backend sobre el margen no se pierden: van debajo del
  // consejo. "No hay plan que respete el margen" y la reserva por no tener
  // dónde cargar cambian lo que significa el número de arriba.
  const marginFallbackText =
    bateria && !bateria.margen_alcanzado && bateria.llegada_pct !== null
      ? td.margin.noPlanFallback
      : "";
  const reserva = bateria?.reserva ?? null;
  // `reserva` es la que se PIDIÓ, no la que se logró: el backend reintenta con
  // 0 cuando con esa reserva no existe ningún plan (ver margen_alcanzado). Sin
  // este chequeo se prometía una reserva que la ruta devuelta no cumple.
  const reservaAplicada =
    reserva?.motivo === "cargador_destino" && bateria?.margen_alcanzado === true;
  const reservaText = reservaAplicada
    ? td.margin.reserveApplied(reserva!.pct.toFixed(0))
    : reserva?.motivo === "cargador_destino"
      ? td.margin.reserveNotEnough
      : "";
  const marginNotes = `${marginFallbackText}${reservaText}`.trim();

  // El cargador del destino: sólo viene cuando se pidió la ruta declarando que
  // allá no hay dónde enchufar. Contesta la pregunta que sigue a "¿llego?".
  const cargador = result.cargador_destino ?? null;

  // Respaldo por parada. Alineado 1 a 1 con recharges igual que los costos, con
  // el node_id de respaldo por si los largos no coinciden.
  const respaldos = result.respaldo_paradas?.paradas;
  const respaldoDe = (i: number, nodeId: number | string) => {
    const fila =
      respaldos && respaldos.length === primary.recharges.length
        ? respaldos[i]
        : respaldos?.find((p) => p.node_id === String(nodeId));
    return fila?.respaldo ?? null;
  };

  // Comercios a pie desde cada parada. Los que no entran en el rato de ESTA
  // parada van al final y atenuados: saberlos igual sirve.
  const poisDe = (i: number): EstacionPoi[] => {
    const listas = primary.breakdown.recargas_pois;
    if (!listas || listas.length !== primary.recharges.length) return [];
    return [...listas[i]!].sort(
      (a, b) => Number(b.entra_en_la_parada) - Number(a.entra_en_la_parada)
    );
  };

  // Desglose del costo. costo_uyu_recargas presente significa que
  // costo_uyu_energia es SOLO lo cargado en casa y las recargas en ruta van
  // cotizadas aparte, con el tarifario de cada operador.
  const bd = primary.breakdown;
  const tollsText = hayPeajeSinMonto(bd)
    ? bd.peaje_uyu > 0
      ? td.cost.tollsPartialAmount(formatUyu(bd.peaje_uyu))
      : td.cost.tollsNoAmount
    : formatUyu(bd.peaje_uyu);
  const sinTarifa = bd.recargas_sin_tarifa ?? 0;
  const costParts =
    bd.costo_uyu_recargas != null
      ? [
          { label: pt.costParts.home, value: formatUyu(bd.costo_uyu_energia) },
          { label: pt.costParts.recharges, value: formatUyu(bd.costo_uyu_recargas) },
          { label: pt.costParts.tolls, value: tollsText },
        ]
      : [
          { label: pt.costParts.energy, value: formatUyu(bd.costo_uyu_energia) },
          { label: pt.costParts.tolls, value: tollsText },
        ];

  const progressPct = live.totalKm > 0 ? Math.min(100, (live.distanceKm / live.totalKm) * 100) : 0;
  const liveBatteryPct = Math.max(
    0,
    Math.min(100, (live.batteryKwh / Math.max(0.001, live.capacityKwh)) * 100)
  );
  const radarText = live.radarAlert
    ? live.radarAlert.maxspeedKmh != null
      ? td.live.radarAlertWithSpeed(live.radarAlert.nombre, live.radarAlert.maxspeedKmh)
      : td.live.radarAlert(live.radarAlert.nombre)
    : null;
  const canStart = result.astar.found && vehicle != null;

  function cancelPlan() {
    const state = useMapStore.getState();
    // resetTripPlanning y no clearResult: "Cancelar" es empezar de cero. Con
    // la cámara de vuelta en la ubicación real, que es lo que de verdad se
    // siente como arrancar de nuevo.
    state.resetTripPlanning();
    if (state.myPosition) state.leafletMap?.setView(state.myPosition, AUTO_LOCATE_ZOOM);
  }

  return (
    <>
      <div className={ui.body}>
        <div className={styles.header}>
          <div className={styles.headRow}>
            <div className={styles.headText}>
              <span className={styles.eyebrow}>
                {pt.yourTrip}
                {replaySuffix ?? ""}
              </span>
              <h2 className={styles.route}>
                <span>{result.origin.name}</span>
                {/* La flecha va con el destino: con nombres largos, sola en
                    una línea no se entendía de dónde a dónde. */}
                <span>
                  <span className={styles.arrow} aria-hidden="true">
                    →{" "}
                  </span>
                  {result.destination.name}
                </span>
              </h2>
            </div>
            {!live.active && (
              <button
                type="button"
                className={[ui.linkAction, styles.edit].join(" ")}
                onClick={clearResult}
              >
                <IconEdit />
                {pt.edit}
              </button>
            )}
          </div>
          {summary && result.modo && (
            <div className={styles.mode}>
              <span className={styles.modePill}>
                <span className="sr-only">{td.tripMode.label}: </span>
                <IconCheck size={14} strokeWidth={2} />
                {t.map.routeInput.routeMode[result.modo]}
              </span>
              <p className={ui.muted}>{td.tripMode[result.modo]}</p>
            </div>
          )}
        </div>

        {/* El viaje terminó pero no se pudo guardar: es dato real de un
            recorrido que ya ocurrió y no se puede volver a producir. */}
        {live.saveError && (
          <p role="alert" className={ui.alertDanger}>
            <IconAlert />
            <span className={ui.alertText}>{live.saveError}</span>
          </p>
        )}

        {!summary ? (
          <div role="alert" className={styles.noRoute}>
            <p className={styles.noRouteTitle}>
              <IconBlocked />
              {pt.noRouteTitle}
            </p>
            <p className={styles.noRouteBody}>{pt.noRouteBody(Math.round(startBatteryPct))}</p>
            <ul className={styles.noRouteTips}>
              {pt.noRouteTips.map((tip) => (
                <li key={tip}>{tip}</li>
              ))}
            </ul>
            <button
              type="button"
              className={[ui.btnOutline, ui.btnStrong, styles.noRouteBtn].join(" ")}
              onClick={clearResult}
            >
              {pt.editTrip}
            </button>
          </div>
        ) : (
          <>
            {(live.active || live.finished) && (
              <section className={styles.live} aria-label={pt.live}>
                <div className={styles.liveHead}>
                  <span className={styles.liveTitle}>
                    <span className={styles.liveDot} aria-hidden="true" />
                    {live.active ? pt.live : live.statusText || pt.live}
                  </span>
                  <span className={styles.livePct}>{num(progressPct)} %</span>
                </div>
                <div className={styles.liveBar}>
                  <div
                    className={[
                      styles.liveFill,
                      live.statusKind === "charging" ? styles.liveFillCharging : "",
                    ].join(" ")}
                    style={{ width: `${progressPct}%` }}
                  />
                </div>
                <div className={styles.liveGrid}>
                  <div className={ui.metric}>
                    <span className={styles.liveValue}>
                      {num(live.distanceKm, 1)}
                      <span className={ui.unit}>{pt.of(num(live.totalKm, 1))}</span>
                    </span>
                    <span className={ui.metricLabel}>{pt.traveled}</span>
                  </div>
                  <div className={ui.metric}>
                    <span className={styles.liveValue}>
                      {num(liveBatteryPct)}
                      <span className={ui.unit}>%</span>
                    </span>
                    <span className={ui.metricLabel}>{pt.battery}</span>
                  </div>
                  <div className={ui.metric}>
                    <span className={styles.liveValue}>{formatDuration(live.elapsedMin)}</span>
                    <span className={ui.metricLabel}>{pt.elapsed}</span>
                  </div>
                  <div className={ui.metric}>
                    <span className={styles.liveValue}>
                      {live.speedKmh != null ? Math.round(live.speedKmh) : "—"}
                      <span className={ui.unit}>km/h</span>
                    </span>
                    <span className={ui.metricLabel}>{pt.speed}</span>
                  </div>
                </div>
                {live.active && live.statusText && (
                  <p
                    className={[
                      styles.liveStatus,
                      live.statusKind === "warn" ? ui.textWarn : "",
                      live.statusKind === "charging" ? ui.textWarn : "",
                      live.statusKind === "done" ? ui.textAccent : "",
                    ].join(" ")}
                  >
                    {live.statusText}
                  </p>
                )}
                {/* Pide atención inmediata: alert, para que un lector de
                    pantalla lo anuncie apenas aparece. */}
                {radarText && (
                  <p role="alert" className={ui.alertWarn}>
                    <IconAlert size={20} />
                    {radarText}
                  </p>
                )}
                {live.advisory && (
                  <p
                    className={[
                      styles.advice,
                      live.advisory.kind === "ok" ? styles.adviceOk : "",
                      live.advisory.kind === "tight" || live.advisory.kind === "warn"
                        ? styles.adviceLow
                        : "",
                      live.advisory.kind === "danger" ? styles.adviceCrit : "",
                    ].join(" ")}
                  >
                    {live.advisory.text}
                  </p>
                )}
                {/* TEMP DEBUG, revertir junto con gpsAccuracyM/gpsGapMs en
                    useLiveTrip.ts: diagnóstico para el próximo viaje real. */}
                {live.active && (
                  <p className={ui.muted}>
                    {td.live.gpsDebug(
                      live.gpsAccuracyM != null ? String(Math.round(live.gpsAccuracyM)) : "?",
                      live.gpsGapMs != null ? (live.gpsGapMs / 1000).toFixed(1) : "?"
                    )}
                  </p>
                )}
              </section>
            )}

            <div className={[ui.card, styles.arrive].join(" ")}>
              <div className={styles.arriveHead}>
                <span>{pt.arriveWith}</span>
                {tone && <span className={toneText[tone]}>{pt.tone[tone]}</span>}
              </div>
              {arrivalPct != null ? (
                <span className={styles.arriveValue}>
                  {num(arrivalPct)}
                  <span className={styles.arriveUnit}>%</span>
                </span>
              ) : (
                <span className={styles.arriveValue}>
                  {num(summary.arrivalKwh, 1)}
                  <span className={styles.arriveUnit}>kWh</span>
                </span>
              )}
              {arrivalPct != null && tone && (
                <div className={ui.bar}>
                  <div
                    className={[ui.barFill, toneBar[tone]].join(" ")}
                    style={{ width: `${Math.max(2, Math.min(100, arrivalPct))}%` }}
                  />
                </div>
              )}
              {tone && (
                <div className={[styles.advice, toneSoft[tone]].join(" ")}>
                  {tone === "ok" ? <IconCheck size={18} /> : <IconAlert size={18} />}
                  <span>
                    {pt.advice[tone]}
                    {marginNotes && <span className={styles.adviceNote}>{marginNotes}</span>}
                  </span>
                </div>
              )}
              {!tone && marginNotes && <p className={ui.muted}>{marginNotes}</p>}
            </div>

            <div className={styles.detailsGrid}>
              <details className={[ui.card, styles.details].join(" ")}>
                <summary className={styles.summary}>
                  <span className={styles.summaryValue}>{formatDuration(summary.timeMin)}</span>
                  <span className={styles.summaryLabel}>
                    {pt.time}
                    <span className={styles.chevron}>
                      <IconChevronDown size={14} />
                    </span>
                  </span>
                </summary>
                <dl className={styles.parts}>
                  {[
                    { label: pt.timeParts.driving, min: summary.drivingMin },
                    { label: pt.timeParts.traffic, min: summary.trafficMin },
                    { label: pt.timeParts.charging, min: summary.chargingMin },
                  ].map((p) => (
                    <div key={p.label} className={styles.partRow}>
                      <dt>{p.label}</dt>
                      <dd>{formatDuration(p.min)}</dd>
                    </div>
                  ))}
                </dl>
              </details>
              <details className={[ui.card, styles.details].join(" ")}>
                <summary className={styles.summary}>
                  <span className={styles.summaryValue}>
                    <span className={styles.summaryPrefix}>≈ $</span>
                    {num(summary.costUyu)}
                  </span>
                  <span className={styles.summaryLabel}>
                    {pt.cost}
                    <span className={styles.chevron}>
                      <IconChevronDown size={14} />
                    </span>
                  </span>
                </summary>
                <dl className={styles.parts}>
                  {costParts.map((p) => (
                    <div key={p.label} className={styles.partRow}>
                      <dt>{p.label}</dt>
                      <dd>{p.value}</dd>
                    </div>
                  ))}
                </dl>
                {sinTarifa > 0 && <p className={styles.partsNote}>{pt.withoutTariff(sinTarifa)}</p>}
              </details>
            </div>

            <div className={styles.stats}>
              <div className={ui.metric}>
                <span className={styles.statValue}>
                  {num(summary.distanceKm)}
                  <span className={ui.unit}>km</span>
                </span>
                <span className={ui.metricLabel}>{pt.distance}</span>
              </div>
              {summary.avgSpeedKmh !== null && (
                <div className={ui.metric}>
                  <span className={styles.statValue}>
                    {Math.round(summary.avgSpeedKmh)}
                    <span className={ui.unit}>km/h</span>
                  </span>
                  <span className={ui.metricLabel}>{pt.avgSpeed}</span>
                </div>
              )}
              <div className={ui.metric}>
                <span className={styles.statValue}>
                  {num(summary.consumedKwh, 1)}
                  <span className={ui.unit}>kWh</span>
                </span>
                <span className={ui.metricLabel}>{pt.batteryUsed}</span>
              </div>
              <div className={ui.metric}>
                <span className={styles.statValue}>{summary.rechargeCount}</span>
                <span className={ui.metricLabel}>{pt.stops}</span>
              </div>
              <div className={ui.metric}>
                {summary.hasTolls ? (
                  <span className={styles.statValue}>
                    {summary.tollCount}
                    <span className={ui.unit}>· {tollsText}</span>
                  </span>
                ) : (
                  <span className={[styles.statValue, styles.statText].join(" ")}>
                    {pt.noTolls}
                  </span>
                )}
                <span className={ui.metricLabel}>{pt.tolls}</span>
              </div>
            </div>

            {cargador && (
              <div className={styles.destCharger}>
                <span className={styles.destIcon}>
                  <IconBolt />
                </span>
                <div className={styles.destText}>
                  <span className={styles.smallLabel}>{pt.destinationCharger}</span>
                  <span className={styles.destName}>{cargador.nombre}</span>
                  <span className={styles.smallLabel}>
                    {td.destinationCharger.distance(cargador.distancia_km_recta.toFixed(1))}
                    {cargador.potencia_kw ? ` · ${Math.round(cargador.potencia_kw)} kW` : ""}
                    {cargador.operador ? ` · ${cargador.operador}` : ""}
                    {cargador.direccion ? ` · ${cargador.direccion}` : ""}
                  </span>
                  {/* No se disimula: si el más cercano está así de lejos, el
                      problema no es el margen, es que ahí no hay dónde cargar. */}
                  {cargador.demasiado_lejos && (
                    <span className={ui.textWarn}>{td.destinationCharger.tooFar}</span>
                  )}
                </div>
              </div>
            )}

            <section className={styles.stops} aria-labelledby="stops-title">
              <h3 className={ui.sectionTitle} id="stops-title">
                {pt.stopsTitle(primary.recharges.length)}
              </h3>
              {primary.recharges.length === 0 ? (
                <p className={styles.noStops}>
                  <span className={ui.textAccent}>
                    <IconCheck size={18} />
                  </span>
                  {pt.noStops}
                </p>
              ) : (
                primary.recharges.map((rc, i) => {
                  const detail = findStationDetail(stations, rc.node_id);
                  const addedPct = pctOfCapacity(rc.added_kwh, vehicle);
                  // recargas_costos viene alineado 1 a 1 con recharges, y la
                  // misma estación puede aparecer dos veces (ida y vuelta).
                  const costos = bd.recargas_costos;
                  const rcTarifa =
                    costos && costos.length === primary.recharges.length
                      ? costos[i]
                      : costos?.find((c) => c.node_id === String(rc.node_id));
                  const respaldo = respaldoDe(i, rc.node_id);
                  const pois = poisDe(i);
                  return (
                    <div className={styles.stop} key={i}>
                      <span className={styles.stopNum}>{i + 1}</span>
                      <div className={styles.stopBody}>
                        <div className={styles.stopTitle}>
                          <span className={styles.stopName}>{rc.station_name}</span>
                          {detail && <span className={styles.smallLabel}>{detail.direccion}</span>}
                        </div>
                        <div className={ui.metrics3}>
                          <div className={ui.metric}>
                            <span className={styles.stopValue}>
                              {addedPct !== null
                                ? `+${num(addedPct)} %`
                                : `+${num(rc.added_kwh, 1)} kWh`}
                            </span>
                            <span className={styles.stopLabel}>{pt.stopAdd}</span>
                          </div>
                          <div className={ui.metric}>
                            <span className={styles.stopValue}>{formatDuration(rc.time_min)}</span>
                            <span className={styles.stopLabel}>{pt.stopTime}</span>
                          </div>
                          <div className={ui.metric}>
                            {rcTarifa?.costo_uyu != null ? (
                              <span className={styles.stopValue}>
                                {formatUyu(rcTarifa.costo_uyu)}
                              </span>
                            ) : (
                              <span className={styles.stopNoRate}>{pt.noRate}</span>
                            )}
                            <span className={styles.stopLabel}>{pt.stopCost}</span>
                          </div>
                        </div>
                        <dl className={styles.stopRows}>
                          {detail && (
                            <div>
                              <dt>{pt.charger}</dt>
                              <dd>
                                {detail.potencia_kw} kW · {detail.tipo_conector}
                              </dd>
                            </div>
                          )}
                          {/* Ocupación: informativa (corre si te quedás
                              enchufado sin cargar), no está sumada en ningún costo. */}
                          {rcTarifa?.tarifa_conocida &&
                            rcTarifa.ocupacion_uyu_min != null &&
                            rcTarifa.ocupacion_tolerancia_min != null && (
                              <div>
                                <dt>{pt.fee}</dt>
                                <dd className={ui.textWarn}>
                                  {td.stopCard.occupationValue(
                                    precioUnitario(rcTarifa.ocupacion_uyu_min),
                                    rcTarifa.ocupacion_tolerancia_min
                                  )}
                                </dd>
                              </div>
                            )}
                          {/* Si este cargador no funciona, ¿a dónde se va? Para
                              cuando estás ahí es tarde para decidirlo. */}
                          {respaldo && (
                            <div>
                              <dt>{pt.backup}</dt>
                              <dd>
                                {td.stopCard.backupValue(
                                  respaldo.nombre,
                                  respaldo.distancia_km_recta,
                                  respaldo.demasiado_lejos
                                )}
                              </dd>
                            </div>
                          )}
                          {pois.length > 0 && (
                            <div>
                              <dt>{pt.nearby}</dt>
                              <dd>
                                <ul className={styles.pois}>
                                  {pois.map((p, j) => (
                                    <li
                                      key={j}
                                      className={p.entra_en_la_parada ? undefined : styles.poiFar}
                                    >
                                      {p.nombre}
                                      <span className={styles.poiMeta}>
                                        {" "}
                                        · {td.stopCard.poiCategoria[p.categoria]} ·{" "}
                                        {td.stopCard.poiDist(p.dist_m)}
                                        {!p.entra_en_la_parada &&
                                          ` · ${td.stopCard.poiParadaLarga}`}
                                      </span>
                                    </li>
                                  ))}
                                </ul>
                              </dd>
                            </div>
                          )}
                        </dl>
                      </div>
                    </div>
                  );
                })
              )}
            </section>
          </>
        )}
      </div>

      {summary && canStart && (
        <div className={ui.foot}>
          {/* "Iniciar viaje" puede rechazarse sin llegar a arrancar (lejos
              del origen, sin GPS, sin HTTPS): el motivo se dice acá, al lado
              del botón que se acaba de tocar. */}
          {!live.active && !live.finished && live.statusText && (
            <p className={ui.alertWarn}>
              <IconAlert size={18} />
              {live.statusText}
            </p>
          )}
          {live.active ? (
            <button type="button" className={ui.btnDanger} onClick={liveTrip.cancel}>
              <IconClose />
              {td.cancelTrip}
            </button>
          ) : (
            <div className={styles.footActions}>
              <button
                type="button"
                className={[ui.btnPrimary, styles.startBtn].join(" ")}
                onClick={liveTrip.start}
              >
                <IconNavigate />
                {live.finished ? td.startTripAgain : td.startTrip}
              </button>
              <button
                type="button"
                className={[ui.btnOutline, ui.btnLarge, styles.cancelBtn].join(" ")}
                onClick={cancelPlan}
              >
                {td.cancelPlan}
              </button>
            </div>
          )}
          {/* Vive acá (antes de arrancar y durante el viaje) en vez de en una
              pantalla de ajustes: es la única preferencia del viaje en vivo. */}
          <Checkbox
            className={styles.radarToggle}
            checked={radarVibrationEnabled}
            onChange={(checked) => {
              setRadarVibrationEnabled(checked);
              setRadarVibrationEnabledState(checked);
            }}
            label={td.live.radarVibration}
          />
        </div>
      )}
    </>
  );
}
