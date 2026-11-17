import type { Vehicle } from "../api/vehicles";
import type { Format } from "../showroom/format";

/** Lee una cifra escrita con coma o con punto ("0,18" o "0.18"). */
export function parseDecimal(value: string): number {
  return parseFloat(value.trim().replace(",", "."));
}

/**
 * El consumo se guarda y viaja en kWh/km (es lo que habla la API), pero en Uruguay se
 * dice en kWh cada 100 km: es la unidad de la ficha del auto y de cualquier folleto.
 * Estas dos son el único lugar donde se cambia de una a la otra.
 *
 * El `toPrecision` no es adorno: 0,169 × 100 da 16,900000000000002 en coma flotante, y
 * eso terminaría escrito en el campo al editar un auto. Doce cifras limpian el ruido sin
 * tocar un dato real (0,1693 sigue siendo 16,93).
 */
export function consumoPor100(kwhKm: number): number {
  return Number((kwhKm * 100).toPrecision(12));
}

/** kWh cada 100 km → kWh/km, la unidad de la API. */
export function consumoDePor100(por100: number): number {
  return Number((por100 / 100).toPrecision(12));
}

/**
 * 16,9 · 14,5 · 16,93: kWh cada 100 km con los decimales que tiene, hasta dos.
 * `n` es el formateador de números del lugar donde se muestra.
 */
export function consumoTexto(n: (value: number, decimals?: number) => string, kwhKm: number): string {
  const x = consumoPor100(kwhKm);
  return n(x, Math.min(2, (String(x).split(".")[1] ?? "").length));
}

/** Autonomía con la batería llena: batería ÷ consumo. */
export function carRange(
  v: Pick<Vehicle, "battery_capacity_kwh" | "consumption_kwh_per_km">
): number | null {
  return v.consumption_kwh_per_km > 0
    ? Math.round(v.battery_capacity_kwh / v.consumption_kwh_per_km)
    : null;
}

/** 44,9 · 16,9 · 60: sin decimales de más. El consumo, en kWh cada 100 km. */
export function carFigures(
  f: Format,
  v: Pick<Vehicle, "battery_capacity_kwh" | "consumption_kwh_per_km" | "charging_power_kw">
) {
  const kwh = v.battery_capacity_kwh;
  return {
    kwh: f.n(kwh, kwh % 1 ? 1 : 0),
    cons: consumoTexto(f.n, v.consumption_kwh_per_km),
    kw: f.n(v.charging_power_kw, v.charging_power_kw % 1 ? 1 : 0),
  };
}
