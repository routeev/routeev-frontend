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
function formatTimeBreakdown(drivingMin: number, trafficMin: number, chargingMin: number): string | null {
  const parts: string[] = [];
  if (drivingMin > 0.5) parts.push(`${formatDuration(drivingMin)} manejando`);
  if (trafficMin > 0.5) parts.push(`${formatDuration(trafficMin)} de tráfico`);
  if (chargingMin > 0.5) parts.push(`${formatDuration(chargingMin)} cargando`);
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
  const marginText =
    marginTone === "danger"
      ? `🔴 Margen crítico: llegarías con ~${llegadaPct?.toFixed(1)}% de batería. Cualquier desvío o consumo extra te puede dejar sin carga.`
      : marginTone === "warn"
        ? `🟠 Margen bajo: llegarías con ~${llegadaPct?.toFixed(1)}%, por debajo del margen de seguridad del ${bateria?.margen_pct}%.`
        : `🟢 Llegás con ~${llegadaPct?.toFixed(1)}% de batería, dentro del margen de seguridad (${bateria?.margen_pct}%).`;
  const marginFallbackText =
    bateria && !bateria.margen_alcanzado && llegadaPct !== null
      ? ` No hay plan de cargas que respete ese margen en este viaje: se muestra la mejor ruta posible.`
      : "";

  // Desglose del costo. El texto de peajes es el mismo de siempre (con o sin
  // montos desconocidos); lo que cambia con el backend nuevo es la energía:
  // costo_uyu_recargas presente significa que costo_uyu_energia es SOLO lo
  // cargado en casa y las recargas en ruta van cotizadas aparte, con el
  // tarifario de cada operador. Backend viejo: un solo renglón de energía.
  const bd = primary.breakdown;
  const peajesSub = hayPeajeSinMonto(bd)
    ? bd.peaje_uyu > 0
      ? `${formatUyu(bd.peaje_uyu)} y otros sin monto conocido`
      : "sin monto conocido"
    : formatUyu(bd.peaje_uyu);
  const sinTarifa = bd.recargas_sin_tarifa ?? 0;
  const costoSub =
    bd.costo_uyu_recargas != null
      ? `energía de casa ${formatUyu(bd.costo_uyu_energia)} + recargas ${formatUyu(bd.costo_uyu_recargas)} + peajes ${peajesSub}` +
        (sinTarifa > 0 ? ` · ${sinTarifa} recarga${sinTarifa === 1 ? "" : "s"} sin tarifario` : "")
      : `energía ${formatUyu(bd.costo_uyu_energia)} + peajes ${peajesSub}`;

  const timeBreakdown = summary
    ? formatTimeBreakdown(summary.drivingMin, summary.trafficMin, summary.chargingMin)
    : null;
  // Igual que costoSub arriba: energia_recargada_kwh > 0 es la señal de que
  // hubo carga en ruta ademas de la de casa (backend nuevo). Sin eso, el
  // desglose casa/ruta seria identico al numero de arriba, redundante.
  const energySub = !summary
    ? null
    : summary.publicEnergyKwh != null && summary.publicEnergyKwh > 0
      ? `${summary.consumedKwh.toFixed(2)} kWh · casa ${summary.homeEnergyKwh?.toFixed(2)} + ruta ${summary.publicEnergyKwh.toFixed(2)}`
      : summary.consumedPct !== null
        ? `${summary.consumedKwh.toFixed(2)} kWh`
        : null;

  return (
    <section className={styles.dashboard}>
      <div className={styles.header}>
        <div>
          <h2>Datos del viaje</h2>
          <div className={styles.routeLabel}>{routeLabel}</div>
        </div>
        {!liveTrip.ui.active && (
          // Escondido durante un viaje en vivo a proposito: "Cancelar
          // viaje" (mas abajo) es la salida correcta ahi -- liveTrip no se
          // entera de que el dashboard se cerro, asi que dejar cerrar esto
          // en medio del seguimiento dejaria el GPS corriendo sin ruta
          // dibujada en el mapa (RouteLayers depende de lastResult).
          <button
            type="button"
            className={styles.closeBtn}
            onClick={() => {
              // resetTripPlanning (no solo setLastResult) porque cerrar
              // "Datos del viaje" tiene que sacar TODO lo del viaje anterior,
              // no solo el resultado calculado: origen y destino fijados en
              // los inputs de "Tu viaje" se quedaban puestos, listos para
              // recalcular la misma ruta por accidente.
              const state = useMapStore.getState();
              state.resetTripPlanning();
              // Mismo criterio que el popupclose de StationsLayer: sin esto
              // la cámara se quedaba mirando fija donde estaba el viaje
              // anterior -- visualmente seguía "mostrándolo" aunque la línea
              // ya no estuviera. Volver a la ubicación real es lo que de
              // verdad se siente como "arrancar de nuevo".
              if (state.myPosition) state.leafletMap?.setView(state.myPosition, AUTO_LOCATE_ZOOM);
            }}
            aria-label="Cerrar datos del viaje"
            title="Cerrar"
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M6 6l12 12M18 6 6 18" />
            </svg>
          </button>
        )}
      </div>

      {!summary ? (
        <div className={styles.stat} style={{ gridColumn: "1 / -1" }}>
          <div className={[styles.statValue, styles.notFound].join(" ")}>No se encontró una ruta viable con esta batería.</div>
        </div>
      ) : (
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
            </div>
          )}
          <div className={styles.stats}>
            <TripStatCard label="Distancia total" value={`${summary.distanceKm.toFixed(1)} km`} large />
            <TripStatCard label="Tiempo estimado" value={formatDuration(summary.timeMin)} sub={timeBreakdown} large />
            {summary.avgSpeedKmh !== null && (
              <TripStatCard label="Velocidad promedio" value={`${Math.round(summary.avgSpeedKmh)} km/h`} />
            )}
            <TripStatCard
              label="Batería consumida"
              value={summary.consumedPct !== null ? `${summary.consumedPct.toFixed(0)}%` : `${summary.consumedKwh.toFixed(2)} kWh`}
              sub={energySub}
            />
            <TripStatCard
              label="Batería al llegar"
              value={summary.arrivalPct !== null ? `${summary.arrivalPct.toFixed(0)}%` : `${summary.arrivalKwh.toFixed(1)} kWh`}
              sub={summary.arrivalPct !== null ? `${summary.arrivalKwh.toFixed(1)} kWh` : null}
            />
            <TripStatCard label="Paradas de recarga" value={String(summary.rechargeCount)} />
            <TripStatCard label="Costo estimado" value={formatUyu(summary.costUyu)} sub={costoSub} />
            <TripStatCard
              label="Peajes"
              value={summary.hasTolls ? `${summary.tollCount} en la ruta` : "Sin peajes"}
              sub={
                summary.hasTolls
                  ? hayPeajeSinMonto(primary.breakdown)
                    ? primary.breakdown.peaje_uyu > 0
                      ? `${formatUyu(primary.breakdown.peaje_uyu)} y otros sin monto conocido`
                      : "monto no disponible"
                    : formatUyu(primary.breakdown.peaje_uyu)
                  : null
              }
            />
          </div>

          <div className={styles.chargingStops}>
            {primary.recharges.length === 0 ? (
              <p className="hint" style={{ margin: "8px 0 0" }}>
                Sin paradas de recarga: la batería alcanza para todo el viaje.
              </p>
            ) : (
              <>
                <h3>Puestos de carga usados</h3>
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
                        <span>Batería agregada</span>
                        <b>{addedPct !== null ? `+${addedPct.toFixed(0)}% (+${rc.added_kwh.toFixed(1)} kWh)` : `+${rc.added_kwh.toFixed(1)} kWh`}</b>
                      </div>
                      <div className={styles.stopRow}>
                        <span>Tiempo de carga</span>
                        <b>{rc.time_min.toFixed(1)} min</b>
                      </div>
                      {rcTarifa && (
                        <div className={styles.stopRow}>
                          <span>Costo</span>
                          <b>{rcTarifa.costo_uyu != null ? formatUyu(rcTarifa.costo_uyu) : "Tarifa no publicada"}</b>
                        </div>
                      )}
                      {/* Ocupación: informativa (corre si te quedás enchufado
                          sin cargar), por eso no está sumada en ningún costo. */}
                      {rcTarifa?.tarifa_conocida &&
                        rcTarifa.ocupacion_uyu_min != null &&
                        rcTarifa.ocupacion_tolerancia_min != null && (
                          <div className={styles.stopRow}>
                            <span>Ocupación</span>
                            <b>
                              $ {precioUnitario(rcTarifa.ocupacion_uyu_min)}/min pasados {rcTarifa.ocupacion_tolerancia_min} min
                            </b>
                          </div>
                        )}
                      {detail && (
                        <div className={styles.stopRow}>
                          <span>Dirección</span>
                          <b>{detail.direccion}</b>
                        </div>
                      )}
                      {detail && (
                        <div className={styles.stopRow}>
                          <span>Potencia disponible</span>
                          <b>{detail.potencia_kw} kW max</b>
                        </div>
                      )}
                      {detail && (
                        <div className={styles.stopRow}>
                          <span>Conectores</span>
                          <b>{detail.tipo_conector}</b>
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
          {!liveTrip.ui.active ? (
            <button type="button" className={["primary", styles.startBtn].join(" ")} onClick={liveTrip.start}>
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d={PLAY_PATH} />
              </svg>
              <span>{liveTrip.ui.finished ? "Iniciar viaje de nuevo" : "Iniciar viaje"}</span>
            </button>
          ) : (
            <button type="button" className={["primary", styles.startBtn].join(" ")} onClick={liveTrip.cancel}>
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <rect x="6.5" y="6.5" width="11" height="11" rx="1.6" />
              </svg>
              <span>Cancelar viaje</span>
            </button>
          )}

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

          {(liveTrip.ui.active || liveTrip.ui.finished) && (
            <div className={styles.live}>
              <div className={styles.liveRow}>
                <div className={styles.liveItem}>
                  <span className={styles.liveLabel}>Distancia</span>
                  <span className={["mono-num", styles.liveValue].join(" ")}>
                    {liveTrip.ui.distanceKm.toFixed(1)} / {liveTrip.ui.totalKm.toFixed(1)} km
                  </span>
                </div>
                <div className={styles.liveItem}>
                  <span className={styles.liveLabel}>Batería</span>
                  <span className={["mono-num", styles.liveValue].join(" ")}>
                    {Math.max(0, Math.min(100, (liveTrip.ui.batteryKwh / Math.max(0.001, liveTrip.ui.capacityKwh)) * 100)).toFixed(0)}% (
                    {liveTrip.ui.batteryKwh.toFixed(1)} kWh)
                  </span>
                </div>
                <div className={styles.liveItem}>
                  <span className={styles.liveLabel}>Tiempo de viaje</span>
                  <span className={["mono-num", styles.liveValue].join(" ")}>{liveTrip.ui.elapsedMin.toFixed(0)} min</span>
                </div>
                <div className={styles.liveItem}>
                  <span className={styles.liveLabel}>Velocidad</span>
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
            </div>
          )}
        </div>
      )}
    </section>
  );
}
