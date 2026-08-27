import { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { en } from "./dictionaries/en";
import { es } from "./dictionaries/es";
import { getStoredLang } from "./getStoredLang";

export type Lang = "es" | "en";

// Mismo prefijo routeev_ que el resto de las claves de localStorage del
// proyecto (routeev_token, routeev_username).
const STORAGE_KEY = "routeev_lang";

const dictionaries = { es, en };

interface LanguageContextValue {
  lang: Lang;
  /** El diccionario completo del idioma actual -- t.nav.myProfile, t.map.tripStats.marginCritical(pct), etc. */
  t: (typeof dictionaries)[Lang];
  setLang: (lang: Lang) => void;
}

const LanguageContext = createContext<LanguageContextValue | null>(null);

/**
 * Envuelve toda la app (ver App.tsx). El español sigue siendo el default de
 * toda la vida -- solo se pasa a inglés si la persona lo eligió antes, en
 * esta pestaña o en una visita anterior (localStorage).
 */
export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(getStoredLang);

  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  const value = useMemo<LanguageContextValue>(
    () => ({
      lang,
      t: dictionaries[lang],
      setLang: (next) => {
        setLangState(next);
        window.localStorage.setItem(STORAGE_KEY, next);
      },
    }),
    [lang]
  );

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useTranslation(): LanguageContextValue {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error("useTranslation() tiene que usarse dentro de <LanguageProvider>");
  return ctx;
}
