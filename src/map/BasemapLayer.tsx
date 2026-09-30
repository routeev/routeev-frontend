// La libreria no exporta nada para usar: se importa por su efecto, que es
// colgarle `L.maplibreGL(...)` al Leaflet ya cargado (y, del lado del tipado,
// declararlo dentro del modulo "leaflet").
import "@maplibre/maplibre-gl-leaflet";
import L from "leaflet";
import { useEffect } from "react";
import { useMap } from "react-leaflet";
import { useActiveTheme } from "../theme/useActiveTheme";
import { BASEMAP_ATTRIBUTION, basemapStyleForTheme, completarImagenesFaltantes } from "./basemap";
import { aplicarGuardaMaplibreLeaflet } from "./maplibreLeafletGuard";

// Antes de crear cualquier capa: ver maplibreLeafletGuard.ts.
aplicarGuardaMaplibreLeaflet();

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
  const theme = useActiveTheme();

  useEffect(() => {
    const layer = L.maplibreGL({
      style: basemapStyleForTheme(theme),
      // El plugin apaga el control de atribucion propio de MapLibre (que se
      // dibujaria sobre el canvas, encima del de Leaflet) y usa este texto
      // para el de Leaflet, el unico que queda a la vista.
      attributionControl: { customAttribution: BASEMAP_ATTRIBUTION },
    });
    layer.addTo(map);
    completarImagenesFaltantes(layer.getMaplibreMap());
    return () => {
      // try/catch por si remove() mismo falla a mitad de camino (efecto que
      // se re-dispara rapido: entrar a /app con el tema guardado en claro
      // rehace la capa casi en el mismo tick). OJO: esto NO cubre el
      // "Cannot read properties of null (reading 'getZoom')" que se veia en
      // produccion -- ese pasa un cuadro DESPUES de remove(), fuera de este
      // try, y lo arregla maplibreLeafletGuard.ts.
      try {
        layer.remove();
      } catch (e) {
        console.warn("No se pudo remover limpio el basemap anterior (known issue de maplibre-gl-leaflet):", e);
      }
    };
    // `theme` en las deps: al cambiarlo se rehace la capa con el otro estilo.
    // Se rehace entera en vez de llamar a setStyle() sobre la instancia de
    // MapLibre de adentro porque es una accion deliberada y poco frecuente, y
    // rehacerla no puede quedar en un estado a medias. El mapa de Leaflet NO
    // se toca, asi que el encuadre (centro y zoom) se mantiene: lo unico que
    // parpadea es el fondo.
  }, [map, theme]);

  return null;
}
