// Portado 1:1 desde js/api.js -- mismo criterio es-UY hardcodeado (el sitio
// no tiene i18n, front2.md 1.8), mismas reglas de redondeo.

export function formatDuration(totalMinutes: number): string {
  const mins = Math.max(0, Math.round(totalMinutes));
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return h > 0 ? `${h} h ${m} min` : `${m} min`;
}

export function formatUyu(value: number): string {
  return new Intl.NumberFormat("es-UY", {
    style: "currency",
    currency: "UYU",
    maximumFractionDigits: 0,
  }).format(Math.max(0, value));
}

export function formatDate(isoString: string): string {
  const d = new Date(isoString);
  return d.toLocaleString("es-UY", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
