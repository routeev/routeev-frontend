/**
 * Asesor de velocidad recomendada durante el viaje en vivo, portado 1:1 de
 * js/map/liveTrip.js. Modelo puramente informativo (no toca el cálculo de
 * la ruta): el consumo del vehículo en el motor de ruteo es una constante
 * kWh/km fija, pero en la realidad ir más rápido consume más energía por
 * km -- ese margen es lo que permite, yendo más lento, estirar la batería.
 *
 * No calibrado con datos reales de ningún vehículo: asume que el consumo
 * informado corresponde a un ritmo de referencia de 90 km/h.
 */

const REFERENCE_SPEED_KMH = 90;
const LOW_SPEED_FACTOR_FLOOR = 0.55;
const MIN_SUGGESTED_SPEED_KMH = 40;
const SAFE_MARGIN = 1.0;
const COMFORTABLE_MARGIN = 1.15;

export type AdvisoryKind = "ok" | "tight" | "warn" | "danger";
export interface SpeedAdvisory {
  kind: AdvisoryKind;
  text: string;
}

export interface SpeedAdvisoryInput {
  speedKmh: number | null;
  batteryKwh: number;
  consumptionKwhKm: number;
  remainingKm: number;
  pendingRecharge: boolean;
}

function speedConsumptionFactor(speedKmh: number): number {
  const v = Math.max(5, Math.min(160, speedKmh));
  const r = v / REFERENCE_SPEED_KMH;
  return v <= REFERENCE_SPEED_KMH ? LOW_SPEED_FACTOR_FLOOR + (1 - LOW_SPEED_FACTOR_FLOOR) * r * r : r * r;
}

function speedForConsumptionFactor(factor: number): number {
  if (factor >= 1) return REFERENCE_SPEED_KMH * Math.sqrt(factor);
  const clamped = Math.max(LOW_SPEED_FACTOR_FLOOR, factor);
  return REFERENCE_SPEED_KMH * Math.sqrt((clamped - LOW_SPEED_FACTOR_FLOOR) / (1 - LOW_SPEED_FACTOR_FLOOR));
}

function speedForTargetMargin(speedKmh: number, margin: number, targetMargin: number): number {
  const targetFactor = speedConsumptionFactor(speedKmh) * (margin / targetMargin);
  return speedForConsumptionFactor(targetFactor);
}

export function computeSpeedAdvisory({
  speedKmh,
  batteryKwh,
  consumptionKwhKm,
  remainingKm,
  pendingRecharge,
}: SpeedAdvisoryInput): SpeedAdvisory | null {
  if (speedKmh == null || remainingKm < 0.15) return null;

  const affordableRate = batteryKwh / remainingKm;
  const neededRateNow = consumptionKwhKm * speedConsumptionFactor(speedKmh);
  const margin = affordableRate / neededRateNow;

  if (margin >= COMFORTABLE_MARGIN) {
    return {
      kind: "ok",
      text: pendingRecharge
        ? "A este ritmo estás gastando menos de lo previsto: es posible que no necesites la parada de carga planeada."
        : "Vas a llegar con margen de batería a este ritmo.",
    };
  }

  if (margin >= SAFE_MARGIN) {
    const suggestedSpeed = speedForTargetMargin(speedKmh, margin, COMFORTABLE_MARGIN);
    const vale = suggestedSpeed >= MIN_SUGGESTED_SPEED_KMH && suggestedSpeed < speedKmh - 3;
    return {
      kind: "tight",
      text:
        `Vas a llegar, pero muy justo de batería (te sobraría apenas ${Math.max(0, Math.round((margin - 1) * 100))}% a este ritmo).` +
        (vale ? ` Bajando a ~${Math.round(suggestedSpeed)} km/h tendrías más margen.` : " Mantené este ritmo, sin acelerar."),
    };
  }

  const suggestedSpeed = speedForTargetMargin(speedKmh, margin, 1.05);
  if (suggestedSpeed >= MIN_SUGGESTED_SPEED_KMH && suggestedSpeed < speedKmh - 3) {
    return {
      kind: "warn",
      text:
        `Al ritmo actual (~${Math.round(speedKmh)} km/h) no te alcanza la batería para llegar. Bajando a ~${Math.round(suggestedSpeed)} km/h deberías llegar con lo que te queda` +
        (pendingRecharge ? ", sin necesidad de la parada de carga planeada." : "."),
    };
  }

  return {
    kind: "danger",
    text: pendingRecharge
      ? "No te alcanza la batería aunque bajes la velocidad: seguí el plan y parás en la próxima estación de carga."
      : "No te alcanza la batería para llegar aunque bajes la velocidad.",
  };
}
