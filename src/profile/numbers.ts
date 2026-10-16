import type { Vehicle } from "../api/vehicles";
import type { Format } from "../showroom/format";

/** Lee una cifra escrita con coma o con punto ("0,18" o "0.18"). */
export function parseDecimal(value: string): number {
  return parseFloat(value.trim().replace(",", "."));
}

/** Autonomía con la batería llena: batería ÷ consumo. */
export function carRange(
  v: Pick<Vehicle, "battery_capacity_kwh" | "consumption_kwh_per_km">
): number | null {
  return v.consumption_kwh_per_km > 0
    ? Math.round(v.battery_capacity_kwh / v.consumption_kwh_per_km)
    : null;
}

/** 44,9 · 0,169 · 60: sin decimales de más. */
export function carFigures(
  f: Format,
  v: Pick<Vehicle, "battery_capacity_kwh" | "consumption_kwh_per_km" | "charging_power_kw">
) {
  const kwh = v.battery_capacity_kwh;
  return {
    kwh: f.n(kwh, kwh % 1 ? 1 : 0),
    cons: f.n(v.consumption_kwh_per_km, 3).replace(/0$/, ""),
    kw: f.n(v.charging_power_kw, v.charging_power_kw % 1 ? 1 : 0),
  };
}
