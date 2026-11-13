import { describe, expect, it } from "vitest";
import { esDispositivoApple, urlsParaNavegar } from "./navegar";

describe("urlsParaNavegar", () => {
  // Las mismas que el móvil (src/utils/navegar.ts): https, que abren la app
  // si está instalada. Llevan la coordenada, no la dirección: la dirección de
  // UTE muchas veces es "Ruta 5 km 98", que Waze no encuentra.
  it("arma los links de Waze, Google Maps y Mapas de Apple con la coordenada", () => {
    const u = urlsParaNavegar(-34.0994, -56.2142);
    expect(u.waze).toBe("https://waze.com/ul?ll=-34.0994,-56.2142&navigate=yes");
    expect(u.google).toBe("https://www.google.com/maps/dir/?api=1&destination=-34.0994,-56.2142");
    expect(u.apple).toBe("https://maps.apple.com/?daddr=-34.0994,-56.2142");
  });
});

describe("esDispositivoApple", () => {
  it("iPhone, iPad (que se presenta como Mac) y Mac sí; Android y Windows no", () => {
    expect(esDispositivoApple("Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X)")).toBe(true);
    expect(esDispositivoApple("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)")).toBe(true);
    expect(esDispositivoApple("Mozilla/5.0 (Linux; Android 16; SM-S921B)")).toBe(false);
    expect(esDispositivoApple("Mozilla/5.0 (Windows NT 10.0; Win64; x64)")).toBe(false);
  });
});
