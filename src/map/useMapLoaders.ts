import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { getSearchableNodes, getStations } from "../api/graph";
import { listEvModels, listVehicles } from "../api/vehicles";
import { useMapStore } from "./mapStore";

/**
 * Cuatro cargas en paralelo (estaciones, nodos buscables, vehículos, modelos
 * de EV), portadas de loadAllWithRetry() en js/map/main.js. Ahí se
 * armaba a mano el Promise.allSettled + botón de reintentar que esto
 * reemplaza con lo que TanStack Query ya da de fábrica (reintento
 * automático con backoff, estado de error por query) -- exactamente lo que
 * front2.md (Parte 2) preveía para este caso.
 *
 * `stations` comparte queryKey con StationsLayer: es la MISMA request
 * cacheada (TanStack Query dedupea por key), esto solo agrega su estado al
 * resumen para el banner de reintentar.
 *
 * Ya NO se baja `GET /api/graph`. Eran ~1,6 MB con 63.800 nodos y 97.293
 * aristas en cada apertura de /app, y su único consumidor era GraphLayer,
 * que dibujaba la malla vial sobre el mapa. Desde que el ruteo pasó a
 * Valhalla (`POST /api/route/plan` recibe coordenadas), ese grafo no
 * interviene en nada de lo que la app calcula. Ojo: la descarga estaba
 * pedida en DOS lugares con la misma queryKey, así que sacar solo la capa
 * no habría evitado el payload.
 *
 * staleTime: Infinity en las tres que son catálogo estático (no cambian
 * mientras el backend está corriendo): sin esto, TanStack Query las
 * revalida en segundo plano cada vez que la pestaña recupera el foco --
 * trivial en la compu, pero en el celular eso es CADA vez que se vuelve de
 * otra app. `vehicles` se deja con el default: el usuario los edita en
 * /profile mientras el mapa puede seguir montado en otra pestaña.
 */
export function useMapLoaders() {
  const stationsQ = useQuery({ queryKey: ["stations"], queryFn: getStations, staleTime: Infinity });
  const nodesQ = useQuery({ queryKey: ["searchableNodes"], queryFn: getSearchableNodes, staleTime: Infinity });
  const vehiclesQ = useQuery({ queryKey: ["vehicles"], queryFn: listVehicles });
  const modelsQ = useQuery({ queryKey: ["evModels"], queryFn: listEvModels, staleTime: Infinity });

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
