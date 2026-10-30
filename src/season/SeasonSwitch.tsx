// El interruptor "Edicion Halloween": la unica pieza nueva de interfaz que
// suma el disfraz. Va en el header de todas las paginas mientras dura la
// ventana de fechas, y cada persona lo apaga y lo vuelve a prender cuando
// quiere. Pasado el 3/11 no se renderiza.

import { useState } from "react";
import { useTranslation } from "../i18n/LanguageProvider";
import { Calabaza } from "./halloweenArt";
import { useHayTemporada, useSeason } from "./season";
import { setSeasonOn } from "./seasonPreference";
import styles from "./SeasonSwitch.module.css";

function Tilde() {
  return (
    <svg viewBox="0 0 10 10" aria-hidden="true">
      <path
        d="M2 5.2 4 7.2 8 3"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

interface SeasonSwitchProps {
  /**
   * "bar" va en la barra de escritorio (dentro de .actions, que ya se
   * oculta en mobile). "compact" es el de mobile, al lado del boton del
   * menu, y se oculta solo de 900 para arriba. "withLabel" suma el texto a
   * la vista: lo usa el pie del login en el celular, donde el header no
   * tiene lugar.
   */
  variant?: "bar" | "compact" | "withLabel";
}

export function SeasonSwitch({ variant = "bar" }: SeasonSwitchProps) {
  const { t } = useTranslation();
  const hayTemporada = useHayTemporada();
  const on = useSeason() === "halloween";
  const [aviso, setAviso] = useState("");

  // Fuera de la ventana de fechas no hay nada que prender: el interruptor
  // desaparece solo el 3/11, sin desplegar.
  if (!hayTemporada) return null;

  const s = t.common.season;

  function alternar() {
    setSeasonOn(!on);
    // El cambio visual es toda la paleta, asi que a la vista no hace falta
    // confirmar nada -- esto es para quien no lo ve. Region propia y no una
    // global: el interruptor es el unico que escribe aca.
    setAviso(on ? s.offNotice : s.onNotice);
  }

  return (
    <>
      <button
        type="button"
        role="switch"
        aria-checked={on}
        aria-label={variant === "withLabel" ? undefined : s.name}
        title={on ? s.turnOff : s.turnOn}
        className={[styles.wrap, variant === "compact" ? styles.soloMovil : ""].join(" ")}
        onClick={alternar}
      >
        <Calabaza className={[styles.calabaza, on ? "" : styles.calabazaOff].join(" ")} />
        {variant === "withLabel" && <span className={styles.label}>{s.name}</span>}
        <span className={[styles.track, on ? "" : styles.trackOff].join(" ")} aria-hidden="true">
          <span className={[styles.knob, on ? "" : styles.knobOff].join(" ")}>
            {on && <Tilde />}
          </span>
        </span>
      </button>
      {/* aria-live y no role="status": el interruptor va en el header de
          TODAS las paginas, y varias ya tienen su propia region de estado
          (el login tiene dos). Un segundo role="status" las vuelve
          ambiguas -- para quien usa la pagina y para quien la testea. Esto
          anuncia igual (role="status" es exactamente una region polite y
          atomica) sin sumar un rol que ya esta ocupado. */}
      <span aria-live="polite" aria-atomic="true" className={styles.aviso}>
        {aviso}
      </span>
    </>
  );
}
