import { useEffect, useRef, useState, type RefObject } from "react";

export type SheetPosition = "min" | "mid" | "full";

/** Alto de la hoja colapsada: el handle y una línea de resumen, nada más. */
const MIN_PX = 48;
/** Arriba del todo deja ver una franja del mapa, para que se entienda que sigue ahí. */
const FULL_GAP_PX = 8;
const MID_RATIO = 0.6;
/** Menos que esto entre pointerdown y pointerup es un toque, no un arrastre. */
const DRAG_THRESHOLD_PX = 4;

export interface BottomSheet {
  position: SheetPosition;
  setPosition: (p: SheetPosition) => void;
  /** Alto que se dibuja ahora, siguiendo al dedo mientras se arrastra. */
  height: number;
  /** Alto de la posición en la que quedó. El mapa se acomoda a esto y no al
   *  arrastre: redimensionar Leaflet en cada pointermove es caro y no aporta. */
  snappedHeight: number;
  dragging: boolean;
  handleProps: {
    onPointerDown: (e: React.PointerEvent<HTMLElement>) => void;
    onClick: () => void;
  };
}

/**
 * La hoja inferior del panel en pantalla angosta: tres posiciones (mín, medio,
 * completo), arrastre con el dedo que se ajusta a la más cercana, y un toque
 * en el handle que alterna entre mín y medio.
 *
 * Mide el contenedor (el área debajo de la barra superior) con un
 * ResizeObserver: "60 % del alto" tiene que seguir siéndolo cuando el teclado
 * del celular o la barra de direcciones del navegador cambian el alto.
 */
export function useBottomSheet(
  containerRef: RefObject<HTMLElement | null>,
  enabled: boolean
): BottomSheet {
  const [containerH, setContainerH] = useState(0);
  const [position, setPosition] = useState<SheetPosition>("mid");
  const [dragH, setDragH] = useState<number | null>(null);
  // Un arrastre termina con un pointerup que el navegador además entrega como
  // click sobre el mismo handle: sin esto, soltar después de arrastrar también
  // alternaba la posición recién elegida.
  const suppressClick = useRef(false);
  const endDrag = useRef<(() => void) | null>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el || !enabled) return;
    const observer = new ResizeObserver(([entry]) => {
      if (entry) setContainerH(Math.round(entry.contentRect.height));
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [containerRef, enabled]);

  useEffect(() => () => endDrag.current?.(), []);

  const heights: Record<SheetPosition, number> = {
    min: MIN_PX,
    mid: Math.max(MIN_PX, Math.round(containerH * MID_RATIO)),
    full: Math.max(MIN_PX, containerH - FULL_GAP_PX),
  };

  function onPointerDown(e: React.PointerEvent<HTMLElement>) {
    // Si el arrastre anterior terminó afuera del handle, el click que lo iba a
    // consumir nunca llegó: no puede comerse este toque nuevo.
    suppressClick.current = false;
    const startY = e.clientY;
    const startH = heights[position];
    let moved = false;

    const move = (ev: PointerEvent) => {
      const dy = startY - ev.clientY;
      if (Math.abs(dy) > DRAG_THRESHOLD_PX) moved = true;
      if (moved) setDragH(Math.max(heights.min, Math.min(heights.full, startH + dy)));
    };
    const up = (ev: PointerEvent) => {
      endDrag.current?.();
      if (!moved) return;
      const current = Math.max(heights.min, Math.min(heights.full, startH + (startY - ev.clientY)));
      const nearest = (["min", "mid", "full"] as const).reduce((best, k) =>
        Math.abs(heights[k] - current) < Math.abs(heights[best] - current) ? k : best
      );
      suppressClick.current = true;
      setPosition(nearest);
      setDragH(null);
    };

    endDrag.current = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointercancel", up);
      endDrag.current = null;
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    window.addEventListener("pointercancel", up);
  }

  function onClick() {
    if (suppressClick.current) {
      suppressClick.current = false;
      return;
    }
    setPosition((p) => (p === "min" ? "mid" : "min"));
  }

  return {
    position,
    setPosition,
    height: dragH ?? heights[position],
    snappedHeight: heights[position],
    dragging: dragH != null,
    handleProps: { onPointerDown, onClick },
  };
}
