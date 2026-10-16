// Mismas claves de localStorage que el sitio estatico actual (js/api.js).
// Deliberado: durante el cutover por pagina (front2.md, Parte 2 "Estrategia
// de migracion"), el sitio viejo y este conviven contra la misma API. Si
// cambiaramos las claves, loguearse en uno no valdria en el otro.
const TOKEN_KEY = "routeev_token";
const USERNAME_KEY = "routeev_username";

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function getUsername(): string | null {
  return localStorage.getItem(USERNAME_KEY);
}

export function setSession(token: string, username: string): void {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USERNAME_KEY, username);
}

// Solo el nombre, sin tocar el token: usado al renombrarse (AccountSection),
// donde el token sigue siendo valido (get_current_user en el backend
// resuelve el usuario de nuevo desde la base, no confia en el "username" que
// el JWT tenia grabado al emitirse) -- lo que queda desactualizado es esta
// copia en localStorage, que el header usa como respaldo mientras no llega
// /api/users/me (ver landing/HeaderAccount.tsx).
export function setUsername(username: string): void {
  localStorage.setItem(USERNAME_KEY, username);
}

export function clearSession(): void {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USERNAME_KEY);
}
