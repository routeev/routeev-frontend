import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { Suspense } from "react";
import { HelmetProvider } from "react-helmet-async";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { LanguageProvider } from "../i18n/LanguageProvider";
import { GOOGLE_PLAY_URL } from "../welcome/stores";
import { LandingPage } from "./LandingPage";

function renderLanding(entries = ["/"]) {
  const queryClient = new QueryClient();
  return render(
    <HelmetProvider>
      <LanguageProvider>
        <QueryClientProvider client={queryClient}>
          <MemoryRouter initialEntries={entries} initialIndex={entries.length - 1}>
            <Suspense fallback={null}>
              <LandingPage />
            </Suspense>
          </MemoryRouter>
        </QueryClientProvider>
      </LanguageProvider>
    </HelmetProvider>
  );
}

describe("LandingPage", () => {
  beforeEach(() => {
    localStorage.clear();
    // La bienvenida de la primera visita tiene sus propios tests, abajo.
    localStorage.setItem("routeev_welcome_seen", "1");
    document.body.style.overflow = "";
  });

  it("titula con la pregunta del producto, en un solo h1", () => {
    renderLanding();
    const titles = screen.getAllByRole("heading", { level: 1 });
    expect(titles).toHaveLength(1);
    expect(titles[0]).toHaveTextContent("¿Llega tu auto eléctrico? Fijate antes de salir.");
  });

  it("sin sesión: el showroom como entrada principal y la cuenta como secundaria", () => {
    renderLanding();
    expect(screen.getByRole("link", { name: /probar con mi auto/i })).toHaveAttribute(
      "href",
      "/showroom"
    );
    expect(screen.getByRole("link", { name: /o crear cuenta gratis/i })).toHaveAttribute(
      "href",
      "/login?crear=1"
    );
    expect(screen.getByRole("link", { name: /^iniciar sesión$/i })).toHaveAttribute(
      "href",
      "/login"
    );
    expect(screen.getByRole("link", { name: /^crear cuenta$/i })).toHaveAttribute(
      "href",
      "/login?crear=1"
    );
  });

  it("con sesión: 'Ir a la app' en vez de iniciar sesión y crear cuenta", () => {
    localStorage.setItem("routeev_token", "fake-token");
    renderLanding();
    for (const link of screen.getAllByRole("link", { name: /ir a la app/i })) {
      expect(link).toHaveAttribute("href", "/app");
    }
    expect(screen.getByRole("link", { name: /o seguir en la app/i })).toHaveAttribute(
      "href",
      "/app"
    );
    expect(screen.queryByRole("link", { name: /^iniciar sesión$/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /crear cuenta/i })).not.toBeInTheDocument();
  });

  it("muestra las cuatro cifras reales", () => {
    renderLanding();
    const data = screen.getByRole("region", { name: "Hecho con datos reales" });
    for (const value of ["63.800", "19", "261", "328"]) {
      expect(within(data).getByText(value)).toBeInTheDocument();
    }
  });

  it("el hero muestra un viaje resuelto sobre el mapa, contado en texto", () => {
    renderLanding();
    expect(
      screen.getByRole("figure", {
        name: "Ejemplo de viaje de Montevideo a Rivera: 497 km, 1 parada de carga en Paso de los Toros, llegás con 24 %",
      })
    ).toBeInTheDocument();
  });

  // El hero es del producto: las tiendas van solo en el cierre, y desde el
  // hero hay un link que baja hasta ahí.
  it("las tiendas están en el cierre, con un link desde el hero", () => {
    renderLanding();
    const closing = within(screen.getByRole("region", { name: "Probalo con tu auto." }));
    expect(closing.getByRole("link", { name: /google play/i })).toHaveAttribute(
      "href",
      GOOGLE_PLAY_URL
    );
    expect(closing.getByRole("link", { name: /app store/i })).toBeInTheDocument();
    expect(screen.getAllByRole("link", { name: /google play/i })).toHaveLength(1);
    expect(screen.getByRole("link", { name: /preferís el celular/i })).toHaveAttribute(
      "href",
      "/#app"
    );
  });

  it("la batería de salida cambia el resultado del viaje", () => {
    renderLanding();
    const demo = within(
      screen.getByRole("region", { name: "La autonomía real no es la del folleto." })
    );
    const route = () => demo.getByRole("img", { name: /ruta montevideo a rivera/i });
    expect(demo.getByRole("button", { name: "100%" })).toHaveAttribute("aria-pressed", "true");
    expect(route()).toHaveAccessibleName("Ruta Montevideo a Rivera con 1 parada de carga");
    expect(demo.getByText("Con margen")).toBeInTheDocument();

    fireEvent.click(demo.getByRole("button", { name: "80%" }));
    expect(demo.getByRole("button", { name: "80%" })).toHaveAttribute("aria-pressed", "true");
    expect(demo.getByText("Margen bajo")).toBeInTheDocument();
    expect(demo.getByText(/manejá a 90 km\/h o menos/i)).toBeInTheDocument();

    fireEvent.click(demo.getByRole("button", { name: "60%" }));
    expect(route()).toHaveAccessibleName("Ruta Montevideo a Rivera con 2 paradas de carga");
    expect(demo.getByText("Tacuarembó")).toBeInTheDocument();
  });

  it("cambia el idioma desde el header", () => {
    renderLanding();
    fireEvent.click(screen.getByRole("button", { name: "English" }));
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
      "Will your EV make it? Check before you leave."
    );
    expect(screen.getByRole("button", { name: "English" })).toHaveAttribute("aria-pressed", "true");
  });

  it("el menú del celular toma el foco, bloquea el scroll y se cierra con Escape", () => {
    renderLanding();
    const toggle = screen.getByRole("button", { name: "Abrir menú" });
    fireEvent.click(toggle);

    const menu = screen.getByRole("dialog", { name: "Menú" });
    expect(toggle).toHaveAttribute("aria-expanded", "true");
    expect(within(menu).getByRole("link", { name: /showroom/i })).toHaveFocus();
    expect(within(menu).getByRole("link", { name: /bajar la app/i })).toHaveAttribute(
      "href",
      "/#app"
    );
    expect(document.body.style.overflow).toBe("hidden");

    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Abrir menú" })).toHaveFocus();
    expect(document.body.style.overflow).toBe("");
  });

  it("el foco no sale del menú abierto", () => {
    renderLanding();
    fireEvent.click(screen.getByRole("button", { name: "Abrir menú" }));
    const menu = screen.getByRole("dialog", { name: "Menú" });
    const toggle = screen.getByRole("button", { name: "Cerrar menú" });
    const focusables = menu.querySelectorAll<HTMLElement>("a[href], button");
    const last = focusables[focusables.length - 1]!;

    last.focus();
    fireEvent.keyDown(document, { key: "Tab" });
    expect(toggle).toHaveFocus();

    fireEvent.keyDown(document, { key: "Tab", shiftKey: true });
    expect(last).toHaveFocus();
  });
});

