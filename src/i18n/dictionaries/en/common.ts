// Textos genéricos reusados por más de una pantalla/namespace -- si un texto
// solo aparece en un área (map, profile, auth, etc.) va en el diccionario de
// esa área, no acá.
export const common = {
  cancel: "Cancel",
  save: "Save",
  saving: "Saving...",
  themeSwitcherLabel: "Theme",
  lightMode: "Light mode",
  darkMode: "Dark mode",
  // src/api/client.ts: no puede usar useTranslation() (no es un componente),
  // así que lee estos vía getStoredLang() en vez del hook.
  unexpectedApiError: "Unexpected error",
  networkError: "We couldn't connect to the server. It might be your connection, or the server may still be starting up: try again in a few seconds.",
  sessionExpired: "Your session expired, sign in again",
  unreadableResponse: "The server sent back something we couldn't read. Try again.",
  // Interruptor de temporada (src/season/SeasonSwitch.tsx).
  season: {
    halloween: "Halloween edition",
    turnOff: "Turn off the Halloween edition",
    turnOn: "Turn on the Halloween edition",
  },
};
