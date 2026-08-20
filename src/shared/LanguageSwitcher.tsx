import { useEffect, useRef, useState } from "react";
import { useTranslation } from "../i18n/LanguageProvider";
import type { Lang } from "../i18n/LanguageProvider";
import { IconChevronDown } from "./NavIcons";
import styles from "./LanguageSwitcher.module.css";

// "short" es lo que se ve en el dropdown (pedido explícito: "ENG"/"ES", no
// el nombre completo) -- el nombre completo (t.common.languageNameEs/En)
// sigue existiendo para el aria-label del gatillo, que no tiene texto
// visible (solo la bandera + la flechita) y sí lo necesita.
// Reino Unido/España, no Uruguay/Estados Unidos -- pedido explícito. Orden
// EN primero, ES segundo, en ese mismo pedido.
const LANGS: { code: Lang; flag: string; short: string }[] = [
  { code: "en", flag: "🇬🇧", short: "ENG" },
  { code: "es", flag: "🇪🇸", short: "ES" },
];

/**
 * Selector ES/EN, usado en AppTopbar (pantallas con cuenta) y SiteHeader
 * (landing/legales/showroom). Dropdown con banderita en vez del toggle de
 * dos botones que tenía antes: pedido explícito de que se vea "más
 * profesional" -- mismo patrón de menú desplegable que ya usa el chip de
 * usuario de AppTopbar (botón + panel absoluto + cierre al click afuera),
 * asi el idioma no introduce un mecanismo de interacción nuevo en la app.
 */
export function LanguageSwitcher() {
  const { lang, setLang, t } = useTranslation();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    function onDocClick(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [open]);

  const nameOf = (code: Lang) => (code === "es" ? t.common.languageNameEs : t.common.languageNameEn);
  const current = LANGS.find((l) => l.code === lang) ?? LANGS[0]!;

  function choose(code: Lang) {
    setLang(code);
    setOpen(false);
  }

  return (
    <div className={styles.switcher} ref={rootRef}>
      <button
        type="button"
        className={styles.trigger}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`${t.common.languageSwitcherLabel}: ${nameOf(lang)}`}
        onClick={() => setOpen((v) => !v)}
      >
        <span className={styles.flag} aria-hidden="true">
          {current.flag}
        </span>
        <IconChevronDown />
      </button>
      {open && (
        <div className={styles.dropdown} role="menu">
          {LANGS.map((l) => (
            <button
              key={l.code}
              type="button"
              role="menuitemradio"
              aria-checked={lang === l.code}
              title={nameOf(l.code)}
              className={[styles.option, lang === l.code ? styles.optionActive : ""].join(" ")}
              onClick={() => choose(l.code)}
            >
              <span className={styles.flag} aria-hidden="true">
                {l.flag}
              </span>
              {l.short}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
