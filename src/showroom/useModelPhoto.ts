import { useEffect, useRef, useState } from "react";
import type { PhotoCredit, PhotoLookup } from "../api/showroom";
import { observePhoto, solicitarFoto } from "./photoQueue";

/**
 * Resuelve la foto de un modelo: si ya vino precargada del catálogo
 * (`model.foto_url`, ver GET /api/showroom/models) se usa directo -- se
 * deriva en cada render, no vía efecto+estado, porque es un dato que ya
 * tenemos completo (no algo que sincronizar con un sistema externo). Sin
 * eso, la ficha (que recibe el modelo de su propio useQuery, no como prop
 * ya lista como ModelCard) mostraba "sin foto" para siempre: en el primer
 * render `precached` todavía es undefined, y un estado inicializado una
 * sola vez en el montaje no se vuelve a sincronizar solo cuando el fetch
 * termina.
 *
 * Si no hay precache, se pide ansiosa (tarjetas de la primera pantalla, la
 * ficha) o recién cuando el elemento referenciado entra en viewport (el
 * resto del grid).
 */
export function useModelPhoto(
  nombre: string,
  eager: boolean,
  precached?: { url: string; credito?: PhotoCredit }
) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [fetchedPhoto, setFetchedPhoto] = useState<PhotoLookup | null>(null);

  useEffect(() => {
    if (precached || !nombre) return;
    // El que devuelve solicitarFoto cancela el pedido si todavía no salió.
    if (eager) return solicitarFoto(nombre, setFetchedPhoto);
    const el = ref.current;
    if (!el) return;
    return observePhoto(el, nombre, setFetchedPhoto);
    // precached es estable por identidad de objeto solo si el llamador lo memoiza;
    // acá alcanza con su url, que es lo único que decide si hace falta pedirla.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nombre, eager, precached?.url]);

  const photo: PhotoLookup | null = precached
    ? { encontrada: true, url: precached.url, credito: precached.credito }
    : fetchedPhoto;

  return { ref, photo };
}
