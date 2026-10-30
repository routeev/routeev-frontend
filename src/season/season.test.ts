import { afterEach, describe, expect, it } from "vitest";
import { syncThemeForRoute } from "../theme/theme";
import { HALLOWEEN, isHalloweenWindow, readSeason, SEASON_OFF_KEY } from "./season";
import { setSeasonOn } from "./seasonPreference";

const root = document.documentElement;

afterEach(() => {
  root.removeAttribute("data-season");
  root.removeAttribute("data-theme");
  window.localStorage.clear();
  window.history.replaceState(null, "", "/");
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

// Prendida, el disfraz es solo oscuro: quien había elegido claro en /app lo ve
// oscuro. Su preferencia no se toca, y vuelve apenas apaga el interruptor.
describe("tema con la temporada prendida", () => {
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

describe("setSeasonOn", () => {
  it("apagarla saca el atributo y recuerda la elección", () => {
    root.setAttribute("data-season", "halloween");
    setSeasonOn(false);
    expect(readSeason()).toBeNull();
    expect(window.localStorage.getItem(SEASON_OFF_KEY)).toBe(HALLOWEEN.edition);
  });

  it("prenderla pone el atributo y borra la marca", () => {
    window.localStorage.setItem(SEASON_OFF_KEY, HALLOWEEN.edition);
    setSeasonOn(true);
    expect(readSeason()).toBe("halloween");
    expect(window.localStorage.getItem(SEASON_OFF_KEY)).toBeNull();
  });

  // El caso que más importa: apagar Halloween en /app le devuelve su tema claro
  // en el momento, sin recargar; prenderlo lo vuelve a oscurecer.
  it("en /app apagarla devuelve el tema claro guardado, y prenderla lo oscurece", () => {
    window.history.replaceState(null, "", "/app");
    window.localStorage.setItem("routeev_theme", "light");
    root.setAttribute("data-season", "halloween");
    syncThemeForRoute("/app");
    expect(root.hasAttribute("data-theme")).toBe(false);

    setSeasonOn(false);
    expect(root.getAttribute("data-theme")).toBe("light");

    setSeasonOn(true);
    expect(root.hasAttribute("data-theme")).toBe(false);
    expect(window.localStorage.getItem("routeev_theme")).toBe("light");
  });

  it("fuera de /app y /profile no cambia el tema, que ahí es siempre oscuro", () => {
    window.localStorage.setItem("routeev_theme", "light");
    setSeasonOn(false);
    expect(root.hasAttribute("data-theme")).toBe(false);
  });
});
