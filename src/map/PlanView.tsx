import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "../i18n/LanguageProvider";
import { readNumberInput } from "../shared/readNumberInput";
import { calculateGateMissing, useMapStore, vehicleAutonomyKm } from "./mapStore";
import { nextTripStep } from "./nextStep";
import {
  IconAlert,
  IconCar,
  IconCheck,
  IconChevronDown,
  IconClock,
  IconLocate,
  IconMinus,
  IconPlus,
  IconSwap,
} from "./panelIcons";
import { RouteAutocompleteField } from "./RouteAutocompleteField";
import { useGeolocation } from "./useGeolocation";
import ui from "./panel.module.css";
import styles from "./PlanView.module.css";

/** Cuánto tiene que tardar "Calcular ruta" para avisar que está tardando. */
const SLOW_CALC_MS = 6000;

/** Batería al salir: los botones van de 5 en 5, el número se puede tipear exacto. */
const BATTERY_STEP = 5;

interface PlanViewProps {
  calc: { calculate: () => void; isPending: boolean; startedAt: number; error: string | null };
  /** Aviso que viene del mapa (no se pudo centrar en tu ubicación, etc.). */
  mapNotice: { message: string; variant: "error" | "warn" } | null;
  /** Cargas que fallaron y no son las estaciones (esas se avisan en su pestaña). */
  loadFailed: string[];
  onRetryLoad: () => void;
}

/**
 * La pestaña "Viaje" antes de calcular: origen y destino, las dos preguntas,
 * el vehículo y la batería. "Calcular ruta" vive en el pie y aparece recién
 * cuando se puede calcular; mientras tanto, la línea de "paso siguiente" dice
 * qué falta (ver nextStep.ts).
 */
