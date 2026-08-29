// La libreria no exporta nada para usar: se importa por su efecto, que es
// colgarle `L.maplibreGL(...)` al Leaflet ya cargado (y, del lado del tipado,
// declararlo dentro del modulo "leaflet").
import "@maplibre/maplibre-gl-leaflet";
import L from "leaflet";
import { useEffect } from "react";
import { useMap } from "react-leaflet";
import { useActiveTheme } from "../theme/useActiveTheme";
import { BASEMAP_ATTRIBUTION, basemapStyleForTheme } from "./basemap";

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
    return () => {
      // try/catch a proposito: @maplibre/maplibre-gl-leaflet sincroniza zoom
      // entre Leaflet y el MapLibre de adentro escuchando eventos del mapa
      // de Leaflet -- si este efecto se re-dispara rapido (entrar a /app con
      // el tema guardado en claro, por ejemplo: arranca en oscuro por
      // defecto y syncThemeForRoute lo corrige a claro casi en el mismo
      // tick, rehaciendo la capa de nuevo) puede quedar un evento en cola
      // que le pega a la instancia de MapLibre ya destruida antes de que
      // termine de inicializarse. Confirmado en produccion: "Uncaught
      // TypeError: Cannot read properties of null (reading 'getZoom')"
      // adentro del bundle de la libreria, no de este archivo. No es un bug
      // nuestro para arreglar de raiz (es interno a la libreria de terceros)
      // -- esto evita que ese caso de carrera tire un error sin capturar a
      // la consola. El basemap ya quedo reemplazado por la capa nueva antes
      // de que esto pueda pasar, asi que no hay nada visible que se pierda.
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
