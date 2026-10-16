import { lazy, Suspense, useMemo, type CSSProperties, type ReactNode } from "react";
import type { SimulateResult } from "../api/showroom";
import { useTranslation } from "../i18n/LanguageProvider";
import { IconAlert, IconCheck } from "../map/panelIcons";
import { useFormat } from "./format";
import { IconXCircle } from "./showroomIcons";
import { cargarSimulationMap } from "./simulationMapLoader";
import { armarTramos, type ParadaConKm } from "./simulationTimeline";
import { tarifaLinea } from "./tarifaTexto";
import styles from "./SimulationResult.module.css";
import ui from "./ui.module.css";

// Ver simulationMapLoader.ts: el mapa (leaflet + maplibre) baja recién acá, no
// con la página del showroom. TripSimulator arranca esa descarga al apretar
// "Calcular viaje", en paralelo al cálculo del servidor.
const SimulationMap = lazy(() => cargarSimulationMap().then((m) => ({ default: m.SimulationMap })));

type Tone = "ok" | "low" | "crit";

/** Con margen desde 20 %, margen bajo de 10 a 19 %, crítico por debajo de 10 %. */
function toneOf(pct: number): Tone {
  return pct >= 20 ? "ok" : pct >= 10 ? "low" : "crit";
}

/** Por debajo de esta distancia entre paradas, sus nombres se pisan en la tira. */
const MIN_LABEL_GAP = 0.2;

interface SimulationResultProps {
  result: SimulateResult;
  /** Capacidad de la versión simulada, para la animación de la batería. */
  batteryKwh: number;
  startBattery: number;
  from: string;
  to: string;
}

