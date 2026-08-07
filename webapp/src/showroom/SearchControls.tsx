import type { Orden } from "./useShowroomCatalog";
import { num } from "./num";
import styles from "./SearchControls.module.css";

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
          <input type="checkbox" checked={soloDc} onChange={(e) => onSoloDcChange(e.target.checked)} />
          Solo con carga rápida (50 kW o más)
        </label>

        <span className={["mono-num", styles.count].join(" ")}>
          {count > 0 ? `${num(count)} ${count === 1 ? "modelo" : "modelos"}` : ""}
        </span>
      </div>
    </>
  );
}
