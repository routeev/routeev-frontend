import type { StationReviewSummary } from "../api/stationReviews";
import { Stars } from "./Stars";
import styles from "./RatingSummary.module.css";

interface RatingSummaryProps {
  summary: StationReviewSummary | undefined;
  size?: number;
  /** Compacto: "(N)" en vez de "4.3 · N reseñas" -- para donde el espacio es chico (fila de la lista). */
  compact?: boolean;
}

export function RatingSummary({ summary, size = 12, compact = false }: RatingSummaryProps) {
  if (!summary || summary.count === 0 || summary.avg_rating == null) return null;
  return (
    <span className={styles.wrap}>
      <Stars value={summary.avg_rating} size={size} />
      <span className={styles.text}>
        {compact
          ? `(${summary.count})`
          : `${summary.avg_rating.toFixed(1)} · ${summary.count} ${summary.count === 1 ? "reseña" : "reseñas"}`}
      </span>
    </span>
  );
}
