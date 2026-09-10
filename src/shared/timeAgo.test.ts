import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { timeAgo } from "./timeAgo";

const t = {
  haceMin: (m: number) => `hace ${m} min`,
  haceHoras: (h: number) => `hace ${h} h`,
  reciente: "recién",
};

describe("timeAgo", () => {
  const AHORA = new Date("2026-09-10T12:00:00Z").getTime();

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(AHORA);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("menos de 1 minuto es 'reciente', nunca un número", () => {
    expect(timeAgo(new Date(AHORA - 40_000).toISOString(), t)).toBe("recién");
  });

  it("redondea hacia abajo en minutos", () => {
    expect(timeAgo(new Date(AHORA - 4 * 60_000 - 59_000).toISOString(), t)).toBe("hace 4 min");
  });

  it("pasa a horas a partir de los 90 minutos", () => {
    expect(timeAgo(new Date(AHORA - 90 * 60_000).toISOString(), t)).toBe("hace 1 h");
  });

  it("sigue en horas mucho después", () => {
    expect(timeAgo(new Date(AHORA - 5 * 60 * 60_000).toISOString(), t)).toBe("hace 5 h");
  });
});
