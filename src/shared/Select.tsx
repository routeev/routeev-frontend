import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
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
 * Select del proyecto, escrito a mano -- reemplaza al Listbox de
 * @headlessui/react. Esa librería no separa sus componentes en imports
 * independientes (un solo `headlessui.esm.js`, ver su package.json): usar
 * SOLO Listbox acá igual bajaba el paquete entero, 1.2MB / 326KB
 * comprimidos -- más que el resto de la app junta -- y en la pantalla más
 * visitada (VehiclePanel vive en /app, no en una ruta lazy aparte).
 *
 * Reemplaza al <select> nativo por el motivo que ya decía el comentario
 * viejo: su desplegable lo dibuja el sistema operativo, sin forma de
 * seguir los tokens del proyecto.
 *
 * El truco de accesibilidad es el mismo que ya usa ModelCombobox.tsx (mismo
 * repo, mismo patrón, ya probado): el foco NUNCA se mueve del <button>
 * disparador, ni con el panel abierto -- la opción "resaltada" con el
 * teclado se comunica con aria-activedescendant, no moviendo el foco de
 * verdad. Eso evita manejar blur/foco cruzando el portal (el panel vive en
 * document.body, del otro lado del árbol de React) y hace que "afuera ==
 * blur del botón" sea literalmente el cierre por click afuera, sin un
 * listener aparte en document. El único cuidado, igual que en
 * ModelCombobox: un click en una opción tiene que evitar el blur del botón
 * con preventDefault() en el mousedown, antes de que el navegador mueva el
 * foco solo.
 *
 * El panel se porta a document.body (createPortal) y no queda adentro de
 * este árbol: dos de estos viven en paneles con overflow propio (el
 * sidebar de /app, ver .sidebarScroll en MapPage.module.css), donde un
 * panel absoluto quedaría recortado.
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
  const [open, setOpen] = useState(false);
  const [highlighted, setHighlighted] = useState(0);
  const [pos, setPos] = useState<{ top: number; left: number; width: number } | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  // Prefijo único para los ids de las opciones -- useId y no `id` (la prop):
  // `id` es opcional (VehiclePanel/SearchControls lo pasan porque tienen un
  // <label htmlFor> propio, pero no es un requisito de este componente).
  const baseId = useId();
  const listboxId = `${baseId}-listbox`;
  const optionId = (i: number) => `${baseId}-opt-${i}`;

  const current = options.find((o) => o.value === value);

  function openDropdown() {
    if (disabled || options.length === 0 || !triggerRef.current) return;
    // position:fixed abajo, así que coordenadas de viewport directas --
    // nunca hace falta sumar window.scrollX/Y.
    const r = triggerRef.current.getBoundingClientRect();
    setPos({ top: r.bottom + 6, left: r.left, width: r.width });
    const idx = options.findIndex((o) => o.value === value);
    setHighlighted(idx >= 0 ? idx : 0);
    setOpen(true);
  }

  function closeDropdown() {
    setOpen(false);
  }

  function selectIndex(i: number) {
    const opt = options[i];
    if (!opt) return;
    onChange(opt.value);
    closeDropdown();
  }

  // Reposicionar (no cerrar) ante cualquier scroll/resize mientras está
  // abierto -- en /app este botón vive en .sidebarScroll (un contenedor con
  // su propio scroll), así que hace falta capture:true para enterarse de
  // ESE scroll y no solo del de window. Probado en vivo: cerrar acá (la
  // primera versión) tenía un falso positivo real -- el mapa (Leaflet/
  // MapLibre) dispara sus propios eventos de scroll/resize al re-renderizar
  // (invalidateSize y similares), sin que la persona haya tocado nada, y
  // eso cerraba el panel solo. Recalcular la posición es correcto en los
  // dos casos: si fue un scroll de verdad, sigue al botón; si fue ruido del
  // mapa, el rect no cambió y no se nota.
  useEffect(() => {
    if (!open) return;
    function reposition() {
      if (!triggerRef.current) return;
      const r = triggerRef.current.getBoundingClientRect();
      setPos({ top: r.bottom + 6, left: r.left, width: r.width });
    }
    window.addEventListener("scroll", reposition, true);
    window.addEventListener("resize", reposition);
    return () => {
      window.removeEventListener("scroll", reposition, true);
      window.removeEventListener("resize", reposition);
    };
  }, [open]);

  function onKeyDown(e: React.KeyboardEvent<HTMLButtonElement>) {
    if (disabled) return;
    if (!open) {
      if (e.key === "ArrowDown" || e.key === "ArrowUp" || e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        openDropdown();
      }
      return;
    }
    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setHighlighted((h) => Math.min(options.length - 1, h + 1));
        break;
      case "ArrowUp":
        e.preventDefault();
        setHighlighted((h) => Math.max(0, h - 1));
        break;
      case "Home":
        e.preventDefault();
        setHighlighted(0);
        break;
      case "End":
        e.preventDefault();
        setHighlighted(options.length - 1);
        break;
      case "Enter":
      case " ":
        e.preventDefault();
        selectIndex(highlighted);
        break;
      case "Escape":
        e.preventDefault();
        closeDropdown();
        break;
      case "Tab":
        // No preventDefault: el tab tiene que seguir de largo al siguiente
        // campo, solo cerramos el panel para que no quede huérfano.
        closeDropdown();
        break;
    }
  }

  return (
    <div className={[styles.root, className].filter(Boolean).join(" ")}>
      <button
        ref={triggerRef}
        id={id}
        type="button"
        className={styles.trigger}
        disabled={disabled}
        data-open={open || undefined}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listboxId : undefined}
        aria-activedescendant={open && options[highlighted] ? optionId(highlighted) : undefined}
        onClick={() => (open ? closeDropdown() : openDropdown())}
        onKeyDown={onKeyDown}
        onBlur={closeDropdown}
      >
        <span className={styles.label}>{current?.label ?? placeholder ?? ""}</span>
        <IconChevronDown />
      </button>
      {open &&
        pos &&
        createPortal(
          <ul
            id={listboxId}
            role="listbox"
            className={styles.dropdown}
            style={{ position: "fixed", top: pos.top, left: pos.left, width: pos.width }}
          >
            {options.map((o, i) => (
              <li
                key={String(o.value)}
                id={optionId(i)}
                role="option"
                aria-selected={o.value === value}
                className={[styles.option, i === highlighted ? styles.optionActive : "", o.value === value ? styles.optionSelected : ""]
                  .filter(Boolean)
                  .join(" ")}
                onMouseEnter={() => setHighlighted(i)}
                onMouseDown={(e) => {
                  // preventDefault antes que nada: sin esto el mousedown le
                  // saca el foco al botón (está del otro lado del portal) y
                  // el onBlur de arriba cierra el panel ANTES de que el
                  // click en la opción llegue a procesarse. Mismo truco que
                  // ModelCombobox.tsx.
                  e.preventDefault();
                  selectIndex(i);
                }}
              >
                {o.label}
              </li>
            ))}
          </ul>,
          document.body
        )}
    </div>
  );
}
