import { apiFetch } from "./client";

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

export function register(email: string, password: string): Promise<AuthResponse> {
  return apiFetch<AuthResponse>("/api/auth/register", { method: "POST", body: { email, password } });
}

export function confirmEmail(email: string, code: string): Promise<AuthSession> {
  return apiFetch<AuthSession>("/api/auth/confirm-email", { method: "POST", body: { email, code } });
}

export function resendConfirmation(email: string): Promise<void> {
  return apiFetch<void>("/api/auth/resend-confirmation", { method: "POST", body: { email } });
}

export function googleLogin(idToken: string): Promise<AuthSession> {
  // El backend espera `id_token` (ver js/api.js#googleLogin), no `credential`
  // -- ese es el nombre del campo que devuelve el SDK de Google, pero no el
  // que espera GoogleAuthRequest en backend/app/schemas.py.
  return apiFetch<AuthSession>("/api/auth/google", { method: "POST", body: { id_token: idToken } });
}
