import { describe, expect, it } from "vitest";
import { computeSpeedAdvisory } from "./speedAdvisory";

describe("computeSpeedAdvisory", () => {
  it("returns null without a stable speed reading", () => {
    expect(computeSpeedAdvisory({ speedKmh: null, batteryKwh: 20, consumptionKwhKm: 0.18, remainingKm: 50, pendingRecharge: false })).toBeNull();
  });

  it("returns null when almost arrived", () => {
    expect(computeSpeedAdvisory({ speedKmh: 90, batteryKwh: 20, consumptionKwhKm: 0.18, remainingKm: 0.1, pendingRecharge: false })).toBeNull();
  });

  it("is 'ok' with plenty of battery margin", () => {
    const result = computeSpeedAdvisory({ speedKmh: 90, batteryKwh: 30, consumptionKwhKm: 0.18, remainingKm: 50, pendingRecharge: false });
    expect(result?.kind).toBe("ok");
  });

  it("is 'danger' when battery can't cover the remaining distance at any reasonable speed", () => {
    const result = computeSpeedAdvisory({ speedKmh: 120, batteryKwh: 2, consumptionKwhKm: 0.18, remainingKm: 50, pendingRecharge: false });
    expect(result?.kind).toBe("danger");
    expect(result?.text).toMatch(/no te alcanza la batería/i);
  });

  it("suggests a lower speed in the 'warn' band", () => {
    // A 120 km/h el consumo es alto; bajando deberia alcanzar exactamente.
    const result = computeSpeedAdvisory({ speedKmh: 120, batteryKwh: 8, consumptionKwhKm: 0.18, remainingKm: 50, pendingRecharge: false });
    expect(result?.kind).toBe("warn");
    expect(result?.text).toMatch(/km\/h/);
  });

  it("mentions the pending recharge stop when one exists and margin is tight", () => {
    const result = computeSpeedAdvisory({ speedKmh: 100, batteryKwh: 9, consumptionKwhKm: 0.18, remainingKm: 50, pendingRecharge: true });
    expect(result).not.toBeNull();
    if (result?.kind === "warn" || result?.kind === "danger") {
      expect(result.text).toMatch(/parada de carga/i);
    }
  });
});
