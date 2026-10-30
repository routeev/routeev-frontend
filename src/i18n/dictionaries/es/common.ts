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
  // Disfraz de temporada (src/season/). Son los unicos textos nuevos que
  // suma: el nombre del interruptor, sus dos tooltips, los dos avisos que
  // confirman el cambio y el motivo del tema bloqueado. Se borran con el
  // resto despues del 3/11.
  season: {
    name: "Edición Halloween",
    turnOn: "Activar la edición Halloween",
    turnOff: "Desactivar la edición Halloween",
    onNotice: "Edición Halloween activada.",
    offNotice:
      "Edición Halloween desactivada. La podés volver a activar desde el mismo interruptor.",
    themeLocked: "Mientras la edición Halloween está activada, la app se ve oscura.",
  },
};
