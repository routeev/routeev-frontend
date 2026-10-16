import { useMutation, useQuery } from "@tanstack/react-query";
import { useState, type FormEvent, type KeyboardEvent } from "react";
import { ApiError } from "../api/client";
import {
  showroomDestinos,
  showroomSimulate,
  type Destino,
  type ShowroomModel,
} from "../api/showroom";
import { useTranslation } from "../i18n/LanguageProvider";
import { IconMinus, IconPlus, IconRetry, IconSwap } from "../map/panelIcons";
import type { CatalogLine } from "./catalog";
import { useFormat } from "./format";
import { SimulationResult } from "./SimulationResult";
import { cargarSimulationMap } from "./simulationMapLoader";
import { IconInfo, IconXCircle } from "./showroomIcons";
import { uruguayPoints } from "./uruguayPoints";
import styles from "./TripSimulator.module.css";
import ui from "./ui.module.css";

const BATTERY_MIN = 10;
const BATTERY_MAX = 100;
const BATTERY_STEP = 10;

interface Run {
  modelId: string;
  origin: string;
  destination: string;
  battery: number;
  roundTrip: boolean;
}

function sameRun(a: Run, b: Run) {
  return (
    a.modelId === b.modelId &&
    a.origin === b.origin &&
    a.destination === b.destination &&
    a.battery === b.battery &&
    a.roundTrip === b.roundTrip
  );
}

function cityLabel(d: Destino) {
  return d.nombre === d.departamento ? d.nombre : `${d.nombre} (${d.departamento})`;
}

interface TripSimulatorProps {
  line: CatalogLine;
  model: ShowroomModel;
}

/**
 * "¿Llegás con este auto?". No se simula al cambiar un dato: el servidor deja
 * 10 por hora, así que se calcula solo con el botón. Si después de un
 * resultado se cambia algo, el botón pasa a "Volver a calcular" y el
 * resultado avisa que es del cálculo anterior.
 */
