import { showroomImage, type PhotoLookup } from "../api/showroom";

/**
 * Cola de fotos con concurrencia limitada, portada de js/showroom.js
 * (foto/bombear). Cada nombre que no está todavía en caché termina en una
 * consulta a Wikimedia por detrás (ver showroom_images.py); pedirlas de a
 * pocas evita que quien filtra rápido dispare 24 pedidos en ráfaga.
 */
const FOTOS_EN_PARALELO = 2;

const cache = new Map<string, Promise<PhotoLookup>>();
const pendientes: { tarea: () => Promise<PhotoLookup>; resolve: (v: PhotoLookup) => void }[] = [];
let enVuelo = 0;

function bombear() {
  while (enVuelo < FOTOS_EN_PARALELO && pendientes.length) {
    const item = pendientes.shift()!;
    enVuelo++;
    item
      .tarea()
      .catch((): PhotoLookup => ({ encontrada: false }))
      .then((valor) => {
        enVuelo--;
        item.resolve(valor);
        bombear();
      });
  }
}

export function getPhoto(nombre: string): Promise<PhotoLookup> {
  let p = cache.get(nombre);
  if (!p) {
    p = new Promise<PhotoLookup>((resolve) => {
      pendientes.push({ tarea: () => showroomImage(nombre), resolve });
      bombear();
    });
    cache.set(nombre, p);
  }
  return p;
}

// Una sola instancia de IntersectionObserver para todas las tarjetas: crear
// un observer por tarjeta multiplica el trabajo del navegador en cada scroll.
let observer: IntersectionObserver | null = null;
const callbacks = new WeakMap<Element, (meta: PhotoLookup) => void>();
const names = new WeakMap<Element, string>();

function getObserver(): IntersectionObserver {
  observer ??= new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        observer!.unobserve(entry.target);
        const cb = callbacks.get(entry.target);
        const nombre = names.get(entry.target);
        callbacks.delete(entry.target);
        names.delete(entry.target);
        if (cb && nombre) getPhoto(nombre).then(cb);
      }
    },
    { rootMargin: "200px" }
  );
  return observer;
}

/** Pide la foto cuando `el` entra en viewport. Devuelve una función de limpieza. */
export function observePhoto(el: Element, nombre: string, cb: (meta: PhotoLookup) => void): () => void {
  names.set(el, nombre);
  callbacks.set(el, cb);
  const obs = getObserver();
  obs.observe(el);
  return () => {
    obs.unobserve(el);
    callbacks.delete(el);
    names.delete(el);
  };
}
