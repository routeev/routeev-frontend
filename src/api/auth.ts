import { ApiError, apiFetch } from "./client";

export interface AuthConfig {
  google_client_id: string | null;
  ai_vehicle_lookup_enabled: boolean;
}

/** Cuenta creada/logueada sin pasos pendientes: ya hay sesión. */
export interface AuthSession {
  confirmation_required?: false;
  access_token: string;
  username: string;
}

/** Cuenta creada pero con el código de confirmación recién enviado por mail. */
export interface ConfirmationRequired {
  confirmation_required: true;
  email: string;
}

export type AuthResponse = AuthSession | ConfirmationRequired;

export function authConfig(): Promise<AuthConfig> {
  return apiFetch<AuthConfig>("/api/auth/config");
}

export function login(email: string, password: string): Promise<AuthResponse> {
  return apiFetch<AuthResponse>("/api/auth/login", { method: "POST", body: { email, password } });
}

/**
 * Alta de cuenta. `displayName` es OPCIONAL de punta a punta (QA BAJO 25): sin
 * él, el backend deriva el nombre del correo y sale un "pucho1394" que nadie
 * eligió.
 *
 * El campo se llama `display_name` y NO `username`: son dos cosas distintas en
 * el backend. `username` es un identificador (único, minúsculas, sin espacios
 * ni acentos, derivado del correo) y `display_name` es un nombre propio, que
 * puede repetirse y lleva tildes y espacios. Mandar uno por el otro haría que
 * "Matías Filgueiras" no pase la validación del alfabeto de `username`.
 *
 * El reintento sin el campo no es paranoia gratuita: el backend que acepta
 * `display_name` en el alta se está desplegando en paralelo a este cambio, y
 * los schemas de FastAPI de este proyecto rechazan los campos que no conocen
 * con un 422 ("Extra inputs are not permitted" -- exactamente el error que ya
 * se comió showroomLookupAi por mandar "consulta" en vez de "query"). Mandarlo
 * a ciegas contra la API vieja rompería el alta de cualquiera que se moleste
 * en escribir su nombre, que es lo último que puede pasar en una pantalla de
 * registro. Con el reintento, lo peor que pasa contra una API vieja es que el
 * nombre se ignore y la cuenta se cree igual.
 */
export async function register(
  email: string,
  password: string,
  displayName?: string
): Promise<AuthResponse> {
  const base = { email, password };
  const nombre = displayName?.trim();
  if (!nombre) {
    return apiFetch<AuthResponse>("/api/auth/register", { method: "POST", body: base });
  }
  try {
    return await apiFetch<AuthResponse>("/api/auth/register", {
      method: "POST",
      body: { ...base, display_name: nombre },
    });
  } catch (err) {
    // Solo se reintenta ante el rango de errores que puede haber causado el
    // campo de más. Un 409 (correo ya registrado) o un 500 se propagan tal
    // cual: reintentar ahí sería pedir dos veces lo mismo para nada. Si el
    // reintento también falla, el error que sale es el del reintento, que es
    // el que habla del problema real (contraseña corta, correo inválido...).
    if (err instanceof ApiError && (err.status === 422 || err.status === 400)) {
      return apiFetch<AuthResponse>("/api/auth/register", { method: "POST", body: base });
    }
    throw err;
  }
}

export function confirmEmail(email: string, code: string): Promise<AuthSession> {
  return apiFetch<AuthSession>("/api/auth/confirm-email", { method: "POST", body: { email, code } });
}

export function resendConfirmation(email: string): Promise<void> {
  return apiFetch<void>("/api/auth/resend-confirmation", { method: "POST", body: { email } });
}

export function requestPasswordReset(email: string): Promise<void> {
  return apiFetch<void>("/api/auth/forgot-password", { method: "POST", body: { email } });
}

export function verifyPasswordResetCode(email: string, code: string): Promise<void> {
  return apiFetch<void>("/api/auth/verify-reset-code", { method: "POST", body: { email, code } });
}

export function resetPassword(email: string, code: string, newPassword: string): Promise<AuthSession> {
  return apiFetch<AuthSession>("/api/auth/reset-password", {
    method: "POST",
    body: { email, code, new_password: newPassword },
  });
}

export function googleLogin(idToken: string): Promise<AuthSession> {
  // El backend espera `id_token` (ver js/api.js#googleLogin), no `credential`
  // -- ese es el nombre del campo que devuelve el SDK de Google, pero no el
  // que espera GoogleAuthRequest en backend/app/schemas.py.
  return apiFetch<AuthSession>("/api/auth/google", { method: "POST", body: { id_token: idToken } });
}
