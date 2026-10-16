import { useState, type CSSProperties } from "react";
import { useTranslation } from "../i18n/LanguageProvider";
import { IconAlert, IconCheck } from "../map/panelIcons";
import styles from "./BatteryDemo.module.css";

type StartCharge = 100 | 80 | 60;

interface Scenario {
  arrive: number;
  margin: "ok" | "low";
  hours: number;
  minutes: number;
  cost: number;
  /** `at`: dónde cae la parada en la ruta, de 0 (origen) a 1 (destino). */
  stops: { name: string; minutes: number; at: number }[];
}

// Datos de ejemplo del handoff, rotulados como tales en la página: BYD
// Dolphin, Montevideo → Rivera (497 km). PENDIENTE: validarlos contra el
// motor real, idealmente con un cálculo hecho al construir y no en vivo.
const SCENARIOS: Record<StartCharge, Scenario> = {
  100: {
    arrive: 24,
    margin: "ok",
    hours: 6,
    minutes: 15,
    cost: 740,
    stops: [{ name: "Paso de los Toros", minutes: 25, at: 0.5 }],
  },
  80: {
    arrive: 12,
    margin: "low",
    hours: 6,
    minutes: 25,
    cost: 790,
    stops: [{ name: "Paso de los Toros", minutes: 35, at: 0.5 }],
  },
  60: {
    arrive: 21,
    margin: "ok",
    hours: 6,
    minutes: 50,
    cost: 860,
    stops: [
      { name: "Florida", minutes: 20, at: 0.2 },
      { name: "Tacuarembó", minutes: 25, at: 0.78 },
    ],
  },
};

const START_CHARGES: StartCharge[] = [100, 80, 60];

/**
 * "La autonomía real no es la del folleto": el mismo viaje con tres cargas
 * de salida, en la tarjeta de resultado de /app. Lo único interactivo de la
 * landing además del menú.
 */
export function BatteryDemo() {
  const { t } = useTranslation();
  const b = t.landing.battery;
  const [start, setStart] = useState<StartCharge>(100);
  const s = SCENARIOS[start];
  const ok = s.margin === "ok";
  const MarginIcon = ok ? IconCheck : IconAlert;

  return (
    <section aria-labelledby="bateria-titulo" className={styles.section}>
      <div className={styles.inner}>
        <div className={styles.text}>
          <h2 id="bateria-titulo" className={styles.title}>
            {b.title}
          </h2>
          <p className={styles.body}>{b.body}</p>
          <div className={styles.picker}>
            <span id="bateria-pregunta" className={styles.question}>
              {b.question}
            </span>
            <div role="group" aria-labelledby="bateria-pregunta" className={styles.segmented}>
              {START_CHARGES.map((value) => (
                <button
                  key={value}
                  type="button"
                  aria-pressed={start === value}
                  onClick={() => setStart(value)}
                >
                  {value}
                  <span className={styles.unit}>%</span>
                </button>
              ))}
            </div>
            <span className={styles.sample}>{b.sample}</span>
          </div>
        </div>

        <div className={styles.card}>
          <div className={styles.od}>
            <span className={styles.originDot} aria-hidden="true" />
            <span>Montevideo</span>
            <span className={styles.odLine} aria-hidden="true" />
            <span className={styles.destDiamond} aria-hidden="true" />
            <span>Rivera</span>
            <span className={styles.distance}>497 km</span>
          </div>

          <div role="img" aria-label={b.routeAria(s.stops.length)} className={styles.strip}>
            <div className={styles.stripLine} />
            <span className={styles.stripOrigin} />
            <span className={styles.stripDest} />
            {s.stops.map((stop, i) => (
              <div
                key={stop.name}
                className={styles.stop}
                style={{ "--at": stop.at } as CSSProperties}
              >
                <span className={styles.stopSquare}>{i + 1}</span>
                <span className={styles.stopText}>
                  <span className={styles.stopName}>{stop.name}</span>
                  <span className={styles.stopMinutes}>{stop.minutes} min</span>
                </span>
              </div>
            ))}
          </div>

          <div className={styles.arrive}>
            <div className={styles.arriveHead}>
              <span>{b.arriveWith}</span>
              <span className={ok ? styles.toneOk : styles.toneLow}>
                <MarginIcon size={16} />
                {ok ? b.goodMargin : b.lowMargin}
              </span>
            </div>
            <span aria-live="polite" className={styles.arriveValue}>
              {s.arrive}
              <span className={styles.arriveUnit}>%</span>
            </span>
            <div className={styles.track}>
              <div
                className={ok ? styles.fillOk : styles.fillLow}
                style={{ width: `${s.arrive}%` }}
              />
            </div>
            <div className={ok ? styles.messageOk : styles.messageLow}>
              <MarginIcon size={18} />
              <span>{ok ? b.goodMarginMessage : b.lowMarginMessage}</span>
            </div>
          </div>

          <div className={styles.stats}>
            <div className={styles.stat}>
              <span className={styles.statValue}>
                {s.hours}
                <span className={styles.statUnitH}>h</span>
                {s.minutes}
              </span>
              <span className={styles.statLabel}>{b.time}</span>
            </div>
            <div className={styles.stat}>
              <span className={styles.statValue}>
                <span className={styles.statUnitCost}>≈ $U</span>
                {s.cost}
              </span>
              <span className={styles.statLabel}>{b.cost}</span>
            </div>
            <div className={styles.stat}>
              <span className={styles.statValue}>{s.stops.length}</span>
              <span className={styles.statLabel}>{b.stops}</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
