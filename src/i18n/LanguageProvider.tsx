import { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import type { Dictionary } from "./dictionaries/en";
import { es } from "./dictionaries/es";
import { getStoredLang } from "./getStoredLang";

export type Lang = "es" | "en";

// Mismo prefijo routeev_ que el resto de las claves de localStorage del
// proyecto (routeev_token, routeev_username).
const STORAGE_KEY = "routeev_lang";

// El español va en el chunk de entrada (es el idioma de casi todas las
// visitas); el inglés se baja aparte, solo para quien lo eligió. Los dos
// juntos eran ~97 kB del chunk que carga toda página antes de mostrar nada.
let enDictionary: Dictionary | null = null;
let enLoading: Promise<Dictionary> | null = null;

function loadEnglish(): Promise<Dictionary> {
  enLoading ??= import("./dictionaries/en").then((m) => {
    enDictionary = m.en;
    return m.en;
  });
  // Si falló (sin red), el próximo intento vuelve a pedirlo.
  enLoading.catch(() => {
    enLoading = null;
  });
  return enLoading;
}

// Quien ya había elegido inglés lo empieza a bajar apenas carga este módulo,
// a la par del chunk de la página, y no recién cuando React monta.
if (getStoredLang() === "en") void loadEnglish().catch(() => {});

interface LanguageContextValue {
  lang: Lang;
  /** El diccionario completo del idioma actual -- t.nav.myProfile, t.map.tripStats.marginCritical(pct), etc. */
  t: Dictionary;
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
  const [english, setEnglish] = useState<Dictionary | null>(enDictionary);

  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  // Entró con inglés guardado y el diccionario todavía está bajando. Si no
  // llega (sin red), la página sale en español en vez de quedar en blanco;
  // la preferencia guardada no se toca.
  useEffect(() => {
    if (lang !== "en" || english) return;
    let alive = true;
    loadEnglish().then(
      (dictionary) => alive && setEnglish(dictionary),
      () => alive && setLangState("es")
    );
    return () => {
      alive = false;
    };
  }, [lang, english]);

  const value = useMemo<LanguageContextValue>(
    () => ({
      lang,
      t: lang === "en" && english ? english : es,
      setLang: (next) => {
        window.localStorage.setItem(STORAGE_KEY, next);
        if (next === "es" || enDictionary) {
          if (enDictionary) setEnglish(enDictionary);
          setLangState(next);
          return;
        }
        // Al cambiar a inglés la página sigue en español hasta que el
        // diccionario llega: nunca se ve a medio traducir.
        loadEnglish().then(
          (dictionary) => {
            setEnglish(dictionary);
            setLangState("en");
          },
          () => {}
        );
      },
    }),
    [lang, english]
  );

  // Solo al entrar con inglés guardado, un instante: mejor nada que la página
  // en español que enseguida cambia de idioma.
  if (lang === "en" && !english) return null;

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useTranslation(): LanguageContextValue {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error("useTranslation() tiene que usarse dentro de <LanguageProvider>");
  return ctx;
}
