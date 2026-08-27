import "@testing-library/jest-dom/vitest";

// jsdom no implementa matchMedia (https://github.com/jsdom/jsdom/issues/3522).
// Shim minimo para que los componentes que respetan prefers-reduced-motion
// (front2.md 3.6) no rompan en tests -- devuelve "no reducido" por defecto.
/**
 * Node 22+ trae sus PROPIOS `localStorage`/`sessionStorage` globales, y son
 * experimentales: sin la bandera `--localstorage-file` valen `undefined`. Como
 * ya existen en globalThis, el entorno jsdom de Vitest no llega a instalar los
 * suyos encima -- resultado: `localStorage.clear()` explota con "Cannot read
 * properties of undefined" en cualquier test que toque la sesion
 * (src/api/session.ts) o el replay de viajes (src/map/useReplayFromHistory.ts,
 * que usa sessionStorage). Depende de la version de Node de cada maquina, asi
 * que en una anda y en otra no.
 *
 * El shim se instala SOLO si falta: con una version de Node donde jsdom gana,
 * este archivo no toca nada. En memoria y por archivo de test alcanza -- es
 * exactamente lo que hace la implementacion de jsdom para lo que estos tests
 * necesitan.
 */
function memoryStorage(): Storage {
  const data = new Map<string, string>();
  return {
    get length() {
      return data.size;
    },
    key: (i) => [...data.keys()][i] ?? null,
    getItem: (k) => data.get(String(k)) ?? null,
    setItem: (k, v) => void data.set(String(k), String(v)),
    removeItem: (k) => void data.delete(String(k)),
    clear: () => data.clear(),
  };
}

for (const nombre of ["localStorage", "sessionStorage"] as const) {
  if (globalThis[nombre]) continue;
  // defineProperty y no una asignacion suelta: el global de Node es un getter
  // de solo lectura, y `globalThis.localStorage = ...` no haria nada.
  Object.defineProperty(globalThis, nombre, {
    value: memoryStorage(),
    configurable: true,
    writable: true,
  });
}

if (typeof window !== "undefined" && !window.matchMedia) {
  window.matchMedia = (query: string): MediaQueryList =>
    ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    }) as MediaQueryList;
}
