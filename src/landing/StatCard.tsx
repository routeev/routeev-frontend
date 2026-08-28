import { useEffect, useState } from "react";
import { num } from "../showroom/num";
import { Counter, type PlaceValue } from "../shared/Counter";
import { SpotlightCard } from "../shared/SpotlightCard";
import { useInViewOnce } from "../shared/useInViewOnce";
import styles from "./StatCard.module.css";

// Mismo breakpoint que ".stats" en LandingPage.module.css (2 columnas en vez
// de 4). Counter.fontSize es un número -- se aplica como px inline, así que
// un media query de CSS no lo puede pisar (y tampoco correspondía forzarlo
// con !important solo para esto). "63.800+" (el número más largo) entra
// holgado a fontSize 28 en una columna de 4, pero se corta en una tarjeta de
// 2 columnas en un celular chico (~124px) -- de ahí el tamaño más chico acá.
function useIsNarrowStat(): boolean {
  const [narrow, setNarrow] = useState(
    () => typeof window !== "undefined" && window.matchMedia("(max-width: 900px)").matches
  );
  useEffect(() => {
    const mql = window.matchMedia("(max-width: 900px)");
    const onChange = () => setNarrow(mql.matches);
    onChange();
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, []);
  return narrow;
}

interface StatCardProps {
  value: number;
  places?: PlaceValue[];
  suffix?: string;
  label: string;
  /** Orden entre hermanas: cada odómetro arranca un poco después que el anterior. */
  index: number;
}

const STAGGER_MS = 120;

export function StatCard({ value, places, suffix, label, index }: StatCardProps) {
  const { ref, inView } = useInViewOnce<HTMLDivElement>();
  const [target, setTarget] = useState(0);
  const narrow = useIsNarrowStat();

  useEffect(() => {
    if (!inView) return;
    const id = window.setTimeout(() => setTarget(value), index * STAGGER_MS);
    return () => window.clearTimeout(id);
  }, [inView, value, index]);

  // El odometro anima digito por digito (nodos de texto separados) y es
  // puramente decorativo -- se oculta de lectores de pantalla y se expone en
  // su lugar el valor final real y estable (no el que va animando), igual
  // que el resto del sitio usa .sr-only (front2.md 1.8).
  return (
    <div ref={ref} className={styles.wrap}>
      <SpotlightCard className={styles.card}>
        <div className={styles.valueRow}>
          <span className="sr-only">{`${num(value)}${suffix ?? ""}`}</span>
          <span aria-hidden="true" className={styles.digits}>
            <Counter
              value={target}
              places={places}
              fontSize={narrow ? 20 : 28}
              fontWeight={700}
              textColor="var(--accent-astar)"
              fadeBackground="var(--bg-panel)"
            />
            {suffix && <span className={styles.suffix}>{suffix}</span>}
          </span>
        </div>
        <div className={styles.label}>{label}</div>
      </SpotlightCard>
    </div>
  );
}
