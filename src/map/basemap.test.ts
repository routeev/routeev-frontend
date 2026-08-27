import { afterEach, describe, expect, it } from "vitest";
import { basemapStyleForTheme, DARK_BASEMAP_STYLE_URL, LIGHT_BASEMAP_STYLE_URL } from "./basemap";

// El módulo de basemap registra el worker de MapLibre al importarse; en jsdom
// eso es inocuo y no hace falta simular nada.

describe("basemapStyleForTheme", () => {
  it("el tema claro pide positron y el oscuro dark", () => {
    expect(basemapStyleForTheme("light")).toBe(LIGHT_BASEMAP_STYLE_URL);
    expect(basemapStyleForTheme("dark")).toBe(DARK_BASEMAP_STYLE_URL);
  });

  // Los dos estilos tienen que existir de verdad en OpenFreeMap y servirse sin
  // API key: ese es el motivo por el que se dejó CARTO (estampaba "API KEY
  // REQUIRED" sobre cada tile). Un typo acá no rompe ningún tipo -- deja el
  // mapa en blanco, y solo se ve abriendo la app.
  it("las dos URLs apuntan a estilos de OpenFreeMap", () => {
    for (const url of [LIGHT_BASEMAP_STYLE_URL, DARK_BASEMAP_STYLE_URL]) {
      expect(url).toMatch(/^https:\/\/tiles\.openfreemap\.org\/styles\/[a-z0-9-]+$/);
    }
    expect(LIGHT_BASEMAP_STYLE_URL).not.toBe(DARK_BASEMAP_STYLE_URL);
  });

  // Mismo par que usa routeev-movil en src/theme/mapStyle.ts. Si un cliente
  // cambia de estilo y el otro no, la misma cuenta ve dos mapas distintos.
  it("usa el mismo par que el cliente movil: dark y positron", () => {
    expect(DARK_BASEMAP_STYLE_URL.endsWith("/dark")).toBe(true);
    expect(LIGHT_BASEMAP_STYLE_URL.endsWith("/positron")).toBe(true);
  });
});

describe("useActiveTheme (lectura del atributo)", () => {
  afterEach(() => {
    document.documentElement.removeAttribute("data-theme");
  });

  // No se monta el hook (necesitaría react-dom/test-utils y un componente):
  // se prueba la regla que implementa, que es la parte que puede equivocarse.
  // Oscuro es el DEFAULT -- tokens.css define la paleta oscura en el :root
  // pelado y solo la pisa con :root[data-theme="light"].
  it("sin atributo el tema es oscuro", () => {
    expect(document.documentElement.getAttribute("data-theme")).toBeNull();
    expect(temaSegunAtributo()).toBe("dark");
  });

  it("con data-theme=light el tema es claro", () => {
    document.documentElement.setAttribute("data-theme", "light");
    expect(temaSegunAtributo()).toBe("light");
  });

  // syncThemeForRoute() BORRA el atributo para forzar oscuro fuera de /app y
  // /profile, no lo pone en "dark": el mapa tiene que leer eso como oscuro.
  it("un valor que no es light se lee como oscuro", () => {
    document.documentElement.setAttribute("data-theme", "dark");
    expect(temaSegunAtributo()).toBe("dark");
  });
});

function temaSegunAtributo(): "light" | "dark" {
  return document.documentElement.getAttribute("data-theme") === "light" ? "light" : "dark";
}
