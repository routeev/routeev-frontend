import { useQuery } from "@tanstack/react-query";
import { stationReviewPhotoUrl } from "../api/stationReviews";

export function stationReviewPhotoQueryKey(reviewId: number) {
  return ["stationReviewPhoto", reviewId] as const;
}

/**
 * Foto privada de una reseña de estacion: se pide con Authorization y se
 * convierte a blob URL (un <img> no puede mandar headers propios). Cacheada
 * con React Query (staleTime: Infinity, no cambia sola) en vez de un fetch
 * por useEffect -- mismo motivo que useVehiclePhoto.ts: sin esto se volvía a
 * pedir y a crear una blob URL nueva en CADA remonte (entrar y salir del
 * detalle de la estación), aunque la foto siguiera siendo la misma. Quien
 * sube o borra la foto propia es responsable de invalidar esta query (y
 * revocar la blob URL vieja) a mano -- ver StationReviews.tsx.
 */
export function useStationReviewPhoto(reviewId: number, hasPhoto: boolean | undefined) {
  const { data } = useQuery({
    queryKey: stationReviewPhotoQueryKey(reviewId),
    queryFn: () => stationReviewPhotoUrl(reviewId),
    enabled: !!hasPhoto && reviewId > 0,
    staleTime: Infinity,
  });
  return hasPhoto ? (data ?? null) : null;
}
