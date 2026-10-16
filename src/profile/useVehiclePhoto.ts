import { useQuery } from "@tanstack/react-query";
import { vehiclePhotoUrl } from "../api/vehicles";

export function vehiclePhotoQueryKey(vehicleId: number) {
  return ["vehiclePhoto", vehicleId] as const;
}

/**
 * Foto privada de un vehículo: se pide con Authorization y se convierte a
 * blob URL (un <img> no puede mandar headers propios). Cacheada con React
 * Query (staleTime: Infinity, no cambia sola) en vez de un fetch por
 * useEffect: antes se volvía a pedir y a crear una blob URL nueva en CADA
 * remonte (entrar y salir de /profile), aunque la foto siguiera siendo la
 * misma. Quien sube o borra una foto es responsable de invalidar esta query
 * (y revocar la blob URL vieja) a mano -- ver CarsSection.tsx.
 */
export function useVehiclePhoto(vehicleId: number, hasPhoto: boolean | undefined) {
  const { data } = useQuery({
    queryKey: vehiclePhotoQueryKey(vehicleId),
    queryFn: () => vehiclePhotoUrl(vehicleId),
    enabled: !!hasPhoto,
    staleTime: Infinity,
  });
  return hasPhoto ? (data ?? null) : null;
}
