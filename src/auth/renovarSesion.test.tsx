import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ProtectedRoute } from "./ProtectedRoute";
import { olvidarUltimaRenovacion, renovarSesion } from "./renovarSesion";

/**
 * La renovación del token de routeev-backend#63: con el token de 30 días y
 * esto, quien entra a la web al menos una vez por mes no vuelve a ver el login.
 */

const RENOVADO = {
  access_token: "tok-nuevo",
  token_type: "bearer",
  username: "marcela",
  email: "m@x.uy",
};

function respuesta(status: number, body: unknown = RENOVADO) {
  return new Response(status === 204 ? null : JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

const fetchMock = vi.fn<typeof fetch>();

beforeEach(() => {
  olvidarUltimaRenovacion();
  localStorage.clear();
  localStorage.setItem("routeev_token", "tok-viejo");
  localStorage.setItem("routeev_username", "marcela");
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

const pedidosDeRenovacion = () =>
  fetchMock.mock.calls.filter(([url]) => String(url).endsWith("/api/auth/refresh"));

describe("renovarSesion", () => {
  it("manda el token guardado y guarda el nuevo", async () => {
    fetchMock.mockResolvedValue(respuesta(200));
    await renovarSesion();

    const [url, init] = pedidosDeRenovacion()[0];
    expect(String(url)).toMatch(/\/api\/auth\/refresh$/);
    expect(init?.method).toBe("POST");
    expect(new Headers(init?.headers).get("Authorization")).toBe("Bearer tok-viejo");
    expect(localStorage.getItem("routeev_token")).toBe("tok-nuevo");
  });

  it("no la pide de nuevo antes de 10 minutos, y sí después", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    fetchMock.mockImplementation(async () => respuesta(200));
    await renovarSesion();
    await renovarSesion();
    expect(pedidosDeRenovacion()).toHaveLength(1);

    vi.setSystemTime(Date.now() + 10 * 60 * 1000 + 1);
    await renovarSesion();
    expect(pedidosDeRenovacion()).toHaveLength(2);
  });

  it("sin token no pide nada", async () => {
    localStorage.clear();
    await renovarSesion();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("sin red no rompe nada: el token queda como estaba y se reintenta la próxima vez", async () => {
    fetchMock.mockRejectedValueOnce(new TypeError("Failed to fetch"));
    await expect(renovarSesion()).resolves.toBeUndefined();
    expect(localStorage.getItem("routeev_token")).toBe("tok-viejo");

    fetchMock.mockResolvedValueOnce(respuesta(200));
    await renovarSesion();
    expect(localStorage.getItem("routeev_token")).toBe("tok-nuevo");
  });

  it("un 401 (sesión vencida o cerrada) borra la sesión", async () => {
    fetchMock.mockResolvedValue(respuesta(401, { detail: "Sesion cerrada" }));
    await renovarSesion();
    expect(localStorage.getItem("routeev_token")).toBeNull();
  });

  it("si mientras tanto se salió de la cuenta, no resucita la sesión", async () => {
    fetchMock.mockImplementation(async () => {
      localStorage.clear();
      return respuesta(200);
    });
    await renovarSesion();
    expect(localStorage.getItem("routeev_token")).toBeNull();
  });
});

describe("ProtectedRoute", () => {
  function renderApp() {
    render(
      <MemoryRouter initialEntries={["/app"]}>
        <Routes>
          <Route
            path="/app"
            element={
              <ProtectedRoute>
                <p>Mapa</p>
              </ProtectedRoute>
            }
          />
          <Route path="/login" element={<p>Login</p>} />
        </Routes>
      </MemoryRouter>
    );
  }

  it("renueva al entrar y al volver a la pestaña", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    fetchMock.mockImplementation(async () => respuesta(200));
    renderApp();
    expect(screen.getByText("Mapa")).toBeInTheDocument();
    await waitFor(() => expect(pedidosDeRenovacion()).toHaveLength(1));

    vi.setSystemTime(Date.now() + 11 * 60 * 1000);
    document.dispatchEvent(new Event("visibilitychange"));
    await waitFor(() => expect(pedidosDeRenovacion()).toHaveLength(2));
  });

  it("sin token manda al login sin pedir nada", () => {
    localStorage.clear();
    renderApp();
    expect(screen.getByText("Login")).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