export function TripSimulator({ line, model }: TripSimulatorProps) {
  const { t } = useTranslation();
  const tf = t.showroom.simulationForm;
  const tr = t.showroom.simulationResult;
  const f = useFormat();

  // staleTime: Infinity -- las ciudades no cambian mientras dura la visita.
  const destinos = useQuery({
    queryKey: ["showroomDestinos"],
    queryFn: showroomDestinos,
    staleTime: Infinity,
  });
  const cities = destinos.data ?? [];

  // null = sin elegir todavía: se usa el default, que depende de la lista.
  const [originPick, setOriginPick] = useState<string | null>(null);
  const [destinationPick, setDestinationPick] = useState<string | null>(null);
  const [battery, setBattery] = useState(BATTERY_MAX);
  const [roundTrip, setRoundTrip] = useState(false);
  const [sameCity, setSameCity] = useState(false);

  // Montevideo primero; un destino lejos por defecto -- el caso interesante es
  // el que obliga a parar a cargar.
  const defaultDestination =
    cities.find((d) => d.nombre === "Rivera") ??
    cities.find((d) => d.nombre === "Punta del Este") ??
    cities.at(-1);
  const origin = originPick ?? cities[0]?.id ?? "";
  const destination = destinationPick ?? defaultDestination?.id ?? "";
  const current: Run = { modelId: model.id, origin, destination, battery, roundTrip };

  const simulate = useMutation({
    mutationFn: (run: Run) =>
      showroomSimulate({
        origin_id: run.origin,
        destination_id: run.destination,
        model_ids: [run.modelId],
        bateria_inicial_pct: run.battery,
        ida_y_vuelta: run.roundTrip,
      }),
  });

  function calculate(e?: FormEvent) {
    e?.preventDefault();
    if (simulate.isPending || !origin || !destination) return;
    if (origin === destination) {
      setSameCity(true);
      return;
    }
    setSameCity(false);
    // El mapa baja mientras el servidor calcula (de 1 a 3 s): su descarga no
    // se suma a la espera. El catch evita una promesa rechazada sin dueño si
    // el chunk no llega; React.lazy lo vuelve a intentar cuando lo necesite.
    void cargarSimulationMap().catch(() => undefined);
    simulate.mutate(current);
  }

  const bump = (delta: number) =>
    setBattery((b) => Math.min(BATTERY_MAX, Math.max(BATTERY_MIN, b + delta)));
  function onBatteryKey(e: KeyboardEvent<HTMLDivElement>) {
    const delta =
      e.key === "ArrowUp" || e.key === "ArrowRight"
        ? BATTERY_STEP
        : e.key === "ArrowDown" || e.key === "ArrowLeft"
          ? -BATTERY_STEP
          : 0;
    if (e.key === "Home") setBattery(BATTERY_MIN);
    else if (e.key === "End") setBattery(BATTERY_MAX);
    else if (!delta) return;
    else bump(delta);
    e.preventDefault();
  }

  const lastRun = simulate.variables;
  const result = simulate.isSuccess ? simulate.data.resultados[0] : undefined;
  const stale = Boolean(result && lastRun && !sameRun(lastRun, current));
  const cityOf = (id: string | undefined) => cities.find((d) => d.id === id);
  const rateLimited = simulate.error instanceof ApiError && simulate.error.status === 429;

  return (
    <div className={styles.grid}>
      <form className={styles.form} onSubmit={calculate} noValidate>
        <div className={styles.od}>
          <div className={styles.odRow}>
            <span className={styles.odOrigin} aria-hidden="true" />
            <span className={styles.odField}>
              <label htmlFor="sim-from" className={styles.odLabel}>
                {tf.from}
              </label>
              <select
                id="sim-from"
                className={styles.odSelect}
                value={origin}
                disabled={!cities.length}
                onChange={(e) => setOriginPick(e.target.value)}
              >
                {cities.map((d) => (
                  <option key={d.id} value={d.id}>
                    {cityLabel(d)}
                  </option>
                ))}
              </select>
            </span>
          </div>
          <span className={styles.odLine} aria-hidden="true" />
          <div className={styles.odRow}>
            <span className={styles.odDest} aria-hidden="true" />
            <span className={styles.odField}>
              <label htmlFor="sim-to" className={styles.odLabel}>
                {tf.to}
              </label>
              <select
                id="sim-to"
                className={styles.odSelect}
                value={destination}
                disabled={!cities.length}
                onChange={(e) => setDestinationPick(e.target.value)}
              >
                {cities.map((d) => (
                  <option key={d.id} value={d.id}>
                    {cityLabel(d)}
                  </option>
                ))}
              </select>
            </span>
          </div>
          <button
            type="button"
            className={styles.swap}
            aria-label={tf.swap}
            disabled={!cities.length}
            onClick={() => {
              setOriginPick(destination);
              setDestinationPick(origin);
            }}
          >
            <IconSwap />
          </button>
        </div>
        {destinos.isError && (
          <p role="alert" className={styles.fieldError}>
            {tf.citiesError}
            <button
              type="button"
              className={styles.inlineRetry}
              onClick={() => void destinos.refetch()}
            >
              <IconRetry size={16} />
              {tr.retry}
            </button>
          </p>
        )}

        <div className={styles.battery}>
          <div className={styles.batteryHead}>
            <span id="batt-l" className={styles.batteryLabel}>
              {tf.battery}
            </span>
            <span className={styles.car}>
              {line.brand} {line.name} · {f.n(model.bateria_kwh, 1)} kWh
            </span>
          </div>
          <div className={styles.stepper}>
            <button
              type="button"
              className={styles.stepButton}
              aria-label={tf.less}
              disabled={battery <= BATTERY_MIN}
              onClick={() => bump(-BATTERY_STEP)}
            >
              <IconMinus />
            </button>
            <div
              role="spinbutton"
              tabIndex={0}
              aria-labelledby="batt-l"
              aria-valuemin={BATTERY_MIN}
              aria-valuemax={BATTERY_MAX}
              aria-valuenow={battery}
              aria-valuetext={`${battery} %`}
              className={styles.batteryValue}
              onKeyDown={onBatteryKey}
            >
              <span className={styles.batteryPct}>
                {battery}
                <span className={ui.unit}>%</span>
              </span>
              <span className={styles.batteryKm}>
                ≈ {f.n(Math.round((model.autonomia_aprox_km * battery) / 100))} km
              </span>
            </div>
            <button
              type="button"
              className={styles.stepButton}
              aria-label={tf.more}
              disabled={battery >= BATTERY_MAX}
              onClick={() => bump(BATTERY_STEP)}
            >
              <IconPlus size={18} />
            </button>
          </div>
          <div className={styles.track} aria-hidden="true">
            <div className={styles.fill} style={{ width: `${battery}%` }} />
          </div>
        </div>

        <button
          type="button"
          role="switch"
          aria-checked={roundTrip}
          className={styles.roundTrip}
          onClick={() => setRoundTrip((v) => !v)}
        >
          <span className={styles.roundTripText}>
            <span className={styles.roundTripTitle}>{tf.roundTrip}</span>
            <span className={styles.roundTripHelp}>{tf.roundTripHelp}</span>
          </span>
          <span className={styles.switchTrack} aria-hidden="true">
            <span className={styles.switchKnob} />
          </span>
        </button>

        <div className={styles.submitBlock}>
          <button
            type="submit"
            className={styles.submit}
            disabled={simulate.isPending || !cities.length}
            aria-busy={simulate.isPending}
          >
            {simulate.isPending && <span className={[ui.spinner, ui.spinnerOnAccent].join(" ")} />}
            {simulate.isPending ? tf.calculating : result ? tf.recalculate : tf.calculate}
          </button>
          {sameCity && (
            <p role="alert" className={styles.fieldError}>
              {tf.sameCity}
            </p>
          )}
          <span className={styles.limit}>{tf.limit}</span>
        </div>
      </form>

      <div className={styles.output} aria-live="polite">
        {simulate.isIdle && (
          <div className={styles.idle}>
            <UruguayOutline className={styles.idleMap} />
            <p className={styles.idleText}>{tr.idle}</p>
          </div>
        )}

        {simulate.isPending && (
          <div role="status" className={styles.pending}>
            <div className={styles.pendingMap}>
              <UruguayOutline className={styles.pendingOutline} filled />
              <div className={styles.pendingCard}>
                <span className={[ui.spinner, styles.pendingSpinner].join(" ")} />
                <span className={styles.pendingText}>
                  <span className={styles.pendingTitle}>{tr.calculatingTitle}</span>
                  <span className={styles.pendingBody}>{tr.calculatingBody}</span>
                </span>
              </div>
            </div>
            <div className={styles.pendingFigures} aria-hidden="true">
              {[0, 1, 2, 3].map((i) => (
                <div key={i} />
              ))}
            </div>
          </div>
        )}

        {simulate.isError && (
          <div role="alert" className={styles.error}>
            <span className={styles.errorTitle}>
              <IconXCircle />
              {tr.errorTitle}
            </span>
            <p className={styles.errorBody}>{rateLimited ? tr.rateLimited : tr.errorBody}</p>
            {!rateLimited && (
              <button type="button" className={styles.errorRetry} onClick={() => calculate()}>
                <IconRetry size={16} />
                {tr.retry}
              </button>
            )}
          </div>
        )}

        {result && lastRun && (
          <>
            {stale && (
              <span className={styles.stale}>
                <IconInfo />
                {tr.stale}
              </span>
            )}
            <SimulationResult
              // Cada cálculo monta su propio mapa: encuadre y animación arrancan de cero.
              key={simulate.submittedAt}
              result={result}
              batteryKwh={
                line.versions.find((v) => v.id === lastRun.modelId)?.bateria_kwh ??
                model.bateria_kwh
              }
              startBattery={lastRun.battery}
              from={cityOf(lastRun.origin)?.nombre ?? ""}
              to={cityOf(lastRun.destination)?.nombre ?? ""}
            />
          </>
        )}
      </div>
    </div>
  );
}

function UruguayOutline({ className, filled = false }: { className?: string; filled?: boolean }) {
  return (
    <svg viewBox="20 260 760 640" className={className} aria-hidden="true" focusable="false">
      <polygon
        points={uruguayPoints}
        fill={filled ? "var(--bg-panel)" : "none"}
        stroke="var(--border)"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
    </svg>
  );
}
