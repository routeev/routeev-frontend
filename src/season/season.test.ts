import { afterEach, describe, expect, it } from "vitest";
import { syncThemeForRoute } from "../theme/theme";
import { HALLOWEEN, isHalloweenWindow, readSeason } from "./season";

const root = document.documentElement;

afterEach(() => {
  root.removeAttribute("data-season");
  root.removeAttribute("data-theme");
  window.localStorage.clear();
});

describe("isHalloweenWindow", () => {
  it("arranca el 27/10 a las 00:00 de Montevideo y termina antes del 3/11", () => {
    expect(isHalloweenWindow(Date.parse("2026-10-26T23:59:59-03:00"))).toBe(false);
    expect(isHalloweenWindow(HALLOWEEN.start)).toBe(true);
    expect(isHalloweenWindow(Date.parse("2026-10-31T21:00:00-03:00"))).toBe(true);
    expect(isHalloweenWindow(HALLOWEEN.end - 1)).toBe(true);
    expect(isHalloweenWindow(HALLOWEEN.end)).toBe(false);
  });
});

describe("readSeason", () => {
  it("sin atributo no hay temporada", () => {
    expect(readSeason()).toBeNull();
  });

  it("con data-season es halloween", () => {
    root.setAttribute("data-season", "halloween");
    expect(readSeason()).toBe("halloween");
  });
});

// El disfraz es solo oscuro y no se puede sacar: quien había elegido claro
// en /app lo ve oscuro hasta el 3/11, y su preferencia vuelve después.
describe("tema durante la temporada", () => {
  it("en /app ignora el claro guardado sin borrarlo", () => {
    window.localStorage.setItem("routeev_theme", "light");
    root.setAttribute("data-season", "halloween");
    syncThemeForRoute("/app");
    expect(root.hasAttribute("data-theme")).toBe(false);
    expect(window.localStorage.getItem("routeev_theme")).toBe("light");
  });

  it("sin temporada el claro guardado vuelve", () => {
    window.localStorage.setItem("routeev_theme", "light");
    syncThemeForRoute("/app");
    expect(root.getAttribute("data-theme")).toBe("light");
  });
});
