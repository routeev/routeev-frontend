import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { LanguageProvider } from "../i18n/LanguageProvider";
import { setTheme } from "../theme/theme";
import { SEASON_ID, SEASON_OFF_KEY, aplicarTemporada } from "./season";
import { SeasonSwitch } from "./SeasonSwitch";

function enFecha(iso: string) {
  vi.spyOn(Date, "now").mockReturnValue(Date.parse(iso));
}

function montar() {
  render(
    <LanguageProvider>
      <SeasonSwitch />
    </LanguageProvider>
  );
}

beforeEach(() => {
  localStorage.clear();
  document.documentElement.removeAttribute("data-season");
  document.documentElement.removeAttribute("data-theme");
  enFecha("2026-10-31T12:00:00-03:00");
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("el interruptor de la edicion Halloween", () => {
  it("es un switch y dice si esta prendido", () => {
    aplicarTemporada(true);
    montar();
    const sw = screen.getByRole("switch", { name: "Edición Halloween" });
    expect(sw).toHaveAttribute("aria-checked", "true");
  });

  it("apagarlo saca el atributo y se acuerda al recargar", async () => {
    aplicarTemporada(true);
    montar();
    const sw = screen.getByRole("switch");
    fireEvent.click(sw);

    expect(document.documentElement.hasAttribute("data-season")).toBe(false);
    expect(localStorage.getItem(SEASON_OFF_KEY)).toBe(SEASON_ID);
    expect(await screen.findByRole("switch")).toHaveAttribute("aria-checked", "false");
  });

  it("volver a prenderlo borra la preferencia y repone el atributo", () => {
    localStorage.setItem(SEASON_OFF_KEY, SEASON_ID);
    montar();
    const sw = screen.getByRole("switch");
    expect(sw).toHaveAttribute("aria-checked", "false");

    fireEvent.click(sw);
    expect(document.documentElement.getAttribute("data-season")).toBe("halloween");
    expect(localStorage.getItem(SEASON_OFF_KEY)).toBe(null);
  });

  // El caso que mas importa: alguien que eligio el tema claro y apaga el
  // disfraz desde /app tiene que recuperar el claro ahi mismo, sin recargar.
  it("apagarlo en /app devuelve al momento el tema claro guardado", () => {
    setTheme("light");
    aplicarTemporada(true);
    window.history.pushState({}, "", "/app");
    montar();

    fireEvent.click(screen.getByRole("switch"));
    expect(document.documentElement.getAttribute("data-theme")).toBe("light");
  });

  // Por texto y no por rol: la region es un aria-live, no un role="status",
  // justamente para no chocar con las que ya tienen el login y el panel.
  it("confirma el cambio por una region que se anuncia", () => {
    aplicarTemporada(true);
    montar();
    fireEvent.click(screen.getByRole("switch"));
    const aviso = screen.getByText(
      "Edición Halloween desactivada. La podés volver a activar desde el mismo interruptor."
    );
    expect(aviso).toHaveAttribute("aria-live", "polite");
  });

  // Pasada la ventana el interruptor desaparece solo, sin desplegar nada.
  it("no se renderiza despues del 3/11", () => {
    enFecha("2026-11-05T12:00:00-03:00");
    montar();
    expect(screen.queryByRole("switch")).toBeNull();
  });
});
