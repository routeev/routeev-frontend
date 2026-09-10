/**
 * "hace 4 min" / "hace 2 h" a partir de un ISO del backend. Redondea hacia
 * ABAJO y nunca dice "recién": un dato de 40 segundos mostrado como "ahora"
 * invita a confiar en él más de lo que corresponde -- mismo criterio que
 * `antiguedad()` en StationStatusChip.tsx (el feed oficial de UTE), pero
 * generalizado a horas: ahí nunca hacía falta (el dato se refresca cada
 * pocos minutos), acá sí -- un reporte de la comunidad sigue vigente varias
 * horas (ver STATION_STATUS_REPORT_TTL_HOURS en la API).
 */
export function timeAgo(iso: string, t: { haceMin: (m: number) => string; haceHoras: (h: number) => string; reciente: string }): string {
  const ms = Date.now() - new Date(iso).getTime();
  if (!Number.isFinite(ms) || ms < 60_000) return t.reciente;
  const minutos = Math.floor(ms / 60_000);
  if (minutos < 90) return t.haceMin(minutos);
  return t.haceHoras(Math.floor(minutos / 60));
}
