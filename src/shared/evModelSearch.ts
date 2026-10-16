// Búsqueda de modelos del catálogo para "Agregar un auto" (AddCarDialog, en el
// perfil).
//
// La lista no ofrece nada hasta que haya un mínimo de letras escritas, y de
// ahí en más filtra (sin mayúsculas ni tildes) con un tope de opciones — un
// autocompletado de verdad, como el de la app móvil (que además exige
// escribir antes de traer el catálogo del backend). El tope y el mínimo son
// propiedades del CATÁLOGO, no del widget: por eso viven acá.
export const MODEL_SEARCH_MIN_CHARS = 3;
export const MODEL_SEARCH_MAX_OPTIONS = 50;

/** Minúsculas y sin tildes, para que "citroen" también encuentre "Citroën". */
function normalize(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();
}

export function filterModelLabels(labels: Iterable<string>, search: string): string[] {
  const query = normalize(search.trim());
  if (query.length < MODEL_SEARCH_MIN_CHARS) return [];
  const matches: string[] = [];
  for (const label of labels) {
    if (normalize(label).includes(query)) {
      matches.push(label);
      if (matches.length >= MODEL_SEARCH_MAX_OPTIONS) break;
    }
  }
  return matches;
}
