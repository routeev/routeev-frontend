import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { LanguageProvider } from "../i18n/LanguageProvider";
import { HALLOWEEN, SEASON_OFF_KEY } from "./season";
import { SeasonChip } from "./SeasonChip";

const root = document.documentElement;

function renderChip() {
  return render(
    <LanguageProvider>
      <header>
        <a href="/">RouteEV</a>
        <SeasonChip />
      </header>
    </LanguageProvider>
  );
}

afterEach(() => {
  root.removeAttribute("data-season");
  root.removeAttribute("data-theme");
  window.localStorage.clear();
});

describe("SeasonChip", () => {
  it("fuera de temporada no se monta", () => {
    renderChip();
    expect(screen.queryByRole("button", { name: /halloween/i })).toBeNull();
  });

  it("en el tema claro no se monta", () => {
    root.setAttribute("data-season", "halloween");
    root.setAttribute("data-theme", "light");
    renderChip();
    expect(screen.queryByRole("button", { name: /halloween/i })).toBeNull();
  });

  it("cerrarlo apaga la temporada, la recuerda y pasa el foco al logo", async () => {
    root.setAttribute("data-season", "halloween");
    renderChip();
    const close = screen.getByRole("button", { name: /halloween/i });
    close.focus();
    fireEvent.click(close);
    // El MutationObserver avisa en una microtarea.
    await act(async () => {});
    expect(root.hasAttribute("data-season")).toBe(false);
    expect(window.localStorage.getItem(SEASON_OFF_KEY)).toBe(HALLOWEEN.edition);
    expect(screen.queryByRole("button", { name: /halloween/i })).toBeNull();
    expect(document.activeElement).toBe(screen.getByRole("link", { name: "RouteEV" }));
  });
});
