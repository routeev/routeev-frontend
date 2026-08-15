import { CircleMarker, Polyline, Tooltip } from "react-leaflet";
import { useMapStore } from "../mapStore";

// Mismo naranja que --accent-dijkstra (src/styles/tokens.css), el color de
// "ojo con esto" en toda la app: Leaflet pinta las polilíneas sobre un
// <canvas> (preferCanvas en MapCanvas.tsx) y ahí no puede resolver var() en
// runtime. Mismo criterio que RouteLayers.tsx.
const COLOR_AVISO = "#f2a154";

/**
 * La línea entre "donde tocaste" y "donde quedó el punto".
 *
 * El reporte era "para marcar un punto hay que clickear justo arriba de una
 * calle". La causa real es otra: el backend snapea a NODOS del grafo (cruces
 * y estaciones), nunca al punto más cercano sobre la traza de la ruta, y en
 * ruta abierta esos cruces están a kilómetros. Hasta que eso se arregle del
 * lado del servidor, lo mínimo honesto es MOSTRAR el desvío en vez de
 * describirlo en un cartel: un círculo donde la persona tocó y una línea
 * punteada hasta el punto que terminó quedando. Con eso se entiende de un
 * vistazo si el punto sirve o no, que es lo que la tarjeta de al lado
 * pregunta ("Usar este punto" / "Marcar otro punto").
 */
export function ImprecisePickLink() {
  const pick = useMapStore((s) => s.imprecisePick);
  if (!pick) return null;

  const desde: [number, number] = [pick.clickLat, pick.clickLon];
  const hasta: [number, number] = [pick.node.lat, pick.node.lon];

  return (
    <>
      <Polyline
        positions={[desde, hasta]}
        pathOptions={{ color: COLOR_AVISO, weight: 2, opacity: 0.9, dashArray: "4 6", lineCap: "round" }}
      />
      <CircleMarker
        center={desde}
        radius={6}
        pathOptions={{ color: COLOR_AVISO, weight: 2, opacity: 0.95, fillOpacity: 0.25 }}
      >
        {/* permanent: el punto tocado no tiene ningún otro cartel que lo
            explique, y pedirle a alguien que descubra un tooltip pasando el
            mouse no sirve en un celular. */}
        <Tooltip permanent direction="top" offset={[0, -8]}>
          Tocaste acá
        </Tooltip>
      </CircleMarker>
    </>
  );
}
