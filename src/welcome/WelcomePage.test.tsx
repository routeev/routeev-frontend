import { render, screen } from "@testing-library/react";
import { HelmetProvider } from "react-helmet-async";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { LanguageProvider } from "../i18n/LanguageProvider";
import { APP_STORE_URL, GOOGLE_PLAY_URL, detectMobileOs } from "./stores";
import { WelcomePage } from "./WelcomePage";

const ANDROID_UA =
  "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Mobile Safari/537.36";
const IPHONE_UA =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1";

function renderWelcome() {
  return render(
    <HelmetProvider>
      <LanguageProvider>
        <MemoryRouter>
          <WelcomePage />
        </MemoryRouter>
      </LanguageProvider>
    </HelmetProvider>
  );
}

describe("detectMobileOs", () => {
  it("reconoce Android y manda todo lo demás a iOS", () => {
    expect(detectMobileOs(ANDROID_UA)).toBe("android");
    expect(detectMobileOs(IPHONE_UA)).toBe("ios");
    expect(detectMobileOs("Mozilla/5.0 (Windows NT 10.0; Win64; x64)")).toBe("ios");
  });
});

describe("WelcomePage", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("muestra el titular y deja seguir a la web", () => {
    renderWelcome();
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
      "¿Llega tu auto eléctrico? Fijate antes de salir."
    );
    expect(screen.getByRole("link", { name: /continuar en la web/i })).toHaveAttribute("href", "/");
    expect(screen.getByRole("link", { name: /ir a la web/i })).toHaveAttribute("href", "/");
  });

  it("lleva cada badge a su tienda", () => {
    renderWelcome();
    expect(screen.getByRole("link", { name: /app store/i })).toHaveAttribute("href", APP_STORE_URL);
    expect(screen.getByRole("link", { name: /disponible en google play/i })).toHaveAttribute(
      "href",
      GOOGLE_PLAY_URL
    );
  });

  // Las dos tiendas siempre, sea cual sea el sistema: en mobile ya no se
  // esconde la que no es del teléfono detrás de un link de texto.
  it.each([
    ["Android", ANDROID_UA],
    ["iPhone", IPHONE_UA],
  ])("en %s muestra los dos badges", (_, ua) => {
    vi.spyOn(navigator, "userAgent", "get").mockReturnValue(ua);
    renderWelcome();
    expect(screen.getByRole("link", { name: /app store/i })).toHaveAttribute("href", APP_STORE_URL);
    expect(screen.getByRole("link", { name: /google play/i })).toHaveAttribute(
      "href",
      GOOGLE_PLAY_URL
    );
    expect(screen.queryByText(/^También en/)).not.toBeInTheDocument();
  });
});
