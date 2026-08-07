import { useEffect, useRef, useState } from "react";
import type { PhotoCredit, PhotoLookup } from "../api/showroom";
import { getPhoto, observePhoto } from "./photoQueue";

/**
 * Resuelve la foto de un modelo: si ya vino precargada del catálogo
 * (`model.foto_url`, ver GET /api/showroom/models) se usa directo; si no,
 * se pide ansiosa (tarjetas de la primera pantalla, la ficha) o recién
 * cuando el elemento referenciado entra en viewport (el resto del grid).
 */
export function useModelPhoto(nombre: string, eager: boolean, precached?: { url: string; credito?: PhotoCredit }) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [photo, setPhoto] = useState<PhotoLookup | null>(
    precached ? { encontrada: true, url: precached.url, credito: precached.credito } : null
  );

  useEffect(() => {
    if (precached || !nombre) return;
    if (eager) {
      let cancelled = false;
      getPhoto(nombre).then((meta) => {
        if (!cancelled) setPhoto(meta);
      });
      return () => {
        cancelled = true;
      };
    }
    const el = ref.current;
    if (!el) return;
    return observePhoto(el, nombre, setPhoto);
    // precached es estable por identidad de objeto solo si el llamador lo memoiza;
    // acá alcanza con su url, que es lo único que decide la rama "ya resuelta".
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nombre, eager, precached?.url]);

  return { ref, photo };
}
