import { Checkbox as HeadlessCheckbox } from "@headlessui/react";
import styles from "./Checkbox.module.css";

interface CheckboxProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  "aria-describedby"?: string;
}

/**
 * Checkbox propio sobre @headlessui/react en vez de un <input type="checkbox">
 * a mano: Checkbox de Headless UI renderiza un <span role="checkbox"> real,
 * asi que el tilde es un <svg> hijo de verdad (el ícono "Check" de Lucide,
 * lucide.dev) en vez de contenido generado con ::after sobre un <input> --
 * eso ultimo es lo que se probo antes y Firefox nunca lo dibuja, con o sin
 * appearance: none.
 *
 * Se usa junto con Field + Label de Headless UI en cada pantalla (no acá:
 * el wrapper visual -- fila simple, chip, toggle chico -- difiere por caso,
 * ver SimulationForm/SearchControls/TripDashboard): un <span role="checkbox">
 * no tiene la asociación nativa de <label for>, Field es lo que hace que
 * clickear el texto también tilde.
 */
export function Checkbox({ checked, onChange, ...rest }: CheckboxProps) {
  return (
    <HeadlessCheckbox checked={checked} onChange={onChange} className={styles.checkbox} {...rest}>
      {/* Siempre en el DOM, visible solo via [data-checked] (ver Checkbox.module.css)
          -- Checkbox de Headless UI tipa la funcion de children para que
          siempre devuelva un elemento, no boolean | elemento, asi que
          esconderlo con un `checked &&` corto-circuito no tipa. */}
      <svg viewBox="0 0 24 24" className={styles.icon} aria-hidden="true">
        <path d="M20 6 9 17l-5-5" />
      </svg>
    </HeadlessCheckbox>
  );
}
