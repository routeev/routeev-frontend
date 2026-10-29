import { useTranslation } from "../i18n/LanguageProvider";
import { PumpkinArt } from "./halloweenArt";
import { useSeason } from "./season";
import styles from "./SeasonChip.module.css";

/**
 * "Edición Halloween" en el header de las páginas públicas (landing, showroom,
 * login). Solo avisa: la temporada no se puede apagar hasta que termina. Ni en
 * /app ni en /profile: ahí el disfraz es solo la paleta.
 */
export function SeasonChip({ className }: { className?: string }) {
  const season = useSeason();
  const { t } = useTranslation();
  if (!season) return null;

  return (
    <span className={[styles.chip, className].filter(Boolean).join(" ")}>
      <PumpkinArt size={18} />
      <span className={styles.label}>{t.common.season.halloween}</span>
    </span>
  );
}
