import L from "leaflet";
import { useEffect } from "react";
import { Marker, Polyline, Popup, useMap } from "react-leaflet";
import { useTranslation } from "../../i18n/LanguageProvider";
import { formatUyu } from "../../shared/format";
import { tollIcon } from "../markerIcons";
import { useMapStore } from "../mapStore";

// Mismo par que --accent-astar/--accent-dijkstra (src/styles/tokens.css):
// Leaflet no puede leer var() en runtime.
const COLOR_ASTAR = "#34e3a8";
const COLOR_DIJKSTRA = "#f2a154";

export function RouteLayers() {
  const { t } = useTranslation();
  const rl = t.map.layers.routeLayers;
  const map = useMap();
  const result = useMapStore((s) => s.lastResult);

  useEffect(() => {
    if (result?.astar.found) {
      const layer = L.polyline(result.astar.route_coords);
      map.fitBounds(layer.getBounds(), { padding: [40, 40] });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [result]);

  if (!result) return null;

  // Si A* no encontró ruta se cae a Dijkstra para mostrar los peajes de esa
  // alternativa, pero ese puede no existir (calculo sin comparación): ahí se
  // usa igual A*, que trae el "no se encontró ruta" a mostrar.
  const primary = result.astar.found ? result.astar : (result.dijkstra ?? result.astar);
  const peajes = primary.breakdown.peajes_puntos ?? [];

  return (
    <>
      {result.dijkstra?.found && (
        <Polyline
          positions={result.dijkstra.route_coords}
          pathOptions={{ color: COLOR_DIJKSTRA, weight: 5, opacity: 0.85, dashArray: "2 10", lineCap: "round" }}
        />
      )}
      {result.astar.found && (
        <Polyline
          positions={result.astar.route_coords}
          pathOptions={{ color: COLOR_ASTAR, weight: 4, opacity: 0.95, lineCap: "round" }}
        />
      )}
      {peajes.map((p, i) => (
        <Marker key={i} position={[p.lat, p.lon]} icon={tollIcon()} zIndexOffset={400}>
          <Popup>{p.monto_uyu ? rl.tollAmount(formatUyu(p.monto_uyu)) : rl.tollUnknownAmount}</Popup>
        </Marker>
      ))}
    </>
  );
}
