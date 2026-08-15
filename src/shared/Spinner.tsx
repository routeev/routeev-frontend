import styles from "./Spinner.module.css";

interface SpinnerProps {
  /** Lado del anillo en px. El default es el que entra prolijo en un botón. */
  size?: number;
  className?: string;
}

/**
 * Anillo girando pensado para vivir DENTRO del botón que disparó la acción,
 * al lado de su texto.
 *
 * Es decorativo a propósito (aria-hidden): hasta ahora el único indicio de
 * que algo estaba en vuelo era que la etiqueta del botón cambiaba a
 * "Creando..." -- texto chico, gris, que la persona que reportó el problema
 * no llegaba a ver antes de volver a apretar. El spinner agrega el indicio
 * VISUAL, pero no puede ser el único: quien no ve la pantalla se entera por
 * el aria-busy del botón y por el aviso que se empuja al live region de
 * ToastViewport al terminar. Por eso el texto del botón se sigue cambiando
 * además de mostrar esto -- estado por movimiento solo, nunca.
 */
export function Spinner({ size = 14, className }: SpinnerProps) {
  return (
    <span
      className={[styles.spinner, className].filter(Boolean).join(" ")}
      style={{ width: size, height: size }}
      aria-hidden="true"
    />
  );
}
