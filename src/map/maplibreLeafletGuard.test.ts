import L from "leaflet";
import { afterEach, describe, expect, it, vi } from "vitest";
import { aplicarGuardaMaplibreLeaflet } from "./maplibreLeafletGuard";

type Proto = {
  _transitionEnd: (this: unknown) => void;
  _zoomEnd: (this: unknown) => void;
};

function proto(): Proto {
  aplicarGuardaMaplibreLeaflet();
  return (L as unknown as { MaplibreGL: { prototype: Proto } }).MaplibreGL.prototype;
}

/**
 * Corre lo que haya quedado programado para "el cuadro siguiente". Se espía
 * L.Util.requestAnimFrame y no window.requestAnimationFrame: Leaflet guarda
 * su propia referencia a esta última al cargarse, y un espía puesto después
 * no se entera -- el callback nunca corría y los tests pasaban sin probar nada.
 */
function capturarCuadro() {
  const pendientes: (() => void)[] = [];
  vi.spyOn(L.Util, "requestAnimFrame").mockImplementation((fn, ctx) => {
    pendientes.push(() => fn.call(ctx, 0));
    return pendientes.length;
  });
  return Object.assign(() => pendientes.splice(0).forEach((cb) => cb()), { pendientes });
}

afterEach(() => vi.restoreAllMocks());

describe("guarda de maplibre-gl-leaflet", () => {
  it("si la capa se sacó antes del cuadro siguiente, no revienta (el bug de producción)", () => {
    const correrCuadro = capturarCuadro();
    const capa = {
      _map: {} as L.Map | null,
      _glMap: {} as object | null,
      _resizeContainer: vi.fn(),
    };

    proto()._transitionEnd.call(capa);
    // Entre el fin del zoom y el cuadro siguiente: layer.remove().
    capa._map = null;
    capa._glMap = null;

    expect(correrCuadro.pendientes).toHaveLength(1); // el callback de verdad quedó programado
    expect(correrCuadro).not.toThrow();
    expect(capa._resizeContainer).not.toHaveBeenCalled();
  });

  it("con la capa puesta sigue sincronizando MapLibre con Leaflet", () => {
    const correrCuadro = capturarCuadro();
    const gl = { _actualCanvas: document.createElement("canvas"), once: vi.fn(), jumpTo: vi.fn() };
    const center = L.latLng(-34.9, -56.19);
    const map = {
      getZoom: () => 12,
      getCenter: () => center,
      getBounds: () => L.latLngBounds([-35, -56.3], [-34.8, -56.1]),
      latLngToContainerPoint: () => L.point(0, 0),
    };
    const capa = { _map: map, _glMap: gl, _resizeContainer: vi.fn(), _zoomEnd: vi.fn() };

    proto()._transitionEnd.call(capa);
    correrCuadro();

    expect(capa._resizeContainer).toHaveBeenCalled();
    expect(gl.jumpTo).toHaveBeenCalledWith({ center, zoom: 11 });
  });

  it("_zoomEnd tardío (colgado de un moveend de MapLibre) tampoco revienta", () => {
    expect(() => proto()._zoomEnd.call({ _map: null, _glMap: null })).not.toThrow();
  });
});
