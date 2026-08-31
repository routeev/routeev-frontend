import L from "leaflet";
import { useEffect } from "react";
import { Marker, Polyline, Popup, useMap } from "react-leaflet";
import { useTranslation } from "../../i18n/LanguageProvider";
import { formatUyu } from "../../shared/format";
import { radarIcon, tollIcon } from "../markerIcons";
import { useMapStore } from "../mapStore";
import { useActiveTheme } from "../../theme/useActiveTheme";

// Mismos valores que --accent-astar/--accent-dijkstra en cada tema
// (src/styles/tokens.css): Leaflet no puede leer var() en runtime, y con
// preferCanvas menos todavia, asi que hay que duplicarlos a mano.
//
// El par claro NO es el oscuro aclarado: son los tonos que el sistema de
// diseno ya tenia calibrados para fondo claro. El verde menta del tema oscuro
// sobre el basemap `positron` (casi blanco) queda practicamente invisible, y
// la ruta es lo unico que la persona vino a ver.
const COLORES_RUTA = {
  dark: { astar: "#34e3a8", dijkstra: "#f2a154" },
  light: { astar: "#0f9d72", dijkstra: "#c3721f" },
} as const;

export function RouteLayers() {
  const { t } = useTranslation();
  const rl = t.map.layers.routeLayers;
  const map = useMap();
  const result = useMapStore((s) => s.lastResult);
  const colores = COLORES_RUTA[useActiveTheme()];

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
  const radares = primary.breakdown.radares_puntos ?? [];

  return (
    <>
      {result.dijkstra?.found && (
        <Polyline
          positions={result.dijkstra.route_coords}
          pathOptions={{ color: colores.dijkstra, weight: 5, opacity: 0.85, dashArray: "2 10", lineCap: "round" }}
        />
      )}
      {result.astar.found && (
        <Polyline
          positions={result.astar.route_coords}
          pathOptions={{ color: colores.astar, weight: 4, opacity: 0.95, lineCap: "round" }}
        />
      )}
      {peajes.map((p, i) => (
        <Marker key={i} position={[p.lat, p.lon]} icon={tollIcon()} zIndexOffset={400}>
          <Popup>{p.monto_uyu ? rl.tollAmount(formatUyu(p.monto_uyu)) : rl.tollUnknownAmount}</Popup>
        </Marker>
      ))}
      {radares.map((r, i) => (
        <Marker key={i} position={[r.lat, r.lon]} icon={radarIcon()} zIndexOffset={400}>
          <Popup>{r.maxspeed_kmh != null ? rl.radarWithSpeed(r.nombre, r.maxspeed_kmh) : rl.radarLabel(r.nombre)}</Popup>
        </Marker>
      ))}
    </>
  );
}
