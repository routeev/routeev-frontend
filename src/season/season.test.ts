import { afterEach, describe, expect, it } from "vitest";
import { dismissSeason, HALLOWEEN, isHalloweenWindow, readSeason, SEASON_OFF_KEY } from "./season";

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

  it("con data-season y tema oscuro, es halloween", () => {
    root.setAttribute("data-season", "halloween");
    expect(readSeason()).toBe("halloween");
  });

  // En claro los tokens hw-* no existen: los adornos no se pueden pintar.
  it("en el tema claro no se ve, aunque haya temporada", () => {
    root.setAttribute("data-season", "halloween");
    root.setAttribute("data-theme", "light");
    expect(readSeason()).toBeNull();
  });
});

describe("dismissSeason", () => {
  it("saca el atributo y recuerda la edición cerrada", () => {
    root.setAttribute("data-season", "halloween");
    dismissSeason();
    expect(root.hasAttribute("data-season")).toBe(false);
    expect(window.localStorage.getItem(SEASON_OFF_KEY)).toBe(HALLOWEEN.edition);
  });
});
