import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "../i18n/LanguageProvider";
import { IconArrowRight } from "../landing/landingIcons";
import { IconAlert, IconRetry } from "../map/panelIcons";
import styles from "./ShowroomStates.module.css";
import ui from "./ui.module.css";

/** A partir de acá se avisa que el servidor puede estar despertando. */
const SLOW_MS = 8000;

/**
 * Mientras baja el catálogo: la forma de lo que viene (título, buscador,
 * tarjetas de marcas) en vez de una página vacía. Recién si tarda se explica
 * por qué: la API duerme cuando nadie la usa y despertar le lleva cerca de un
 * minuto.
 */
export function CatalogLoading() {
  const { t } = useTranslation();
  const [slow, setSlow] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => setSlow(true), SLOW_MS);
    return () => window.clearTimeout(timer);
  }, []);

  return (
    <div className={styles.loading} role="status" aria-live="polite">
      <span className="sr-only">
        {slow ? t.showroom.states.loadingSlow : t.showroom.states.loading}
      </span>
      <div aria-hidden="true" className={styles.skeleton}>
        <div className={styles.skEyebrow} />
        <div className={styles.skTitle} />
        <div className={styles.skLine} />
        <div className={styles.skSearch} />
        <div className={styles.skGrid}>
          {Array.from({ length: 8 }, (_, i) => (
            <div key={i} className={styles.skCard}>
              <div className={styles.skCardName} />
              <div className={styles.skCardSub} />
            </div>
          ))}
        </div>
      </div>
      {slow && (
        <span className={styles.slow} aria-hidden="true">
          <span className={ui.spinner} />
          {t.showroom.states.loadingSlow}
        </span>
      )}
    </div>
  );
}

export function CatalogError({ onRetry }: { onRetry: () => void }) {
  const { t } = useTranslation();
  const s = t.showroom.states;
  return (
    <div className={styles.center}>
      <div role="alert" className={styles.errorCard}>
        <span className={styles.errorIcon}>
          <IconAlert size={22} />
        </span>
        <h1 className={styles.cardTitle}>{s.errorTitle}</h1>
        <p className={styles.cardBody}>{s.errorBody}</p>
        <button type="button" className={ui.btnPrimary} onClick={onRetry}>
          <IconRetry />
          {s.retry}
        </button>
      </div>
    </div>
  );
}

/** Una marca o un modelo que no está (link viejo, nombre que cambió). */
export function NotFound({ title, body }: { title: string; body: string }) {
  const { t } = useTranslation();
  return (
    <div className={styles.center}>
      <div className={styles.notFoundCard}>
        <h1 className={styles.cardTitle}>{title}</h1>
        <p className={styles.cardBody}>{body}</p>
        <Link to="/showroom" className={styles.browse}>
          {t.showroom.search.browse}
          <IconArrowRight size={16} />
        </Link>
      </div>
    </div>
  );
}
