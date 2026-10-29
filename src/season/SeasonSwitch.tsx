import { useTranslation } from "../i18n/LanguageProvider";
import { PumpkinArt } from "./halloweenArt";
import { useSeasonSwitch } from "./season";
import { setSeasonOn } from "./seasonPreference";
import styles from "./SeasonSwitch.module.css";

/**
 * Interruptor de la edición Halloween, en el header de todo el sitio. Prende y
 * apaga el disfraz y se acuerda de la elección. Solo existe mientras dura la
 * temporada: después del 3/11 no devuelve nada.
 *
 * Es un `role="switch"` de verdad (los lectores de pantalla dicen "activado" o
 * "desactivado"), y el estado se ve por la posición de la perilla, el tilde y
 * el color, no solo por el color. Solo usa tokens que existen también con la
 * temporada apagada y en el tema claro de /app: tiene que verse bien en los
 * dos estados.
 */
export function SeasonSwitch({ className }: { className?: string }) {
  const { available, on } = useSeasonSwitch();
  const { t } = useTranslation();
  if (!available) return null;
  const s = t.common.season;

  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      title={on ? s.turnOff : s.turnOn}
      className={[styles.switch, on ? styles.on : "", className].filter(Boolean).join(" ")}
      onClick={() => setSeasonOn(!on)}
    >
      <PumpkinArt size={20} className={styles.pumpkin} />
      <span className={styles.label}>{s.halloween}</span>
      <span className={styles.track} aria-hidden="true">
        <span className={styles.thumb}>
          <svg viewBox="0 0 12 12" width="10" height="10" className={styles.check}>
            <path
              d="m2.5 6.4 2.4 2.4 4.6-5"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.9"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </span>
      </span>
    </button>
  );
}
