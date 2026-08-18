import type { CSSProperties } from "react";
import { useTranslation } from "../i18n/LanguageProvider";
import styles from "./Stars.module.css";

const STAR_PATH =
  "M12 2.5l2.9 6.3 6.9.7-5.2 4.7 1.5 6.8L12 17.6 5.9 21l1.5-6.8L2.2 9.5l6.9-.7L12 2.5Z";

interface StarsProps {
  /** 0-5, puede ser fraccional (un promedio) -- se redondea a la estrella entera mas cercana para pintar. */
  value: number;
  size?: number;
}

/** Estrellas de solo lectura, para mostrar un promedio ya calculado. */
export function Stars({ value, size = 14 }: StarsProps) {
  const { t } = useTranslation();
  const filledCount = Math.round(Math.max(0, Math.min(5, value)));
  return (
    <span
      className={styles.stars}
      style={{ "--star-size": `${size}px` } as CSSProperties}
      aria-label={t.map.stars.ratingLabel(value.toFixed(1))}
    >
      {Array.from({ length: 5 }, (_, i) => (
        <svg
          key={i}
          viewBox="0 0 24 24"
          aria-hidden="true"
          className={i < filledCount ? `${styles.star} ${styles.filled}` : styles.star}
        >
          <path d={STAR_PATH} />
        </svg>
      ))}
    </span>
  );
}

interface StarPickerProps {
  value: number;
  onChange: (value: number) => void;
  size?: number;
}

/** Estrellas clickeables, para que el usuario elija su valoracion (1-5). */
export function StarPicker({ value, onChange, size = 26 }: StarPickerProps) {
  const { t } = useTranslation();
  return (
    <span className={styles.picker} style={{ "--star-size": `${size}px` } as CSSProperties}>
      {Array.from({ length: 5 }, (_, i) => {
        const n = i + 1;
        return (
          <button
            key={n}
            type="button"
            className={styles.pickerBtn}
            aria-label={t.map.stars.starLabel(n)}
            aria-pressed={value === n}
            onClick={() => onChange(n)}
          >
            <svg
              viewBox="0 0 24 24"
              aria-hidden="true"
              className={n <= value ? `${styles.star} ${styles.filled}` : styles.star}
            >
              <path d={STAR_PATH} />
            </svg>
          </button>
        );
      })}
    </span>
  );
}
