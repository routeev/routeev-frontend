import { useEffect, useState } from "react";
import { stationReviewPhotoUrl } from "../api/stationReviews";

/**
 * Foto privada de una reseña de estacion: se pide con Authorization y se
 * convierte a blob URL (un <img> no puede mandar headers propios). Mismo
 * patron que useVehiclePhoto.ts -- ver ese archivo para el porque del
 * revoke en el cleanup.
 */
export function useStationReviewPhoto(reviewId: number, hasPhoto: boolean | undefined) {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!hasPhoto) return;
    let objectUrl: string | null = null;
    let cancelled = false;

    stationReviewPhotoUrl(reviewId).then((resolved) => {
      if (cancelled) {
        if (resolved) URL.revokeObjectURL(resolved);
        return;
      }
      objectUrl = resolved;
      setUrl(resolved);
    });

    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [reviewId, hasPhoto]);

  return hasPhoto ? url : null;
}
