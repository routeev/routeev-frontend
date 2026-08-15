import { afterEach, describe, expect, it, vi } from "vitest";
import { ApiError, apiFetch } from "./client";

/**
 * Lo que ve una persona cuando el pedido no vuelve.
 *
 * El caso que motiva estos tests salió de una captura de pantalla real: el
 * showroom mostrando «No se pudo cargar el catálogo: Failed to fetch». Ese
 * texto es el que tira el navegador, en inglés, y apiFetch lo dejaba propagar
 * tal cual hasta la pantalla. No dice qué pasó ni qué hacer, y encima el caso
 * más común es transitorio: la API arma el grafo entero en memoria al arrancar
 * y tarda cerca de un minuto (ver DEPLOY.md).
 */
afterEach(() => {
  vi.unstubAllGlobals();
});

function stubFetch(impl: () => Promise<Response> | never) {
  vi.stubGlobal("fetch", vi.fn(impl));
}

describe("apiFetch ante un fallo de red", () => {
  it("no deja salir el «Failed to fetch» del navegador", async () => {
    stubFetch(() => Promise.reject(new TypeError("Failed to fetch")));

    await expect(apiFetch("/api/showroom/models")).rejects.toSatisfy((err: unknown) => {
      expect(err).toBeInstanceOf(ApiError);
      const e = err as ApiError;
      expect(e.message).not.toMatch(/failed to fetch/i);
      expect(e.message).toMatch(/servidor/i);
      return true;
    });
  });

  it("lo marca como error de red, con status 0 porque no hubo respuesta", async () => {
    stubFetch(() => Promise.reject(new TypeError("NetworkError when attempting to fetch resource.")));

    const err = await apiFetch("/api/graph/stations").catch((e: unknown) => e);

    expect(err).toBeInstanceOf(ApiError);
    expect((err as ApiError).isNetworkError).toBe(true);
    expect((err as ApiError).status).toBe(0);
  });

  it("sugiere reintentar en vez de dar a entender que la culpa es del usuario", async () => {
    stubFetch(() => Promise.reject(new TypeError("Failed to fetch")));

    const err = (await apiFetch("/api/showroom/models").catch((e: unknown) => e)) as ApiError;

    expect(err.message).toMatch(/de nuevo|reintent/i);
  });
});

describe("apiFetch ante una respuesta ilegible", () => {
  it("un 200 con cuerpo roto no llega como «Unexpected end of JSON input»", async () => {
    // Pasa cuando algo en el medio (un proxy, el dev server reiniciandose)
    // contesta 200 con algo que no es JSON.
    stubFetch(() => Promise.resolve(new Response("<html>oops</html>", { status: 200 })));

    const err = (await apiFetch("/api/showroom/models").catch((e: unknown) => e)) as ApiError;

    expect(err).toBeInstanceOf(ApiError);
    expect(err.message).not.toMatch(/JSON/i);
    expect(err.isNetworkError).toBe(false);
  });

  it("un error del servidor con detail sigue mostrando ese detail", async () => {
    stubFetch(() =>
      Promise.resolve(
        new Response(JSON.stringify({ detail: "Ese correo ya está registrado" }), {
          status: 400,
          headers: { "Content-Type": "application/json" },
        })
      )
    );

    const err = (await apiFetch("/api/auth/register", { method: "POST" }).catch((e: unknown) => e)) as ApiError;

    expect(err.status).toBe(400);
    expect(err.message).toBe("Ese correo ya está registrado");
    expect(err.isNetworkError).toBe(false);
  });

  it("un 204 sigue devolviendo null sin intentar parsear nada", async () => {
    stubFetch(() => Promise.resolve(new Response(null, { status: 204 })));

    await expect(apiFetch("/api/users/me/photo", { method: "DELETE" })).resolves.toBeNull();
  });
});
