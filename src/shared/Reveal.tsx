import type { ReactNode } from "react";
import { useInViewOnce } from "./useInViewOnce";
import styles from "./Reveal.module.css";

interface RevealProps {
  children: ReactNode;
  /** Índice entre hermanos, para el stagger de 60ms (front2.md 3.4). */
  index?: number;
  className?: string;
  id?: string;
}

export function Reveal({ children, index = 0, className, id }: RevealProps) {
  const { ref, inView } = useInViewOnce<HTMLDivElement>();
  return (
    <div
      ref={ref}
      id={id}
      className={[styles.reveal, inView ? styles.visible : "", className].filter(Boolean).join(" ")}
      style={{ transitionDelay: `${index * 60}ms` }}
    >
      {children}
    </div>
  );
}
