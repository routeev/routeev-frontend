import type { MouseEvent } from "react";
import { useTranslation } from "../i18n/LanguageProvider";
import { IconClose } from "../map/panelIcons";
import { PumpkinArt } from "./halloweenArt";
import { dismissSeason, useSeason } from "./season";
import styles from "./SeasonChip.module.css";

/**
 * "Edición Halloween" en el header de las páginas públicas (landing, showroom,
 * login). Es la única pieza nueva del disfraz y la forma de sacárselo: cerrar
 * apaga la temporada para esta persona hasta el año que viene. Ni en /app ni
 * en /profile: ahí el disfraz es solo la paleta.
 */
export function SeasonChip({ className }: { className?: string }) {
  const season = useSeason();
  const { t } = useTranslation();
  if (!season) return null;
  const s = t.common.season;

  function onDismiss(e: MouseEvent<HTMLButtonElement>) {
    // El chip desaparece con el foco adentro: lo pasamos al logo (el primer
    // link del header) para que quien usa teclado no vuelva al principio.
    e.currentTarget.closest("header")?.querySelector<HTMLElement>("a[href]")?.focus();
    dismissSeason();
  }

  return (
    <span className={[styles.chip, className].filter(Boolean).join(" ")}>
      <PumpkinArt size={18} />
      <span className={styles.label}>{s.halloween}</span>
      <button
        type="button"
        className={styles.close}
        aria-label={s.dismissHalloween}
        onClick={onDismiss}
      >
        <IconClose size={14} />
      </button>
    </span>
  );
}
