import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { showroomModels, type ShowroomModel } from "../api/showroom";
import { normalizeForSearch } from "../shared/geo";
import { useDebouncedValue } from "../shared/useDebouncedValue";

const PAGINA = 24;

export type Orden = "relevancia" | "autonomia" | "bateria" | "carga" | "consumo";

const COMPARADORES: Partial<Record<Orden, (a: ShowroomModel, b: ShowroomModel) => number>> = {
  autonomia: (a, b) => b.autonomia_aprox_km - a.autonomia_aprox_km,
  bateria: (a, b) => b.bateria_kwh - a.bateria_kwh,
  carga: (a, b) => b.potencia_carga_kw - a.potencia_carga_kw,
  consumo: (a, b) => a.consumo_kwh_km - b.consumo_kwh_km,
};

/**
 * Estado y lógica de búsqueda/filtro/orden del showroom, portados de
 * filtrar() en js/showroom.js. El catálogo se baja una sola vez (TanStack
 * Query lo cachea) y todo lo demás es 100% client-side -- con 880 entradas
 * no hace falta ir al servidor en cada tecla.
 */
export function useShowroomCatalog() {
  const catalogQuery = useQuery({ queryKey: ["showroomModels"], queryFn: () => showroomModels() });
  // Modelos encontrados por IA (fuera del catálogo): se suman en memoria,
  // quedan buscables por lo que dure la visita (agregarModelo en el original).
  const [extraModels, setExtraModels] = useState<ShowroomModel[]>([]);

  const [query, setQuery] = useState("");
  const debouncedQuery = useDebouncedValue(query, 120);
  const [marca, setMarca] = useState("");
  const [orden, setOrden] = useState<Orden>("relevancia");
  const [soloDc, setSoloDc] = useState(false);
  const [visibles, setVisibles] = useState(PAGINA);

  const modelos = useMemo(() => {
    const base = catalogQuery.data?.models ?? [];
    if (extraModels.length === 0) return base;
    const ids = new Set(base.map((m) => m.id));
    return [...base, ...extraModels.filter((m) => !ids.has(m.id))];
  }, [catalogQuery.data, extraModels]);

  const indexado = useMemo(
    () =>
      modelos.map((m) => ({
        model: m,
        busqueda: normalizeForSearch(`${m.marca} ${m.modelo}`),
        modeloNorm: normalizeForSearch(m.modelo),
      })),
    [modelos]
  );

  const marcas = useMemo(
    () => [...new Set(modelos.map((m) => m.marca))].sort((a, b) => a.localeCompare(b, "es")),
    [modelos]
  );

  const filtrados = useMemo(() => {
    const consulta = normalizeForSearch(debouncedQuery.trim());
    const tokens = consulta ? consulta.split(/\s+/) : [];

    let lista = indexado.filter(({ model, busqueda }) => {
      if (marca && model.marca !== marca) return false;
      if (soloDc && model.potencia_carga_kw < 50) return false;
      // Todas las palabras tienen que aparecer, en cualquier orden: asi
      // "leaf nissan" y "nissan leaf" encuentran lo mismo.
      return tokens.every((t) => busqueda.includes(t));
    });

    const comparador = COMPARADORES[orden];
    if (comparador) {
      lista = [...lista].sort((a, b) => comparador(a.model, b.model));
    } else if (consulta) {
      // Relevancia: primero lo que EMPIEZA con lo escrito (marca o modelo),
      // y dentro de cada grupo, mayor autonomía primero.
      const arranca = ({ busqueda, modeloNorm }: (typeof indexado)[number]) =>
        Number(busqueda.startsWith(consulta) || modeloNorm.startsWith(consulta));
      lista = [...lista].sort(
        (a, b) => arranca(b) - arranca(a) || b.model.autonomia_aprox_km - a.model.autonomia_aprox_km
      );
    } else {
      lista = [...lista].sort((a, b) => b.model.autonomia_aprox_km - a.model.autonomia_aprox_km);
    }

    return lista.map((x) => x.model);
  }, [indexado, debouncedQuery, marca, orden, soloDc]);

  const visible = filtrados.slice(0, visibles);
  const hayMas = visibles < filtrados.length;

  function verMas() {
    setVisibles((v) => v + PAGINA);
  }

  function addModel(model: ShowroomModel) {
    setExtraModels((prev) => (prev.some((m) => m.id === model.id) ? prev : [...prev, model]));
  }

  // Cualquier cambio de filtro reinicia la paginación (mismo criterio que filtrar()).
  function updateQuery(v: string) {
    setQuery(v);
    setVisibles(PAGINA);
  }
  function updateMarca(v: string) {
    setMarca(v);
    setVisibles(PAGINA);
  }
  function updateOrden(v: Orden) {
    setOrden(v);
    setVisibles(PAGINA);
  }
  function updateSoloDc(v: boolean) {
    setSoloDc(v);
    setVisibles(PAGINA);
  }

  return {
    isLoading: catalogQuery.isLoading,
    isError: catalogQuery.isError,
    error: catalogQuery.error,
    total: modelos.length,
    marcas,
    query,
    setQuery: updateQuery,
    marca,
    setMarca: updateMarca,
    orden,
    setOrden: updateOrden,
    soloDc,
    setSoloDc: updateSoloDc,
    filtrados,
    visible,
    hayMas,
    verMas,
    addModel,
  };
}
