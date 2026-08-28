import { useEffect, useState } from "react";
import { num } from "../showroom/num";
import { Counter, type PlaceValue } from "../shared/Counter";
import { SpotlightCard } from "../shared/SpotlightCard";
import { useInViewOnce } from "../shared/useInViewOnce";
import styles from "./StatCard.module.css";

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
    <div ref={ref}>
      <SpotlightCard className={styles.card}>
        <div className={styles.valueRow}>
          <span className="sr-only">{`${num(value)}${suffix ?? ""}`}</span>
          <span aria-hidden="true" className={styles.digits}>
            <Counter value={target} places={places} fontSize={22} fontWeight={700} textColor="var(--accent-astar)" fadeBackground="var(--bg-panel)" />
            {suffix && <span className={styles.suffix}>{suffix}</span>}
          </span>
        </div>
        <div className={styles.label}>{label}</div>
      </SpotlightCard>
    </div>
  );
}
