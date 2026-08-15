import type { Orden } from "./useShowroomCatalog";
import { num } from "./num";
import styles from "./SearchControls.module.css";

/**
 * QA MEDIO 14: "Solo con carga rápida" se leía como si filtrara el VIAJE
 * ("mostrame rutas con cargadores rápidos"), y encima aparece antes de que la
 * persona haya elegido un auto, así que no había con qué desambiguarlo. La
 * potencia entre paréntesis ayudó pero no alcanzó: sigue sin decir de qué es
 * atributo. Por eso el texto de abajo, que sí lo dice con todas las letras.
 */
const AYUDA_DC_ID = "sr-dc-ayuda";

interface SearchControlsProps {
  query: string;
  onQueryChange: (v: string) => void;
  marca: string;
  onMarcaChange: (v: string) => void;
  marcas: string[];
  orden: Orden;
  onOrdenChange: (v: Orden) => void;
  soloDc: boolean;
  onSoloDcChange: (v: boolean) => void;
  count: number;
}

export function SearchControls({
  query,
  onQueryChange,
  marca,
  onMarcaChange,
  marcas,
  orden,
  onOrdenChange,
  soloDc,
  onSoloDcChange,
  count,
}: SearchControlsProps) {
  return (
    <>
      <div className={styles.searchbar}>
        <svg className={styles.searchIcon} viewBox="0 0 24 24" aria-hidden="true">
          <circle cx="11" cy="11" r="7" />
          <line x1="16.2" y1="16.2" x2="21" y2="21" />
        </svg>
        <label className="sr-only" htmlFor="sr-q">
          Buscar un auto eléctrico por marca o modelo
        </label>
        <input
          id="sr-q"
          type="search"
          autoComplete="off"
          spellCheck={false}
          placeholder="Nissan Leaf, BYD Dolphin, Tesla Model 3…"
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
        />
        {query && (
          <button
            type="button"
            className={styles.clear}
            aria-label="Limpiar la búsqueda"
            onClick={() => onQueryChange("")}
          >
            &times;
          </button>
        )}
      </div>

      <div className={styles.filters}>
        <label className="sr-only" htmlFor="sr-marca">
          Filtrar por marca
        </label>
        <select id="sr-marca" value={marca} onChange={(e) => onMarcaChange(e.target.value)}>
          <option value="">Todas las marcas</option>
          {marcas.map((m) => (
            <option key={m} value={m}>
              {m}
            </option>
          ))}
        </select>

        <label className="sr-only" htmlFor="sr-orden">
          Ordenar los resultados
        </label>
        <select id="sr-orden" value={orden} onChange={(e) => onOrdenChange(e.target.value as Orden)}>
          <option value="relevancia">Más relevantes</option>
          <option value="autonomia">Mayor autonomía</option>
          <option value="bateria">Mayor batería</option>
          <option value="carga">Carga más rápida</option>
          <option value="consumo">Menor consumo</option>
        </select>

        <label className={styles.chip}>
          <input
            type="checkbox"
            checked={soloDc}
            onChange={(e) => onSoloDcChange(e.target.checked)}
            aria-describedby={AYUDA_DC_ID}
          />
          Solo con carga rápida (50 kW o más)
        </label>

        <span className={["mono-num", styles.count].join(" ")}>
          {count > 0 ? `${num(count)} ${count === 1 ? "modelo" : "modelos"}` : ""}
        </span>
      </div>

      {/* Siempre visible, nunca un tooltip al pasar el mouse: el hover no
          existe en un celular, y quien más necesita esta aclaración es
          justamente quien no va a descubrir que hay que apuntarle a un
          iconito. Va debajo de la fila de filtros para no romper el wrap del
          flex, y atado al checkbox con aria-describedby para que el lector de
          pantalla lo lea junto con la etiqueta. */}
      <p id={AYUDA_DC_ID} className={styles.chipAyuda}>
        <strong>Es una característica del auto, no del viaje:</strong> deja solo los modelos que
        aceptan 50 kW o más en un cargador rápido (los de corriente continua, DC). No filtra el
        recorrido ni las estaciones que vas a encontrar.
      </p>
    </>
  );
}
