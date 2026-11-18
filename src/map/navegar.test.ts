import { describe, expect, it } from "vitest";
import { esDispositivoApple, MAX_PARADAS_GOOGLE, urlsParaNavegar, urlsRutaCompleta } from "./navegar";

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

describe("urlsRutaCompleta", () => {
  const ORIGEN = { lat: -34.9, lon: -56.2 };
  const DESTINO = { lat: -30.9, lon: -55.5 };
  const P1 = { lat: -33.38, lon: -56.52 };
  const P2 = { lat: -32.3, lon: -56.0 };

  it("Google Maps lleva el origen, las paradas en orden (con | codificado) y el destino", () => {
    expect(urlsRutaCompleta(ORIGEN, [P1, P2], DESTINO).google).toBe(
      "https://www.google.com/maps/dir/?api=1&origin=-34.9,-56.2&destination=-30.9,-55.5" +
        "&waypoints=-33.38,-56.52%7C-32.3,-56&travelmode=driving"
    );
  });

  it("Waze y Mapas de Apple toman un solo destino: la primera parada de carga", () => {
    const u = urlsRutaCompleta(ORIGEN, [P1, P2], DESTINO);
    expect(u.waze).toBe("https://waze.com/ul?ll=-33.38,-56.52&navigate=yes");
    expect(u.apple).toBe("https://maps.apple.com/?daddr=-33.38,-56.52");
  });

  it("un viaje sin paradas de carga abre el destino en las tres apps, sin waypoints", () => {
    const u = urlsRutaCompleta(ORIGEN, [], DESTINO);
    expect(u.google).not.toContain("waypoints");
    expect(u.waze).toBe("https://waze.com/ul?ll=-30.9,-55.5&navigate=yes");
    expect(u.apple).toBe("https://maps.apple.com/?daddr=-30.9,-55.5");
  });

  it("con más paradas de las que acepta Google no lo ofrece: abrirlo con paradas de menos sería otra ruta", () => {
    const muchas = Array.from({ length: MAX_PARADAS_GOOGLE + 1 }, (_, i) => ({ lat: -34 + i * 0.1, lon: -56 }));
    expect(urlsRutaCompleta(ORIGEN, muchas, DESTINO).google).toBeNull();
    expect(urlsRutaCompleta(ORIGEN, muchas.slice(0, MAX_PARADAS_GOOGLE), DESTINO).google).not.toBeNull();
  });
});
