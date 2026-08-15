// Búsqueda de modelos del catálogo para los campos de "nuevo vehículo":
// ModelCombobox en AddVehicleForm (perfil) y el <datalist> que todavía usa
// VehiclePanel (mapa).
//
// Con las 630 opciones siempre montadas, el navegador despliega la lista
// COMPLETA apenas se clickea el campo vacío, tapando la pantalla. Por eso la
// lista no ofrece nada hasta que haya un mínimo de letras escritas, y de
// ahí en más filtra (sin mayúsculas ni tildes) con un tope de opciones — un
// autocompletado de verdad, como el de la app móvil (que además exige
// escribir antes de traer el catálogo del backend).
//
// El tope y el mínimo siguen viviendo acá (y no adentro de ModelCombobox) a
// propósito: son propiedades del CATÁLOGO, no del widget, y los comparten los
// dos formularios aunque uno dibuje su propia lista y el otro no.
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
