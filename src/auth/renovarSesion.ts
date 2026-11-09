import { refreshSession } from "../api/auth";
import { getToken, setSession } from "../api/session";

/**
 * Cada cuánto, como mucho, se renueva el token. Dura 30 días y cada renovación
 * corre el vencimiento (routeev-backend#63), así que con renovar al entrar
 * alcanza para que quien usa la web no vuelva a ver el login. El mínimo es
 * para no pedirlo en cada cambio de pestaña o de pantalla. El backend acepta
 * hasta 60 por hora por usuario.
 */
export const RENOVAR_CADA_MS = 10 * 60 * 1000;

let ultimaRenovacion = 0;

/**
 * Renueva el token guardado y guarda el nuevo. Lo que puede fallar no se le
 * muestra a nadie: sin red, con el servidor despertando o con el tope por hora,
 * el token sigue valiendo y se reintenta la próxima vez. Un 401 (sesión vencida,
 * cerrada o de antes de un "cerrar en todos") ya lo resuelve apiFetch: borra la
 * sesión y manda al login.
 */
export async function renovarSesion(): Promise<void> {
  const token = getToken();
  if (!token || Date.now() - ultimaRenovacion < RENOVAR_CADA_MS) return;
  ultimaRenovacion = Date.now();
  try {
    const res = await refreshSession();
    // Si mientras el pedido viajaba la persona salió, o entró con otra cuenta
    // (en otra pestaña, por ejemplo), el token renovado ya no es el de la
    // sesión: no se pisa.
    if (getToken() !== token) return;
    setSession(res.access_token, res.username);
  } catch {
    ultimaRenovacion = 0;
  }
}

/** Solo para los tests: que cada uno arranque sin una renovación reciente. */
export function olvidarUltimaRenovacion(): void {
  ultimaRenovacion = 0;
}
