// Textos genéricos reusados por más de una pantalla/namespace -- si un texto
// solo aparece en un área (map, profile, auth, etc.) va en el diccionario de
// esa área, no acá.
export const common = {
  cancel: "Cancelar",
  save: "Guardar",
  saving: "Guardando...",
  themeSwitcherLabel: "Tema",
  lightMode: "Modo claro",
  darkMode: "Modo oscuro",
  // src/api/client.ts: no puede usar useTranslation() (no es un componente),
  // así que lee estos vía getStoredLang() en vez del hook.
  unexpectedApiError: "Error inesperado",
  networkError:
    "No pudimos conectarnos con el servidor. Puede ser tu conexión, o que el servidor esté arrancando: probá de nuevo en unos segundos.",
  sessionExpired: "Sesión expirada, inicia sesión de nuevo",
  unreadableResponse: "El servidor respondió algo que no pudimos leer. Probá de nuevo.",
  // Chip de temporada (src/season/SeasonChip.tsx), solo en páginas públicas.
  season: {
    halloween: "Edición Halloween",
  },
};
