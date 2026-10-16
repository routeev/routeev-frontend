import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { RouterProvider, createMemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { getMe } from "../api/user";
import { LanguageProvider } from "../i18n/LanguageProvider";
import { LandingHeader } from "./LandingHeader";

vi.mock("../api/user", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../api/user")>()),
  getMe: vi.fn(),
}));

function renderHeader(page: "app" | "profile") {
  const router = createMemoryRouter(
    [
      { path: "/", element: <p>Landing</p> },
      { path: "/app", element: <LandingHeader loggedIn page="app" /> },
      { path: "/profile", element: <LandingHeader loggedIn page="profile" /> },
    ],
    { initialEntries: [`/${page}`] }
  );
  render(
    <LanguageProvider>
      <QueryClientProvider client={new QueryClient()}>
        <RouterProvider router={router} />
      </QueryClientProvider>
    </LanguageProvider>
  );
  return router;
}

describe("LandingHeader en las pantallas con cuenta", () => {
  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem("routeev_token", "fake-token");
    localStorage.setItem("routeev_username", "marcela");
    document.documentElement.removeAttribute("data-theme");
    document.body.style.overflow = "";
    vi.mocked(getMe).mockResolvedValue({
      username: "marcela",
      display_name: "Marcela Pérez",
      email: "marcela@gmail.com",
    } as Awaited<ReturnType<typeof getMe>>);
  });

  it("en /app: solo el mapa en el nav, sin Inicio ni Showroom", () => {
    renderHeader("app");
    const nav = screen.getAllByRole("navigation", { name: "Principal" })[0]!;
    expect(within(nav).queryByRole("link", { name: "Inicio" })).not.toBeInTheDocument();
    expect(within(nav).queryByRole("link", { name: "Showroom" })).not.toBeInTheDocument();
    expect(within(nav).getByRole("link", { name: "Mapa" })).toHaveAttribute("aria-current", "page");
    // Los botones de sesión de las páginas públicas no tienen sentido acá.
    expect(
      screen.queryByRole("link", { name: /iniciar sesión|ir a la app/i })
    ).not.toBeInTheDocument();
  });

  it("la cuenta muestra el nombre y abre Mi perfil y Cerrar sesión", async () => {
    const router = renderHeader("app");
    const account = await screen.findByRole("button", { name: /marcela pérez/i });
    expect(account).toHaveAttribute("aria-expanded", "false");

    fireEvent.click(account);
    expect(account).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByText("marcela@gmail.com")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Mi perfil" })).toHaveAttribute("href", "/profile");

    fireEvent.click(screen.getByRole("button", { name: "Cerrar sesión" }));
    expect(localStorage.getItem("routeev_token")).toBeNull();
    expect(router.state.location.pathname).toBe("/");
  });

  it("Escape cierra la cuenta y devuelve el foco al botón", async () => {
    renderHeader("app");
    const account = await screen.findByRole("button", { name: /marcela pérez/i });
    fireEvent.click(account);
    fireEvent.keyDown(document, { key: "Escape" });
    expect(account).toHaveAttribute("aria-expanded", "false");
    expect(account).toHaveFocus();
  });

  it("en /profile: Mi perfil es la página actual y el mapa no", async () => {
    renderHeader("profile");
    const nav = screen.getAllByRole("navigation", { name: "Principal" })[0]!;
    expect(within(nav).queryByRole("link", { name: "Inicio" })).not.toBeInTheDocument();
    expect(within(nav).queryByRole("link", { name: "Showroom" })).not.toBeInTheDocument();
    expect(within(nav).getByRole("link", { name: "Mapa" })).not.toHaveAttribute("aria-current");
    fireEvent.click(await screen.findByRole("button", { name: /marcela pérez/i }));
    expect(screen.getByRole("link", { name: "Mi perfil" })).toHaveAttribute("aria-current", "page");
  });

  it("el tema se cambia desde la barra y queda guardado", () => {
    renderHeader("app");
    const theme = screen.getByRole("group", { name: "Tema" });
    const light = within(theme).getByRole("button", { name: "Modo claro" });
    expect(light).toHaveAttribute("aria-pressed", "false");

    fireEvent.click(light);
    expect(document.documentElement).toHaveAttribute("data-theme", "light");
    expect(localStorage.getItem("routeev_theme")).toBe("light");
  });

  it("el menú del celular suma Mi perfil, el tema y Cerrar sesión", async () => {
    renderHeader("app");
    fireEvent.click(screen.getByRole("button", { name: "Abrir menú" }));
    const menu = screen.getByRole("dialog", { name: "Menú" });

    expect(within(menu).getByRole("link", { name: /mapa/i })).toHaveAttribute(
      "aria-current",
      "page"
    );
    expect(within(menu).getByRole("link", { name: /mi perfil/i })).toHaveAttribute(
      "href",
      "/profile"
    );
    expect(within(menu).queryByRole("link", { name: /bajar la app/i })).not.toBeInTheDocument();
    expect(within(menu).getByRole("group", { name: "Tema" })).toBeInTheDocument();
    expect(await within(menu).findByText("Marcela Pérez")).toBeInTheDocument();
    expect(within(menu).getByRole("button", { name: "Cerrar sesión" })).toBeInTheDocument();
  });
});
