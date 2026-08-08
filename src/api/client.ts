import { API_BASE_URL } from "./config";
import { clearSession, getToken } from "./session";

// Espejo de js/api.js#normalizeDetail: el backend FastAPI devuelve, en un
// 422, un array de errores de Pydantic ({loc, msg, type}) en vez de un
// string. Sin esto, cada formulario tendria que saber parsear ese shape.
type PydanticError = { loc?: (string | number)[]; msg: string };

function normalizeDetail(detail: unknown): string {
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail)) {
    return (detail as PydanticError[]).map((e) => e.msg).join(", ");
  }
  return "Error inesperado";
}

export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

export interface ApiFetchOptions extends Omit<RequestInit, "body"> {
  // `object` (no una interfaz con index signature) para aceptar cualquier
  // tipo de payload tipado (SimulateRequest, etc.) sin que TS exija que
  // declare su propia index signature.
  body?: BodyInit | object;
}

// Callback opcional para reaccionar a una sesion expirada sin acoplar este
// modulo a React Router (se conecta desde el ProtectedRoute / layout raiz).
let onSessionExpired: (() => void) | null = null;
export function setOnSessionExpired(handler: () => void): void {
  onSessionExpired = handler;
}

export async function apiFetch<T = unknown>(
  path: string,
  options: ApiFetchOptions = {}
): Promise<T> {
  const headers = new Headers(options.headers);
  const isFormData = options.body instanceof FormData;
  let body: BodyInit | undefined;

  if (options.body !== undefined && !isFormData && typeof options.body !== "string") {
    body = JSON.stringify(options.body);
    headers.set("Content-Type", "application/json");
  } else {
    body = options.body as BodyInit | undefined;
  }

  const token = getToken();
  if (token) headers.set("Authorization", `Bearer ${token}`);

  const res = await fetch(`${API_BASE_URL}${path}`, { ...options, headers, body });

  if (res.status === 401 && token) {
    // 401 solo significa "sesion expirada" cuando HABIA un token de por
    // medio (js/api.js, mismo criterio). Sin token es credenciales
    // invalidas, y eso lo maneja la rama de abajo con el detail real.
    clearSession();
    onSessionExpired?.();
    throw new ApiError("Sesion expirada, inicia sesion de nuevo", 401);
  }

  if (!res.ok) {
    let detail = `Error ${res.status}`;
    try {
      const data = await res.json();
      detail = normalizeDetail(data.detail) || detail;
    } catch {
      // sin body JSON legible, se queda con "Error <status>"
    }
    throw new ApiError(detail, res.status);
  }

  if (res.status === 204) return null as T;
  return (await res.json()) as T;
}