export function SimulationResult({
  result,
  batteryKwh,
  startBattery,
  from,
  to,
}: SimulationResultProps) {
  const { t } = useTranslation();
  const tr = t.showroom.simulationResult;
  const f = useFormat();

  const tramos = useMemo(() => (result.llega ? armarTramos(result) : []), [result]);
  const hasMap = tramos.length > 0 && tramos.every((tramo) => tramo.coords.length > 1);
  // Las paradas numeradas en el orden en que se hacen: la ida y después la vuelta.
  const stops: (ParadaConKm & { n: number })[] = tramos
    .flatMap((tramo) => tramo.paradas)
    .map((p, i) => ({ ...p, n: i + 1 }));

  if (!result.llega) {
    return (
      <div className={styles.verdict}>
        <span className="sr-only">{tr.sr.no(to)}</span>
        <div className={styles.verdictHead}>
          <span className={styles.verdictLabel}>{tr.verdict}</span>
          <span className={styles.toneNo}>
            <IconXCircle size={14} />
            {tr.noTag}
          </span>
        </div>
        <span className={styles.noTitle}>{tr.noTitle}</span>
        <p className={styles.noBody}>{tr.noBody(startBattery, to)}</p>
        <p className={styles.noWhy}>{tr.noWhy}</p>
      </div>
    );
  }

  const d = result.detalle;
  const pct = Math.round(result.bateria_llegada_pct);
  const tone = toneOf(pct);
  const ida = tramos[0];
  const idaStops = stops.filter((s) => s.tramo === "ida");
  const fractions = idaStops.map((s) => (ida && ida.totalKm > 0 ? s.cumKm / ida.totalKm : 0));
  const points = [0, ...fractions, 1];
  const roomy = points.every((p, i) => i === 0 || p - points[i - 1]! >= MIN_LABEL_GAP);
  const conTarifas = d.costo_uyu_recargas != null;
  const sinTarifa = d.recargas_sin_tarifa ?? 0;
  const tolls = Number(d.peajes) || null;
  const totalH = Math.floor(Math.round(result.tiempo_total_min) / 60);
  const totalM = Math.round(result.tiempo_total_min) % 60;

  return (
    <div className={styles.result}>
      <div className={hasMap ? styles.top : undefined}>
        {hasMap && (
          <figure className={styles.map} aria-label={tr.mapAria(from, to, stops.length)}>
            <Suspense fallback={<div className={styles.mapLoading} aria-hidden="true" />}>
              <SimulationMap
                tramosInfo={tramos}
                capacidadKwh={batteryKwh}
                bateriaInicialPct={startBattery}
                tiempoTotalMin={result.tiempo_total_min}
              />
            </Suspense>
          </figure>
        )}

        <div className={styles.verdict}>
          <span className="sr-only">{tr.sr[tone](to, f.n(pct))}</span>
          <div className={styles.verdictHead}>
            <span className={styles.verdictLabel}>{tr.arriveWith}</span>
            <span className={styles.tone} data-tone={tone}>
              {tone === "ok" ? <IconCheck size={14} strokeWidth={2} /> : <IconAlert size={14} />}
              {tr.tone[tone]}
            </span>
          </div>
          <span className={styles.pct}>
            {pct}
            <span className={styles.pctUnit}>%</span>
          </span>
          <div className={styles.track}>
            <div
              className={styles.fill}
              data-tone={tone}
              style={{ width: `${Math.max(0, Math.min(100, pct))}%` }}
            />
          </div>
          <p className={styles.message} data-tone={tone}>
            {tr.message[tone]}
          </p>

          <div
            role="img"
            aria-label={tr.stripAria(from, to, idaStops.length)}
            className={styles.strip}
          >
            <div className={styles.stripLine} />
            <span className={styles.stripOrigin} />
            <span className={styles.stripDest} />
            {idaStops.map((s, i) => (
              <span
                key={s.n}
                className={styles.stripStop}
                style={{ "--at": fractions[i] } as CSSProperties}
              >
                <span className={styles.stopSquare}>{s.n}</span>
                {roomy && <span className={styles.stripStopName}>{s.ciudad ?? s.nombre}</span>}
              </span>
            ))}
            <span className={styles.stripFrom}>{from}</span>
            <span className={styles.stripTo}>{to}</span>
          </div>
        </div>
      </div>

      <dl className={styles.figures}>
        <Figure label={tr.distance}>
          {f.n(d.distancia_km)}
          <span className={ui.unit}>km</span>
        </Figure>
        <Figure label={tr.time}>
          {totalH}
          <span className={styles.unitMid}>h</span>
          {totalM}
          <span className={ui.unit}>min</span>
        </Figure>
        <Figure label={tr.batteryArrival}>
          {pct}
          <span className={ui.unit}>%</span>
        </Figure>
        <Figure label={tr.cost}>
          <span className={ui.prefix}>≈ $U</span>
          {f.n(result.costo_uyu)}
        </Figure>
      </dl>

      <div className={styles.breaks}>
        <Breakdown
          title={tr.timeTitle}
          rows={[
            [tr.driving, f.duration(d.conduccion_min)],
            [tr.traffic, f.duration(d.trafico_min)],
            [tr.charging, f.duration(d.recarga_min)],
          ]}
          total={[tr.total, f.duration(result.tiempo_total_min)]}
        />
        <Breakdown
          title={tr.moneyTitle}
          rows={[
            [conTarifas ? tr.homeEnergy : tr.energy, `$U ${f.n(d.costo_uyu_energia)}`],
            ...(conTarifas && stops.length > 0
              ? [
                  [tr.recharges(stops.length), `$U ${f.n(d.costo_uyu_recargas ?? 0)}`] as [
                    string,
                    string,
                  ],
                ]
              : []),
            [tr.tolls(tolls), `$U ${f.n(d.peaje_uyu)}`],
          ]}
          total={[tr.total, `$U ${f.n(result.costo_uyu)}`]}
          note={sinTarifa > 0 ? tr.noTariff(sinTarifa) : undefined}
        />
      </div>

      {d.tramos.length > 1 && (
        <div className={styles.block}>
          <h3 className={styles.h3}>{tr.legsTitle}</h3>
          <ul className={styles.legs}>
            {d.tramos.map((tramo) => {
              const n = stops.filter((s) => s.tramo === tramo.tramo).length;
              const ida = tramo.tramo === "ida";
              return (
                <li key={tramo.tramo} className={styles.leg}>
                  <span className={styles.legTitle}>
                    {ida ? `${tr.outbound} · ${from} → ${to}` : `${tr.return} · ${to} → ${from}`}
                  </span>
                  <span className={styles.legDetail}>
                    {[
                      `${f.n(tramo.distancia_km)} km`,
                      n ? tr.stopsTitle(n) : null,
                      f.duration(tramo.conduccion_min + tramo.trafico_min + tramo.recarga_min),
                      `$U ${f.n(tramo.costo_uyu_total)}`,
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {stops.length > 0 ? (
        <div className={styles.block}>
          <h3 className={styles.h3}>{tr.stopsTitle(stops.length)}</h3>
          <ol className={styles.stops}>
            {stops.map((s) => {
              const limited =
                s.potencia_efectiva_kw != null && s.potencia_efectiva_kw < s.potencia_kw;
              const chips = [
                s.operador,
                tr.minutes(f.n(s.minutos)),
                `+${f.n(s.kwh, 1)} kWh`,
                limited
                  ? tr.powerLimited(f.n(s.potencia_efectiva_kw!), f.n(s.potencia_kw))
                  : `${f.n(s.potencia_kw)} kW`,
                s.conector,
                d.tramos.length > 1 ? (s.tramo === "ida" ? tr.outbound : tr.return) : null,
                s.tarifa?.tarifa_conocida && s.tarifa.modalidad
                  ? tr.tariffChip(s.tarifa.modalidad)
                  : null,
              ].filter(Boolean);
              const address = s.direccion ?? [s.ciudad, s.departamento].filter(Boolean).join(", ");
              return (
                <li key={s.n} className={styles.stop}>
                  <span className={styles.stopSquareBig} aria-hidden="true">
                    {s.n}
                  </span>
                  <div className={styles.stopBody}>
                    <div className={styles.stopHead}>
                      <span className={styles.stopName}>{s.nombre}</span>
                      <span className={styles.stopCost}>
                        {s.costo_uyu != null ? (
                          <>
                            <span className={ui.prefix}>$U</span>
                            {f.n(s.costo_uyu)}
                          </>
                        ) : (
                          "—"
                        )}
                      </span>
                    </div>
                    {address && <span className={styles.stopAddress}>{address}</span>}
                    <span className={styles.chips}>
                      {chips.map((c) => (
                        <span key={c} className={styles.chip}>
                          {c}
                        </span>
                      ))}
                    </span>
                    {s.tarifa && (
                      <span className={styles.stopTariff}>
                        {tarifaLinea(s.tarifa, t.showroom.tarifaTexto)}
                      </span>
                    )}
                  </div>
                </li>
              );
            })}
          </ol>
        </div>
      ) : (
        <p className={styles.noStops}>{tr.noStops}</p>
      )}
    </div>
  );
}

function Figure({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className={styles.figure}>
      <dt>{label}</dt>
      <dd>{children}</dd>
    </div>
  );
}

interface BreakdownProps {
  title: string;
  rows: [string, string][];
  total: [string, string];
  note?: string;
}

function Breakdown({ title, rows, total, note }: BreakdownProps) {
  return (
    <div className={styles.breakdown}>
      <h3 className={styles.breakdownTitle}>{title}</h3>
      <dl className={styles.breakdownList}>
        {rows.map(([label, value]) => (
          <div key={label} className={styles.breakdownRow}>
            <dt>{label}</dt>
            <dd>{value}</dd>
          </div>
        ))}
        <div className={styles.breakdownTotal}>
          <dt>{total[0]}</dt>
          <dd>{total[1]}</dd>
        </div>
      </dl>
      {note && <p className={styles.breakdownNote}>{note}</p>}
    </div>
  );
}
