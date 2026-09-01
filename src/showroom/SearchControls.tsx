import { Field, Label } from "@headlessui/react";
import { useTranslation } from "../i18n/LanguageProvider";
import { Checkbox } from "../shared/Checkbox";
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
  const { t } = useTranslation();
  const sc = t.showroom.searchControls;
  return (
    <>
      <div className={styles.searchbar}>
        <svg className={styles.searchIcon} viewBox="0 0 24 24" aria-hidden="true">
          <circle cx="11" cy="11" r="7" />
          <line x1="16.2" y1="16.2" x2="21" y2="21" />
        </svg>
        <label className="sr-only" htmlFor="sr-q">
          {sc.searchLabel}
        </label>
        <input
          id="sr-q"
          type="search"
          autoComplete="off"
          spellCheck={false}
          placeholder={sc.searchPlaceholder}
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
        />
        {query && (
          <button
            type="button"
            className={styles.clear}
            aria-label={sc.clearSearch}
            onClick={() => onQueryChange("")}
          >
            &times;
          </button>
        )}
      </div>

      <div className={styles.filters}>
        <label className="sr-only" htmlFor="sr-marca">
          {sc.marcaLabel}
        </label>
        <select id="sr-marca" value={marca} onChange={(e) => onMarcaChange(e.target.value)}>
          <option value="">{sc.todasLasMarcas}</option>
          {marcas.map((m) => (
            <option key={m} value={m}>
              {m}
            </option>
          ))}
        </select>

        <label className="sr-only" htmlFor="sr-orden">
          {sc.ordenLabel}
        </label>
        <select id="sr-orden" value={orden} onChange={(e) => onOrdenChange(e.target.value as Orden)}>
          <option value="relevancia">{sc.ordenRelevancia}</option>
          <option value="autonomia">{sc.ordenAutonomia}</option>
          <option value="bateria">{sc.ordenBateria}</option>
          <option value="carga">{sc.ordenCarga}</option>
          <option value="consumo">{sc.ordenConsumo}</option>
        </select>

        <Field className={styles.chip}>
          <Checkbox checked={soloDc} onChange={onSoloDcChange} aria-describedby={AYUDA_DC_ID} />
          <Label>{sc.soloDc}</Label>
        </Field>

        <span className={["mono-num", styles.count].join(" ")}>{count > 0 ? sc.count(num(count), count) : ""}</span>
      </div>

      {/* Siempre visible, nunca un tooltip al pasar el mouse: el hover no
          existe en un celular, y quien más necesita esta aclaración es
          justamente quien no va a descubrir que hay que apuntarle a un
          iconito. Va debajo de la fila de filtros para no romper el wrap del
          flex, y atado al checkbox con aria-describedby para que el lector de
          pantalla lo lea junto con la etiqueta. */}
      <p id={AYUDA_DC_ID} className={styles.chipAyuda}>
        <strong>{sc.chipAyudaStrong}</strong>
        {sc.chipAyudaRest}
      </p>
    </>
  );
}
