import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { setTheme, syncThemeForRoute } from "../theme/theme";
import {
  SEASON_END,
  SEASON_ID,
  SEASON_OFF_KEY,
  SEASON_START,
  aplicarTemporada,
  apagadaPorLaPersona,
  enVentana,
  temporadaAplicada,
  temporadaCorresponde,
} from "./season";

// La fecha se controla con un spy sobre Date.now y no con fake timers: los
// fake timers de vitest pelean con los efectos de testing-library, y lo
// unico que hace falta es que enVentana() lea la hora que queremos.
function enFecha(iso: string) {
  vi.spyOn(Date, "now").mockReturnValue(Date.parse(iso));
}

beforeEach(() => {
  localStorage.clear();
  document.documentElement.removeAttribute("data-season");
  document.documentElement.removeAttribute("data-theme");
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("la ventana de fechas", () => {
  it("arranca el 27/10 a las 00:00 de Montevideo y no antes", () => {
    enFecha("2026-10-26T23:59:59-03:00");
    expect(enVentana()).toBe(false);
    enFecha(SEASON_START);
    expect(enVentana()).toBe(true);
  });

  it("cubre el 31/10 y el 2/11 entero", () => {
    enFecha("2026-10-31T20:00:00-03:00");
    expect(enVentana()).toBe(true);
    enFecha("2026-11-02T23:59:59-03:00");
    expect(enVentana()).toBe(true);
  });

  // Lo que hace que el disfraz se saque solo, sin desplegar nada: a las
  // 00:00 del 3/11 enVentana() ya es false, asi que quien entra o recarga ve
  // la app de siempre y el interruptor desaparece.
  it("se corta sola el 3/11 a las 00:00", () => {
    enFecha(SEASON_END);
    expect(enVentana()).toBe(false);
    enFecha("2026-11-10T12:00:00-03:00");
    expect(enVentana()).toBe(false);
  });
});

describe("la preferencia de la persona", () => {
  it("apagarla la deja apagada dentro de la ventana", () => {
    enFecha("2026-10-31T12:00:00-03:00");
    expect(temporadaCorresponde()).toBe(true);
    localStorage.setItem(SEASON_OFF_KEY, SEASON_ID);
    expect(apagadaPorLaPersona()).toBe(true);
    expect(temporadaCorresponde()).toBe(false);
  });

  // Guarda QUE edicion se apago, no un booleano: el valor de otro ano no
  // apaga el de este.
  it("solo cuenta si la clave guarda esta edicion", () => {
    localStorage.setItem(SEASON_OFF_KEY, "halloween-2025");
    expect(apagadaPorLaPersona()).toBe(false);
  });
});

describe("el atributo de <html>", () => {
  it("es la unica fuente de verdad de si el disfraz esta puesto", () => {
    expect(temporadaAplicada()).toBe(null);
    aplicarTemporada(true);
    expect(document.documentElement.getAttribute("data-season")).toBe("halloween");
    expect(temporadaAplicada()).toBe("halloween");
    aplicarTemporada(false);
    expect(document.documentElement.hasAttribute("data-season")).toBe(false);
    expect(temporadaAplicada()).toBe(null);
  });
});

describe("el tema con el disfraz puesto", () => {
  // El bloque de Halloween solo existe en oscuro. Si el claro se aplicara,
  // la app se veria como la de siempre con el interruptor diciendo que esta
  // prendido.
  it("fuerza oscuro en /app aunque la persona tenga elegido el claro", () => {
    setTheme("light");
    syncThemeForRoute("/app");
    expect(document.documentElement.getAttribute("data-theme")).toBe("light");

    aplicarTemporada(true);
    syncThemeForRoute("/app");
    expect(document.documentElement.hasAttribute("data-theme")).toBe(false);
  });

  // Lo que hace que apagar el interruptor devuelva el tema al momento, sin
  // recargar: la preferencia nunca se toco.
  it("no pisa la preferencia guardada, asi que al apagarlo vuelve el claro", () => {
    setTheme("light");
    aplicarTemporada(true);
    syncThemeForRoute("/app");
    expect(localStorage.getItem("routeev_theme")).toBe("light");

    aplicarTemporada(false);
    syncThemeForRoute("/app");
    expect(document.documentElement.getAttribute("data-theme")).toBe("light");
  });

  it("la barra del navegador toma el negro violeta del disfraz", () => {
    const meta = document.createElement("meta");
    meta.setAttribute("name", "theme-color");
    document.head.appendChild(meta);

    syncThemeForRoute("/");
    expect(meta.getAttribute("content")).toBe("#0a0e13");

    aplicarTemporada(true);
    syncThemeForRoute("/");
    expect(meta.getAttribute("content")).toBe("#0d0a14");

    meta.remove();
  });
});
