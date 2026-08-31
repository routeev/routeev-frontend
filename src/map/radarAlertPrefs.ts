// Preferencia de vibración para el aviso de radar en el viaje en vivo (ver
// useLiveTrip.ts). Mismo prefijo routeev_ que el resto de las claves de
// localStorage del proyecto (routeev_theme, routeev_token, routeev_lang).
//
// Sin contexto de React a propósito, mismo criterio que theme.ts: lo único
// que necesita leer "está prendido ahora" es el propio toggle en
// TripDashboard al montar, y useLiveTrip.ts lo lee una vez por aviso (no hace
// falta que se entere en vivo si la persona lo cambia a mitad de viaje desde
// otra pestaña).
const STORAGE_KEY = "routeev_radar_vibration";

// Prendida por default: es un aviso de seguridad (que el aviso visual solo
// no cubre si la persona no está mirando la pantalla en ese instante), no
// algo que tenga sentido pedirle a cada quien que active a mano la primera
// vez que usa la app.
export function getRadarVibrationEnabled(): boolean {
  if (typeof window === "undefined") return true;
  return window.localStorage.getItem(STORAGE_KEY) !== "off";
}

export function setRadarVibrationEnabled(enabled: boolean): void {
  window.localStorage.setItem(STORAGE_KEY, enabled ? "on" : "off");
}
