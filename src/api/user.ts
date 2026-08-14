import { apiFetch } from "./client";

export interface Me {
  username: string;
  email: string;
  photo_url?: string;
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
