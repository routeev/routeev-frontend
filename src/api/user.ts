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
