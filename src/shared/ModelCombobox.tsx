import { useEffect, useRef, useState } from "react";
import { useTranslation } from "../i18n/LanguageProvider";
import styles from "./ModelCombobox.module.css";

interface ModelComboboxProps {
  /** Prefijo de los ids del campo, la lista y las opciones. Único por pantalla. */
  id: string;
  label: string;
  placeholder: string;
  value: string;
  /**
   * Opciones YA filtradas por quien lo usa. A propósito: el gate de "no pidas
   * el catálogo hasta que haya suficientes letras" y el tope de opciones son
   * decisiones del formulario (ver el `enabled` de la query en
   * AddVehicleForm y filterModelLabels en evModelSearch), no de este widget.
   */
  options: string[];
  /** true mientras el catálogo se está bajando, para no decir "no hay nada" antes de tiempo. */
  loading?: boolean;
  /** Letras que hacen falta antes de que haya algo para ofrecer. */
  minChars: number;
  /** Miniatura del modelo elegido, si el formulario la consiguió. */
  photoUrl?: string | null;
  onChange: (value: string) => void;
}

/**
 * Autocompletado de modelos del catálogo, escrito a mano.
 *
 * Reemplaza al par <input list> + <datalist> nativo, que se veía roto sobre
 * esta UI oscura: el desplegable lo dibuja el NAVEGADOR, no la página, así
 * que salía blanco, con la tipografía del sistema y con un ancho que no era
 * el del campo. Ningún CSS puede tocarlo (no hay pseudo-elemento estándar
 * para el popup de un datalist), de ahí que haya que reimplementarlo.
 *
 * Lo que NO cambia respecto del datalist, porque estaba bien y costó llegar:
 * el filtro sigue siendo insensible a mayúsculas y tildes, sigue topeado en
 * 50 opciones, y el catálogo se sigue pidiendo recién a partir de `minChars`.
 *
 * Nunca es un campo cerrado: se puede escribir un modelo que no está en el
 * catálogo y seguir de largo -- los datos del auto se pueden completar a
 * mano, y para muchos autos del mercado uruguayo esa es la única opción.
 */
export function ModelCombobox({
  id,
  label,
  placeholder,
  value,
  options,
  loading,
  minChars,
  photoUrl,
  onChange,
}: ModelComboboxProps) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const blurTimeout = useRef<number | null>(null);
  const listRef = useRef<HTMLUListElement | null>(null);

  const listId = `${id}-listbox`;
  const optionId = (i: number) => `${id}-opt-${i}`;
  const escrito = value.trim();
  const showList = open && options.length > 0;
  // La lista puede achicarse sin que se toque una tecla (llega la respuesta
  // del catálogo y el filtro devuelve menos opciones que antes). Sin este
  // recorte, aria-activedescendant queda apuntando a un id que ya no está en
  // el DOM y el lector de pantalla anuncia una opción fantasma.
  const activo = activeIndex < options.length ? activeIndex : -1;
  // La lista y el cartel de ayuda son excluyentes: un <ul role="listbox"> con
  // un item que no es una opción de verdad le miente al lector de pantalla
  // sobre cuántas opciones hay ("1 de 1" cuando no hay ninguna).
  const ayuda = !open
    ? null
    : loading
      ? t.shared.modelCombobox.searching
      : escrito.length < minChars
        ? t.shared.modelCombobox.minChars(minChars)
        : options.length === 0
          ? t.shared.modelCombobox.noMatches
          : null;

  useEffect(() => {
    if (activo < 0) return;
    // Con hasta 50 opciones la marcada con el teclado se va fuera de la caja
    // enseguida; "nearest" mueve lo mínimo y no zamarrea la página entera.
    // El `?.()`: jsdom no implementa scrollIntoView (no hay layout que
    // scrollear), así que sin esto el componente revienta en los tests --
    // y hacer scroll es un lujo, no una condición para que el campo ande.
    listRef.current?.children[activo]?.scrollIntoView?.({ block: "nearest" });
  }, [activo]);

  useEffect(() => () => {
    if (blurTimeout.current) window.clearTimeout(blurTimeout.current);
  }, []);

  function choose(opcion: string) {
    onChange(opcion);
    setOpen(false);
    setActiveIndex(-1);
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "ArrowDown" && showList) {
      e.preventDefault();
      setActiveIndex((i) => Math.min(options.length - 1, i + 1));
    } else if (e.key === "ArrowUp" && showList) {
      e.preventDefault();
      setActiveIndex((i) => Math.max(0, i - 1));
    } else if (e.key === "Enter" && showList) {
      // Con la lista desplegada, Enter significa "quiero esto", nunca "creá
      // el vehículo": el desplegable está tapando los campos de abajo y el
      // formulario todavía no se llegó a mirar. Sin opción marcada, Enter
      // solo cierra la lista -- y ahí sí el siguiente Enter manda el form.
      e.preventDefault();
      if (activo >= 0) choose(options[activo]);
      else setOpen(false);
    } else if (e.key === "Escape" && open) {
      e.preventDefault();
      setOpen(false);
      setActiveIndex(-1);
    } else if (e.key === "Tab") {
      setOpen(false);
    }
  }

  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      <div className={styles.wrap}>
        <input
          id={id}
          type="text"
          role="combobox"
          autoComplete="off"
          aria-expanded={showList}
          // Solo cuando la lista existe de verdad: aria-controls apuntando a
          // un id que no está en el DOM es una referencia rota, y los
          // validadores de accesibilidad la marcan como error.
          aria-controls={showList ? listId : undefined}
          aria-autocomplete="list"
          aria-activedescendant={activo >= 0 ? optionId(activo) : undefined}
          placeholder={placeholder}
          value={value}
          onChange={(e) => {
            onChange(e.target.value);
            setOpen(true);
            setActiveIndex(-1);
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => {
            // Mismo truco que RouteAutocompleteField: un respiro antes de
            // cerrar, para que un click en una opción llegue a procesarse
            // antes de que el blur le saque la lista de abajo del dedo.
            blurTimeout.current = window.setTimeout(() => {
              setOpen(false);
              setActiveIndex(-1);
            }, 120);
          }}
          onKeyDown={onKeyDown}
        />
        {showList && (
          <ul className={styles.list} id={listId} role="listbox" aria-label={label} ref={listRef}>
            {options.map((option, i) => (
              <li
                key={option}
                id={optionId(i)}
                role="option"
                aria-selected={i === activo}
                className={[styles.item, i === activo ? styles.itemActive : ""].join(" ")}
                onMouseDown={(e) => {
                  // preventDefault antes que nada: sin esto el mousedown le
                  // saca el foco al input y dispara el blur de arriba.
                  e.preventDefault();
                  if (blurTimeout.current) window.clearTimeout(blurTimeout.current);
                  choose(option);
                }}
              >
                {option}
              </li>
            ))}
          </ul>
        )}
      </div>
      {ayuda && <p className={styles.ayuda}>{ayuda}</p>}
      {photoUrl && <img src={photoUrl} className={styles.foto} alt="" />}
    </div>
  );
}
