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
  /**
   * true cuando el pedido no llegó a salir o no volvió: sin conexión, el
   * servidor todavía arrancando, un proxy caído. No hay status HTTP porque no
   * hubo respuesta, así que vale 0 -- quien discrimine por status tiene que
   * mirar esto primero.
   */
  isNetworkError: boolean;

  constructor(message: string, status: number, isNetworkError = false) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.isNetworkError = isNetworkError;
  }
}

/**
 * Un fallo de red se veía en pantalla como «Failed to fetch»: el texto crudo
 * que tira el navegador, en inglés, sin decir qué pasó ni qué hacer. Aparecía
 * tal cual en el showroom ("No se pudo cargar el catálogo: Failed to fetch") y
 * en cualquier otra pantalla, porque apiFetch dejaba propagar el TypeError de
 * fetch sin tocarlo.
 *
 * El caso más común no es "no tenés internet": el servidor de la API arma el
 * grafo entero en memoria al arrancar y tarda cerca de un minuto (ver
 * DEPLOY.md), así que después de cada deploy hay una ventana real en la que los
 * pedidos no vuelven. Por eso el mensaje sugiere reintentar en vez de dar a
 * entender que el problema es del usuario.
 */
const MENSAJE_SIN_RESPUESTA =
  "No pudimos conectarnos con el servidor. Puede ser tu conexión, o que el servidor esté arrancando: probá de nuevo en unos segundos.";

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

  let res: Response;
  try {
    res = await fetch(`${API_BASE_URL}${path}`, { ...options, headers, body });
  } catch {
    // fetch rechaza con un TypeError genérico ante cualquier fallo de red, y
    // por diseño no dice cuál fue (es información que la página no debería
    // poder averiguar de otro origen). No hay nada útil que extraer del error
    // original, así que se reemplaza entero.
    throw new ApiError(MENSAJE_SIN_RESPUESTA, 0, true);
  }

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
  try {
    return (await res.json()) as T;
  } catch {
    // Respuesta 2xx cuyo cuerpo se cortó o no es JSON. Pasa cuando algo en el
    // medio (un proxy, el dev server reiniciándose) devuelve una página de
    // error con status 200. Sin esto salía un "Unexpected end of JSON input"
    // en pantalla, que no le dice nada a nadie.
    throw new ApiError("El servidor respondió algo que no pudimos leer. Probá de nuevo.", res.status);
  }
}
