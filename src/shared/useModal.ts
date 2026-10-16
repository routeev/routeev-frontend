import { useEffect, useRef, type RefObject } from "react";

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Un diálogo modal: el foco arranca en `initialFocus`, da vueltas adentro sin
 * salir a la página tapada, Escape lo cierra, la página de atrás no scrollea,
 * y al cerrarse el foco vuelve a `returnFocus` (o a lo que lo tenía antes).
 */
export function useModal(
  dialogRef: RefObject<HTMLElement | null>,
  onClose: () => void,
  initialFocus: RefObject<HTMLElement | null>,
  returnFocus?: () => HTMLElement | null
) {
  // El último onClose sin volver a correr el efecto (y perder el foco
  // inicial) cada vez que el componente de arriba se re-renderiza.
  const onCloseRef = useRef(onClose);
  const returnRef = useRef(returnFocus);
  useEffect(() => {
    onCloseRef.current = onClose;
    returnRef.current = returnFocus;
  });

  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    initialFocus.current?.focus({ preventScroll: true });

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.stopPropagation();
        onCloseRef.current();
        return;
      }
      const dialog = dialogRef.current;
      if (e.key !== "Tab" || !dialog) return;
      const items = [...dialog.querySelectorAll<HTMLElement>(FOCUSABLE)];
      if (!items.length) return;
      const first = items[0]!;
      const last = items[items.length - 1]!;
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
      const target = returnRef.current?.() ?? previous;
      target?.focus({ preventScroll: true });
    };
    // Solo al abrir y al cerrar: los refs ya llevan lo último.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}
