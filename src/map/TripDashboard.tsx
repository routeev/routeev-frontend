import { formatDuration, formatUyu } from "../shared/format";
import { useMapStore, selectedVehicle, batteryPctToKwh } from "./mapStore";
import { findStationDetail, pctOfCapacity, hayPeajeSinMonto, summarizeTrip } from "./tripStats";
import type { LiveTripUi } from "./useLiveTrip";
import styles from "./TripDashboard.module.css";

const BOLT_PATH = "M13.2 2 4.5 13.4h6.1L10.2 22l8.9-11.6h-6.3L13.2 2Z";
const PLAY_PATH = "M8 5.2v13.6L19 12 8 5.2Z";

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

  return (
    <section className={styles.dashboard}>
      <div className={styles.header}>
        <h2>Datos del viaje</h2>
        <div className={styles.routeLabel}>{routeLabel}</div>
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
            <TripStatCard label="Tiempo estimado" value={formatDuration(summary.timeMin)} large />
            <TripStatCard
              label="Batería consumida"
              value={summary.consumedPct !== null ? `${summary.consumedPct.toFixed(0)}%` : `${summary.consumedKwh.toFixed(2)} kWh`}
              sub={summary.consumedPct !== null ? `${summary.consumedKwh.toFixed(2)} kWh` : null}
            />
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
            <TripStatCard
              label="Batería al llegar"
              value={summary.arrivalPct !== null ? `${summary.arrivalPct.toFixed(0)}%` : `${summary.arrivalKwh.toFixed(1)} kWh`}
              sub={summary.arrivalPct !== null ? `${summary.arrivalKwh.toFixed(1)} kWh` : null}
            />
            <TripStatCard label="Paradas de recarga" value={String(summary.rechargeCount)} />
            <TripStatCard
              label="Costo estimado"
              value={formatUyu(summary.costUyu)}
              sub={
                hayPeajeSinMonto(primary.breakdown)
                  ? `energía ${formatUyu(primary.breakdown.costo_uyu_energia)} + peajes ${primary.breakdown.peaje_uyu > 0 ? formatUyu(primary.breakdown.peaje_uyu) + " y otros sin monto conocido" : "sin monto conocido"}`
                  : `energía ${formatUyu(primary.breakdown.costo_uyu_energia)} + peajes ${formatUyu(primary.breakdown.peaje_uyu)}`
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
