import { common as commonEn } from "../i18n/dictionaries/en/common";
import { common as commonEs } from "../i18n/dictionaries/es/common";
import { getStoredLang } from "../i18n/getStoredLang";
import { API_BASE_URL } from "./config";
import { clearSession, getToken } from "./session";

// Este módulo arma mensajes de error antes de que exista ningún árbol de
// componentes (o incluso fuera de uno, en cualquier código que llame a
// apiFetch), así que no puede usar useTranslation() -- lee el idioma actual
// directo de localStorage en el momento de cada error, no una vez al cargar
// el módulo, para que un cambio de idioma a mitad de sesión también aplique
// acá. Importa el namespace `common` directo (no el diccionario combinado de
// ./dictionaries/es) para no arrastrar el resto de los textos de la app (map,
// profile, landing...) a este módulo, que importa CUALQUIER pantalla que
// llame a la API -- eso rompía el code-splitting por página.
function t() {
  return getStoredLang() === "en" ? commonEn : commonEs;
}

// Espejo de js/api.js#normalizeDetail: el backend FastAPI devuelve, en un
// 422, un array de errores de Pydantic ({loc, msg, type}) en vez de un
// string. Sin esto, cada formulario tendria que saber parsear ese shape.
type PydanticError = { loc?: (string | number)[]; msg: string };

function normalizeDetail(detail: unknown): string {
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail)) {
    return (detail as PydanticError[]).map((e) => e.msg).join(", ");
  }
  return t().unexpectedApiError;
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
    //
    // El mensaje sugiere reintentar (no "revisá tu conexión") porque el caso
    // más común no es "no tenés internet": el servidor de la API arma el
    // grafo entero en memoria al arrancar y tarda cerca de un minuto (ver
    // DEPLOY.md), así que después de cada deploy hay una ventana real en la
    // que los pedidos no vuelven.
    throw new ApiError(t().networkError, 0, true);
  }

  if (res.status === 401 && token) {
    // 401 solo significa "sesion expirada" cuando HABIA un token de por
    // medio (js/api.js, mismo criterio). Sin token es credenciales
    // invalidas, y eso lo maneja la rama de abajo con el detail real.
    //
    // getToken() !== token (no solo "token" a secas, leido al principio de
    // esta funcion): un pedido que salio ANTES de cambiar la contraseña
    // (ver AccountPanel.tsx#PasswordField) puede volver DESPUES con un 401
    // real -- el cambio invalida TODOS los tokens viejos, incluido el que
    // este pedido en particular llevaba pegado. Para cuando la respuesta
    // llega, la sesion ya tiene guardado el token NUEVO que devolvio el
    // cambio, que sigue siendo perfectamente valido. Limpiarla igual por un
    // 401 de un pedido que ya se sabe obsoleto deslogueaba a alguien que
    // recien acababa de cambiar su contraseña con exito -- confirmado en
    // vivo. Este pedido puntual sigue fallando (algo lo pidio con un token
    // que ya no vale), pero no le toca la sesion actual a nadie mas.
    if (getToken() === token) {
      clearSession();
      onSessionExpired?.();
    }
    throw new ApiError(t().sessionExpired, 401);
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
    throw new ApiError(t().unreadableResponse, res.status);
  }
}
