import type { InputHTMLAttributes, ReactNode } from "react";
import styles from "./Checkbox.module.css";

interface CheckboxProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  /** Texto (u otro contenido) al lado del tilde -- va DENTRO del <label> que
      este componente arma, así que clickearlo también tilda: reemplaza al
      Field+Label de Headless UI que envolvía esto en cada pantalla (ver el
      historial de este archivo), gratis con la asociación implícita de
      <label> sobre un <input> real adentro -- sin necesitar id/htmlFor. */
  label: ReactNode;
  /** Va en el <label> raíz -- reemplaza el className que antes recibía el
      Field de cada pantalla (hoy, TripDashboard). */
  className?: string;
  disabled?: boolean;
  "aria-describedby"?: InputHTMLAttributes<HTMLInputElement>["aria-describedby"];
}

/**
 * Checkbox propio, sobre un <input type="checkbox"> REAL -- antes era el
 * Checkbox de @headlessui/react, un <span role="checkbox"> sintético. Se
 * sacó junto con el resto de esa librería: era el 90% del chunk más pesado
 * de toda la app (~326KB comprimidos) y se cargaba en /app
 * aunque solo hiciera falta para este tilde y el selector de vehículo.
 *
 * El tilde en Firefox (antes fallaba con ::after sobre el <input> mismo, con
 * o sin appearance:none) se resuelve sin tocar el <input> para nada: se lo
 * esconde visualmente (clip, NUNCA display:none/visibility:hidden -- eso lo
 * saca del árbol de foco y de lectura de pantalla) y el <svg> del tilde vive
 * en un <span> HERMANO, mostrado con `.input:checked + .box .icon` en
 * Checkbox.module.css. Firefox nunca tuvo problema pintando contenido de un
 * hermano -- el bug viejo era específico de estilizar el propio <input>.
 */
export function Checkbox({ checked, onChange, label, className, disabled, ...rest }: CheckboxProps) {
  return (
    <label className={[styles.row, className].filter(Boolean).join(" ")}>
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
        className={styles.input}
        {...rest}
      />
      <span className={styles.box} aria-hidden="true">
        <svg viewBox="0 0 24 24" className={styles.icon} aria-hidden="true">
          <path d="M20 6 9 17l-5-5" />
        </svg>
      </span>
      {label}
    </label>
  );
}
