import { useEffect } from "react";
import { useToastStore, type Toast } from "./toastStore";
import styles from "./ToastViewport.module.css";

/**
 * El único live region de la app, montado una sola vez desde App.tsx.
 *
 * Antes de esto no había NADA que confirmara que una acción había terminado:
 * ni toast, ni overlay, ni aria-live en todo src/. El único indicio era que
 * el botón se re-habilitaba y su texto volvía de "Creando..." a "Crear
 * vehículo" -- invisible para un lector de pantalla, y casi invisible para
 * cualquiera que en ese medio segundo estuviera mirando otra parte de la
 * pantalla (que es exactamente lo que pasa mientras se espera algo).
 *
 * role="status" + aria-live="polite" en el CONTENEDOR, no en cada aviso: el
 * live region tiene que existir en el DOM desde antes de que aparezca el
 * texto, o el lector de pantalla no tiene qué observar y no anuncia nada. Por
 * eso el <div> se renderiza siempre, aunque esté vacío.
 */
export function ToastViewport() {
  const toasts = useToastStore((s) => s.toasts);

  return (
    <div className={styles.viewport} role="status" aria-live="polite">
      {toasts.map((t) => (
        <ToastRow key={t.id} toast={t} />
      ))}
    </div>
  );
}

function ToastRow({ toast }: { toast: Toast }) {
  const dismiss = useToastStore((s) => s.dismiss);
  const esError = toast.variant === "error";

  useEffect(() => {
    const timer = window.setTimeout(() => dismiss(toast.id), toast.duration);
    return () => window.clearTimeout(timer);
  }, [toast.id, toast.duration, dismiss]);

  return (
    <div className={[styles.toast, esError ? styles.error : styles.ok].join(" ")}>
      {/* El ícono no es decoración: el color del borde no puede ser lo único
          que distinga "salió bien" de "salió mal" (daltonismo, monitores
          malos, y el propio dark mode que aplana los contrastes). */}
      <span className={styles.icon} aria-hidden="true">
        {esError ? "!" : "✓"}
      </span>
      <p className={styles.message}>{toast.message}</p>
      <button type="button" className={styles.close} onClick={() => dismiss(toast.id)}>
        <span aria-hidden="true">&times;</span>
        <span className="sr-only">Cerrar este aviso</span>
      </button>
    </div>
  );
}