export function PlanView({ calc, mapNotice, loadFailed, onRetryLoad }: PlanViewProps) {
  const { t, lang } = useTranslation();
  const ri = t.map.routeInput;
  const pp = t.map.panel.plan;

  const picking = useMapStore((s) => s.picking);
  const startPicking = useMapStore((s) => s.startPicking);
  const stopPicking = useMapStore((s) => s.stopPicking);
  const swapEnds = useMapStore((s) => s.swapEnds);
  const origin = useMapStore((s) => s.originNode);
  const destination = useMapStore((s) => s.destinationNode);
  const cargadorEnDestino = useMapStore((s) => s.cargadorEnDestino);
  const setCargadorEnDestino = useMapStore((s) => s.setCargadorEnDestino);
  const routeMode = useMapStore((s) => s.routeMode);
  const setRouteMode = useMapStore((s) => s.setRouteMode);
  const vehicles = useMapStore((s) => s.vehicles);
  const vehiclesLoaded = useMapStore((s) => s.vehiclesLoaded);
  const selectedVehicleId = useMapStore((s) => s.selectedVehicleId);
  const selectVehicle = useMapStore((s) => s.selectVehicle);
  const startBatteryPct = useMapStore((s) => s.startBatteryPct);
  const setStartBatteryPct = useMapStore((s) => s.setStartBatteryPct);
  const geolocation = useGeolocation();

  // Calculado en cada render y no como selector del store: arma un array
  // nuevo cada vez (ver el comentario de calculateGateMissing en mapStore.ts).
  const gate = {
    vehiclesLoaded,
    hasSelectedVehicle: selectedVehicleId != null,
    origin,
    destination,
    chargerAnswered: cargadorEnDestino != null,
  };
  const ready = calculateGateMissing(gate).length === 0;
  const step = nextTripStep(gate, t.map.nextStep);

  // "Está tardando": se enciende a los 6 s del cálculo EN CURSO. Se guarda el
  // startedAt del cálculo para el que venció el plazo, así un cálculo nuevo
  // arranca sin el aviso aunque el anterior lo haya tenido.
  const [slowFor, setSlowFor] = useState<number | null>(null);
  useEffect(() => {
    if (!calc.isPending) return;
    const id = window.setTimeout(() => setSlowFor(calc.startedAt), SLOW_CALC_MS);
    return () => window.clearTimeout(id);
  }, [calc.isPending, calc.startedAt]);
  const slow = calc.isPending && slowFor === calc.startedAt;

  const vehicle = vehicles.find((v) => v.id === selectedVehicleId) ?? null;
  const fmt = (n: number, decimals = 0) =>
    n.toLocaleString(lang === "es" ? "es-UY" : "en-US", {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    });
  const pct = Math.max(0, Math.min(100, startBatteryPct || 0));
  const fullRangeKm = vehicle ? vehicleAutonomyKm(vehicle) : 0;
  const level = pct >= 40 ? "high" : pct >= 20 ? "mid" : "low";
  const levelTone = { high: ui.toneAccent, mid: ui.toneWarn, low: ui.toneDanger }[level];
  const levelText = { high: ui.textAccent, mid: ui.textWarn, low: ui.textDanger }[level];

  const togglePicking = (role: "origin" | "destination") =>
    picking === role ? stopPicking() : startPicking(role);

  const stepBattery = (dir: 1 | -1) => {
    // Desde un valor tipeado a mano (37) el primer toque lleva al múltiplo de
    // 5 más cercano en esa dirección (40 o 35), no a 42 o 32.
    const next =
      dir > 0
        ? Math.floor(pct / BATTERY_STEP + 1) * BATTERY_STEP
        : Math.ceil(pct / BATTERY_STEP - 1) * BATTERY_STEP;
    setStartBatteryPct(Math.max(BATTERY_STEP, Math.min(100, next)));
  };

  const chargeOptions = [
    { key: "yes", label: ri.chargerAtDestination.yes, value: true },
    { key: "no", label: ri.chargerAtDestination.no, value: false },
  ] as const;
  const modeOptions = (["eficiente", "rapido", "economico"] as const).map((m) => ({
    value: m,
    label: ri.routeMode[m],
  }));
  const chargeHelp =
    cargadorEnDestino == null
      ? pp.chargeHelp.none
      : cargadorEnDestino
        ? pp.chargeHelp.yes
        : pp.chargeHelp.no;

  return (
    <>
      <div className={ui.body}>
        <div className={ui.group}>
          <div className={styles.odCard}>
            <span className={styles.originMark} aria-hidden="true" />
            <span className={styles.destMark} aria-hidden="true" />
            <span className={styles.connector} aria-hidden="true" />
            <RouteAutocompleteField
              role="origin"
              placeholder={ri.originPlaceholder}
              isPicking={picking === "origin"}
              onPickTarget={() => togglePicking("origin")}
            />
            <RouteAutocompleteField
              role="destination"
              placeholder={ri.destinationPlaceholder}
              isPicking={picking === "destination"}
              onPickTarget={() => togglePicking("destination")}
            />
            <div className={styles.swapCell}>
              <button
                type="button"
                className={styles.swap}
                disabled={!origin && !destination}
                title={ri.swapPoints}
                onClick={() => swapEnds()}
              >
                <IconSwap />
                <span className="sr-only">{ri.swapPoints}</span>
              </button>
            </div>
          </div>

          <div className={styles.locateRow}>
            <button
              type="button"
              className={ui.btnOutline}
              onClick={geolocation.useMyLocation}
              disabled={geolocation.busy}
            >
              <IconLocate />
              {geolocation.busy ? ri.locatingYou : ri.useMyLocation}
            </button>
            {geolocation.result && (
              <p
                role="status"
                className={[
                  styles.locateResult,
                  geolocation.result.kind === "ok" ? ui.textAccent : "",
                  geolocation.result.kind === "warn" ? ui.textWarn : "",
                  geolocation.result.kind === "error" ? ui.textDanger : "",
                ].join(" ")}
              >
                {geolocation.result.kind === "ok" && <IconCheck />}
                {geolocation.result.text}
              </p>
            )}
          </div>

          <p role="status" className={[styles.step, step.done ? styles.stepDone : ""].join(" ")}>
            {step.done ? (
              <span className={styles.stepCheck} aria-hidden="true">
                <IconCheck size={12} strokeWidth={3} />
              </span>
            ) : (
              <span className={styles.stepNum} aria-hidden="true">
                {step.num}
              </span>
            )}
            <span>{step.text}</span>
          </p>

          {calc.error && (
            // alert: el fallo llega como respuesta a "Calcular ruta", y en un
            // celular el botón queda lejos de acá. Sin anuncio, la lectura es
            // "no pasó nada".
            <div role="alert" className={ui.alertDanger}>
              <IconAlert />
              <p className={ui.alertText}>{calc.error}</p>
              <button type="button" className={ui.alertAction} onClick={calc.calculate}>
                {pp.retry}
              </button>
            </div>
          )}
          {mapNotice && (
            <p className={mapNotice.variant === "error" ? ui.alertDanger : ui.alertWarn}>
              <IconAlert size={18} />
              <span className={ui.alertText}>{mapNotice.message}</span>
            </p>
          )}
          {loadFailed.length > 0 && (
            <div role="alert" className={ui.alertDanger}>
              <IconAlert />
              <p className={ui.alertText}>{t.map.page.loadFailed(loadFailed.join(", "))}</p>
              <button type="button" className={ui.alertAction} onClick={onRetryLoad}>
                {pp.retry}
              </button>
            </div>
          )}
        </div>

        {destination && (
          // Recién con destino: antes la pregunta no tiene sujeto ("¿en el
          // destino?" ¿cuál?).
          <div className={styles.questions}>
            <div className={ui.question}>
              <p className={ui.questionLabel} id="q-charger">
                {ri.chargerAtDestination.legend}
              </p>
              <div role="radiogroup" aria-labelledby="q-charger" className={ui.segmented}>
                {chargeOptions.map((o) => (
                  <button
                    key={o.key}
                    type="button"
                    role="radio"
                    aria-checked={cargadorEnDestino === o.value}
                    className={ui.segOption}
                    onClick={() => setCargadorEnDestino(o.value)}
                  >
                    {o.label}
                  </button>
                ))}
              </div>
              <p className={ui.muted}>{chargeHelp}</p>
            </div>
            <div className={ui.question}>
              <p className={ui.questionLabel} id="q-mode">
                {ri.routeMode.legend}
              </p>
              <div role="radiogroup" aria-labelledby="q-mode" className={ui.segmented}>
                {modeOptions.map((o) => (
                  <button
                    key={o.value}
                    type="button"
                    role="radio"
                    aria-checked={routeMode === o.value}
                    className={ui.segOption}
                    onClick={() => setRouteMode(o.value)}
                  >
                    {o.label}
                  </button>
                ))}
              </div>
              <p className={ui.muted}>{t.map.tripDashboard.tripMode[routeMode]}</p>
            </div>
          </div>
        )}

        <section className={styles.vehicle} aria-labelledby="vehicle-title">
          <div className={ui.sectionHead}>
            <h3 className={ui.sectionTitle} id="vehicle-title">
              {pp.vehicle}
            </h3>
            {vehicles.length > 0 && (
              // ?agregar-vehiculo=1: el perfil lo lee al montar y abre solo
              // el diálogo de alta (ver CarsSection.tsx).
              <Link to="/profile?agregar-vehiculo=1" className={ui.linkAction}>
                <IconPlus />
                {t.map.vehiclePanel.addVehicle}
              </Link>
            )}
          </div>

          {!vehiclesLoaded ? (
            <p className={[ui.cardPadded, ui.muted].join(" ")}>
              {t.map.vehiclePanel.loadingVehicles}
            </p>
          ) : vehicles.length === 0 ? (
            <div className={ui.dashedCard}>
              <span className={ui.iconBox}>
                <IconCar />
              </span>
              <div className={styles.emptyText}>
                <p className={ui.cardTitle}>{pp.noVehicleTitle}</p>
                <p className={ui.muted}>{pp.noVehicleBody}</p>
              </div>
              <Link to="/profile?agregar-vehiculo=1" className={ui.btnAccentOutline}>
                <IconPlus />
                {t.map.vehiclePanel.addVehicle}
              </Link>
            </div>
          ) : (
            <div className={[ui.card, styles.vehicleCard].join(" ")}>
              {/* El <select> nativo va encima de la fila, transparente: se ve
                  la fila del diseño y se abre el selector del sistema, que en
                  el celular es mucho más cómodo que una lista propia. */}
              <label className={styles.vehicleRow}>
                <span className={ui.iconBox}>
                  <IconCar />
                </span>
                <span className={styles.vehicleText}>
                  <span className={styles.vehicleName}>
                    {vehicle?.name ?? t.map.vehiclePanel.activeVehicle}
                  </span>
                  {vehicle && (
                    <span className={styles.vehicleSub}>
                      {pp.vehicleSub(fmt(vehicle.battery_capacity_kwh, 1), fmt(fullRangeKm))}
                    </span>
                  )}
                </span>
                <span className={styles.vehicleChevron}>
                  <IconChevronDown />
                </span>
                <select
                  className={styles.vehicleSelect}
                  aria-label={pp.changeVehicle}
                  value={selectedVehicleId ?? ""}
                  onChange={(e) => selectVehicle(e.target.value ? Number(e.target.value) : null)}
                >
                  {selectedVehicleId == null && (
                    <option value="">{t.map.vehiclePanel.activeVehicle}</option>
                  )}
                  {vehicles.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.name}
                    </option>
                  ))}
                </select>
              </label>

              <div className={styles.battery}>
                <div className={styles.batteryHead}>
                  <label htmlFor="start-battery">{pp.batteryAtStart}</label>
                  <span className={levelText}>{pp.levels[level]}</span>
                </div>
                <div className={styles.batteryControl}>
                  <button
                    type="button"
                    className={styles.stepBtn}
                    aria-label={pp.less}
                    disabled={!vehicle || pct <= BATTERY_STEP}
                    onClick={() => stepBattery(-1)}
                  >
                    <IconMinus />
                  </button>
                  <div className={styles.batteryCenter}>
                    <span className={styles.batteryNumber}>
                      <input
                        id="start-battery"
                        className={styles.batteryInput}
                        type="number"
                        inputMode="numeric"
                        min={0}
                        max={100}
                        step={1}
                        disabled={!vehicle}
                        value={vehicle ? startBatteryPct : ""}
                        onChange={(e) => setStartBatteryPct(readNumberInput(e))}
                      />
                      <span className={styles.batteryUnit}>%</span>
                    </span>
                    {vehicle && (
                      <span className={styles.batteryRange} aria-live="polite">
                        {pp.range(fmt((fullRangeKm * pct) / 100))}
                      </span>
                    )}
                  </div>
                  <button
                    type="button"
                    className={styles.stepBtn}
                    aria-label={pp.more}
                    disabled={!vehicle || pct >= 100}
                    onClick={() => stepBattery(1)}
                  >
                    <IconPlus size={18} />
                  </button>
                </div>
                <div className={ui.bar}>
                  <div className={[ui.barFill, levelTone].join(" ")} style={{ width: `${pct}%` }} />
                </div>
              </div>
            </div>
          )}
        </section>
      </div>

      {/* El pie entero aparece recién cuando se puede calcular: no un botón
          gris sin explicación. Lo que falta lo dice el paso siguiente. */}
      {(ready || calc.isPending) && (
        <div className={ui.foot}>
          <button
            type="button"
            className={ui.btnPrimary}
            disabled={calc.isPending}
            aria-busy={calc.isPending}
            onClick={calc.calculate}
          >
            {calc.isPending && <span className={ui.spinner} aria-hidden="true" />}
            {calc.isPending ? pp.calculating : t.map.page.calculateRoute}
          </button>
          {slow ? (
            <p role="status" className={styles.slowNote}>
              <IconClock />
              {pp.calculatingSlow}
            </p>
          ) : (
            <p role="status" className={styles.footNote}>
              {calc.isPending ? pp.calculatingNote : t.map.page.readyToCalculate}
            </p>
          )}
        </div>
      )}
    </>
  );
}
