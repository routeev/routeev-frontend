import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { HelmetProvider } from "react-helmet-async";
import { RouterProvider, createMemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import * as auth from "../api/auth";
import { ApiError } from "../api/client";
import { LanguageProvider } from "../i18n/LanguageProvider";
import { LoginPage } from "./LoginPage";

vi.mock("../api/auth", () => ({
  authConfig: vi.fn(),
  login: vi.fn(),
  register: vi.fn(),
  confirmEmail: vi.fn(),
  resendConfirmation: vi.fn(),
  requestPasswordReset: vi.fn(),
  verifyPasswordResetCode: vi.fn(),
  resetPassword: vi.fn(),
  googleLogin: vi.fn(),
}));

const SESSION = { access_token: "tok", username: "marcela" };

function renderLogin(path = "/login") {
  const router = createMemoryRouter(
    [
      { path: "/login", element: <LoginPage /> },
      { path: "/app", element: <p>App</p> },
    ],
    { initialEntries: [path] }
  );
  render(
    <HelmetProvider>
      <LanguageProvider>
        <QueryClientProvider
          client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
        >
          <RouterProvider router={router} />
        </QueryClientProvider>
      </LanguageProvider>
    </HelmetProvider>
  );
  return router;
}

const type = (label: string | RegExp, value: string) =>
  fireEvent.change(screen.getByLabelText(label), { target: { value } });
const submit = (name: string | RegExp) => fireEvent.click(screen.getByRole("button", { name }));

describe("LoginPage", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.mocked(auth.authConfig).mockResolvedValue({} as Awaited<ReturnType<typeof auth.authConfig>>);
  });

  it("cambia entre iniciar sesión y crear cuenta con links reales, y la URL acompaña", async () => {
    const router = renderLogin();
    expect(
      screen.getByRole("heading", { level: 1, name: "Entrá a tu cuenta" })
    ).toBeInTheDocument();
    const modes = screen.getByRole("navigation", { name: "Iniciar sesión o crear cuenta" });
    expect(within(modes).getByRole("link", { name: "Iniciar sesión" })).toHaveAttribute(
      "aria-current",
      "page"
    );

    fireEvent.click(within(modes).getByRole("link", { name: "Crear cuenta" }));
    const title = await screen.findByRole("heading", { level: 1, name: "Creá tu cuenta" });
    expect(router.state.location.search).toBe("?crear=1");
    expect(title).toHaveFocus();
    const terms = screen.getByText(/Al crear la cuenta aceptás/);
    expect(within(terms).getByRole("link", { name: "Términos" })).toHaveAttribute(
      "href",
      "/terminos"
    );
  });

  it("al crear la cuenta, el mínimo de la contraseña se dice antes de escribir y se actualiza", () => {
    renderLogin("/login?crear=1");
    expect(screen.getByText("Mínimo 10 caracteres.")).toBeInTheDocument();
    type("Contraseña", "ruta-a");
    expect(screen.getByText("Mínimo 10 caracteres · te faltan 4.")).toBeInTheDocument();
    type("Contraseña", "ruta-a-rivera");
    expect(screen.getByText("Cumple el mínimo de 10 caracteres.")).toBeInTheDocument();
  });

  it("valida al enviar, lleva el foco al primer campo con error y lo limpia al corregirlo", () => {
    renderLogin("/login?crear=1");
    type("Correo electrónico", "marcela@");
    type("Contraseña", "12345");
    submit("Crear cuenta");

    const email = screen.getByLabelText("Correo electrónico");
    expect(email).toHaveAttribute("aria-invalid", "true");
    expect(email).toHaveFocus();
    expect(email).toHaveAccessibleDescription("Ingresá un correo válido, como nombre@dominio.com.");
    expect(screen.getByLabelText("Contraseña")).toHaveAccessibleDescription(
      "La contraseña necesita al menos 10 caracteres."
    );
    expect(auth.register).not.toHaveBeenCalled();

    type("Correo electrónico", "marcela@gmail.com");
    expect(email).not.toHaveAttribute("aria-invalid");
  });

  it("muestra el error de la API tal cual", async () => {
    vi.mocked(auth.login).mockRejectedValue(new ApiError("Correo o contraseña incorrectos.", 401));
    renderLogin();
    type("Correo electrónico", "marcela@gmail.com");
    type("Contraseña", "contraseña123");
    submit("Entrar");
    expect(await screen.findByRole("alert")).toHaveTextContent("Correo o contraseña incorrectos.");
  });

  it("con el correo sin confirmar, pasa a confirmarlo con un aviso", async () => {
    vi.mocked(auth.login).mockRejectedValue(new ApiError("Sin confirmar", 403));
    renderLogin();
    type("Correo electrónico", "marcela@gmail.com");
    type("Contraseña", "contraseña123");
    submit("Entrar");

    expect(
      await screen.findByRole("heading", { level: 1, name: "Confirmá tu correo" })
    ).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent("Tu correo todavía no está confirmado");
    expect(screen.getByText("marcela@gmail.com")).toBeInTheDocument();
  });

  it("crear cuenta → confirmar el código → entra a la app", async () => {
    vi.mocked(auth.register).mockResolvedValue({
      confirmation_required: true,
      email: "marcela@gmail.com",
    });
    vi.mocked(auth.confirmEmail).mockResolvedValue(SESSION);
    const router = renderLogin("/login?crear=1");
    type("Correo electrónico", "marcela@gmail.com");
    type(/nombre/i, "Marcela");
    type("Contraseña", "ruta-a-rivera");
    submit("Crear cuenta");

    await screen.findByRole("heading", { level: 1, name: "Confirmá tu correo" });
    expect(auth.register).toHaveBeenCalledWith("marcela@gmail.com", "ruta-a-rivera", "Marcela");
    // Pegar el código con texto alrededor deja solo los dígitos.
    type("Código de 6 dígitos", "Código: 482 913");
    expect(screen.getByLabelText("Código de 6 dígitos")).toHaveValue("482913");
    submit("Confirmar");

    await waitFor(() => expect(router.state.location.pathname).toBe("/app"));
    expect(auth.confirmEmail).toHaveBeenCalledWith("marcela@gmail.com", "482913");
    expect(localStorage.getItem("routeev_token")).toBe("tok");
  });

  it("recuperar la contraseña: correo → código → contraseña nueva, y pedir otro código vuelve al código", async () => {
    vi.mocked(auth.requestPasswordReset).mockResolvedValue(undefined);
    vi.mocked(auth.verifyPasswordResetCode).mockResolvedValue(undefined);
    renderLogin();
    type("Correo electrónico", "marcela@gmail.com");
    submit("¿Olvidaste tu contraseña?");

    await screen.findByRole("heading", { level: 1, name: "Recuperá tu contraseña" });
    expect(screen.getByLabelText("Correo electrónico")).toHaveValue("marcela@gmail.com");
    submit("Enviar código");

    await screen.findByRole("heading", { level: 1, name: "Revisá tu correo" });
    expect(screen.getByText(/tiene una cuenta, te mandamos un código/)).toBeInTheDocument();
    type("Código de 6 dígitos", "482913");
    submit("Verificar código");

    await screen.findByRole("heading", { level: 1, name: "Elegí tu contraseña nueva" });
    submit("Pedir otro código");
    await screen.findByRole("heading", { level: 1, name: "Revisá tu correo" });
    expect(screen.getByRole("status")).toHaveTextContent("el anterior ya no sirve");
  });

  it("el ojo muestra y oculta la contraseña", () => {
    renderLogin();
    const pass = screen.getByLabelText("Contraseña");
    expect(pass).toHaveAttribute("type", "password");
    fireEvent.click(screen.getByRole("button", { name: "Mostrar contraseña" }));
    expect(pass).toHaveAttribute("type", "text");
    expect(screen.getByRole("button", { name: "Ocultar contraseña" })).toHaveAttribute(
      "aria-pressed",
      "true"
    );
  });

  it("sin Google configurado no queda el separador", async () => {
    renderLogin();
    await waitFor(() => expect(auth.authConfig).toHaveBeenCalled());
    expect(screen.queryByText("o")).not.toBeInTheDocument();
  });
});
