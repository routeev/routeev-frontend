import { useEffect, useState } from "react";
import { vehiclePhotoUrl } from "../api/vehicles";

/**
 * Foto privada de un vehículo: se pide con Authorization y se convierte a
 * blob URL (un <img> no puede mandar headers propios). El navegador no
 * libera esas URLs solo -- sin el revoke del cleanup se acumulan en memoria
 * cada vez que la lista se vuelve a montar, que es en cada alta, baja o
 * cambio de foto (ver _photoObjectUrls en js/profile.js).
 */
export function useVehiclePhoto(vehicleId: number, hasPhoto: boolean | undefined) {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!hasPhoto) return;
    let objectUrl: string | null = null;
    let cancelled = false;

    vehiclePhotoUrl(vehicleId).then((resolved) => {
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
  }, [vehicleId, hasPhoto]);

  // Derivado en vez de resetear el estado dentro del efecto: si el vehículo
  // dejó de tener foto, la URL vieja ya fue revocada por el cleanup y no
  // debe mostrarse igual.
  return hasPhoto ? url : null;
}