describe("LandingPage: la bienvenida de la primera visita", () => {
  beforeEach(() => {
    localStorage.clear();
    document.body.style.overflow = "";
  });

  afterEach(() => {
    Object.defineProperty(document, "referrer", { value: "", configurable: true });
  });

  // Con más margen que el segundo de siempre: la primera vez, la bienvenida
  // (un chunk aparte) se transforma en frío y puede tardar más.
  const welcome = () =>
    screen.findByRole("dialog", { name: /¿llega tu auto eléctrico?/i }, { timeout: 5000 });
  // Que la home ya esté y sin tapar: si la bienvenida se estuviera bajando,
  // la home tampoco estaría (esperan juntas).
  const expectHomeOpen = () => {
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: /probar con mi auto/i }).closest("[inert]")).toBeNull();
  };

  it("tapa la home hasta que se sigue en la web, y no vuelve a salir", async () => {
    const { unmount } = renderLanding();
    const dialog = await welcome();
    const home = screen.getByRole("link", { name: /probar con mi auto/i });
    expect(home.closest("[inert]")).not.toBeNull();
    expect(dialog).toHaveFocus();
    expect(document.body.style.overflow).toBe("hidden");

    fireEvent.click(within(dialog).getByRole("link", { name: /continuar en la web/i }));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(home.closest("[inert]")).toBeNull();
    expect(document.body.style.overflow).toBe("");
    expect(localStorage.getItem("routeev_welcome_seen")).toBe("1");

    unmount();
    renderLanding();
    expectHomeOpen();
  });

  it("Escape también la cierra", async () => {
    renderLanding();
    await welcome();
    fireEvent.keyDown(document, { key: "Escape" });
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  });

  it("no sale entrando a la home desde otra página del sitio", () => {
    renderLanding(["/showroom", "/"]);
    expectHomeOpen();
  });

  it("no sale con sesión ni a quien llega desde un buscador", () => {
    localStorage.setItem("routeev_token", "fake-token");
    const { unmount } = renderLanding();
    expectHomeOpen();
    unmount();

    localStorage.clear();
    Object.defineProperty(document, "referrer", {
      value: "https://www.google.com.uy/",
      configurable: true,
    });
    renderLanding();
    expectHomeOpen();
  });
});
