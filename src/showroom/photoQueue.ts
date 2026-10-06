import { showroomImage, type PhotoLookup } from "../api/showroom";

/**
 * Cola de fotos con concurrencia limitada, portada de js/showroom.js
 * (foto/bombear). Cada nombre que no está todavía en caché termina en una
 * consulta a Wikimedia por detrás (ver showroom_images.py); pedirlas de a
 * pocas evita que quien filtra rápido dispare 24 pedidos en ráfaga.
 *
 * Por qué 2 y no más: esas búsquedas ya se serializan en el SERVIDOR (un lock
 * y un intervalo mínimo entre salidas a Wikimedia, ver _NET_LOCK), así que
 * subir esto no las hace más rápidas -- solo apila pedidos en la cola del
 * servidor, donde no se pueden cancelar. Con 2 siempre hay una en curso y otra
 * esperando su turno, y todo lo demás espera acá, donde SÍ se puede descartar.
 *
 * Eso es lo que resuelve la cancelación: una búsqueda en frío tarda ~3 s, así
 * que una cola con 8 pedidos son ~12 s. Si esos pedidos eran de tarjetas que
 * ya no están (se cambió el filtro, se hizo scroll de largo), las fotos de lo
 * que la persona SÍ está mirando esperaban detrás de ellos. Un pedido que
 * todavía no salió y ya no le interesa a nadie se descarta; uno ya en vuelo
 * termina igual (el servidor lo guarda, la próxima visita lo encuentra).
 */
const FOTOS_EN_PARALELO = 2;

interface Pedido {
  resolver: (v: PhotoLookup) => void;
  /** Cuántas tarjetas esperan este nombre y no cancelaron. */
  interesados: number;
}

// Una promesa por nombre, para siempre en esta visita: pedir dos veces el
// mismo auto (dos tarjetas, o la tarjeta y su ficha) sale una sola vez.
const cache = new Map<string, Promise<PhotoLookup>>();
// Los que todavía NO salieron, en orden de llegada. Map y no array para poder
// sacar uno por nombre cuando se cancela.
const pendientes = new Map<string, Pedido>();
let enVuelo = 0;

function bombear() {
  while (enVuelo < FOTOS_EN_PARALELO && pendientes.size) {
    const [nombre, pedido] = pendientes.entries().next().value!;
    pendientes.delete(nombre);
    enVuelo++;
    showroomImage(nombre)
      .catch((): PhotoLookup => ({ encontrada: false }))
      .then((valor) => {
        enVuelo--;
        pedido.resolver(valor);
        bombear();
      });
  }
}

/**
 * Pide la foto de `nombre` y avisa con `alResolver` cuando llega. Devuelve la
 * función para cancelar: si el pedido todavía no salió y no queda nadie más
 * esperándolo, se descarta; si ya salió, cancelar solo evita el aviso.
 */
export function solicitarFoto(nombre: string, alResolver: (meta: PhotoLookup) => void): () => void {
  let promesa = cache.get(nombre);
  if (!promesa) {
    promesa = new Promise<PhotoLookup>((resolver) => {
      pendientes.set(nombre, { resolver, interesados: 0 });
    });
    cache.set(nombre, promesa);
  }
  // undefined cuando ya salió (o ya llegó): nada que contar ni que cancelar.
  const pedido = pendientes.get(nombre);
  if (pedido) pedido.interesados++;

  let activo = true;
  void promesa.then((meta) => {
    if (activo) alResolver(meta);
  });
  bombear();

  return () => {
    if (!activo) return;
    activo = false;
    if (!pedido) return;
    pedido.interesados--;
    if (pedido.interesados === 0 && pendientes.get(nombre) === pedido) {
      pendientes.delete(nombre);
      // También del caché: esa promesa nunca se va a resolver, y la próxima
      // tarjeta que pida este nombre tiene que poder volver a pedirlo.
      cache.delete(nombre);
    }
  };
}

// Una sola instancia de IntersectionObserver para todas las tarjetas: crear
// un observer por tarjeta multiplica el trabajo del navegador en cada scroll.
let observer: IntersectionObserver | null = null;

interface Observada {
  nombre: string;
  alResolver: (meta: PhotoLookup) => void;
  /** Cancelación del pedido en curso; null mientras la tarjeta no lo hizo. */
  cancelar: (() => void) | null;
}
const observadas = new WeakMap<Element, Observada>();

function getObserver(): IntersectionObserver {
  observer ??= new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        const el = entry.target;
        const obs = observadas.get(el);
        if (!obs) continue;
        if (entry.isIntersecting) {
          if (obs.cancelar) continue;
          obs.cancelar = solicitarFoto(obs.nombre, (meta) => {
            // Ya tiene su foto: no hace falta seguir mirándola.
            observer?.unobserve(el);
            observadas.delete(el);
            obs.alResolver(meta);
          });
        } else if (obs.cancelar) {
          // Salió de pantalla antes de que le llegara el turno (scroll largo):
          // su pedido ya no sirve. Si vuelve a entrar, se vuelve a pedir.
          obs.cancelar();
          obs.cancelar = null;
        }
      }
    },
    { rootMargin: "200px" }
  );
  return observer;
}

/** Pide la foto cuando `el` entra en viewport. Devuelve una función de limpieza. */
export function observePhoto(el: Element, nombre: string, alResolver: (meta: PhotoLookup) => void): () => void {
  observadas.set(el, { nombre, alResolver, cancelar: null });
  const obs = getObserver();
  obs.observe(el);
  return () => {
    obs.unobserve(el);
    observadas.get(el)?.cancelar?.();
    observadas.delete(el);
  };
}
