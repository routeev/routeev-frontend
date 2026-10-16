import { useMemo } from "react";
import { useTranslation, type Lang } from "../i18n/LanguageProvider";

/**
 * Números del showroom en el idioma de la página: "60,4" en castellano y
 * "60.4" en inglés. (num() de num.ts sigue siendo es-UY fijo para lo que
 * comparte con el resto de la app.)
 */
export function makeFormat(lang: Lang) {
  const locale = lang === "es" ? "es-UY" : "en-US";
  const n = (value: number, decimals = 0) =>
    value.toLocaleString(locale, {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    });
  return {
    n,
    /** "44,9" o "44,9–60,4" cuando las versiones difieren. */
    range: (min: number, max: number, decimals = 0) =>
      n(min, decimals) === n(max, decimals)
        ? n(min, decimals)
        : `${n(min, decimals)}–${n(max, decimals)}`,
    /** 415 → "6 h 55 min"; 40 → "40 min". */
    duration: (minutes: number) => {
      const total = Math.max(0, Math.round(minutes));
      const h = Math.floor(total / 60);
      const m = total % 60;
      return h > 0 ? `${h} h ${m} min` : `${m} min`;
    },
  };
}

export type Format = ReturnType<typeof makeFormat>;

export function useFormat(): Format {
  const { lang } = useTranslation();
  return useMemo(() => makeFormat(lang), [lang]);
}
