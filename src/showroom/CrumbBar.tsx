import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "../i18n/LanguageProvider";
import { IconChevronRight } from "../landing/landingIcons";
import { IconSearch } from "../map/panelIcons";
import { SearchField } from "./SearchField";
import { IconChevronLeft } from "./showroomIcons";
import styles from "./CrumbBar.module.css";

export interface Crumb {
  label: string;
  to: string;
}

interface CrumbBarProps {
  /** Del índice a la página actual; la última es donde estás. */
  crumbs: Crumb[];
  query: string;
  onQueryChange: (q: string) => void;
}

/**
 * Debajo del header en la página de una marca y en la ficha. Escritorio: miga
 * de pan + buscador. Celular: un "‹ volver" a la página de arriba y una lupa
 * que lleva al buscador del índice.
 */
export function CrumbBar({ crumbs, query, onQueryChange }: CrumbBarProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const parent = crumbs.length > 1 ? crumbs[crumbs.length - 2]! : crumbs[0]!;
  // Desde una marca, "atrás" es el índice: se nombra como lo que es.
  const backLabel = crumbs.length > 2 ? parent.label : t.showroom.crumbs.allBrands;

  return (
    <div className={styles.bar}>
      {/* Con texto en el buscador (escrito en escritorio, o un ?q= en la URL)
          el celular también lo muestra: si no, no habría cómo borrarlo. */}
      <div className={styles.inner} data-searching={query ? "" : undefined}>
        <nav aria-label={t.showroom.crumbs.label} className={styles.crumbs}>
          <ol>
            {crumbs.map((crumb, i) => {
              const last = i === crumbs.length - 1;
              return (
                <li key={crumb.to}>
                  {i > 0 && <IconChevronRight size={14} />}
                  {last ? (
                    <span aria-current="page" className={styles.current}>
                      {crumb.label}
                    </span>
                  ) : (
                    <Link to={crumb.to} className={styles.crumbLink}>
                      {crumb.label}
                    </Link>
                  )}
                </li>
              );
            })}
          </ol>
        </nav>
        <div className={styles.search}>
          <SearchField id="q-bar" size="bar" value={query} onChange={onQueryChange} />
        </div>

        <Link to={parent.to} className={styles.back}>
          <IconChevronLeft />
          <span className={styles.backLabel}>{backLabel}</span>
        </Link>
        <button
          type="button"
          className={styles.searchButton}
          aria-label={t.showroom.index.searchLabel}
          onClick={() => navigate("/showroom", { state: { focusSearch: true } })}
        >
          <IconSearch size={20} />
        </button>
      </div>
    </div>
  );
}
