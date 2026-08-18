import { useTranslation } from "../i18n/LanguageProvider";
import styles from "./LanguageSwitcher.module.css";

/**
 * Selector ES/EN, usado en AppTopbar (pantallas con cuenta) y SiteHeader
 * (landing/legales/showroom). Sigla en vez de nombre completo del idioma a
 * propósito: "ES"/"EN" se entiende esté cual esté seleccionado el idioma
 * actual, mientras que "Español"/"English" en el idioma QUE NO es el activo
 * puede no leerse para quien todavía no lo entiende.
 */
export function LanguageSwitcher() {
  const { lang, setLang, t } = useTranslation();

  return (
    <div className={styles.switcher} role="group" aria-label={t.common.languageSwitcherLabel}>
      <button
        type="button"
        className={lang === "es" ? styles.active : undefined}
        aria-pressed={lang === "es"}
        onClick={() => setLang("es")}
      >
        ES
      </button>
      <button
        type="button"
        className={lang === "en" ? styles.active : undefined}
        aria-pressed={lang === "en"}
        onClick={() => setLang("en")}
      >
        EN
      </button>
    </div>
  );
}
