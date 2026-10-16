import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { create } from "zustand";
import { showroomModels, type ShowroomModel } from "../api/showroom";
import { buildCatalog } from "./catalog";

/**
 * Los autos que la IA encontró fuera del catálogo en esta visita. Viven
 * afuera de la página (y no en un useState) porque se encuentran en la
 * búsqueda y se usan en la ficha: son dos URLs distintas, y tienen que seguir
 * ahí al ir y volver entre ellas.
 */
const useAiModels = create<{ models: ShowroomModel[]; add: (model: ShowroomModel) => void }>(
  (set) => ({
    models: [],
    add: (model) =>
      set((s) => (s.models.some((m) => m.id === model.id) ? s : { models: [...s.models, model] })),
  })
);

/**
 * El catálogo se baja una sola vez (TanStack Query lo guarda) y se arma por
 * marca y modelo en el navegador: buscar, ordenar o cambiar de marca no
 * vuelve a pedir nada.
 */
export function useShowroomCatalog() {
  // staleTime: Infinity -- el catálogo no cambia mientras dura la visita.
  // Sin esto, volver a la pestaña disparaba un refetch del catálogo entero.
  const query = useQuery({
    queryKey: ["showroomModels"],
    queryFn: () => showroomModels(),
    staleTime: Infinity,
  });
  const extra = useAiModels((s) => s.models);
  const addModel = useAiModels((s) => s.add);

  const catalog = useMemo(() => {
    if (!query.data) return null;
    const base = query.data.models;
    const ids = new Set(base.map((m) => m.id));
    return buildCatalog([...base, ...extra.filter((m) => !ids.has(m.id))]);
  }, [query.data, extra]);

  return {
    catalog,
    isError: query.isError && !catalog,
    // El fallo más común es transitorio (la API tarda cerca de un minuto en
    // arrancar): la salida es volver a pedirlo, no recargar la página.
    refetch: query.refetch,
    addModel,
  };
}
