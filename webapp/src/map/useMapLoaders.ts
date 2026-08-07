import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { getGraph, getSearchableNodes, getStations } from "../api/graph";
import { listEvModels, listVehicles } from "../api/vehicles";
import { useMapStore } from "./mapStore";

/**
 * Cinco cargas en paralelo (grafo, estaciones, nodos buscables, vehículos,
 * modelos de EV), portadas de loadAllWithRetry() en js/map/main.js. Ahí se
 * armaba a mano el Promise.allSettled + botón de reintentar que esto
 * reemplaza con lo que TanStack Query ya da de fábrica (reintento
 * automático con backoff, estado de error por query) -- exactamente lo que
 * front2.md (Parte 2) preveía para este caso.
 *
 * `graph` y `stations` comparten queryKey con GraphLayer/StationsLayer: es
 * la MISMA request cacheada (TanStack Query dedupea por key), esto solo
 * agrega su estado al resumen para el banner de reintentar.
 */
export function useMapLoaders() {
  const graphQ = useQuery({ queryKey: ["graph"], queryFn: getGraph });
  const stationsQ = useQuery({ queryKey: ["stations"], queryFn: getStations });
  const nodesQ = useQuery({ queryKey: ["searchableNodes"], queryFn: getSearchableNodes });
  const vehiclesQ = useQuery({ queryKey: ["vehicles"], queryFn: listVehicles });
  const modelsQ = useQuery({ queryKey: ["evModels"], queryFn: listEvModels });

  const setSearchableNodes = useMapStore((s) => s.setSearchableNodes);
  const setVehicles = useMapStore((s) => s.setVehicles);
  const setEvModels = useMapStore((s) => s.setEvModels);

  useEffect(() => {
    if (nodesQ.data) setSearchableNodes(nodesQ.data);
  }, [nodesQ.data, setSearchableNodes]);
  useEffect(() => {
    if (vehiclesQ.data) setVehicles(vehiclesQ.data);
  }, [vehiclesQ.data, setVehicles]);
  useEffect(() => {
    if (modelsQ.data) setEvModels(modelsQ.data);
  }, [modelsQ.data, setEvModels]);

  const loaders = [
    { label: "grafo", query: graphQ },
    { label: "estaciones", query: stationsQ },
    { label: "lista de intersecciones", query: nodesQ },
    { label: "vehículos", query: vehiclesQ },
    { label: "modelos de EV", query: modelsQ },
  ];
  const failed = loaders.filter((l) => l.query.isError).map((l) => l.label);
  const loading = loaders.some((l) => l.query.isLoading);

  function retry() {
    for (const l of loaders) if (l.query.isError) void l.query.refetch();
  }

  return { failed, loading, retry };
}

export function useEvModels() {
  return useMapStore((s) => s.evModels);
}
