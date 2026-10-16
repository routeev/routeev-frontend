import { apiFetch } from "./client";

export interface Me {
  username: string;
  /**
   * Nombre propio, tal como lo escribió la persona ("Matías Filgueiras"), o
   * null si no lo dio. Distinto de `username`, que es un identificador derivado
   * del correo ("pucho1394"): uno es único, en minúsculas y sin acentos; el
   * otro puede repetirse y lleva tildes y espacios.
   *
   * Para mostrar, usar `nombreParaMostrar(me)` en vez de elegir a mano entre
   * los dos. Opcional porque una API anterior a este campo no lo manda.
   */
  display_name?: string | null;
  email: string;
  photo_url?: string;
}

/**
 * Cómo corresponde llamar a esta persona en pantalla: su nombre si lo dio, y si
 * no el `username` capitalizado, que es lo que se mostraba antes.
 *
 * Se resuelve acá y no en cada pantalla para que la próxima que muestre un
 * nombre no tenga que acordarse de la regla.
 */
export function nombreParaMostrar(me: Pick<Me, "username" | "display_name"> | null | undefined): string {
  if (!me) return "";
  if (me.display_name) return me.display_name;
  return me.username ? me.username.charAt(0).toUpperCase() + me.username.slice(1) : "";
}

export function getMe(): Promise<Me> {
  return apiFetch<Me>("/api/users/me");
}

export function uploadMyPhoto(blob: Blob): Promise<Me> {
  const form = new FormData();
  form.append("file", blob, "perfil.jpg");
  return apiFetch<Me>("/api/users/me/photo", { method: "POST", body: form });
}

export function deleteMyPhoto(): Promise<void> {
  return apiFetch<void>("/api/users/me/photo", { method: "DELETE" });
}

export function updateMyUsername(username: string): Promise<Me> {
  return apiFetch<Me>("/api/users/me/username", { method: "PUT", body: { username } });
}

/** Cambia el nombre para mostrar. Un string vacío lo borra y vuelve a verse el `username`. */
export function updateMyDisplayName(displayName: string): Promise<Me> {
  return apiFetch<Me>("/api/users/me/display-name", { method: "PUT", body: { display_name: displayName } });
}

/** Respuesta de PUT /me/password: mismo shape que login/registro (ver api/auth.ts#AuthSession). */
export interface PasswordChangeSession {
  access_token: string;
  username: string;
}

/**
 * Cambia la contraseña. El backend valida `currentPassword` contra la que ya
 * tiene guardada (si no coincide responde 400, no 401: el cliente leería un
 * 401 como sesión vencida) y devuelve un token nuevo -- el cambio invalida
 * todos los tokens ya emitidos (por si alguien más los tenía), así que sin
 * este token nuevo la sesión actual quedaría cortada de inmediato.
 * Guardarlo (`setSession`, ver AccountSection.tsx) es responsabilidad de quien
 * llama, no de esta función.
 */
export function changeMyPassword(currentPassword: string, newPassword: string): Promise<PasswordChangeSession> {
  return apiFetch<PasswordChangeSession>("/api/users/me/password", {
    method: "PUT",
    body: { current_password: currentPassword, new_password: newPassword },
  });
}

export interface EmailChangeRequestResult {
  /** false cuando este servidor no tiene envío de mail configurado: el correo YA cambió, no hace falta pedir ningún código. */
  confirmation_required: boolean;
  new_email: string;
}

/** Primer paso de cambiar el correo: pide un código de 6 dígitos al correo nuevo. */
export function requestMyEmailChange(newEmail: string): Promise<EmailChangeRequestResult> {
  return apiFetch<EmailChangeRequestResult>("/api/users/me/email/request-change", {
    method: "POST",
    body: { new_email: newEmail },
  });
}

/** Segundo paso: el código de 6 dígitos que llegó al correo nuevo. */
export function confirmMyEmailChange(code: string): Promise<Me> {
  return apiFetch<Me>("/api/users/me/email/confirm-change", { method: "POST", body: { code } });
}

/** Borra la cuenta (y en cascada sus vehículos, historial e reseñas) para siempre. */
export function deleteMyAccount(): Promise<void> {
  return apiFetch<void>("/api/users/me", { method: "DELETE" });
}
