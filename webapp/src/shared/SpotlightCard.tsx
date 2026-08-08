import { useRef, useState, type PropsWithChildren, type CSSProperties } from "react";
import styles from "./SpotlightCard.module.css";

// Portado de react-bits (https://reactbits.dev/components/spotlight-card,
// MIT): glow radial que sigue al mouse dentro de la card. Sin dependencia de
// animacion -- es CSS + estado de React, igual que el original. Color por
// defecto en --accent-astar (front2.md: "cian = foco/primario"), asi el
// spotlight refuerza la misma regla semantica en vez de agregar una nueva.
interface SpotlightCardProps extends PropsWithChildren {
  className?: string;
  /** rgba() completo; por defecto, --accent-astar (#34e3a8) con alpha bajo. */
  spotlightColor?: string;
}

export function SpotlightCard({ children, className = "", spotlightColor = "rgba(52, 227, 168, 0.16)" }: SpotlightCardProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const [opacity, setOpacity] = useState(0);

  function onMouseMove(e: React.MouseEvent<HTMLDivElement>) {
    const rect = ref.current?.getBoundingClientRect();
    if (!rect) return;
    setPos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
  }

  const spotlightStyle: CSSProperties = {
    opacity,
    background: `radial-gradient(circle at ${pos.x}px ${pos.y}px, ${spotlightColor}, transparent 70%)`,
  };

  return (
    <div
      ref={ref}
      className={[styles.card, className].filter(Boolean).join(" ")}
      onMouseMove={onMouseMove}
      onMouseEnter={() => setOpacity(1)}
      onMouseLeave={() => setOpacity(0)}
      onFocus={() => setOpacity(1)}
      onBlur={() => setOpacity(0)}
    >
      <div className={styles.spotlight} style={spotlightStyle} aria-hidden="true" />
      {children}
    </div>
  );
}
