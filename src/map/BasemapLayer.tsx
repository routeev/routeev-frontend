// La libreria no exporta nada para usar: se importa por su efecto, que es
// colgarle `L.maplibreGL(...)` al Leaflet ya cargado (y, del lado del tipado,
// declararlo dentro del modulo "leaflet").
import "@maplibre/maplibre-gl-leaflet";
import L from "leaflet";
import { useEffect } from "react";
import { useMap } from "react-leaflet";
import { BASEMAP_ATTRIBUTION, BASEMAP_STYLE_URL } from "./basemap";

/**
 * Mapa base de los mapas de Leaflet (MapCanvas y SimulationMap).
 *
 * No es un `<TileLayer>` de imagenes PNG como antes: OpenFreeMap sirve vector
 * tiles, asi que quien los dibuja es MapLibre GL -- el mismo motor que ya usa
 * el modo navegacion (NavigationMap.tsx) -- montado como una capa mas de
 * Leaflet. Todo lo demas del mapa (marcadores, recorridos, popups, clicks)
 * sigue siendo Leaflet puro: la capa se dibuja en el "tilePane", debajo de
 * todas las capas de overlay, exactamente donde estaba el TileLayer.
 */
export function BasemapLayer() {
  const map = useMap();

  useEffect(() => {
    const layer = L.maplibreGL({
      style: BASEMAP_STYLE_URL,
      // El plugin apaga el control de atribucion propio de MapLibre (que se
      // dibujaria sobre el canvas, encima del de Leaflet) y usa este texto
      // para el de Leaflet, el unico que queda a la vista.
      attributionControl: { customAttribution: BASEMAP_ATTRIBUTION },
    });
    layer.addTo(map);
    return () => {
      layer.remove();
    };
  }, [map]);

  return null;
}
