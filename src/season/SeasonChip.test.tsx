import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { LanguageProvider } from "../i18n/LanguageProvider";
import { SeasonChip } from "./SeasonChip";

const root = document.documentElement;

function renderChip() {
  return render(
    <LanguageProvider>
      <SeasonChip />
    </LanguageProvider>
  );
}

afterEach(() => {
  root.removeAttribute("data-season");
});

describe("SeasonChip", () => {
  it("fuera de temporada no se monta", () => {
    renderChip();
    expect(screen.queryByText(/halloween/i)).toBeNull();
  });

  // Hasta el 3/11 el disfraz no se puede sacar: el chip avisa y nada más.
  it("en temporada avisa, sin botón para apagarla", () => {
    root.setAttribute("data-season", "halloween");
    renderChip();
    expect(screen.getByText(/halloween/i)).toBeInTheDocument();
    expect(screen.queryByRole("button")).toBeNull();
  });
});
