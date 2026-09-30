import "@maplibre/maplibre-gl-leaflet";
import L from "leaflet";

/**
 * Arreglo local de un bug de @maplibre/maplibre-gl-leaflet (0.1.4, la última
 * publicada): `_transitionEnd` -- que corre al terminar una animación de zoom
 * y también en cada `resize` del mapa -- deja programado un callback para el
 * cuadro siguiente que usa `this._map` y `this._glMap` sin fijarse si la capa
 * sigue puesta. Si en ese intervalo se saca la capa (cambio de tema claro/
 * oscuro, entrar al modo navegación, irse de /app), los dos ya son null y
 * revienta con "Cannot read properties of null (reading 'getZoom')". Reportado
 * desde la consola de producción el 30/9/2026.
 *
 * Un try/catch alrededor de `layer.remove()` no lo agarra: el error no pasa
 * adentro de remove(), pasa un cuadro después.
 *
 * Es el mismo cuerpo que el de la librería, con la guarda agregada. La misma
 * guarda va en `_zoomEnd`, que ese callback deja colgado de un "moveend" de
 * MapLibre y tiene el mismo problema.
 */
interface CapaInterna {
  _map: L.Map | null;
  _glMap: {
    _actualCanvas: HTMLElement;
    once: (evento: string, fn: () => void) => void;
    jumpTo: (opts: { center: L.LatLng; zoom: number }) => void;
  } | null;
  _resizeContainer: () => void;
  _zoomEnd: () => void;
}

let aplicado = false;

export function aplicarGuardaMaplibreLeaflet(): void {
  if (aplicado) return;
  aplicado = true;

  const proto = (
    L as unknown as { MaplibreGL: { prototype: CapaInterna & Record<string, unknown> } }
  ).MaplibreGL.prototype;
  const zoomEndOriginal = proto._zoomEnd;

  proto._zoomEnd = function (this: CapaInterna) {
    if (!this._map || !this._glMap) return;
    zoomEndOriginal.call(this);
  };

  proto._transitionEnd = function (this: CapaInterna) {
    L.Util.requestAnimFrame(function (this: CapaInterna) {
      const map = this._map;
      const gl = this._glMap;
      if (!map || !gl) return; // la capa se sacó mientras esperaba el cuadro
      const zoom = map.getZoom();
      const center = map.getCenter();
      const offset = map.latLngToContainerPoint(map.getBounds().getNorthWest());
      this._resizeContainer();
      L.DomUtil.setTransform(gl._actualCanvas, offset, 1);
      gl.once("moveend", () => this._zoomEnd());
      gl.jumpTo({ center, zoom: zoom - 1 });
    }, this);
  };
}
