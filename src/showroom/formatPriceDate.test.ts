import { describe, expect, it } from "vitest";
import { formatPriceDate } from "./formatPriceDate";

describe("formatPriceDate", () => {
  it("formatea dd/mm/yyyy en español", () => {
    expect(formatPriceDate("2026-09-10", "es")).toBe("10/09/2026");
  });

  it("formatea mm/dd/yyyy en inglés", () => {
    expect(formatPriceDate("2026-09-10", "en")).toBe("09/10/2026");
  });

  it("no depende de Date/huso horario -- una fecha de calendario, no un instante", () => {
    // El bug real que esto evita: new Date("2026-01-01") es medianoche UTC,
    // que en Uruguay (UTC-3) cae el 31/12/2025 -- un dia antes del real.
    expect(formatPriceDate("2026-01-01", "es")).toBe("01/01/2026");
  });
});
