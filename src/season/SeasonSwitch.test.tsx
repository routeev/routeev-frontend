import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { LanguageProvider } from "../i18n/LanguageProvider";
import { HALLOWEEN, SEASON_OFF_KEY } from "./season";
import { SeasonSwitch } from "./SeasonSwitch";

const root = document.documentElement;

function renderSwitch() {
  return render(
    <LanguageProvider>
      <SeasonSwitch />
    </LanguageProvider>
  );
}

beforeEach(() => {
  // Dentro de la ventana, salvo que el test diga otra cosa.
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(Date.parse("2026-10-31T12:00:00-03:00"));
});

afterEach(() => {
  vi.useRealTimers();
  root.removeAttribute("data-season");
  root.removeAttribute("data-theme");
  window.localStorage.clear();
});

describe("SeasonSwitch", () => {
  it("después del 3/11 no devuelve nada", () => {
    vi.setSystemTime(HALLOWEEN.end);
    renderSwitch();
    expect(screen.queryByRole("switch")).toBeNull();
  });

  it("es un switch con el estado de la temporada", () => {
    root.setAttribute("data-season", "halloween");
    renderSwitch();
    const sw = screen.getByRole("switch", { name: /halloween/i });
    expect(sw).toHaveAttribute("aria-checked", "true");
  });

  it("apagada, sigue ahí para volver a prenderla", () => {
    renderSwitch();
    expect(screen.getByRole("switch", { name: /halloween/i })).toHaveAttribute(
      "aria-checked",
      "false"
    );
  });

  it("tocarlo apaga y vuelve a prender, y lo recuerda", async () => {
    root.setAttribute("data-season", "halloween");
    renderSwitch();
    const sw = screen.getByRole("switch", { name: /halloween/i });

    fireEvent.click(sw);
    await act(async () => {});
    expect(root.hasAttribute("data-season")).toBe(false);
    expect(window.localStorage.getItem(SEASON_OFF_KEY)).toBe(HALLOWEEN.edition);
    expect(screen.getByRole("switch", { name: /halloween/i })).toHaveAttribute(
      "aria-checked",
      "false"
    );

    fireEvent.click(screen.getByRole("switch", { name: /halloween/i }));
    await act(async () => {});
    expect(root.getAttribute("data-season")).toBe("halloween");
    expect(window.localStorage.getItem(SEASON_OFF_KEY)).toBeNull();
    expect(screen.getByRole("switch", { name: /halloween/i })).toHaveAttribute(
      "aria-checked",
      "true"
    );
  });
});
