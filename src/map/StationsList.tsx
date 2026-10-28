import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { listStationReviewSummaries } from "../api/stationReviews";
import { useTranslation } from "../i18n/LanguageProvider";
import { normalizeForSearch } from "../shared/geo";
import { esPrivada } from "./esPrivada";
import { useMapStore } from "./mapStore";
import { IconAlert, IconBolt, IconRetry, IconSearch, STAR_PATH } from "./panelIcons";
import ui from "./panel.module.css";
import styles from "./StationsList.module.css";
import { matchesStationFilter } from "./stationFilter";

interface StationsListProps {
  loadFailed: boolean;
  onRetry: () => void;
}

/**
 * La pestaña "Estaciones": buscador y filtros fijos arriba, y la lista con su
 * propio scroll -- son ~260 filas, y con el buscador adentro del mismo scroll
 * había que volver arriba de todo para cambiar la búsqueda. Elegir una abre
 * el detalle (StationDetailPanel) en esta misma pestaña.
 */
export function StationsList({ loadFailed, onRetry }: StationsListProps) {
  const { t, lang } = useTranslation();
  const sp = t.map.panel.stations;
  const stations = useMapStore((s) => s.stations);
  const leafletMap = useMapStore((s) => s.leafletMap);
  const selectStation = useMapStore((s) => s.selectStation);
  const summariesQuery = useQuery({
    queryKey: ["stationReviewSummaries"],
    queryFn: listStationReviewSummaries,
  });
  const filter = useMapStore((s) => s.stationFilter);
  const setFilter = useMapStore((s) => s.setStationFilter);
  const [search, setSearch] = useState("");

  if (loadFailed) {
    return (
      <div className={ui.body}>
        <div role="alert" className={styles.failed}>
          <span className={styles.failedIcon}>
            <IconAlert size={22} />
          </span>
          <p className={styles.failedTitle}>{sp.loadFailedTitle}</p>
          <p className={ui.muted}>{sp.loadFailedBody}</p>
          <button
            type="button"
            className={[ui.btnOutline, ui.btnStrong].join(" ")}
            onClick={onRetry}
          >
            <IconRetry />
            {t.map.panel.plan.retry}
          </button>
        </div>
      </div>
    );
  }

  const q = normalizeForSearch(search.trim());
  const shown = stations.filter((s) => {
    if (!matchesStationFilter(s, filter)) return false;
    return (
      !q || normalizeForSearch(`${s.nombre} ${s.departamento ?? ""} ${s.direccion}`).includes(q)
    );
  });
  const rating = (n: number) =>
    n.toLocaleString(lang === "es" ? "es-UY" : "en-US", {
      minimumFractionDigits: 1,
      maximumFractionDigits: 1,
    });

  return (
    <div className={styles.wrap}>
      <div className={styles.controls}>
        <label className={styles.search}>
          <IconSearch />
          <input
            type="search"
            className={styles.searchInput}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={sp.search}
            aria-label={sp.search}
          />
        </label>
        <div className={styles.filters}>
          {(["all", "fast", "ute", "priv"] as const).map((f) => (
            // El botón mide 44 de alto (área de toque); la píldora que se ve, 36.
            <button
              key={f}
              type="button"
              className={styles.filterBtn}
              aria-pressed={filter === f}
              onClick={() => setFilter(f)}
            >
              <span className={styles.filterPill}>{sp.filters[f]}</span>
            </button>
          ))}
        </div>
        <p className={styles.count}>
          {stations.length === 0 ? sp.loading : sp.count(shown.length)}
        </p>
      </div>

      <ul className={styles.list}>
        {shown.map((st) => {
          const summary = summariesQuery.data?.[String(st.node_id)];
          const sub = [st.departamento, st.operador].filter(Boolean).join(" · ");
          return (
            <li key={st.node_id}>
              <button
                type="button"
                className={styles.row}
                onClick={() => {
                  selectStation(st.node_id);
                  leafletMap?.setView([st.lat, st.lon], 16);
                }}
              >
                <span className={styles.rowIcon}>
                  <IconBolt />
                </span>
                <span className={styles.rowText}>
                  <span className={styles.rowName}>{st.nombre}</span>
                  <span className={styles.rowSub}>
                    <span>{sub}</span>
                    {/* Solo se marca el privado: UTE es la mayoría de la red y
                        etiquetarla en cada fila sería ruido. */}
                    {esPrivada(st.operador) && (
                      <span className={styles.privTag}>{sp.privateTag}</span>
                    )}
                  </span>
                </span>
                <span className={styles.rowMeta}>
                  <span className={styles.kw}>
                    {st.potencia_kw}
                    <span className={ui.unit}>kW</span>
                  </span>
                  {summary && summary.count > 0 && summary.avg_rating != null && (
                    <span className={styles.rating}>
                      <svg
                        viewBox="0 0 24 24"
                        width="12"
                        height="12"
                        fill="currentColor"
                        aria-hidden="true"
                      >
                        <path d={STAR_PATH} />
                      </svg>
                      {rating(summary.avg_rating)} ({summary.count})
                    </span>
                  )}
                </span>
              </button>
            </li>
          );
        })}
        {stations.length > 0 && shown.length === 0 && (
          <li className={styles.empty}>{q ? sp.noMatch(search.trim()) : sp.noMatchFilter}</li>
        )}
      </ul>
    </div>
  );
}
