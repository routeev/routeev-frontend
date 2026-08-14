import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useRef } from "react";
import L from "leaflet";
import { Polyline, useMap } from "react-leaflet";
import { getGraph } from "../../api/graph";
import { useMapStore } from "../mapStore";

/** Dibuja el grafo vial completo (todas las aristas) y ajusta el mapa a su extensión. */
export function GraphLayer() {
  const map = useMap();
  // staleTime: Infinity -- ver el comentario en useMapLoaders.ts (misma
  // key: el grafo no cambia mientras el backend esta corriendo). Ademas de
  // ahorrar el refetch, evita que el efecto de abajo vuelva a correr
  // fitBounds() sobre el pais entero (pisando el auto-locate del usuario)
  // cada vez que la pestaña recupera el foco.
  const query = useQuery({ queryKey: ["graph"], queryFn: getGraph, staleTime: Infinity });
  const addNodes = useMapStore((s) => s.addNodes);

  const segments = useMemo<[number, number][][]>(() => {
    if (!query.data) return [];
    const byId = new Map(query.data.nodes.map((n) => [n.id, n]));
    const segs: [number, number][][] = [];
    for (const e of query.data.edges) {
      const a = byId.get(e.from);
      const b = byId.get(e.to);
      if (a && b) segs.push([[a.lat, a.lon], [b.lat, b.lon]]);
    }
    return segs;
  }, [query.data]);

  // Antes esto corria en CADA cambio de query.data (no solo "la primera
  // vez que llegan los datos" como decia el comentario -- nada lo
  // garantizaba) y SIEMPRE hacia fitBounds a Uruguay entero, sin mirar si
  // CaptureMap ya habia centrado el mapa en la ubicacion real del usuario
  // (MapCanvas.tsx). El grafo pesa ~1,6 MB/63.800 nodos: en la practica es
  // una carrera contra la geolocalizacion, y cuando el grafo terminaba de
  // cargar DESPUES del auto-locate exitoso, este fitBounds lo pisaba --
  // pareciera que "la ubicacion no funciona" cuando en realidad si
  // funciono, y esto la deshizo un instante despues.
  const hasFitOnce = useRef(false);
  useEffect(() => {
    if (!query.data || hasFitOnce.current) return;
    addNodes(query.data.nodes);
    hasFitOnce.current = true;
    // Si el auto-locate ya centro el mapa en la ubicacion real, esa vista
    // gana -- fitBounds a todo el pais es solo el respaldo para cuando la
    // geolocalizacion no esta disponible o el usuario aun no la resolvio.
    if (useMapStore.getState().myPosition) return;
    const bounds = L.latLngBounds(query.data.nodes.map((n): [number, number] => [n.lat, n.lon]));
    map.fitBounds(bounds, { padding: [20, 20] });
  }, [query.data, map, addNodes]);

  if (!segments.length) return null;
  return <Polyline positions={segments} pathOptions={{ color: "#3a4552", weight: 1.4, opacity: 0.65 }} />;
}
