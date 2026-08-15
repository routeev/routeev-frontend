import { useMutation } from "@tanstack/react-query";
import { memo } from "react";
import { showroomLookupAi, type ShowroomFicha } from "../api/showroom";
import { ModelCard } from "./ModelCard";
import type { ModelFamily } from "./modelFamily";
import { ModelGridSkeleton } from "./Skeletons";
import styles from "./ModelGrid.module.css";

const FOTOS_SIN_ESPERAR = 8;

interface ModelGridProps {
  isLoading: boolean;
  isError: boolean;
  errorMessage?: string;
  /** Volver a pedir el catálogo. Sin esto el error es una pantalla sin salida. */
  onRetry?: () => void;
  familias: ModelFamily[];
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
  onRetry,
  familias,
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
    // Con botón de reintentar, no solo el texto del error. Un catálogo que no
    // carga deja la pantalla entera vacía: sin una salida, la única opción que
    // le queda a la persona es recargar la página a mano o irse. Y el caso más
    // común es transitorio (el servidor de la API tarda cerca de un minuto en
    // arrancar), o sea que reintentar suele alcanzar.
    return (
      <div className="error-banner" role="alert">
        <p>{errorMessage ?? "No se pudo cargar el catálogo."}</p>
        {onRetry && (
          <button type="button" className="primary small" onClick={onRetry} style={{ marginTop: 10 }}>
            Reintentar
          </button>
        )}
      </div>
    );
  }

  if (isLoading) {
    return (
      <div aria-busy="true">
        {/* El esqueleto es aria-hidden, así que el estado "estoy cargando" hay
            que decirlo con palabras para quien no lo ve. role="status" y no
            "alert": es información de fondo, no interrumpe lo que se esté
            leyendo. */}
        <p className="sr-only" role="status">
          Cargando el catálogo de modelos…
        </p>
        <ModelGridSkeleton />
      </div>
    );
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
        {familias.map((familia, i) => (
          <ModelCard key={familia.key} familia={familia} eager={i < FOTOS_SIN_ESPERAR} onSelect={onSelectModel} />
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
