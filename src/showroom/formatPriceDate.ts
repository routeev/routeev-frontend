/**
 * Formatea una fecha "YYYY-MM-DD" (verificado_el de precio_uy, ver
 * api/showroom.ts) sin pasar por `Date`: es una fecha de calendario, no un
 * instante, y `new Date("YYYY-MM-DD")` la interpreta como medianoche UTC —
 * en un huso horario al oeste de UTC (como Uruguay) eso muestra el día
 * ANTERIOR al real. Partir el string a mano evita el problema entero.
 */
export function formatPriceDate(iso: string, lang: "es" | "en"): string {
  const [y, m, d] = iso.split("-");
  if (!y || !m || !d) return iso;
  return lang === "es" ? `${d}/${m}/${y}` : `${m}/${d}/${y}`;
}
