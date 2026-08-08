import "@testing-library/jest-dom/vitest";

// jsdom no implementa matchMedia (https://github.com/jsdom/jsdom/issues/3522).
// Shim minimo para que los componentes que respetan prefers-reduced-motion
// (front2.md 3.6) no rompan en tests -- devuelve "no reducido" por defecto.
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
