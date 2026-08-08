import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo } from "react";
import L from "leaflet";
import { Polyline, useMap } from "react-leaflet";
import { getGraph } from "../../api/graph";
import { useMapStore } from "../mapStore";

/** Dibuja el grafo vial completo (todas las aristas) y ajusta el mapa a su extensión. */
export function GraphLayer() {
  const map = useMap();
  const query = useQuery({ queryKey: ["graph"], queryFn: getGraph });
  const addNode = useMapStore((s) => s.addNode);

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

  useEffect(() => {
    if (!query.data) return;
    for (const n of query.data.nodes) addNode(n);
    const bounds = L.latLngBounds(query.data.nodes.map((n): [number, number] => [n.lat, n.lon]));
    map.fitBounds(bounds, { padding: [20, 20] });
    // Solo la primera vez que llegan los datos del grafo.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query.data]);

  if (!segments.length) return null;
  return <Polyline positions={segments} pathOptions={{ color: "#3a4552", weight: 1.4, opacity: 0.65 }} />;
}
