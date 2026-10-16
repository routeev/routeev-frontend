import type { ReactNode } from "react";
import { Helmet } from "react-helmet-async";
import { getToken } from "../api/session";
import { useTranslation } from "../i18n/LanguageProvider";
import { LandingFooter } from "../landing/LandingFooter";
import { LandingHeader } from "../landing/LandingHeader";
import styles from "./LegalLayout.module.css";

interface LegalLayoutProps {
  title: string;
  description: string;
  children: ReactNode;
}

/**
 * Layout compartido por /privacidad y /terminos: el header y el pie de la
 * landing y el showroom (todas las páginas públicas con la misma forma) y una
 * columna angosta de lectura.
 */
export function LegalLayout({ title, description, children }: LegalLayoutProps) {
  const { t } = useTranslation();

  return (
    <div className={styles.page}>
      <Helmet>
        <title>{`${title} — RouteEV`}</title>
        <meta name="description" content={description} />
      </Helmet>

      <LandingHeader loggedIn={Boolean(getToken())} page="legal" />

      <main className={styles.legal}>
        {/* Mismo patrón "eyebrow + título" que la landing y el showroom. */}
        <p className={styles.eyebrow}>
          <span className={styles.eyebrowDot} aria-hidden="true" />
          {t.legal.eyebrow}
        </p>
        {children}
      </main>

      <LandingFooter page="legal" />
    </div>
  );
}
