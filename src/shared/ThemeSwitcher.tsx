import { useState } from "react";
import { useTranslation } from "../i18n/LanguageProvider";
import { getStoredTheme, setTheme, type Theme } from "../theme/theme";
import styles from "./ThemeSwitcher.module.css";

/**
 * Selector claro/oscuro, solo en pantallas con cuenta (AppTopbar,
 * AccountPanel) -- a propósito no vive en SiteHeader (nav público de
 * landing/showroom/legales): el modo claro/oscuro es una preferencia de
 * cuenta, no algo que se le ofrezca a un visitante sin loguearse. No usa el
 * contexto de idioma para el propio tema -- ver src/theme/theme.ts sobre por
 * qué esto no necesita un LanguageProvider-like propio, solo estado local
 * que se sincroniza con localStorage + el atributo data-theme al elegir.
 */
export function ThemeSwitcher() {
  const { t } = useTranslation();
  const [theme, setThemeState] = useState<Theme>(getStoredTheme);

  function choose(next: Theme) {
    setTheme(next);
    setThemeState(next);
  }

  return (
    <div className={styles.switcher} role="group" aria-label={t.common.themeSwitcherLabel}>
      <button
        type="button"
        className={theme === "light" ? styles.active : undefined}
        aria-pressed={theme === "light"}
        aria-label={t.common.lightMode}
        title={t.common.lightMode}
        onClick={() => choose("light")}
      >
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <circle cx="12" cy="12" r="4.5" />
          <path d="M12 2.5v2.5M12 19v2.5M4.6 4.6l1.8 1.8M17.6 17.6l1.8 1.8M2.5 12H5M19 12h2.5M4.6 19.4l1.8-1.8M17.6 6.4l1.8-1.8" />
        </svg>
      </button>
      <button
        type="button"
        className={theme === "dark" ? styles.active : undefined}
        aria-pressed={theme === "dark"}
        aria-label={t.common.darkMode}
        title={t.common.darkMode}
        onClick={() => choose("dark")}
      >
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M20 14.5A8.5 8.5 0 1 1 9.5 4a7 7 0 0 0 10.5 10.5Z" />
        </svg>
      </button>
    </div>
  );
}
