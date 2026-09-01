import { Listbox, ListboxButton, ListboxOption, ListboxOptions } from "@headlessui/react";
import { IconChevronDown } from "./NavIcons";
import styles from "./Select.module.css";

export interface SelectOption<T> {
  value: T;
  label: string;
}

interface SelectProps<T> {
  value: T | null;
  onChange: (value: T) => void;
  options: SelectOption<T>[];
  /** Texto del gatillo cuando no hay nada elegido (o la lista está vacía). */
  placeholder?: string;
  disabled?: boolean;
  /** Para el <label htmlFor> de la pantalla; <button> es labelable, igual que <select>. */
  id?: string;
  /** Va en la raíz. Ver Select.module.css: los ajustes por pantalla (ancho,
      fondo, tamaño de letra) se pasan como custom properties, no pisando
      selectores de adentro. */
  className?: string;
}

/**
 * Select del proyecto, sobre Listbox de @headlessui/react.
 *
 * Listbox y no Menu (role="listbox"/"option" en vez de "menu"/"menuitem"):
 * acá se elige un VALOR, no se dispara una acción -- es lo que hace que un
 * lector de pantalla lo anuncie como un select y lea "opción 2 de 5,
 * seleccionada".
 *
 * Reemplaza al <select> nativo, cuyo desplegable lo dibuja el sistema
 * operativo: no había forma de que siguiera los tokens del proyecto (fondo,
 * borde, --accent-astar en la opción activa) y se veía distinto en cada SO.
 * El panel repite el mismo lenguaje que los otros desplegables de la app
 * (LanguageSwitcher, el chip de usuario de AppTopbar): --bg-panel-raised,
 * --shadow-float, opción activa en --accent-astar.
 *
 * `anchor` posiciona el panel con un portal al body en vez de un
 * position:absolute adentro del contenedor -- necesario porque dos de estos
 * viven dentro de paneles con overflow propio (el sidebar de /app, ver
 * .sidebarScroll), donde un panel absoluto quedaría recortado.
 */
export function Select<T extends string | number>({
  value,
  onChange,
  options,
  placeholder,
  disabled,
  id,
  className,
}: SelectProps<T>) {
  const current = options.find((o) => o.value === value);

  return (
    // `?? undefined`: la prop acepta null porque es lo que tienen los stores
    // (selectedVehicleId: number | null), pero Listbox tipa "sin elegir" como
    // undefined.
    <Listbox value={value ?? undefined} onChange={onChange} disabled={disabled}>
      <div className={[styles.root, className].filter(Boolean).join(" ")}>
        <ListboxButton id={id} className={styles.trigger}>
          <span className={styles.label}>{current?.label ?? placeholder ?? ""}</span>
          <IconChevronDown />
        </ListboxButton>
        <ListboxOptions anchor="bottom start" className={styles.dropdown}>
          {options.map((o) => (
            <ListboxOption key={String(o.value)} value={o.value} className={styles.option}>
              {o.label}
            </ListboxOption>
          ))}
        </ListboxOptions>
      </div>
    </Listbox>
  );
}
