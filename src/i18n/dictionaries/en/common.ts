// Textos genéricos reusados por más de una pantalla/namespace -- si un texto
// solo aparece en un área (map, profile, auth, etc.) va en el diccionario de
// esa área, no acá.
export const common = {
  close: "Close",
  cancel: "Cancel",
  save: "Save",
  saving: "Saving...",
  loading: "Loading...",
  error: "Something went wrong",
  retry: "Retry",
  languageSwitcherLabel: "Language",
  // src/api/client.ts: no puede usar useTranslation() (no es un componente),
  // así que lee estos vía getStoredLang() en vez del hook.
  unexpectedApiError: "Unexpected error",
  networkError: "We couldn't connect to the server. It might be your connection, or the server may still be starting up: try again in a few seconds.",
  sessionExpired: "Your session expired, sign in again",
  unreadableResponse: "The server sent back something we couldn't read. Try again.",
};
