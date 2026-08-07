import { describe, expect, it } from "vitest";
import { haversineKm, normalizeForSearch } from "./geo";

describe("haversineKm", () => {
  it("returns 0 for identical points", () => {
    expect(haversineKm(-34.9, -56.16, -34.9, -56.16)).toBe(0);
  });

  it("approximates the Montevideo-Rivera distance in km", () => {
    // Montevideo (-34.9011, -56.1645) a Rivera (-30.9053, -55.5508)
    const km = haversineKm(-34.9011, -56.1645, -30.9053, -55.5508);
    expect(km).toBeGreaterThan(440);
    expect(km).toBeLessThan(460);
  });
});

describe("normalizeForSearch", () => {
  it("strips accents and lowercases", () => {
    expect(normalizeForSearch("Camino Maldonado")).toBe("camino maldonado");
    expect(normalizeForSearch("Tacuarembó")).toBe("tacuarembo");
  });

  it("is idempotent on already-normalized input", () => {
    const normalized = normalizeForSearch("Ruta 5");
    expect(normalizeForSearch(normalized)).toBe(normalized);
  });
});
