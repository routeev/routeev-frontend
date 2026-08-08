import { useMutation } from "@tanstack/react-query";
import { memo } from "react";
import { showroomLookupAi, type ShowroomFicha, type ShowroomModel } from "../api/showroom";
import { ModelCard } from "./ModelCard";
import styles from "./ModelGrid.module.css";

const FOTOS_SIN_ESPERAR = 8;

interface ModelGridProps {
  isLoading: boolean;
  isError: boolean;
  errorMessage?: string;
  models: ShowroomModel[];
  hasResults: boolean;
  hasMore: boolean;
  onLoadMore: () => void;
  onSelectModel: (id: string) => void;
  query: string;
  hasActiveFilters: boolean;
  aiEnabled: boolean;
  onAiModelFound: (ficha: ShowroomFicha) => void;
}

// memo: esta grilla puede tener hasta ~24 tarjetas montadas a la vez, y sin
// esto React las reconciliaba en cada tecla del buscador aunque la lista
// visible no hubiera cambiado (solucion.md 2.11) -- funciona porque las
// props que le llegan (models, onLoadMore, onSelectModel, onAiModelFound)
// ya son referencias estables desde useShowroomCatalog/ShowroomPage.
function ModelGridComponent({
  isLoading,
  isError,
  errorMessage,
  models,
  hasResults,
  hasMore,
  onLoadMore,
  onSelectModel,
  query,
  hasActiveFilters,
  aiEnabled,
  onAiModelFound,
}: ModelGridProps) {
  const aiLookup = useMutation({ mutationFn: (consulta: string) => showroomLookupAi(consulta) });

  if (isError) {
    return <p className="error-banner">{`No se pudo cargar el catálogo: ${errorMessage ?? "error desconocido"}`}</p>;
  }

  if (isLoading) {
    return <p className={styles.cargando}>Cargando catálogo…</p>;
  }

  if (!hasResults) {
    const consulta = query.trim();
    const ofrecerIa = aiEnabled && consulta.length >= 2 && !hasActiveFilters;
    return (
      <div className={styles.empty}>
        <p className={styles.emptyTitle}>No hay ningún modelo así en el catálogo.</p>
        <p className={styles.emptySub}>
          {hasActiveFilters ? "Probá con otro nombre, o sacá los filtros de marca y carga rápida." : "Probá con otro nombre."}
        </p>
        {ofrecerIa && (
          <div className={styles.aiBox}>
            <p>
              El catálogo tiene los modelos que se consiguen en la región. Si el tuyo no está, la IA lo
              identifica por el nombre y estima sus especificaciones: <strong className={styles.aiQ}>{consulta}</strong>
            </p>
            <button
              type="button"
              className="primary"
              disabled={aiLookup.isPending}
              onClick={() => aiLookup.mutate(consulta, { onSuccess: onAiModelFound })}
            >
              {aiLookup.isPending ? "Buscando…" : "Identificarlo con IA"}
            </button>
            {aiLookup.isError && (
              <p className="error-banner">{aiLookup.error instanceof Error ? aiLookup.error.message : "No se pudo consultar la IA."}</p>
            )}
          </div>
        )}
      </div>
    );
  }

  return (
    <>
      <div className={styles.grid}>
        {models.map((model, i) => (
          <ModelCard key={model.id} model={model} eager={i < FOTOS_SIN_ESPERAR} onSelect={onSelectModel} />
        ))}
      </div>
      {hasMore && (
        <div className={styles.moreWrap}>
          <button type="button" className="ghost" onClick={onLoadMore}>
            Ver más modelos
          </button>
        </div>
      )}
    </>
  );
}

export const ModelGrid = memo(ModelGridComponent);
